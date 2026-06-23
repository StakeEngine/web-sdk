"""Forest Gang lookup weighting."""

from __future__ import annotations

import json
import math
import os
from collections import defaultdict
from typing import Any

from math_targets import (
    BASE_CONTRIBUTIONS,
    BASE_RATES,
    BONUS_MODE_BUCKET_TARGETS,
    CHANCE_RATES,
    LOOKUP_SCALE,
    MODE_COSTS,
    MODE_TARGET_MEANS,
    TARGET_SCALES,
)


def _load_books(path: str) -> list[dict[str, Any]]:
    fields = {'id', 'payoutMultiplier', 'criteria'}
    books = []
    with open(path, 'r', encoding='utf-8') as file:
        for line in file:
            if not line.strip():
                continue
            raw = json.loads(line)
            books.append({key: raw[key] for key in fields if key in raw})
    return books


def _write_lookup(path: str, rows: list[tuple[int, int, int]]) -> None:
    with open(path, 'w', encoding='utf-8') as file:
        for book_id, weight, payout_multiplier in rows:
            file.write(f'{book_id},{weight},{payout_multiplier}\n')


def _normalize_to_total(weights: list[float], total: int) -> list[int]:
    if not weights:
        return []
    raw_total = sum(weights)
    if raw_total <= 0:
        return [1] * len(weights)
    scaled = [total * (weight / raw_total) for weight in weights]
    ints = [int(value) for value in scaled]
    remainder = total - sum(ints)
    order = sorted(range(len(weights)), key=lambda idx: scaled[idx] - ints[idx], reverse=True)
    for idx in order[:remainder]:
        ints[idx] += 1
    return ints


def _solve_alpha(values: list[float], target_mean: float, scale: float) -> float:
    if not values:
        return 0.0
    raw_mean = sum(values) / len(values)
    if target_mean <= 0 or target_mean >= raw_mean:
        return 0.0

    def _mean(alpha: float) -> float:
        weights = [math.exp(-alpha * (value / scale)) for value in values]
        total_weight = sum(weights)
        return sum(value * weight for value, weight in zip(values, weights)) / max(total_weight, 1e-9)

    lo, hi = 0.0, 20.0
    while _mean(hi) > target_mean and hi < 200:
        hi *= 2.0
    for _ in range(80):
        mid = (lo + hi) / 2
        if _mean(mid) > target_mean:
            lo = mid
        else:
            hi = mid
    return hi


def _weights_for_target_mean(values: list[float], target_mean: float, scale: float) -> list[float]:
    if not values:
        return []
    raw_mean = sum(values) / len(values)
    if target_mean <= 0 or target_mean >= raw_mean:
        return [1.0 for _ in values]
    if target_mean <= min(values):
        min_value = min(values)
        return [1.0 if value == min_value else 1e-9 for value in values]
    alpha = _solve_alpha(values, target_mean, scale)
    return [math.exp(-alpha * (value / scale)) for value in values]


def _build_rows_for_target_mean(
    books: list[dict[str, Any]],
    target_mean: float,
    total_weight: int,
    scale: float,
) -> list[tuple[int, int, int]]:
    values = [book['payoutMultiplier'] / 100.0 for book in books]
    float_weights = _weights_for_target_mean(values, target_mean, scale)
    int_weights = _normalize_to_total(float_weights, total_weight)
    return [(book['id'], weight, int(book['payoutMultiplier'])) for book, weight in zip(books, int_weights)]


def _weighted_avg_x(books: list[dict[str, Any]], rows: list[tuple[int, int, int]]) -> float:
    weights = {book_id: weight for book_id, weight, _ in rows}
    total_weight = sum(weights.values()) or 1
    return sum((book['payoutMultiplier'] / 100.0) * weights.get(book['id'], 0) for book in books) / total_weight


def _weighted_hit_rate(books: list[dict[str, Any]], rows: list[tuple[int, int, int]]) -> float:
    weights = {book_id: weight for book_id, weight, _ in rows}
    total_weight = sum(weights.values()) or 1
    return sum(weights.get(book['id'], 0) for book in books if book['payoutMultiplier'] > 0) / total_weight


def _ensure_max_win_reachable(rows: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    if not rows:
        return rows
    result = list(rows)
    max_pm = max(pm for _, _, pm in result)
    if any(weight > 0 for _, weight, pm in result if pm == max_pm):
        return result
    max_idx = next(idx for idx, (_, _, pm) in enumerate(result) if pm == max_pm)
    donor_idx = max(
        (idx for idx, (_, weight, pm) in enumerate(result) if pm == 0 and weight > 1),
        key=lambda idx: result[idx][1],
        default=None,
    )
    if donor_idx is not None:
        donor_id, donor_weight, donor_pm = result[donor_idx]
        result[donor_idx] = (donor_id, donor_weight - 1, donor_pm)
    book_id, _, pm = result[max_idx]
    result[max_idx] = (book_id, 1, pm)
    return result


def _merge_rows(*row_groups: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    merged: list[tuple[int, int, int]] = []
    for group in row_groups:
        merged.extend(group)
    merged.sort(key=lambda row: row[0])
    return merged


def _group_by_criteria(books: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for book in books:
        grouped[str(book['criteria'])].append(book)
    return grouped


def _build_base_mode_lookup(books: list[dict[str, Any]], rates: dict[str, float], total_target_mean: float, q_basegame: float | None = None) -> tuple[list[tuple[int, int, int]], dict[str, float]]:
    grouped = _group_by_criteria(books)
    feature_rows = _build_rows_for_target_mean(grouped['feature'], MODE_TARGET_MEANS['FEATURE'], int(round(LOOKUP_SCALE * rates['feature'])), TARGET_SCALES['feature'])
    dealit_rows = _build_rows_for_target_mean(grouped['dealit'], BASE_CONTRIBUTIONS['dealit'] / BASE_RATES['dealit'], int(round(LOOKUP_SCALE * rates['dealit'])), TARGET_SCALES['dealit'])
    allin_rows = _build_rows_for_target_mean(grouped['allin'], BASE_CONTRIBUTIONS['allin'] / BASE_RATES['allin'], int(round(LOOKUP_SCALE * rates['allin'])), TARGET_SCALES['allin'])

    feature_hit = _weighted_hit_rate(grouped['feature'], feature_rows)
    dealit_hit = _weighted_hit_rate(grouped['dealit'], dealit_rows)
    allin_hit = _weighted_hit_rate(grouped['allin'], allin_rows)
    if q_basegame is None:
        q_basegame = 0.24 - (
            rates['feature'] * feature_hit
            + rates['dealit'] * dealit_hit
            + rates['allin'] * allin_hit
        )
    q_basegame = max(0.15, min(0.26, q_basegame))
    q_zero = 1.0 - q_basegame - rates['feature'] - rates['dealit'] - rates['allin']

    trigger_contribution = (
        rates['feature'] * _weighted_avg_x(grouped['feature'], feature_rows)
        + rates['dealit'] * _weighted_avg_x(grouped['dealit'], dealit_rows)
        + rates['allin'] * _weighted_avg_x(grouped['allin'], allin_rows)
    )
    basegame_target_mean = max(0.0, (total_target_mean - trigger_contribution) / q_basegame)
    basegame_rows = _build_rows_for_target_mean(grouped['basegame'], basegame_target_mean, int(round(LOOKUP_SCALE * q_basegame)), TARGET_SCALES['basegame'])
    zero_rows = _build_rows_for_target_mean(grouped['0'], 0.0, LOOKUP_SCALE - int(round(LOOKUP_SCALE * q_basegame)) - int(round(LOOKUP_SCALE * rates['feature'])) - int(round(LOOKUP_SCALE * rates['dealit'])) - int(round(LOOKUP_SCALE * rates['allin'])), TARGET_SCALES['basegame'])

    rows = _merge_rows(zero_rows, basegame_rows, feature_rows, dealit_rows, allin_rows)
    rows = _ensure_max_win_reachable(rows)
    return rows, {
        'q_basegame': q_basegame,
        'basegame_target_mean': basegame_target_mean,
        'feature_hit': feature_hit,
        'dealit_hit': dealit_hit,
        'allin_hit': allin_hit,
    }


def _build_bonus_buy_lookup(books: list[dict[str, Any]]) -> list[tuple[int, int, int]]:
    rows = _build_rows_for_target_mean(books, MODE_TARGET_MEANS['BONUS'], LOOKUP_SCALE, TARGET_SCALES['bonus'])
    weights = {book_id: weight for book_id, weight, _ in rows}
    super_ids = [book['id'] for book in books if str(book['criteria']) == 'super']
    if super_ids and not any(weights.get(book_id, 0) > 0 for book_id in super_ids):
        super_book_id = super_ids[0]
        donor_idx = max(
            (idx for idx, (_, weight, pm) in enumerate(rows) if pm == 0 and weight > 1),
            key=lambda idx: rows[idx][1],
            default=None,
        )
        if donor_idx is not None:
            donor_id, donor_weight, donor_pm = rows[donor_idx]
            rows[donor_idx] = (donor_id, donor_weight - 1, donor_pm)
        for idx, (book_id, weight, pm) in enumerate(rows):
            if book_id == super_book_id:
                rows[idx] = (book_id, max(1, weight), pm)
                break
    return _ensure_max_win_reachable(rows)


def weight_all_lookups(library_path: str) -> dict[str, float]:
    books_path = os.path.join(library_path, 'books')
    lookup_path = os.path.join(library_path, 'lookup_tables')
    publish_path = os.path.join(library_path, 'publish_files')

    books = {
        mode: _load_books(os.path.join(books_path, f'books_{mode}.jsonl'))
        for mode in MODE_COSTS
    }

    base_rows, base_meta = _build_base_mode_lookup(books['BASE'], BASE_RATES, MODE_TARGET_MEANS['BASE'])
    chance_rows, _ = _build_base_mode_lookup(books['CHANCE'], CHANCE_RATES, MODE_TARGET_MEANS['CHANCE'], q_basegame=base_meta['q_basegame'])

    lookups = {
        'BASE': base_rows,
        'BONUS': _build_bonus_buy_lookup(books['BONUS']),
        'SUPER': _ensure_max_win_reachable(_build_rows_for_target_mean(books['SUPER'], MODE_TARGET_MEANS['SUPER'], LOOKUP_SCALE, TARGET_SCALES['super_mode'])),
        'FEATURE': _ensure_max_win_reachable(_build_rows_for_target_mean(books['FEATURE'], MODE_TARGET_MEANS['FEATURE'], LOOKUP_SCALE, TARGET_SCALES['feature'])),
        'CHANCE': chance_rows,
    }

    for mode, rows in lookups.items():
        _write_lookup(os.path.join(lookup_path, f'lookUpTable_{mode}.csv'), rows)
        _write_lookup(os.path.join(publish_path, f'lookUpTable_{mode}_0.csv'), rows)

    weighted_rtps: dict[str, float] = {}
    for mode, rows in lookups.items():
        weighted_rtps[mode] = _weighted_avg_x(books[mode], rows) / MODE_COSTS[mode]
    return weighted_rtps
