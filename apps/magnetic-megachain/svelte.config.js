// @ts-ignore
import config from 'config-svelte';

const base = config();

// Wrap the adapter to force-exit after writing completes.
// PixiJS/Spine import browser globals that keep the Node.js event loop
// alive indefinitely after the SSR build — process.exit is the only fix.
const baseAdapter = base.kit.adapter;
const exitAdapter = {
	name: baseAdapter.name,
	async adapt(builder) {
		await baseAdapter.adapt(builder);
		process.exit(0);
	},
	supports: baseAdapter.supports,
	emulate: baseAdapter.emulate,
};

export default {
	...base,
	kit: {
		...base.kit,
		adapter: exitAdapter,
	},
};
