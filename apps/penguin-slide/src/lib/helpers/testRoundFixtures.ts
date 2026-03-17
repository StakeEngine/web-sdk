export const FORCE_TEST_ROUND = false;

export const FORCED_TEST_ROUND_STATE = [
    {
        "index": 0,
        "landedStep": "RIGHT",
        "steps": {
            "LEFT": {
                "stepType": "ICE",
                "item": "+2",
                "sinking": false
            },
            "RIGHT": {
                "stepType": "ICE",
                "item": "+1",
                "sinking": true
            }
        },
        "accumulatedWinAmount": 0,
        "winAmount": 0,
        "lifeVests": 0,
        "bananaCount": 0,
			success: false,
			applies: true,
			terminal: true
    },
    {
        "index": 1,
        "landedStep": "LEFT",
        "steps": {
            "LEFT": {
                "stepType": "ICE",
                "item": "+2",
                "sinking": false
            },
            "RIGHT": {
                "stepType": "ICE",
                "item": "NOTHING",
                "sinking": false
            }
        },
        "accumulatedWinAmount": 200,
        "winAmount": 200,
        "lifeVests": 0,
        "bananaCount": 0,
        "success": true,
        "applies": true,
        "terminal": false
    },
    {
        "index": 2,
        "landedStep": "RIGHT",
        "steps": {
            "LEFT": {
                "stepType": "ICE",
                "item": "NOTHING",
                "sinking": false
            },
            "RIGHT": {
                "stepType": "ICE",
                "item": "+2",
                "sinking": false
            }
        },
        "accumulatedWinAmount": 400,
        "winAmount": 200,
        "lifeVests": 0,
        "bananaCount": 0,
        "success": true,
        "applies": true
    },
    {
        "index": 3,
        "landedStep": "RIGHT",
        "steps": {
            "RIGHT": {
                "stepType": "ICE",
                "item": "GOAL",
                "sinking": false
            },
            "LEFT": {
                "stepType": "ICE",
                "item": "NOTHING",
                "sinking": false
            }
        },
        "accumulatedWinAmount": 400,
        "winAmount": 0,
        "lifeVests": 0,
        "bananaCount": 0,
        "success": true,
        "applies": true,
        "finish": true
    },
    {
        "index": 4,
        "landedStep": "LEFT",
        "steps": {
            "LEFT": {
                "stepType": "ICE",
                "item": "NOTHING",
                "sinking": false
            },
            "RIGHT": {
                "stepType": "ICE",
                "item": "BANANA",
                "sinking": false
            }
        },
        "accumulatedWinAmount": 400,
        "winAmount": 0,
        "lifeVests": 0,
        "bananaCount": 0,
        "success": false,
        "applies": false
    },
    {
        "index": 5,
        "landedStep": "RIGHT",
        "steps": {
            "LEFT": {
                "stepType": "ICE",
                "item": "+3",
                "sinking": false
            },
            "RIGHT": {
                "stepType": "ICE",
                "item": "NOTHING",
                "sinking": false
            }
        },
        "accumulatedWinAmount": 400,
        "winAmount": 0,
        "lifeVests": 0,
        "bananaCount": 0,
        "success": false,
        "applies": false
    },
    {
        "index": 6,
        "landedStep": "RIGHT",
        "steps": {
            "LEFT": {
                "stepType": "ICE",
                "item": "NOTHING",
                "sinking": false
            },
            "RIGHT": {
                "stepType": "ICE",
                "item": "+2",
                "sinking": false
            }
        },
        "accumulatedWinAmount": 400,
        "winAmount": 0,
        "lifeVests": 0,
        "bananaCount": 0,
        "success": false,
        "applies": false
    },
    {
        "index": 7,
        "landedStep": "LEFT",
        "steps": {
            "LEFT": {
                "stepType": "ICE",
                "item": "+5",
                "sinking": false
            },
            "RIGHT": {
                "stepType": "ICE",
                "item": "NOTHING",
                "sinking": false
            }
        },
        "accumulatedWinAmount": 400,
        "winAmount": 0,
        "lifeVests": 0,
        "bananaCount": 0,
        "success": false,
        "applies": false
    },
    {
        "index": 8,
        "landedStep": "RIGHT",
        "steps": {
            "LEFT": {
                "stepType": "ICE",
                "item": "+1",
                "sinking": false
            },
            "RIGHT": {
                "stepType": "ICE",
                "item": "NOTHING",
                "sinking": false
            }
        },
        "accumulatedWinAmount": 400,
        "winAmount": 0,
        "lifeVests": 0,
        "bananaCount": 0,
        "success": false,
        "applies": false
    },
    {
        "index": 9,
        "type": "setWin",
        "amount": 400,
        "winLevel": 1
    },
    {
        "index": 10,
        "type": "setTotalWin",
        "amount": 400
    },
    {
        "index": 11,
        "type": "finalWin",
        "amount": 400
    }
];

export function buildSimulatedLossEvents(stakeAmount: number) {
	const startValue = Math.round(stakeAmount * 100);
	return [
		{
			stepIndex: 0,
			landedStep: 'LEFT',
			steps: {
				LEFT: { item: 'BANANA', sinking: true },
				RIGHT: { item: 'NOTHING', sinking: false }
			},
			accumulatedWinAmount: 0,
			winAmount: -startValue,
			lifeVests: 0,
			success: false,
			applies: true,
			terminal: true
		},
		{ type: 'finish', totalSteps: 1, totalWinAmount: 0, betAmount: startValue, multiplier: 0, success: false }
	];
}
