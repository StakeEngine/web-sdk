// @ts-ignore
import config from 'config-vite';

const base = config();

export default {
	...base,
	build: {
		...(base.build ?? {}),
		rollupOptions: {
			...(base.build?.rollupOptions ?? {}),
			treeshake: { preset: 'safest' },
		},
	},
};
