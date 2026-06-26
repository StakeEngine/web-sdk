import { createAsset } from 'pixi-svelte';

import img from './big_wins.webp';
import rawAtlas from './big_wins.atlas?raw';
import spine from './mm_bigwin.json';

export default createAsset({ img, rawAtlas, spine });