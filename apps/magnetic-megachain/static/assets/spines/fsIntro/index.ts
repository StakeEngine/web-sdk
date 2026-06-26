import { createAsset } from 'pixi-svelte';

import img from './fs_screen.webp';
import rawAtlas from './fs_screen.atlas?raw';
import fsIntro from './fs_screen.json';
import fsIntroNumber from './fs_screen_number.json';
import fsOutroNumber from './fs_total_number.json';

export default createAsset({
	img,
	rawAtlas,
	spines: {
		fsIntro,
		fsIntroNumber,
		fsOutroNumber
	},
});
