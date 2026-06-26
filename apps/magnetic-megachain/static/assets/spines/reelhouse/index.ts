import { createAsset } from 'pixi-svelte';

import img from './reelhouse_glow.webp';
import rawAtlas from './reelhouse_glow.atlas?raw';
import spine from './reelhouse_glow.json';

export default createAsset({ img, rawAtlas, spine });