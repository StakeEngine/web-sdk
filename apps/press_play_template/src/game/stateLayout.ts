import { createLayout } from 'utils-layout';

// CHANGE ME: update backgroundRatio to match your background art aspect ratio
export const { stateLayout, stateLayoutDerived } = createLayout({
	backgroundRatio: {
		normal: 16 / 9,
		portrait: 9 / 16,
	},
	mainSizesMap: {
		desktop:  { width: 1422, height: 800 },
		tablet:   { width: 1000, height: 1000 },
		landscape: { width: 1600, height: 900 },
		portrait: { width: 800,  height: 1422 },
	},
});
