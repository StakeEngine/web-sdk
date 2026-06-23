import { createAsset } from 'pixi-svelte';

import img from './mm_bg.webp';
import rawAtlas from './mm_bg.atlas?raw';
import spine from './mm_bg.json';

export default createAsset({ img, rawAtlas, spine, preload: true });