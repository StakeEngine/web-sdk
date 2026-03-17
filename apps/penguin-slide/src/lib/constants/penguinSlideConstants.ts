export const SPAWN_DELAY_STEP = 0.1;
export const NORMAL_PICKUP_DESTROY_DELAY_MS = 280;
export const GOAL_PICKUP_DESTROY_DELAY_MS = 320;
export const LIFERING_PICKUP_DESTROY_DELAY_MS = 220;

export const LEFT_SPAWN_OFFSETS = [-0.76, -0.52, -0.3];
export const RIGHT_SPAWN_OFFSETS = [0.3, 0.52, 0.76];
export const LEFT_MISS_SPAWN_OFFSETS = [-1, -0.9, -0.78];
export const RIGHT_MISS_SPAWN_OFFSETS = [0.78, 0.9, 1];
export const LEFT_LANE_SLOTS = [0, 1, 2, 3] as const;
export const RIGHT_LANE_SLOTS = [4, 5, 6, 7] as const;
export const SLOT_TO_OFFSET: Record<number, number> = {
	0: -0.86,
	1: -0.66,
	2: -0.44,
	3: -0.24,
	4: 0.24,
	5: 0.44,
	6: 0.66,
	7: 0.86
};
export const SPAWN_OFFSET_JITTER = 0.05;
export const MIN_SPAWN_OFFSET = 0.24;
export const PICKUP_SCALE_BOOST = 4.1;
export const LANE_MAP: Record<string, number> = { LEFT: -1, RIGHT: 1 };
export const OUTER_LANE_OFFSET = Math.max(
	1,
	...LEFT_SPAWN_OFFSETS.map((offset) => Math.abs(offset)),
	...RIGHT_SPAWN_OFFSETS.map((offset) => Math.abs(offset))
);
export const PENGUIN_LANE_RANGE = OUTER_LANE_OFFSET + 0.24;
export const PENGUIN_LANE_SIDE_PAD = 0.2;

export const WOBBLE_INTENSITY = 5;
export const PICKUP_LOOKAHEAD_EXTRA_STEPS = 0.025;
export const PICKUP_TRAVEL_SPEED = 3.4;
export const PICKUP_TOP_ENTRY_BUFFER_STEPS = 0.08;
export const PICKUP_STEP_PACE_MULTIPLIER = 2.2;
export const PICKUP_Y_SPACING_EXPONENT = 2.3;
export const PREVIOUS_STEP_SLIP_EXTRA_LEAD_STEPS = 0.46;
export const FIRST_STEP_SINKING_EXTRA_LEAD_STEPS = 0.22;
export const SLIP_TRIGGER_DELAY_STEPS = 0.5;
export const GOAL_CENTER_LOCK_EARLY_LEAD_STEPS = 0.34;

export const PENGUIN_LANE_BASE_FOLLOW_RATE = 2.2;
export const PENGUIN_LANE_DISTANCE_FOLLOW_RATE = 4;
export const PENGUIN_LANE_CENTER_LOCK_RATE_MULT = 1.9;
export const PENGUIN_LANE_MAX_SPEED = 5.2;
export const PENGUIN_LANE_MAX_SPEED_CENTER_LOCK = 6.4;
export const PENGUIN_MOTION_STEP_DT_MAX = 1 / 45;
export const TARGET_LOCK_HYSTERESIS_MS = 130;
export const PICKUP_CENTER_LOCK_LEAD_STEPS = 0.1;
export const PICKUP_CENTER_LOCK_BUFFER_STEPS = 0.08;

export const PENGUIN_SLIDE_TIME_SCALE = 0.9;
export const SLIP_SIDE_MOVEMENT_SPEED_MULT = 0.65;
export const SLIP_ANIMATION_SPEED_MULT = 0.8;
export const SLIP_ANIMATION_DURATION_MULT = 1 / SLIP_SIDE_MOVEMENT_SPEED_MULT;
export const SLIP_PRE_DRIFT_DURATION_MULT = 1.2;
export const SLIP_EDGE_ALIGN_MIN_DELTA = 0.08;
export const SLIP_EDGE_ALIGN_MIN_DURATION_MS = 140;
export const SLIP_EDGE_ALIGN_MAX_DURATION_MS = 480;
export const SLIP_EDGE_ALIGN_SPEED = 3;
export const SLIP_EDGE_ALIGN_CENTER_SLOW_MULT = 0.45;
export const SLIP_EDGE_ALIGN_LIFT_FRAC = 0.012;

export const DISABLE_PENGUIN_SLIDE_MOTION = false;
export const DEBUG_GAME_SPEED_MULT = 1;
export const PRE_STEP_SWEEP_PERIOD_STEPS = 3.6;
export const PRE_STEP_SWEEP_INSET = 0.24;
export const PRE_STEP_OPENING_FREE_ROAM_STEPS = 2.5;
export const PRE_STEP_SINGLE_SWEEP_MIN_STEPS = 0.7;
export const PRE_STEP_SINGLE_SWEEP_BASE_STEPS = 1.5;
export const PRE_STEP_FIRST_LOCK_LEAD_STEPS = 0.62;
export const PRE_STEP_HANDOFF_STEPS = 0.34;

export const accumulatedStrokeWidth = 12;
export const betOptions = [0.5, 1, 2.5, 5, 10, 25, 50];

export const ICE_PIECES_PER_SIDE = 4;
export const ICE_SPAWN_Y_DOWN_FRAC = 0.07;
export const ICE_SPAWN_X_JITTER_FRAC = 0.015;
export const ICE_SPAWN_LEFT_COUNT = 4;
export const ICE_SPAWN_RIGHT_COUNT = 4;
export const ICE_VISIBLE_START = 4;
export const ICE_RESPAWN_GAP_FRAC = 0;
