type Size = { w: number; h: number };

export function coinAssetKeyForToken(token: any, defaultBaseStake: number) {
	const coinValue = token?.extra?.coinValue ?? token?.extra?.value ?? 0;
	const baseStake = token?.extra?.baseStake ?? defaultBaseStake;
	const normalized = baseStake > 0 ? coinValue / baseStake : coinValue;
	if (normalized <= 3) return 'coin_bronze';
	if (normalized <= 20) return 'coin_silver';
	return 'coin_gold';
}

export function tokenScaleForDepth(
	depth: number,
	renderSize: Size,
	pickupScaleBoost: number,
	isSmallScreen: boolean
) {
	const mobileFactor = isSmallScreen ? 0.8 : 1;
	const isPortrait = renderSize.h > renderSize.w;
	const isMobilePortrait = isPortrait && renderSize.w <= 500;
	const portraitBoost = isPortrait ? 1.38 : 1;
	const mobilePortraitScale = isMobilePortrait ? 0.75 : 1;
	const depthScale = isPortrait ? 0.5 + depth * 1.54 : 0.6 + depth * 1.4;
	return depthScale * mobileFactor * 2.6 * portraitBoost * pickupScaleBoost * mobilePortraitScale;
}

export function tokenSpineSizeForDepth(
	depth: number,
	viewport: Size,
	renderSize: Size,
	pickupScaleBoost: number,
	isSmallScreen: boolean
) {
	const mobileFactor = isSmallScreen ? 0.75 : 1;
	const isPortrait = renderSize.h > renderSize.w;
	const isMobilePortrait = isPortrait && renderSize.w <= 500;
	const portraitBoost = isPortrait ? 1.56 : 1;
	const mobilePortraitScale = isMobilePortrait ? 0.75 : 1;
	const depthT = Math.max(0, Math.min(1, depth));
	const depthExp = Math.pow(depthT, 2.35);
	const depthScale = isPortrait ? 0.42 + depthExp * 2.2 : 0.42 + depthExp * 1.7;
	const descentScaleBoost = 1 + Math.pow(Math.max(0, Math.min(1, depth)), 1.25) * 0.62;
	const base = Math.max(40, viewport.w * 0.035);
	return base * depthScale * descentScaleBoost * mobileFactor * 2.6 * portraitBoost * pickupScaleBoost * mobilePortraitScale;
}

export function accumulatedAmountYForViewport(viewport: Size, renderSize: Size) {
	const desktopAccumulatedOffset =
		renderSize.w >= 1024 && renderSize.h >= 600 && renderSize.w > renderSize.h
			? viewport.h * 0.022
			: 0;
	return viewport.h * 0.11 + desktopAccumulatedOffset;
}
