// Shared golden gradients for canvas (Pixi) text fills, clipped to glyphs like CSS background-clip:text.
//
// `pixi.js` is a transitive dependency of `pixi-svelte`; it isn't a direct dependency of this app, so
// TypeScript can't resolve its types here — but the app's vite config aliases `pixi.js` to the
// workspace root, so it resolves correctly at build/runtime. The @ts-expect-error covers only the
// type-resolution gap.
// @ts-expect-error - 'pixi.js' is resolved at build time via the vite alias (transitive dep).
import { FillGradient } from 'pixi.js';

// Figma "golden-gradient": linear-gradient(184deg, #FFA90E 15.26%, #EE960B 69.74%, #D18005 92.88%).
// 184deg ≈ vertical (top → bottom), so a straight vertical gradient matches.
export const GOLD_GRADIENT = new FillGradient({
	type: 'linear',
	start: { x: 0.5, y: 0 },
	end: { x: 0.5, y: 1 },
	colorStops: [
		{ offset: 0.1526, color: 0xffa90e },
		{ offset: 0.6974, color: 0xee960b },
		{ offset: 0.9288, color: 0xd18005 },
	],
	textureSpace: 'local',
});

// Brighter win gradient: linear-gradient(182deg, #E2D981 17.62%, #FBC503 60.04%, #D98503 102.47%).
export const WIN_GRADIENT = new FillGradient({
	type: 'linear',
	start: { x: 0.5, y: 0 },
	end: { x: 0.5, y: 1 },
	colorStops: [
		{ offset: 0.1762, color: 0xe2d981 },
		{ offset: 0.6004, color: 0xfbc503 },
		{ offset: 1.0, color: 0xd98503 },
	],
	textureSpace: 'local',
});
