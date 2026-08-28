import { innerWidth, innerHeight } from 'svelte/reactivity/window';

type Sizes = { width: number; height: number };

const CANVAS_RATIO_TYPE_BREAK_POINTS = {
	wideSquare: 1.3, // Min ratio of long width canvas, used for position FS UI elements
	narrowSquare: 0.8, // GALAXY FOLD EXPAND RATIO IS 1.400390625
};

const CANVAS_SIZE_TYPE_BREAK_POINTS = {
	smallMobile: 375, // Max size of small mobile layouts e.g. iPhone SE
	mobile: 480, // Max size of common mobile layouts e.g. iPhone XR
	tablet: 820, // Max size of tablets layouts, e.g. iPad Air
	largeTablet: 1024, // Max size of large tablets layouts, e.g. iPad Pro
};

const getRatio = (value: Sizes) => value.width / (value.height || 1);

const STANDARD_MAIN_SIZES_MAP = {
	desktop: { width: 1920, height: 1080 },
	tablet: { width: 1920, height: 1920 },
	landscape: { width: 1920, height: 1080 },
	portrait: { width: 1080, height: 1920 },
};

type MainSizesMap = typeof STANDARD_MAIN_SIZES_MAP;

export const createLayout = (layoutOptions: {
	backgroundRatio: {
		normal: number;
		portrait: number;
	};
	mainSizesMap: MainSizesMap;
	/**
	 * Height the UI chrome occupies along the bottom, per layout type, in the same
	 * units as `mainSizesMap`. Reserving it keeps the game area clear of the UI bar
	 * when the canvas is wider than the design ratio - without it the game area
	 * takes the full canvas height and the bottom of the board renders behind the
	 * bar. Omit it and the layout is unchanged.
	 */
	safeAreaBottomMap?: Partial<Record<keyof MainSizesMap, number>>;
}) => {
	const canvasSizes = () => ({ width: innerWidth.current ?? 1, height: innerHeight.current ?? 1 }); // because of resizeTo: window
	const canvasRatio = () => getRatio(canvasSizes());
	const canvasRatioType = () => {
		if (canvasRatio() >= CANVAS_RATIO_TYPE_BREAK_POINTS.wideSquare) return 'longWidth' as const;
		if (canvasRatio() <= CANVAS_RATIO_TYPE_BREAK_POINTS.narrowSquare) return 'longHeight' as const;
		return 'almostSquare' as const;
	};
	const canvasSizeType = () => {
		const deviceWidth = Math.min(canvasSizes().width, canvasSizes().height);
		if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.smallMobile) return 'smallMobile' as const;
		if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.mobile) return 'mobile' as const;
		if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.tablet) return 'tablet' as const;
		if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.largeTablet) return 'largeTablet' as const;
		return 'desktop' as const;
	};
	const layoutType = () => {
		if (canvasRatioType() === 'almostSquare') return 'tablet' as const;
		if (canvasRatioType() === 'longHeight') return 'portrait' as const;
		if (canvasSizeType() === 'mobile' || canvasSizeType() === 'smallMobile')
			return 'landscape' as const;
		return 'desktop' as const;
	};
	const isStacked = () => ['portrait', 'almostSquare'].includes(layoutType());

	const createMainLayout =
		(
			mainSizesMap: MainSizesMap,
			safeAreaBottomMap?: Partial<Record<keyof MainSizesMap, number>>,
		) =>
		() => {
			const mainSizes = mainSizesMap[layoutType()];
			const safeAreaBottom = safeAreaBottomMap?.[layoutType()] ?? 0;
			const widthScale = canvasSizes().width / mainSizes.width;
			const heightScale = canvasSizes().height / (mainSizes.height + safeAreaBottom);
			const scale = Math.min(widthScale, heightScale);
			const x = canvasSizes().width * 0.5;
			// centre in the area above the reserved strip, not in the whole canvas
			const y = canvasSizes().height * 0.5 - safeAreaBottom * scale * 0.5;

			return {
				x,
				y,
				scale,
				width: mainSizes.width,
				height: mainSizes.height,
				anchor: 0.5,
			};
		};

	const mainLayout = createMainLayout(layoutOptions.mainSizesMap, layoutOptions.safeAreaBottomMap);

	const mainLayoutStandard = createMainLayout(STANDARD_MAIN_SIZES_MAP);

	const createBackgroundLayout = ({ scale, ratio }: { scale: number; ratio: number }) => {
		const canvasRatio = getRatio(canvasSizes());

		if (canvasRatio < ratio) {
			return {
				x: canvasSizes().width / 2,
				y: canvasSizes().height / 2,
				height: canvasSizes().height * scale,
			};
		}

		return {
			x: canvasSizes().width / 2,
			y: canvasSizes().height / 2,
			width: canvasSizes().width * scale,
		};
	};

	const normalBackgroundLayout = ({ scale }: { scale: number }) =>
		createBackgroundLayout({ scale, ratio: layoutOptions.backgroundRatio.normal });
	const portraitBackgroundLayout = ({ scale }: { scale: number }) =>
		createBackgroundLayout({ scale, ratio: layoutOptions.backgroundRatio.portrait });

	const stateLayout = $state({
		showLoadingScreen: true,
	});

	const stateLayoutDerived = {
		canvasSizes,
		canvasRatio,
		canvasRatioType,
		canvasSizeType,
		layoutType,
		isStacked,
		mainLayout,
		mainLayoutStandard,
		normalBackgroundLayout,
		portraitBackgroundLayout,
	};

	return {
		stateLayout,
		stateLayoutDerived,
	};
};
