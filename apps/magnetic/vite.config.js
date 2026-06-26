// @ts-ignore
import config from 'config-vite';
import { createRequire } from 'module';

const base = config();

// pixi.js and pixi-filters live in the workspace root's pnpm store (deps of pixi-svelte),
// not directly in this app's node_modules — resolve them from the workspace root.
const rootRequire = createRequire(new URL('../../package.json', import.meta.url));

export default {
	...base,
	resolve: {
		...(base.resolve ?? {}),
		alias: {
			...(base.resolve?.alias ?? {}),
			'pixi.js': rootRequire.resolve('pixi.js'),
			'pixi-filters': rootRequire.resolve('pixi-filters'),
		},
	},
	build: {
		...(base.build ?? {}),
		rollupOptions: {
			...(base.build?.rollupOptions ?? {}),
			treeshake: { preset: 'safest' },
		},
	},
};
