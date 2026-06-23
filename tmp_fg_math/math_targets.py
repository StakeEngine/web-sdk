"""Shared Forest Gang math targets."""

from __future__ import annotations

TARGET_RTP = 0.961
TARGET_BASE_HIT_RATE = 0.24
TARGET_BASE_STD_RANGE = (16.0, 20.0)
LOOKUP_SCALE = 10_000_000

MODE_COSTS = {
    'BASE': 1.0,
    'BONUS': 100.0,
    'SUPER': 400.0,
    'FEATURE': 20.0,
    'CHANCE': 2.0,
}

MODE_TARGET_MEANS = {
    mode: TARGET_RTP * cost
    for mode, cost in MODE_COSTS.items()
}

BASE_RATES = {
    'feature': 0.010000,
    'dealit': 0.004000,
    'allin': 0.000250,
}

CHANCE_RATES = {
    'feature': 0.010000,
    'dealit': 0.012000,
    'allin': 0.000750,
}

BASE_CONTRIBUTIONS = {
    'non_bonus': 0.4805,
    'bonus': 0.4805,
    'feature': 0.1922,
    'line': 0.2883,
    'dealit': 0.4355,
    'allin': 0.0450,
}

BONUS_MODE_BUCKET_TARGETS = {
    'bonus': (MODE_TARGET_MEANS['BONUS'] - (0.03 * 360.0)) / 0.97,
    'super': 360.0,
}

TARGET_SCALES = {
    'basegame': 8.0,
    'feature': 24.0,
    'dealit': 70.0,
    'allin': 120.0,
    'bonus': 70.0,
    'bonus_super': 140.0,
    'super_mode': 180.0,
}
