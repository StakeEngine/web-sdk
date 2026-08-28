import { createLayout } from 'utils-layout';

export const { stateLayout, stateLayoutDerived } = createLayout({
	backgroundRatio: {
		normal: 2039 / 1000,
		portrait: 1242 / 2208,
	},
	mainSizesMap: {
		desktop: { width: 1422, height: 800 },
		tablet: { width: 1000, height: 1000 },
		landscape: { width: 1600, height: 900 },
		portrait: { width: 800, height: 1422 },
	},
	// height the UI bar takes along the bottom, in mainSizesMap units
	safeAreaBottomMap: {
		desktop: 220,
		tablet: 260,
		landscape: 240,
		portrait: 380,
	},
});
