export default {
	providerName: 'sample_provider',
	gameName: 'sample_lines',
	gameID: '0_0_cluster',
	rtp: 0.97,
	numReels: 7,
	numRows: [7, 7, 7, 7, 7, 7, 7],
	betModes: {
		base: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.97,
			max_win: 5000.0,
		},
		bonus: {
			cost: 500,
			feature: true,
			buyBonus: false,
			rtp: 0.97,
			max_win: 5000.0,
		},
	},
	symbols: {
		W: {
			paytable: null,
			special_properties: ['wild', 'multiplier'],
		},
		L4: {
			paytable: [
				{
					'5': 0.1,
				},
				{
					'6': 0.5,
				},
				{
					'7': 0.5,
				},
				{
					'8': 0.5,
				},
				{
					'9': 1.5,
				},
				{
					'10': 1.5,
				},
				{
					'11': 1.5,
				},
				{
					'12': 1.5,
				},
				{
					'13': 4.0,
				},
				{
					'14': 4.0,
				},
				{
					'15': 4.0,
				},
				{
					'16': 4.0,
				},
				{
					'17': 4.0,
				},
				{
					'18': 4.0,
				},
				{
					'19': 4.0,
				},
				{
					'20': 4.0,
				},
				{
					'21': 4.0,
				},
				{
					'22': 4.0,
				},
				{
					'23': 4.0,
				},
				{
					'24': 4.0,
				},
				{
					'25': 4.0,
				},
				{
					'26': 4.0,
				},
				{
					'27': 4.0,
				},
				{
					'28': 4.0,
				},
				{
					'29': 4.0,
				},
				{
					'30': 4.0,
				},
				{
					'31': 4.0,
				},
				{
					'32': 4.0,
				},
				{
					'33': 4.0,
				},
				{
					'34': 4.0,
				},
				{
					'35': 4.0,
				},
				{
					'36': 4.0,
				},
			],
		},
		L1: {
			paytable: [
				{
					'5': 0.6,
				},
				{
					'6': 1.5,
				},
				{
					'7': 1.5,
				},
				{
					'8': 1.5,
				},
				{
					'9': 4.0,
				},
				{
					'10': 4.0,
				},
				{
					'11': 4.0,
				},
				{
					'12': 4.0,
				},
				{
					'13': 10.0,
				},
				{
					'14': 10.0,
				},
				{
					'15': 10.0,
				},
				{
					'16': 10.0,
				},
				{
					'17': 10.0,
				},
				{
					'18': 10.0,
				},
				{
					'19': 10.0,
				},
				{
					'20': 10.0,
				},
				{
					'21': 10.0,
				},
				{
					'22': 10.0,
				},
				{
					'23': 10.0,
				},
				{
					'24': 10.0,
				},
				{
					'25': 10.0,
				},
				{
					'26': 10.0,
				},
				{
					'27': 10.0,
				},
				{
					'28': 10.0,
				},
				{
					'29': 10.0,
				},
				{
					'30': 10.0,
				},
				{
					'31': 10.0,
				},
				{
					'32': 10.0,
				},
				{
					'33': 10.0,
				},
				{
					'34': 10.0,
				},
				{
					'35': 10.0,
				},
				{
					'36': 10.0,
				},
			],
		},
		H3: {
			paytable: [
				{
					'5': 1.3,
				},
				{
					'6': 3.2,
				},
				{
					'7': 3.2,
				},
				{
					'8': 3.2,
				},
				{
					'9': 7.0,
				},
				{
					'10': 7.0,
				},
				{
					'11': 7.0,
				},
				{
					'12': 7.0,
				},
				{
					'13': 30.0,
				},
				{
					'14': 30.0,
				},
				{
					'15': 30.0,
				},
				{
					'16': 30.0,
				},
				{
					'17': 30.0,
				},
				{
					'18': 30.0,
				},
				{
					'19': 30.0,
				},
				{
					'20': 30.0,
				},
				{
					'21': 30.0,
				},
				{
					'22': 30.0,
				},
				{
					'23': 30.0,
				},
				{
					'24': 30.0,
				},
				{
					'25': 30.0,
				},
				{
					'26': 30.0,
				},
				{
					'27': 30.0,
				},
				{
					'28': 30.0,
				},
				{
					'29': 30.0,
				},
				{
					'30': 30.0,
				},
				{
					'31': 30.0,
				},
				{
					'32': 30.0,
				},
				{
					'33': 30.0,
				},
				{
					'34': 30.0,
				},
				{
					'35': 30.0,
				},
				{
					'36': 30.0,
				},
			],
		},
		S: {
			paytable: null,
			special_properties: ['scatter'],
		},
		H4: {
			paytable: [
				{
					'5': 1.0,
				},
				{
					'6': 2.5,
				},
				{
					'7': 2.5,
				},
				{
					'8': 2.5,
				},
				{
					'9': 6.0,
				},
				{
					'10': 6.0,
				},
				{
					'11': 6.0,
				},
				{
					'12': 6.0,
				},
				{
					'13': 20.0,
				},
				{
					'14': 20.0,
				},
				{
					'15': 20.0,
				},
				{
					'16': 20.0,
				},
				{
					'17': 20.0,
				},
				{
					'18': 20.0,
				},
				{
					'19': 20.0,
				},
				{
					'20': 20.0,
				},
				{
					'21': 20.0,
				},
				{
					'22': 20.0,
				},
				{
					'23': 20.0,
				},
				{
					'24': 20.0,
				},
				{
					'25': 20.0,
				},
				{
					'26': 20.0,
				},
				{
					'27': 20.0,
				},
				{
					'28': 20.0,
				},
				{
					'29': 20.0,
				},
				{
					'30': 20.0,
				},
				{
					'31': 20.0,
				},
				{
					'32': 20.0,
				},
				{
					'33': 20.0,
				},
				{
					'34': 20.0,
				},
				{
					'35': 20.0,
				},
				{
					'36': 20.0,
				},
			],
		},
		L2: {
			paytable: [
				{
					'5': 0.4,
				},
				{
					'6': 1.2,
				},
				{
					'7': 1.2,
				},
				{
					'8': 1.2,
				},
				{
					'9': 3.5,
				},
				{
					'10': 3.5,
				},
				{
					'11': 3.5,
				},
				{
					'12': 3.5,
				},
				{
					'13': 8.0,
				},
				{
					'14': 8.0,
				},
				{
					'15': 8.0,
				},
				{
					'16': 8.0,
				},
				{
					'17': 8.0,
				},
				{
					'18': 8.0,
				},
				{
					'19': 8.0,
				},
				{
					'20': 8.0,
				},
				{
					'21': 8.0,
				},
				{
					'22': 8.0,
				},
				{
					'23': 8.0,
				},
				{
					'24': 8.0,
				},
				{
					'25': 8.0,
				},
				{
					'26': 8.0,
				},
				{
					'27': 8.0,
				},
				{
					'28': 8.0,
				},
				{
					'29': 8.0,
				},
				{
					'30': 8.0,
				},
				{
					'31': 8.0,
				},
				{
					'32': 8.0,
				},
				{
					'33': 8.0,
				},
				{
					'34': 8.0,
				},
				{
					'35': 8.0,
				},
				{
					'36': 8.0,
				},
			],
		},
		H1: {
			paytable: [
				{
					'5': 3.0,
				},
				{
					'6': 7.5,
				},
				{
					'7': 7.5,
				},
				{
					'8': 7.5,
				},
				{
					'9': 15.0,
				},
				{
					'10': 15.0,
				},
				{
					'11': 15.0,
				},
				{
					'12': 15.0,
				},
				{
					'13': 60.0,
				},
				{
					'14': 60.0,
				},
				{
					'15': 60.0,
				},
				{
					'16': 60.0,
				},
				{
					'17': 60.0,
				},
				{
					'18': 60.0,
				},
				{
					'19': 60.0,
				},
				{
					'20': 60.0,
				},
				{
					'21': 60.0,
				},
				{
					'22': 60.0,
				},
				{
					'23': 60.0,
				},
				{
					'24': 60.0,
				},
				{
					'25': 60.0,
				},
				{
					'26': 60.0,
				},
				{
					'27': 60.0,
				},
				{
					'28': 60.0,
				},
				{
					'29': 60.0,
				},
				{
					'30': 60.0,
				},
				{
					'31': 60.0,
				},
				{
					'32': 60.0,
				},
				{
					'33': 60.0,
				},
				{
					'34': 60.0,
				},
				{
					'35': 60.0,
				},
				{
					'36': 60.0,
				},
			],
		},
		H2: {
			paytable: [
				{
					'5': 2.0,
				},
				{
					'6': 5.0,
				},
				{
					'7': 5.0,
				},
				{
					'8': 5.0,
				},
				{
					'9': 10.0,
				},
				{
					'10': 10.0,
				},
				{
					'11': 10.0,
				},
				{
					'12': 10.0,
				},
				{
					'13': 40.0,
				},
				{
					'14': 40.0,
				},
				{
					'15': 40.0,
				},
				{
					'16': 40.0,
				},
				{
					'17': 40.0,
				},
				{
					'18': 40.0,
				},
				{
					'19': 40.0,
				},
				{
					'20': 40.0,
				},
				{
					'21': 40.0,
				},
				{
					'22': 40.0,
				},
				{
					'23': 40.0,
				},
				{
					'24': 40.0,
				},
				{
					'25': 40.0,
				},
				{
					'26': 40.0,
				},
				{
					'27': 40.0,
				},
				{
					'28': 40.0,
				},
				{
					'29': 40.0,
				},
				{
					'30': 40.0,
				},
				{
					'31': 40.0,
				},
				{
					'32': 40.0,
				},
				{
					'33': 40.0,
				},
				{
					'34': 40.0,
				},
				{
					'35': 40.0,
				},
				{
					'36': 40.0,
				},
			],
		},
		L3: {
			paytable: [
				{
					'5': 0.2,
				},
				{
					'6': 0.8,
				},
				{
					'7': 0.8,
				},
				{
					'8': 0.8,
				},
				{
					'9': 2.5,
				},
				{
					'10': 2.5,
				},
				{
					'11': 2.5,
				},
				{
					'12': 2.5,
				},
				{
					'13': 5.0,
				},
				{
					'14': 5.0,
				},
				{
					'15': 5.0,
				},
				{
					'16': 5.0,
				},
				{
					'17': 5.0,
				},
				{
					'18': 5.0,
				},
				{
					'19': 5.0,
				},
				{
					'20': 5.0,
				},
				{
					'21': 5.0,
				},
				{
					'22': 5.0,
				},
				{
					'23': 5.0,
				},
				{
					'24': 5.0,
				},
				{
					'25': 5.0,
				},
				{
					'26': 5.0,
				},
				{
					'27': 5.0,
				},
				{
					'28': 5.0,
				},
				{
					'29': 5.0,
				},
				{
					'30': 5.0,
				},
				{
					'31': 5.0,
				},
				{
					'32': 5.0,
				},
				{
					'33': 5.0,
				},
				{
					'34': 5.0,
				},
				{
					'35': 5.0,
				},
				{
					'36': 5.0,
				},
			],
		},
	},
	paddingReels: {
		basegame: '',
		freegame: '',
	},
};
