"""Forest Gang proto math-sdk implementation."""

from __future__ import annotations

import random
from typing import Dict, List, Tuple

PAYLINES: Dict[int, List[int]] = {
    1: [0, 0, 0, 0, 0],
    2: [1, 1, 1, 1, 1],
    3: [2, 2, 2, 2, 2],
    4: [3, 3, 3, 3, 3],
    5: [0, 1, 2, 1, 0],
    6: [3, 2, 1, 2, 3],
    7: [0, 0, 1, 0, 0],
    8: [3, 3, 2, 3, 3],
    9: [1, 2, 3, 2, 1],
    10: [2, 1, 0, 1, 2],
    11: [0, 1, 1, 1, 0],
    12: [3, 2, 2, 2, 3],
    13: [1, 1, 2, 1, 1],
    14: [2, 2, 1, 2, 2],
    15: [1, 0, 1, 0, 1],
    16: [2, 3, 2, 3, 2],
    17: [0, 1, 0, 1, 0],
    18: [3, 2, 3, 2, 3],
    19: [1, 2, 1, 2, 1],
    20: [2, 1, 2, 1, 2],
}

PREMIUMS = ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL']
LOWS = ['A', 'K', 'Q', 'J', 'T']
PAY_SYMBOLS = PREMIUMS + LOWS
PAY_SYMBOL_WEIGHTS = [
    ('T', 24),
    ('J', 20),
    ('Q', 16),
    ('K', 13),
    ('A', 10),
    ('SQUIRREL', 8),
    ('RABBIT', 6),
    ('BEAR', 4),
    ('WOLF', 2),
    ('FOX', 1),
]
WILD = 'WILD'
SCATTER = 'SCATTER'
MAX_WIN_X = 25000
BONUS_TOTAL_FS = 10
SUPER_TOTAL_FS = 10
FEATURE_TOTAL_FS = 1
RETRIGGER_SPINS: dict[int, int] = {}
ROW_OFFSET = 1

ALL_IN_PROFILE_WEIGHTS = [
    ('cold', 70),
    ('warm', 20),
    ('hot', 8),
    ('insane', 2),
]

ALL_IN_PROFILE_CONFIG = {
    'cold': {'early_density_mult': 0.78, 'late_density_mult': 0.28},
    'warm': {'early_density_mult': 0.98, 'late_density_mult': 0.42},
    'hot': {'early_density_mult': 1.12, 'late_density_mult': 0.58},
    'insane': {'early_density_mult': 1.28, 'late_density_mult': 0.78},
}

DEAL_IT_DENSITY_MULT = {
    'freegame': 0.46,
    'feature': 0.68,
}

PAYTABLE = {
    'FOX': {3: 3, 4: 20, 5: 250},
    'WOLF': {3: 2.5, 4: 15, 5: 175},
    'BEAR': {3: 2, 4: 12, 5: 150},
    'RABBIT': {3: 1.5, 4: 10, 5: 100},
    'SQUIRREL': {3: 1, 4: 8, 5: 75},
    'A': {3: 0.8, 4: 5, 5: 40},
    'K': {3: 0.7, 4: 4, 5: 35},
    'Q': {3: 0.6, 4: 3.5, 5: 30},
    'J': {3: 0.5, 4: 3, 5: 25},
    'T': {3: 0.4, 4: 2.5, 5: 20},
}

BASE_PADDING_REELS = [
    ['A', 'FOX', 'J', 'SCATTER', 'BEAR', 'K', 'WILD', 'Q', 'RABBIT', 'T', 'WOLF', 'A'],
    ['K', 'Q', 'FOX', 'J', 'SCATTER', 'SQUIRREL', 'A', 'WILD', 'BEAR', 'T', 'RABBIT', 'K'],
    ['Q', 'A', 'WOLF', 'SCATTER', 'J', 'FOX', 'T', 'BEAR', 'K', 'WILD', 'RABBIT', 'Q'],
    ['J', 'BEAR', 'K', 'Q', 'SCATTER', 'WOLF', 'A', 'RABBIT', 'T', 'FOX', 'WILD', 'J'],
    ['T', 'RABBIT', 'A', 'K', 'SCATTER', 'FOX', 'Q', 'WOLF', 'J', 'SQUIRREL', 'WILD', 'T'],
]
FREEGAME_PADDING_REELS = [
    ['FOX', 'A', 'J', 'BEAR', 'SCATTER', 'FOX', 'K', 'RABBIT', 'WILD', 'Q', 'WOLF', 'A'],
    ['K', 'FOX', 'Q', 'J', 'SCATTER', 'BEAR', 'A', 'WOLF', 'T', 'FOX', 'RABBIT', 'K'],
    ['Q', 'A', 'FOX', 'SCATTER', 'J', 'FOX', 'T', 'BEAR', 'K', 'WILD', 'RABBIT', 'Q'],
    ['J', 'BEAR', 'K', 'FOX', 'SCATTER', 'WOLF', 'A', 'RABBIT', 'T', 'FOX', 'WILD', 'J'],
    ['T', 'FOX', 'A', 'K', 'SCATTER', 'FOX', 'Q', 'WOLF', 'J', 'SQUIRREL', 'WILD', 'T'],
]
SUPER_PADDING_REELS = [
    ['WOLF', 'A', 'J', 'BEAR', 'SCATTER', 'FOX', 'K', 'RABBIT', 'WILD', 'Q', 'WOLF', 'A'],
    ['K', 'FOX', 'Q', 'J', 'SCATTER', 'BEAR', 'A', 'WOLF', 'T', 'FOX', 'RABBIT', 'K'],
    ['Q', 'A', 'WOLF', 'SCATTER', 'J', 'FOX', 'T', 'BEAR', 'K', 'WILD', 'RABBIT', 'Q'],
    ['J', 'BEAR', 'K', 'WOLF', 'SCATTER', 'WOLF', 'A', 'RABBIT', 'T', 'FOX', 'WILD', 'J'],
    ['T', 'FOX', 'A', 'K', 'SCATTER', 'WOLF', 'Q', 'WOLF', 'J', 'SQUIRREL', 'WILD', 'T'],
]

SAFE_SYMBOL_CYCLE = ['A', 'K', 'Q', 'J', 'T', 'SQUIRREL', 'RABBIT', 'BEAR', 'WOLF', 'FOX']


def clamp(n: int | float, min_value: int | float, max_value: int | float):
    return max(min_value, min(max_value, n))


def choice_weighted(entries: List[Tuple[object, int | float]]):
    total = sum(weight for _, weight in entries)
    roll = random.random() * total
    for value, weight in entries:
        roll -= weight
        if roll <= 0:
            return value
    return entries[-1][0]


def make_strip(symbol_weights, scatter_count=1, wild_count=2, length=50):
    strip = []
    weighted = list(symbol_weights.items())
    while len(strip) < length - scatter_count - wild_count:
        strip.append(choice_weighted(weighted))
    strip.extend([WILD] * wild_count)
    strip.extend([SCATTER] * scatter_count)
    random.shuffle(strip)
    return strip


def create_base_strips():
    weights = {
        'T': 10,
        'J': 9,
        'Q': 8,
        'K': 7,
        'A': 6,
        'SQUIRREL': 5,
        'RABBIT': 4,
        'BEAR': 3,
        'WOLF': 2,
        'FOX': 1,
    }
    return [make_strip(weights) for _ in range(5)]


def choose_all_in_profile() -> str:
    return choice_weighted(ALL_IN_PROFILE_WEIGHTS)


def _bonus_symbol_weights() -> dict[str, float]:
    return {
        'T': 10,
        'J': 9,
        'Q': 8,
        'K': 7,
        'A': 6,
        'SQUIRREL': 5,
        'RABBIT': 4,
        'BEAR': 3,
        'WOLF': 2,
        'FOX': 1,
    }


def _make_bonus_strip(selected_symbol: str, density_mult: float, mode: str, reel_index: int):
    weights = _bonus_symbol_weights()
    weights[selected_symbol] = max(0.35, weights[selected_symbol] * density_mult)
    length = 72 + (reel_index * 2)
    wild_count = 0 if mode in ('feature', 'superspin') else 1
    scatter_count = 0
    strip = []
    weighted = list(weights.items())
    while len(strip) < length - scatter_count - wild_count:
        strip.append(choice_weighted(weighted))
    strip.extend([WILD] * wild_count)
    random.shuffle(strip)
    return strip


def make_bonus_strip(selected_symbol: str, mode: str, reel_index: int):
    density_mult = DEAL_IT_DENSITY_MULT.get(mode, DEAL_IT_DENSITY_MULT['freegame'])
    return _make_bonus_strip(selected_symbol, density_mult, mode, reel_index)


def make_bonus_strip_with_density(selected_symbol: str, density_mult: float, mode: str, reel_index: int):
    return _make_bonus_strip(selected_symbol, density_mult, mode, reel_index)


def _next_multiplier_for_profile(current: int, spin_won: bool, expanded_won: bool, profile: str) -> int:
    del expanded_won, profile
    return current * 2 if spin_won else current


def spin_board(strips):
    board = []
    for strip in strips:
        stop = random.randrange(len(strip))
        reel = []
        for i in range(6):
            reel.append(strip[(stop + i) % len(strip)])
        board.append(reel)
    return board


def symbol_json(name: str):
    out = {'name': name}
    if name == WILD:
        out['wild'] = True
    if name == SCATTER:
        out['scatter'] = True
    return out


def board_json(board):
    return [[symbol_json(name) for name in reel] for reel in board]


def get_visible_name(board, reel: int, row: int) -> str:
    return board[reel][row + ROW_OFFSET]


def get_visible_positions_by_symbol(board, symbol: str):
    positions = []
    for reel in range(5):
        for row in range(4):
            if get_visible_name(board, reel, row) == symbol:
                positions.append({'reel': reel, 'row': row + ROW_OFFSET})
    return positions


def count_visible_scatters(board):
    count = 0
    positions = []
    for reel in range(5):
        for row in range(4):
            if get_visible_name(board, reel, row) == SCATTER:
                count += 1
                positions.append({'reel': reel, 'row': row + ROW_OFFSET})
    return {'count': count, 'positions': positions}


def evaluate_board(board, paytable=None):
    if paytable is None:
        paytable = PAYTABLE
    wins = []
    total_win_amount = 0
    for line_index, line in PAYLINES.items():
        best = None
        for symbol in PAY_SYMBOLS:
            positions = []
            count = 0
            for reel in range(5):
                row = line[reel]
                cell = get_visible_name(board, reel, row)
                if cell == SCATTER:
                    break
                if cell == symbol or cell == WILD:
                    count += 1
                    positions.append({'reel': reel, 'row': row + ROW_OFFSET})
                    continue
                break
            pay_x = paytable[symbol].get(count, 0)
            if pay_x <= 0:
                continue
            if best is None or pay_x > best['payX']:
                best = {'symbol': symbol, 'payX': pay_x, 'positions': positions, 'lineIndex': line_index}
        if best is not None:
            win = int(round(best['payX'] * 100))
            wins.append({
                'symbol': best['symbol'],
                'kind': len(best['positions']),
                'win': win,
                'positions': best['positions'],
                'meta': {
                    'lineIndex': best['lineIndex'],
                    'multiplier': 1,
                    'winWithoutMult': win,
                    'globalMult': 1,
                    'lineMultiplier': 1,
                },
            })
            total_win_amount += win
    return {'wins': wins, 'totalWinAmount': total_win_amount}


def expanded_board_for_symbol(board, symbol: str, reels: List[int]):
    clone = [list(reel) for reel in board]
    for reel in reels:
        for row in range(1, 5):
            clone[reel][row] = symbol
    return clone


def win_level_from_amount(amount: int):
    x = amount / 100.0
    if x <= 0:
        return 1
    if x < 2:
        return 2
    if x < 5:
        return 3
    if x < 10:
        return 4
    if x < 20:
        return 5
    if x < 50:
        return 6
    if x < 100:
        return 7
    if x < 200:
        return 8
    if x < 500:
        return 9
    return 10


def calc_padding_positions():
    base = 1 if random.randrange(2) == 0 else 2
    return [base, base + 2, base + 4, base + 6, base + 8]


def make_scatter_reveal_board(num_scatters: int):
    filler = ['A', 'K', 'Q', 'J', 'T']
    board = [[filler[reel % len(filler)]] * 6 for reel in range(5)]
    if num_scatters >= 4:
        scatter_cells = [(0, 0), (1, 2), (3, 1), (4, 3)]
    else:
        scatter_cells = [(0, 1), (2, 0), (4, 2)]
    for reel, visible_row in scatter_cells:
        board[reel][visible_row + ROW_OFFSET] = SCATTER
    positions = [{'reel': reel, 'row': visible_row + ROW_OFFSET} for reel, visible_row in scatter_cells]
    return board, positions


def _reel_count_win(board, selected_symbol: str):
    reels_with_symbol = sorted([
        reel for reel in range(5)
        if any(get_visible_name(board, reel, row) == selected_symbol for row in range(4))
    ])
    count = len(reels_with_symbol)
    if count < 3:
        return 0, [], []
    pay_x = PAYTABLE[selected_symbol].get(min(count, 5), 0)
    win_amount = int(round(pay_x * 20 * 100))
    positions = get_visible_positions_by_symbol(board, selected_symbol)
    return win_amount, reels_with_symbol, positions


def sanitize_bonus_board_for_expand(board, selected_symbol: str):
    clone = [list(reel) for reel in board]
    for attempt in range(40):
        other_wins = [win for win in evaluate_board(clone, PAYTABLE)['wins'] if win['symbol'] != selected_symbol]
        if not other_wins:
            return clone
        for win_index, win in enumerate(other_wins):
            for pos in reversed(win['positions']):
                reel = pos['reel']
                row = pos['row']
                if clone[reel][row] == selected_symbol:
                    continue
                replacement = SAFE_SYMBOL_CYCLE[(reel + row + attempt + win_index) % len(SAFE_SYMBOL_CYCLE)]
                if replacement == selected_symbol:
                    replacement = SAFE_SYMBOL_CYCLE[(reel + row + attempt + win_index + 1) % len(SAFE_SYMBOL_CYCLE)]
                clone[reel][row] = replacement
                break
    return clone


def apply_deal_it_spin(board, selected_symbol: str, mode: str = 'BONUS'):
    visible_positions = get_visible_positions_by_symbol(board, selected_symbol)
    symbol_win, winning_reels, win_positions = _reel_count_win(board, selected_symbol)
    did_expand = bool(winning_reels)

    if symbol_win > 0:
        other_wins = []
        other_total = 0
    else:
        other_eval = evaluate_board(board, PAYTABLE)
        other_wins = [win for win in other_eval['wins'] if win['symbol'] != selected_symbol]
        other_total = sum(win['win'] for win in other_wins)

    total_win = symbol_win + other_total
    combined_wins = other_wins[:]
    if symbol_win > 0:
        combined_wins.append({
            'symbol': selected_symbol,
            'kind': len(winning_reels),
            'win': symbol_win,
            'positions': win_positions,
            'meta': {'lineIndex': 0, 'multiplier': 1, 'winWithoutMult': symbol_win, 'globalMult': 1, 'lineMultiplier': 1},
        })

    final_amount = total_win
    temp_multiplier = None
    if final_amount > 0 and random.random() < 0.50:
        temp_multiplier = choice_weighted([
            (2, 40.0),
            (3, 27.0),
            (5, 18.0),
            (10, 9.0),
            (20, 4.0),
            (50, 1.5),
            (100, 0.5),
        ])
        final_amount = int(round(final_amount * temp_multiplier))

    return {
        'evalResult': {'wins': combined_wins, 'totalWinAmount': total_win},
        'expandedPositions': visible_positions,
        'expandedReels': winning_reels,
        'didExpand': did_expand,
        'tempMultiplier': temp_multiplier,
        'finalAmount': final_amount,
    }


def apply_all_in_spin(board, selected_symbol: str, global_multiplier: int, profile: str = 'warm'):
    visible_positions = get_visible_positions_by_symbol(board, selected_symbol)
    symbol_win, winning_reels, win_positions = _reel_count_win(board, selected_symbol)
    did_expand = bool(winning_reels)

    if symbol_win > 0:
        other_wins = []
        other_total = 0
    else:
        other_eval = evaluate_board(board, PAYTABLE)
        other_wins = [win for win in other_eval['wins'] if win['symbol'] != selected_symbol]
        other_total = sum(win['win'] for win in other_wins)

    total_win = symbol_win + other_total
    combined_wins = other_wins[:]
    if symbol_win > 0:
        combined_wins.append({
            'symbol': selected_symbol,
            'kind': len(winning_reels),
            'win': symbol_win,
            'positions': win_positions,
            'meta': {'lineIndex': 0, 'multiplier': global_multiplier, 'winWithoutMult': symbol_win, 'globalMult': global_multiplier, 'lineMultiplier': 1},
        })
    final_amount = int(round(total_win * global_multiplier)) if total_win > 0 else 0
    next_multiplier = _next_multiplier_for_profile(global_multiplier, total_win > 0, symbol_win > 0, profile)
    return {
        'evalResult': {'wins': combined_wins, 'totalWinAmount': total_win},
        'expandedPositions': visible_positions,
        'expandedReels': winning_reels,
        'didExpand': did_expand,
        'finalAmount': final_amount,
        'nextMultiplier': next_multiplier,
        'multiplierChanged': next_multiplier != global_multiplier,
        'profile': profile,
    }
