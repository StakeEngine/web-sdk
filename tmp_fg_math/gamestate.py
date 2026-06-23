"""Forest Gang custom math-sdk gamestate."""

from __future__ import annotations

from src.state.state import GeneralGameState

from forest_math import (
    ALL_IN_PROFILE_CONFIG,
    BONUS_TOTAL_FS,
    FEATURE_TOTAL_FS,
    MAX_WIN_X,
    PAY_SYMBOL_WEIGHTS,
    RETRIGGER_SPINS,
    SUPER_TOTAL_FS,
    apply_all_in_spin,
    apply_deal_it_spin,
    choose_all_in_profile,
    choice_weighted,
    count_visible_scatters,
    create_base_strips,
    evaluate_board,
    make_bonus_strip,
    make_bonus_strip_with_density,
    make_scatter_reveal_board,
    sanitize_bonus_board_for_expand,
    spin_board,
    win_level_from_amount,
)
from game_events import (
    apply_temp_multiplier_event,
    bonus_symbol_selected_event,
    expanded_symbol_reveal_event,
    final_win_event,
    fs_end_event,
    fs_trigger_event,
    reveal_event,
    set_total_event,
    set_win_event,
    update_fs_event,
    update_global_multiplier_event,
    win_info_event,
)


class GameState(GeneralGameState):
    def assign_special_sym_function(self):
        self.special_symbol_functions = {}

    def run_freespin(self):
        return None

    def _mode_bonus_type(self, mode_name: str) -> str:
        name = mode_name.upper()
        if name == 'SUPER':
            return self.config.superspin_type
        if name == 'FEATURE':
            return self.config.feature_type
        return self.config.freegame_type

    def _accept_round(self, *, mode_name: str, criteria: str, trigger_mode: str | None, base_total_amount: int, final_amount: int) -> bool:
        del base_total_amount
        mode_name = mode_name.upper()
        if mode_name in ('BASE', 'CHANCE'):
            if criteria == '0':
                return trigger_mode is None and final_amount == 0
            if criteria == 'basegame':
                return trigger_mode is None and final_amount > 0
            if criteria == 'dealit':
                return trigger_mode == self.config.freegame_type
            if criteria == 'allin':
                return trigger_mode == self.config.superspin_type
            if criteria == 'feature':
                return trigger_mode == self.config.feature_type
            return True
        if mode_name == 'BONUS':
            return trigger_mode in (self.config.freegame_type, self.config.superspin_type)
        if mode_name == 'SUPER':
            return trigger_mode == self.config.superspin_type
        if mode_name == 'FEATURE':
            return trigger_mode == self.config.feature_type
        return True

    def _apply_spin_win(self, amount: int, gametype: str):
        self.win_manager.reset_spin_win()
        if amount > 0:
            self.win_manager.update_spinwin(amount / 100.0)
        if gametype.lower() == self.config.superspin_type.lower():
            self.win_manager.freegame_wins += self.win_manager.spin_win
        else:
            effective = self.config.freegame_type if gametype == self.config.feature_type else gametype
            self.win_manager.update_gametype_wins(effective)

    def _run_bonus_sequence(self, bonus_type: str, selected_symbol: str, scatter_positions: list | None = None) -> tuple[int, int]:
        total_win_amount = 0
        win_cap = MAX_WIN_X

        if bonus_type == self.config.superspin_type:
            session_profile = choose_all_in_profile()
            profile_cfg = ALL_IN_PROFILE_CONFIG[session_profile]
            global_multiplier = 2
            early_strips = [make_bonus_strip_with_density(selected_symbol, profile_cfg['early_density_mult'], bonus_type, reel_index) for reel_index in range(5)]
            late_strips = [make_bonus_strip_with_density(selected_symbol, profile_cfg['late_density_mult'], bonus_type, reel_index) for reel_index in range(5)]
            strips = late_strips
        else:
            session_profile = 'warm'
            global_multiplier = 1
            early_strips = None
            late_strips = None
            strips = [make_bonus_strip(selected_symbol, bonus_type, reel_index) for reel_index in range(5)]

        if scatter_positions is None:
            if bonus_type == self.config.superspin_type:
                scatter_positions = [{'reel': 0, 'row': 1}, {'reel': 1, 'row': 2}, {'reel': 2, 'row': 3}, {'reel': 3, 'row': 2}]
            elif bonus_type == self.config.feature_type:
                scatter_positions = []
            else:
                scatter_positions = [{'reel': 0, 'row': 1}, {'reel': 1, 'row': 2}, {'reel': 2, 'row': 3}]

        total_spins = SUPER_TOTAL_FS if bonus_type == self.config.superspin_type else FEATURE_TOTAL_FS if bonus_type == self.config.feature_type else BONUS_TOTAL_FS
        fs_trigger_event(self, total_spins, scatter_positions)
        bonus_symbol_selected_event(self, selected_symbol, bonus_type, profile=session_profile if bonus_type == self.config.superspin_type else None)
        if bonus_type == self.config.superspin_type:
            update_global_multiplier_event(self, global_multiplier)

        spins_played = 0
        while spins_played < total_spins:
            update_fs_event(self, spins_played, total_spins)
            current_strips = early_strips if bonus_type == self.config.superspin_type and spins_played < 3 else strips if bonus_type != self.config.superspin_type else late_strips
            board = spin_board(current_strips)

            if bonus_type in (self.config.freegame_type, self.config.feature_type):
                spin = apply_deal_it_spin(board, selected_symbol, bonus_type)
            else:
                spin = apply_all_in_spin(board, selected_symbol, global_multiplier, session_profile)

            if spin['didExpand']:
                board = sanitize_bonus_board_for_expand(board, selected_symbol)

            reveal_event(self, board, bonus_type)
            if spin['didExpand']:
                expanded_symbol_reveal_event(self, selected_symbol, spin['expandedReels'], spin['expandedPositions'])
            if spin['evalResult']['totalWinAmount'] > 0:
                win_info_event(self, spin['evalResult']['totalWinAmount'], spin['evalResult']['wins'])
                if spin.get('tempMultiplier'):
                    apply_temp_multiplier_event(self, spin['tempMultiplier'], spin['evalResult']['totalWinAmount'], spin['finalAmount'])
                set_win_event(self, spin['finalAmount'], win_level_from_amount(spin['finalAmount']))
                prev_total = total_win_amount
                total_win_amount = min(total_win_amount + spin['finalAmount'], win_cap * 100)
                self._apply_spin_win(total_win_amount - prev_total, bonus_type)
            else:
                self._apply_spin_win(0, bonus_type)

            if bonus_type == self.config.superspin_type and spin.get('multiplierChanged'):
                update_global_multiplier_event(self, spin['nextMultiplier'])
                global_multiplier = spin['nextMultiplier']

            set_total_event(self, total_win_amount)
            if total_win_amount >= win_cap * 100:
                break
            spins_played += 1

        fs_end_event(self, total_win_amount, win_level_from_amount(total_win_amount))
        return total_win_amount, global_multiplier

    def _generate_round(self, mode_name: str):
        mode_name = mode_name.upper()
        if mode_name in ('BASE', 'CHANCE'):
            strips = create_base_strips()
            board = spin_board(strips)
            reveal_event(self, board, self.config.basegame_type)
            scatter = count_visible_scatters(board)
            base_eval = evaluate_board(board)
            base_total_amount = base_eval['totalWinAmount']
            if base_total_amount > 0:
                win_info_event(self, base_total_amount, base_eval['wins'])
                set_win_event(self, base_total_amount, win_level_from_amount(base_total_amount))
            set_total_event(self, base_total_amount)
            self._apply_spin_win(base_total_amount, self.config.basegame_type)

            trigger_mode = None
            final_amount = base_total_amount
            if scatter['count'] >= 4:
                trigger_mode = self.config.superspin_type
            elif scatter['count'] >= 3:
                trigger_mode = self.config.freegame_type
            elif getattr(self, 'criteria', None) == 'feature':
                trigger_mode = self.config.feature_type

            if trigger_mode is not None:
                self.triggered_freegame = True
                positions = scatter['positions'] if trigger_mode != self.config.feature_type else []
                bonus_total_amount, _ = self._run_bonus_sequence(trigger_mode, choice_weighted(PAY_SYMBOL_WEIGHTS), scatter_positions=positions)
                final_amount = min(base_total_amount + bonus_total_amount, MAX_WIN_X * 100)
                if base_total_amount > 0:
                    set_total_event(self, final_amount)
            return {'triggerMode': trigger_mode, 'baseTotalAmount': base_total_amount, 'finalAmount': final_amount}

        bonus_type = self._mode_bonus_type(mode_name)
        self.triggered_freegame = True
        if bonus_type == self.config.feature_type:
            bonus_total_amount, _ = self._run_bonus_sequence(bonus_type, choice_weighted(PAY_SYMBOL_WEIGHTS), scatter_positions=[])
        else:
            num_scatters = 4 if bonus_type == self.config.superspin_type else 3
            cinematic_board, scatter_positions = make_scatter_reveal_board(num_scatters)
            reveal_event(self, cinematic_board, self.config.basegame_type)
            bonus_total_amount, _ = self._run_bonus_sequence(bonus_type, choice_weighted(PAY_SYMBOL_WEIGHTS), scatter_positions=scatter_positions)
        return {'triggerMode': bonus_type, 'baseTotalAmount': 0, 'finalAmount': bonus_total_amount}

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim, simulation_seed)
        while True:
            self.reset_book()
            result = self._generate_round(self.betmode)
            if self._accept_round(
                mode_name=self.betmode,
                criteria=self.criteria,
                trigger_mode=result['triggerMode'],
                base_total_amount=result['baseTotalAmount'],
                final_amount=result['finalAmount'],
            ):
                self.update_final_win()
                final_win_event(self, int(round(self.book.payout_multiplier * 100)))
                self.imprint_wins()
                return
