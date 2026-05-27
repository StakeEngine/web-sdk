import { createAsset } from 'pixi-svelte';

import img from './symbols2.webp';
import rawAtlas from './symbols2.atlas?raw';
import M from './M.json';
import S from './S.json';

export default createAsset({
	img,
	rawAtlas,
	spines: {
		M,
		S,
	},
});
