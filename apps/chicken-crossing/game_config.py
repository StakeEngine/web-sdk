"""Configuration for the chicken crossing game."""

from src.config.config import Config
from src.config.distributions import Distribution
from src.config.config import BetMode


class GameConfig(Config):
    """Game configuration for a non-slot, lane-based 50/50 game."""

    def __init__(self):
        super().__init__()
        self.game_id = "chicken_crossing"
        self.provider_number = 0
        self.working_name = "chicken_crossing"
        self.game_name = "Chicken Crossing"

        # Game parameters
        self.num_lanes = 5
        self.lane_win_prob = 0.5
        self.lane_multiplier = 2.0
        self.starting_multiplier = 1.0

        self.wincap = round(self.lane_multiplier ** self.num_lanes, 2)
        expected_rtp = (self.lane_win_prob * self.lane_multiplier) ** self.num_lanes
        self.rtp = expected_rtp if expected_rtp < 1.0 else 0.99
        self.win_type = "other"
        self.construct_paths()

        # Game dimensions (not a reel-based game)
        self.num_reels = 0
        self.num_rows = [0] * self.num_reels
        self.paytable = {}
        self.include_padding = False
        self.special_symbols = {"wild": [], "scatter": [], "multiplier": []}

        self.freespin_triggers = {self.basegame_type: {}, self.freegame_type: {}}
        self.anticipation_triggers = {self.basegame_type: 0, self.freegame_type: 0}

        self.bet_modes = [
            BetMode(
                name="base",
                cost=1.0,
                rtp=self.rtp,
                max_win=self.wincap,
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=[
                    Distribution(
                        criteria="basegame",
                        quota=1.0,
                        conditions={
                            "reel_weights": {},
                            "force_wincap": False,
                            "force_freegame": False,
                        },
                    ),
                ],
            ),
        ]
