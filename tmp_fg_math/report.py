"""Forest Gang book/report helpers."""

from __future__ import annotations

import json
import os
from typing import Any

from math_targets import MODE_COSTS, TARGET_BASE_HIT_RATE, TARGET_RTP


def _load_lookup(path: str) -> dict[int, int]:
    weights: dict[int, int] = {}
    with open(path, 'r', encoding='utf-8') as file:
        for line in file:
            if not line.strip():
                continue
            book_id, weight, _payout = line.strip().split(',')
            weights[int(book_id)] = int(weight)
    return weights


def _load_books(path: str) -> list[dict[str, Any]]:
    with open(path, 'r', encoding='utf-8') as file:
        return [json.loads(line) for line in file if line.strip()]


def _event_count(book: dict[str, Any], event_type: str) -> int:
    return sum(1 for event in book['events'] if event.get('type') == event_type)


def _weighted_quantiles(rows: list[dict[str, Any]], weights: dict[int, int], quantiles: list[float]) -> dict[str, float]:
    total_weight = sum(weights.values()) or 1
    sorted_rows = sorted(rows, key=lambda row: row['payoutMultiplier'])
    results: dict[str, float] = {}
    cumulative = 0.0
    qi = 0
    for row in sorted_rows:
        cumulative += weights.get(row['id'], 0) / total_weight
        while qi < len(quantiles) and cumulative >= quantiles[qi]:
            results[f'p{int(quantiles[qi] * 100)}'] = row['payoutMultiplier'] / 100
            qi += 1
        if qi >= len(quantiles):
            break
    for quantile in quantiles[qi:]:
        results[f'p{int(quantile * 100)}'] = sorted_rows[-1]['payoutMultiplier'] / 100 if sorted_rows else 0.0
    return results


def _super_profile_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    profile_data: dict[str, list[float]] = {}
    for row in rows:
        profile = 'unknown'
        for event in row.get('events', []):
            if event.get('type') == 'bonusSymbolSelected':
                profile = event.get('profile', 'unknown')
                break
        payout = row['payoutMultiplier'] / 100
        profile_data.setdefault(profile, []).append(payout)

    stats: dict[str, Any] = {}
    total = sum(len(values) for values in profile_data.values()) or 1
    for profile, payouts in sorted(profile_data.items()):
        stats[profile] = {
            'count': len(payouts),
            'fraction': round(len(payouts) / total, 4),
            'avg_payout': round(sum(payouts) / max(len(payouts), 1), 2),
            'hit_rate': round(sum(1 for payout in payouts if payout > 0) / max(len(payouts), 1), 4),
            'max_payout': max(payouts) if payouts else 0.0,
        }
    return stats


def build_report(library_path: str, mode_costs: dict[str, float]) -> dict[str, Any]:
    books_path = os.path.join(library_path, 'books')
    publish_path = os.path.join(library_path, 'publish_files')
    report: dict[str, Any] = {'modes': {}, 'summary': {}}
    quantiles = [0.50, 0.75, 0.90, 0.95, 0.99, 0.999]

    for mode, cost in mode_costs.items():
        rows = _load_books(os.path.join(books_path, f'books_{mode}.jsonl'))
        lookup_weights = _load_lookup(os.path.join(publish_path, f'lookUpTable_{mode}_0.csv'))
        total_weight = sum(lookup_weights.values()) or 1
        payouts = [row['payoutMultiplier'] / 100 for row in rows]
        weighted_avg_x = sum((row['payoutMultiplier'] / 100) * lookup_weights.get(row['id'], 0) for row in rows) / total_weight
        hit_rate = sum(lookup_weights.get(row['id'], 0) for row in rows if row['payoutMultiplier'] > 0) / total_weight
        trigger_rate = sum(lookup_weights.get(row['id'], 0) for row in rows if _event_count(row, 'freeSpinTrigger') > 0) / total_weight
        mode_report: dict[str, Any] = {
            'rows': len(rows),
            'avg_x': weighted_avg_x if rows else 0.0,
            'rtp': (weighted_avg_x / cost) if rows else 0.0,
            'hit_rate': hit_rate if rows else 0.0,
            'trigger_rate': trigger_rate if rows else 0.0,
            'max_x_observed': max(payouts) if rows else 0.0,
            'quantiles': _weighted_quantiles(rows, lookup_weights, quantiles) if rows else {},
        }
        if mode == 'SUPER':
            mode_report['profile_breakdown'] = _super_profile_stats(rows)
        report['modes'][mode] = mode_report

    base = report['modes'].get('BASE', {})
    report['summary'] = {
        'target_rtp': TARGET_RTP,
        'target_hit_rate': TARGET_BASE_HIT_RATE,
        'mode_costs': MODE_COSTS,
        'base_rtp_delta': base.get('rtp', 0.0) - TARGET_RTP,
        'base_hit_rate_delta': base.get('hit_rate', 0.0) - TARGET_BASE_HIT_RATE,
    }
    return report


def write_report(library_path: str, mode_costs: dict[str, float]) -> str:
    report = build_report(library_path, mode_costs)
    output_path = os.path.join(library_path, 'configs', 'simulation_report.json')
    with open(output_path, 'w', encoding='utf-8') as file:
        json.dump(report, file, indent=2)
    return output_path
