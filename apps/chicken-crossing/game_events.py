from src.events.event_constants import EventConstants


def crossing_start_event(gamestate):
    event = {
        "index": len(gamestate.book.events),
        "type": EventConstants.CROSSING_START.value,
        "totalLanes": int(gamestate.config.num_lanes),
        "laneWinProbability": float(gamestate.config.lane_win_prob),
        "laneMultiplier": float(gamestate.config.lane_multiplier),
        "startingMultiplier": int(round(gamestate.config.starting_multiplier * 100, 0)),
    }
    gamestate.book.add_event(event)


def lane_result_event(gamestate, lane_index: int, success: bool, multiplier: float):
    event = {
        "index": len(gamestate.book.events),
        "type": EventConstants.LANE_RESULT.value,
        "laneIndex": int(lane_index),
        "success": bool(success),
        "multiplier": int(round(multiplier * 100, 0)),
    }
    gamestate.book.add_event(event)


def crossing_summary_event(gamestate, lanes_cleared: int, final_multiplier: float):
    event = {
        "index": len(gamestate.book.events),
        "type": EventConstants.CROSSING_SUMMARY.value,
        "lanesCleared": int(lanes_cleared),
        "finalMultiplier": int(round(final_multiplier * 100, 0)),
    }
    gamestate.book.add_event(event)
