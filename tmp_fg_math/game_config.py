"""Forest Gang math-sdk config."""

from src.config.betmode import BetMode
from src.config.config import Config
from src.config.distributions import Distribution

from forest_math import BASE_PADDING_REELS, FREEGAME_PADDING_REELS, PAYLINES, PAYTABLE, SUPER_PADDING_REELS
from math_targets import BASE_RATES, CHANCE_RATES, TARGET_RTP


class GameConfig(Config):
    def __init__(self):
        super().__init__()
        self.game_id = '0_0_forest_gang'
        self.provider_number = 0
        self.provider_name = 'sample_provider'
        self.game_name = 'forest_gang'
        self.working_name = 'Forest Gang'
        self.output_regular_json = False
        self.wincap = 25000.0
        self.win_type = 'lines'
        self.rtp = TARGET_RTP
        self.construct_paths()

        self.num_reels = 5
        self.num_rows = [4] * self.num_reels
        self.paytable = {(kind, sym): pay for sym, table in PAYTABLE.items() for kind, pay in table.items()}
        self.special_symbols = {'wild': ['WILD'], 'scatter': ['SCATTER']}
        self.paylines = PAYLINES
        self.include_padding = True
        self.superspin_type = 'superspin'
        self.feature_type = 'feature'
        self.padding_reels = {
            self.basegame_type: BASE_PADDING_REELS,
            self.freegame_type: FREEGAME_PADDING_REELS,
            self.superspin_type: SUPER_PADDING_REELS,
            self.feature_type: FREEGAME_PADDING_REELS,
        }
        self.freespin_triggers = {self.basegame_type: {3: 10, 4: 10, 5: 10}}
        self.anticipation_triggers = {self.basegame_type: 2}

        empty_conditions = {'reel_weights': {self.basegame_type: {'FG': 1}}}
        self.bet_modes = [
            BetMode(
                name='BASE',
                cost=1.0,
                rtp=self.rtp,
                max_win=self.wincap,
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=[
                    Distribution(criteria='0', quota=1.0 - 0.22575 - BASE_RATES['feature'] - BASE_RATES['dealit'] - BASE_RATES['allin'], conditions=empty_conditions.copy()),
                    Distribution(criteria='basegame', quota=0.22575, conditions=empty_conditions.copy()),
                    Distribution(criteria='dealit', quota=BASE_RATES['dealit'], conditions={**empty_conditions, 'force_freegame': True}),
                    Distribution(criteria='allin', quota=BASE_RATES['allin'], conditions={**empty_conditions, 'force_freegame': True}),
                    Distribution(criteria='feature', quota=BASE_RATES['feature'], conditions={**empty_conditions, 'force_freegame': True}),
                ],
            ),
            BetMode(
                name='BONUS',
                cost=100.0,
                rtp=self.rtp,
                max_win=self.wincap,
                auto_close_disabled=False,
                is_feature=False,
                is_buybonus=True,
                distributions=[
                    Distribution(criteria='bonus', quota=0.97, conditions={**empty_conditions, 'force_freegame': True}),
                    Distribution(criteria='super', quota=0.03, conditions={**empty_conditions, 'force_freegame': True}),
                ],
            ),
            BetMode(
                name='SUPER',
                cost=400.0,
                rtp=self.rtp,
                max_win=self.wincap,
                auto_close_disabled=False,
                is_feature=False,
                is_buybonus=True,
                distributions=[
                    Distribution(criteria='super', quota=1.0, conditions={**empty_conditions, 'force_freegame': True}),
                ],
            ),
            BetMode(
                name='FEATURE',
                cost=20.0,
                rtp=self.rtp,
                max_win=self.wincap,
                auto_close_disabled=False,
                is_feature=False,
                is_buybonus=True,
                distributions=[
                    Distribution(criteria='feature', quota=1.0, conditions={**empty_conditions, 'force_freegame': True}),
                ],
            ),
            BetMode(
                name='CHANCE',
                cost=2.0,
                rtp=self.rtp,
                max_win=self.wincap,
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=[
                    Distribution(criteria='0', quota=1.0 - 0.22575 - CHANCE_RATES['feature'] - CHANCE_RATES['dealit'] - CHANCE_RATES['allin'], conditions=empty_conditions.copy()),
                    Distribution(criteria='basegame', quota=0.22575, conditions=empty_conditions.copy()),
                    Distribution(criteria='dealit', quota=CHANCE_RATES['dealit'], conditions={**empty_conditions, 'force_freegame': True}),
                    Distribution(criteria='allin', quota=CHANCE_RATES['allin'], conditions={**empty_conditions, 'force_freegame': True}),
                    Distribution(criteria='feature', quota=CHANCE_RATES['feature'], conditions={**empty_conditions, 'force_freegame': True}),
                ],
            ),
        ]
