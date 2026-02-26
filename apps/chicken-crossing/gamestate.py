"""Handles the state and output for a single simulation round."""

from game_override import GameStateOverride
from game_events import crossing_start_event, lane_result_event, crossing_summary_event
from src.calculations.statistics import get_random_outcome
from src.events.event_constants import EventConstants


class GameState(GameStateOverride):
    """Handle all game-logic and event updates for a given simulation number."""

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim, simulation_seed)
        self.repeat = True
        while self.repeat:
            self.reset_book()

            current_multiplier = float(self.config.starting_multiplier)
            lanes_cleared = 0
            lane_distribution = {
                True: self.config.lane_win_prob,
                False: 1.0 - self.config.lane_win_prob,
            }

            crossing_start_event(self)

            for lane_index in range(1, self.config.num_lanes + 1):
                lane_win = get_random_outcome(lane_distribution)
                if lane_win:
                    current_multiplier = round(current_multiplier * self.config.lane_multiplier, 2)
                    lanes_cleared += 1
                    lane_result_event(self, lane_index, True, current_multiplier)
                else:
                    current_multiplier = 0.0
                    lane_result_event(self, lane_index, False, current_multiplier)
                    break

            crossing_summary_event(self, lanes_cleared, current_multiplier)

            self.win_manager.update_spinwin(current_multiplier)
            self.win_manager.update_gametype_wins(self.gametype)

            game_event = {
                "index": len(self.book.events),
                "type": EventConstants.WIN_DATA.value,
                "totalWin": int(round(current_multiplier * 100, 0)),
                "lanesCleared": int(lanes_cleared),
                "totalLanes": int(self.config.num_lanes),
            }
            self.book.add_event(game_event)

            self.evaluate_finalwin()

        self.imprint_wins()

    def run_freespin(self):
        pass
