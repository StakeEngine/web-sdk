import type { PixiPoint, Sizes } from './types';

export const REM = 16;
export const MIN_CLICKABLE_SIZE = 3 * REM; // 44 x 44 is minimum clickable size

export const getPointValues = ({
	point,
	defaultValue,
}: {
	point: PixiPoint;
	defaultValue: number;
}) => {
	const finalDefaultValue = defaultValue === undefined ? 0 : defaultValue;
	if (typeof point === 'number') return [point, point];
	return [point?.x || finalDefaultValue, point?.y || finalDefaultValue];
};

export const anchorToPivot = ({ anchor, sizes }: { anchor: PixiPoint; sizes: Sizes }) => {
	const { width, height } = sizes;
	const [anchorX, anchorY] = getPointValues({ point: anchor, defaultValue: 0 });
	return { x: width * anchorX, y: height * anchorY };
};

/**
 * Detects if WebGL is enabled.
 * Inspired from http://www.browserleaks.com/webgl#howto-detect-webgl
 *
 * @return { number } -1 for not Supported,
 *										0 for disabled
 *										1 for enabled
 */
export function detectWebGL() {
	// Check for the WebGL rendering context
	if (window && !!window.WebGLRenderingContext) {
		let canvas = document.createElement('canvas'),
			names = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d'],
			context = false;

		for (const i in names) {
			try {
				// @ts-ignore
				context = canvas.getContext(names[i]);
				// @ts-ignore
				if (context && typeof context.getParameter === 'function') {
					// WebGL is enabled.
					return 1;
				}
			} catch (e) {}
		}

		// WebGL is supported, but disabled.
		return 0;
	}

	// WebGL not supported.
	return -1;
}

let webfontLoaderPromise: Promise<typeof import('webfontloader') | null> | null = null;

const loadWebFontLoader = async () => {
	if (typeof window === 'undefined') {
		return null;
	}

	if (!webfontLoaderPromise) {
		webfontLoaderPromise = import('webfontloader').catch((error) => {
			console.error('Unable to import webfontloader', error);
			return null;
		});
	}

	return webfontLoaderPromise;
};

export const preloadFont = () =>
	new Promise<void>(async (resolve) => {
		if (typeof window === 'undefined') {
			resolve();
			return;
		}

		try {
			const loaderModule = await loadWebFontLoader();
			const WebFont =
				loaderModule && 'default' in loaderModule ? loaderModule.default : loaderModule;

			if (!WebFont) {
				resolve();
				return;
			}

			WebFont.load({
				typekit: {
					id: 'aba0ebl',
				},
				active: () => {
					resolve();
				},
				inactive: () => {
					console.error('Web font load inactive');
					resolve();
				},
			});
		} catch (error) {
			console.error('Web font load failed', error);
			resolve();
		}
	});

export function propsSyncEffect<TProps extends object, TTarget>({
	props,
	target,
	ignore,
}: {
	props: TProps;
	target?: TTarget | (() => TTarget);
	ignore?: (keyof TProps)[];
}) {
	$effect(() => {
		// The whole thing is wrapped inside an $effect
		// and because of ”props[key]“，it will react with every single props updated.
		let targetInstance = target instanceof Function ? target() : target;
		if (targetInstance) {
			(Object.keys(props) as (keyof TProps)[])
				.filter((key) => (ignore ? !ignore.includes(key) : true))
				.forEach((key) => {
					if (props[key] !== undefined) {
						// @ts-ignore
						targetInstance[key] = props[key];
					}
				});
		}
	});
}
