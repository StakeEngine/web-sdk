type BitmapSpriteAsset = { type: 'sprite'; src: string; preload: true };

type SpineAsset = {
	type: 'spine';
	src: {
		atlas: string;
		skeleton: string;
		scale: number;
	};
	preload: true;
};

export function buildPenguinSlidePixiAssets(
	assetPath: (path: string) => string,
	bitmapAssetsWithClones: Record<string, BitmapSpriteAsset>
) {
	const spine = (atlas: string, skeleton: string): SpineAsset => ({
		type: 'spine',
		src: {
			atlas: assetPath(atlas),
			skeleton: assetPath(skeleton),
			scale: 1
		},
		preload: true
	});

	return {
		banana: spine('/assets/spine/symbols/symbols.atlas', '/assets/spine/symbols/banana.skel'),
		star: spine('/assets/spine/symbols/symbols.atlas', '/assets/spine/symbols/star.skel'),
		lifering: spine('/assets/spine/symbols/symbols.atlas', '/assets/spine/symbols/lifering.skel'),
		goal: spine('/assets/spine/symbols/symbols.atlas', '/assets/spine/symbols/goal.skel'),
		coin_bronze: spine('/assets/spine/symbols/symbols.atlas', '/assets/spine/symbols/coin_copper.skel'),
		coin_silver: spine('/assets/spine/symbols/symbols.atlas', '/assets/spine/symbols/coin_silver.skel'),
		coin_gold: spine('/assets/spine/symbols/symbols.atlas', '/assets/spine/symbols/coin_gold.skel'),
		penguin: spine('/assets/spine/penguin/penguin.atlas', '/assets/spine/penguin/penguin.skel'),
		background_water: spine(
			'/assets/spine/background/background.atlas',
			'/assets/spine/background/background_water.skel'
		),
		background_mountains: spine(
			'/assets/spine/background/background.atlas',
			'/assets/spine/background/background_mountains.skel'
		),
		background_clouds: spine(
			'/assets/spine/background/background.atlas',
			'/assets/spine/background/background_clouds.skel'
		),
		slide: spine('/assets/spine/slide/slide.atlas', '/assets/spine/slide/slide.skel'),
		ice_1: spine('/assets/spine/ice/ice.atlas', '/assets/spine/ice/ice_1.skel'),
		ice_2: spine('/assets/spine/ice/ice.atlas', '/assets/spine/ice/ice_2.skel'),
		ice_3: spine('/assets/spine/ice/ice.atlas', '/assets/spine/ice/ice_3.skel'),
		ice_4: spine('/assets/spine/ice/ice.atlas', '/assets/spine/ice/ice_4.skel'),
		ice_5: spine('/assets/spine/ice/ice.atlas', '/assets/spine/ice/ice_5.skel'),
		ice_6: spine('/assets/spine/ice/ice.atlas', '/assets/spine/ice/ice_6.skel'),
		ice_7: spine('/assets/spine/ice/ice.atlas', '/assets/spine/ice/ice_7.skel'),
		ice_8: spine('/assets/spine/ice/ice.atlas', '/assets/spine/ice/ice_8.skel'),
		...bitmapAssetsWithClones
	};
}
