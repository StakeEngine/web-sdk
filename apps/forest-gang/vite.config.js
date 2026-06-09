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
	plugins: [
		...(base.plugins ?? []),
		{
			name: 'force-exit',
			closeBundle() {
				// SvelteKit/Vite sometimes keeps the process alive after build — force clean exit
				setTimeout(() => process.exit(0), 300);
			},
		},
	],
};
