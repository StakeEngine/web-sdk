type BitmapSpriteAsset = { type: 'sprite'; src: string; preload: true };

export function buildBitmapAssetsWithClones(
	assetPath: (path: string) => string
): Record<string, BitmapSpriteAsset> {
	const bitmapDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
	const bitmapAssets: Record<string, BitmapSpriteAsset> = {};

	for (const d of bitmapDigits) {
		bitmapAssets[`bitmap_coins_gold_${d}`] = {
			type: 'sprite',
			src: assetPath(`/assets/bitmap/coins/gold/${d}.png`),
			preload: true
		};
		bitmapAssets[`bitmap_coins_silver_${d}`] = {
			type: 'sprite',
			src: assetPath(`/assets/bitmap/coins/silver/${d}.png`),
			preload: true
		};
		bitmapAssets[`bitmap_coins_bronze_${d}`] = {
			type: 'sprite',
			src: assetPath(`/assets/bitmap/coins/bronze/${d}.png`),
			preload: true
		};
		bitmapAssets[`bitmap_mult_${d}`] = {
			type: 'sprite',
			src: assetPath(`/assets/bitmap/multiplier/${d}.png`),
			preload: true
		};
	}

	bitmapAssets.bitmap_coins_gold_dot = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/gold/dot.png'),
		preload: true
	};
	bitmapAssets.bitmap_coins_gold_comma = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/gold/comma.png'),
		preload: true
	};
	bitmapAssets.bitmap_coins_gold_x = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/gold/x.png'),
		preload: true
	};
	bitmapAssets.bitmap_coins_silver_dot = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/silver/dot.png'),
		preload: true
	};
	bitmapAssets.bitmap_coins_silver_comma = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/silver/comma.png'),
		preload: true
	};
	bitmapAssets.bitmap_coins_silver_x = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/silver/x.png'),
		preload: true
	};
	bitmapAssets.bitmap_coins_bronze_dot = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/bronze/dot.png'),
		preload: true
	};
	bitmapAssets.bitmap_coins_bronze_comma = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/bronze/comma.png'),
		preload: true
	};
	bitmapAssets.bitmap_coins_bronze_x = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/coins/bronze/x.png'),
		preload: true
	};
	bitmapAssets.bitmap_mult_dot = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/multiplier/dot.png'),
		preload: true
	};
	bitmapAssets.bitmap_mult_comma = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/multiplier/comma.png'),
		preload: true
	};
	bitmapAssets.bitmap_mult_x = {
		type: 'sprite',
		src: assetPath('/assets/bitmap/multiplier/x.png'),
		preload: true
	};

	const bitmapAssetClones: Record<string, BitmapSpriteAsset> = {};
	for (const [assetKey, assetDef] of Object.entries(bitmapAssets)) {
		for (let i = 0; i <= 9; i += 1) {
			bitmapAssetClones[`${assetKey}-${i}`] = assetDef;
		}
	}

	return { ...bitmapAssets, ...bitmapAssetClones };
}
