type Size = { w: number; h: number };

export type SlideMetrics = { width: number; height: number; top: number; y: number };

export type PathMetrics = {
	centerX: number;
	topY: number;
	bottomY: number;
	widthTop: number;
	widthBottom: number;
};

export function slideMetricsForStage(
	viewport: Size,
	renderSize: Size,
	innerWidth: number
): SlideMetrics {
	const w = viewport.w;
	const h = viewport.h;
	const isPortrait = renderSize.h > renderSize.w;
	const width =
		(innerWidth < 600 ? w * (isPortrait ? 0.3888 : 0.28) : w * 0.55) * 0.75 * 1.1 * 1.2 * 1.15;
	const height = h * (isPortrait ? 1.64 : 1.05);
	const top = h * (isPortrait ? -0.045 : 0.1);
	return { width, height, top, y: top + height * 0.5 };
}

export function pathMetricsForStage(viewport: Size, slide: SlideMetrics): PathMetrics {
	return {
		centerX: viewport.w / 2,
		topY: slide.top,
		bottomY: slide.top + slide.height,
		widthTop: Math.max(110, slide.width * 0.22),
		widthBottom: Math.max(320, slide.width * 0.78)
	};
}

export function laneSpreadForDepth(depth: number) {
	const topSpread = 0.14;
	const bottomSpread = 0.7;
	return topSpread + (bottomSpread - topSpread) * depth;
}

export function lanePositionForStage(path: PathMetrics, depth: number, offset: number) {
	const { centerX, topY, bottomY, widthTop, widthBottom } = path;
	const y = topY + (bottomY - topY) * depth;
	const width = widthTop + (widthBottom - widthTop) * depth;
	const spread = laneSpreadForDepth(depth);
	const x = centerX + offset * width * spread;
	return { x, y, width };
}

export function pickupLanePositionForStage(args: {
	path: PathMetrics;
	viewport: Size;
	depth: number;
	offset: number;
	depthExponent: number;
	centerPullBase: number;
	centerPullSideBoost: number;
}) {
	const t = Math.max(0, Math.min(1, args.depth));
	const tY = Math.pow(t, args.depthExponent);
	const laneStart = lanePositionForStage(args.path, 0, args.offset);
	const laneEnd = lanePositionForStage(args.path, 1, args.offset);
	const pos = {
		x: laneStart.x + (laneEnd.x - laneStart.x) * tY,
		y: laneStart.y + (laneEnd.y - laneStart.y) * tY,
		width: laneStart.width + (laneEnd.width - laneStart.width) * t
	};
	const centerX = args.viewport.w * 0.5;
	const sideSpread = Math.max(0, Math.min(1, Math.abs(args.offset)));
	const sidePull = args.centerPullBase + sideSpread * args.centerPullSideBoost;
	return {
		...pos,
		x: centerX + (pos.x - centerX) * sidePull
	};
}
