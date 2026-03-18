export function computeSlipAnimationConfig(args: {
	viewportWidth: number;
	originX: number;
	baselineX: number;
	direction: 1 | -1;
	durationMultiplier: number;
}) {
	const distanceToSlipSide =
		args.direction > 0
			? Math.max(0, args.viewportWidth - args.originX)
			: Math.max(0, args.originX);
	const sideNorm = Math.max(0, Math.min(1, distanceToSlipSide / Math.max(1, args.viewportWidth)));
	const sideTravel = args.viewportWidth * (0.1 + sideNorm * 0.12);
	const sideBias = Math.max(0, (args.baselineX - args.originX) * args.direction) * 0.22;
	const animationSideBoost = args.viewportWidth * 0.05;
	const maxSlide = args.direction * (sideTravel + sideBias + animationSideBoost);
	const preSlideDistance = Math.min(Math.abs(maxSlide) * 0.24, args.viewportWidth * 0.06);
	const preSlide = Math.min(preSlideDistance, Math.abs(maxSlide) * 0.65) * args.direction;
	const preDuration = 140 * args.durationMultiplier;
	const mainDurationBase = Math.max(
		380,
		Math.min(560, 380 + (Math.abs(maxSlide) / Math.max(1, args.viewportWidth)) * 140)
	);
	const mainDuration = mainDurationBase * args.durationMultiplier;
	return { preDuration, mainDuration, duration: preDuration + mainDuration, preSlide, maxSlide };
}

export function computeSlipAnimationFrame(args: {
	elapsed: number;
	preDuration: number;
	mainDuration: number;
	preSlide: number;
	maxSlide: number;
	direction: 1 | -1;
	viewportHeight: number;
}) {
	if (args.elapsed < args.preDuration) {
		const p = Math.max(0, Math.min(1, args.elapsed / args.preDuration));
		const easedPre = p * p * (3 - 2 * p);
		return {
			phase: 'pre' as const,
			slipSlide: args.preSlide * easedPre,
			slipDropY: args.viewportHeight * 0.01 * easedPre,
			penguinSkidRotation: -args.direction * (6 + 8 * easedPre)
		};
	}
	const p = Math.max(0, Math.min(1, (args.elapsed - args.preDuration) / args.mainDuration));
	const easedMain = p * p * (3 - 2 * p);
	return {
		phase: 'main' as const,
		slipSlide: args.preSlide + (args.maxSlide - args.preSlide) * easedMain,
		slipDropY: args.viewportHeight * (0.01 + 0.12 * easedMain * easedMain),
		penguinSkidRotation: -args.direction * (14 + 10 * easedMain)
	};
}
