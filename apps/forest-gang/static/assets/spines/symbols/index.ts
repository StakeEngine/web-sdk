import { createAsset } from 'pixi-svelte';

import img from './symbols.webp';
import rawAtlas from './symbols.atlas?raw';
import H1 from './h1.json';
import H2 from './h2.json';
import H3 from './h3.json';
import H4 from './h4.json';
import H5 from './h5.json';
import L1 from './l1.json';
import L2 from './l2.json';
import L3 from './l3.json';
import L4 from './l4.json';

export default createAsset({
	img,
	rawAtlas,
	spines: {
		H1,
		H2,
		H3,
		H4,
		H5,
		L1,
		L2,
		L3,
		L4,
	},
});