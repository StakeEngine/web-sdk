import { createAsset } from 'pixi-svelte';

import img from './ui_explosion.png';
import rawAtlas from './ui_explosion.atlas?raw';
import spine from './ui_explosion.json';

export default createAsset({ img, rawAtlas, spine });
