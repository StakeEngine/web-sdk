import { createAsset } from 'pixi-svelte';

import img from './tumble_win.webp';
import rawAtlas from './tumble_win.atlas?raw';
import tumble_multiplier from './tumble_multiplier.json';
import tumble_win from './tumble_win.json';

export default createAsset({
	img,
	rawAtlas,
	spines: {
		tumble_multiplier,
		tumble_win,
	},
});