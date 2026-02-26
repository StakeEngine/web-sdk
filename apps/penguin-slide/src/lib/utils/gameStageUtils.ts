export type ViewportSize = { w: number; h: number };

export type PathMetrics = {
	centerX: number;
	topY: number;
	bottomY: number;
	widthTop: number;
	widthBottom: number;
};

export function slideMetrics(viewport: ViewportSize, renderSize: ViewportSize) {
	const w = viewport.w;
	const h = viewport.h;
	const isPortrait = renderSize.h > renderSize.w;
	const width =
		(window.innerWidth < 600 ? w * (isPortrait ? 0.3888 : 0.28) : w * 0.55) * 0.75 * 1.1 * 1.2 * 1.15;
	const height = h * (isPortrait ? 1.64 : 1.05);
	const top = h * (isPortrait ? -0.045 : 0.1);
	return { width, height, top, y: top + height * 0.5 };
}

export function pathMetrics(viewport: ViewportSize, slide: ReturnType<typeof slideMetrics>): PathMetrics {
	return {
		centerX: viewport.w / 2,
		topY: slide.top,
		bottomY: slide.top + slide.height,
		widthTop: Math.max(110, slide.width * 0.22),
		widthBottom: Math.max(320, slide.width * 0.78)
	};
}

export function lanePosition(path: PathMetrics, depth: number, offset: number) {
	const { centerX, topY, bottomY, widthTop, widthBottom } = path;
	const y = topY + (bottomY - topY) * depth;
	const width = widthTop + (widthBottom - widthTop) * depth;
	const topSpread = 0.14;
	const bottomSpread = 0.7;
	const spread = topSpread + (bottomSpread - topSpread) * depth;
	const x = centerX + offset * width * spread;
	return { x, y, width };
}

export function pickupLanePosition(
	path: PathMetrics,
	depth: number,
	offset: number,
	viewport: ViewportSize
) {
	const t = Math.max(0, Math.min(1, depth));
	const laneStart = lanePosition(path, 0, offset);
	const laneEnd = lanePosition(path, 1, offset);
	const pos = {
		x: laneStart.x + (laneEnd.x - laneStart.x) * t,
		y: laneStart.y + (laneEnd.y - laneStart.y) * t,
		width: laneStart.width + (laneEnd.width - laneStart.width) * t
	};
	const centerX = viewport.w * 0.5;
	const centerPull = 0.68;
	return {
		...pos,
		x: centerX + (pos.x - centerX) * centerPull
	};
}
