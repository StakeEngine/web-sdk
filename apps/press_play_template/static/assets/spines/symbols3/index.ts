import { createAsset } from 'pixi-svelte';

import img from './symbols3.webp';
import rawAtlas from './symbols3.atlas?raw';
import explosion from './explosion.json';
import W from './W.json';

export default createAsset({
	img,
	rawAtlas,
	spines: {
		explosion,
		W,
	},
});
