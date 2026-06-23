import { createAsset } from 'pixi-svelte';

import img from './mm_bg_feature.webp';
import rawAtlas from './mm_bg_feature.atlas?raw';
import spine from './mm_bg_feature.json';

export default createAsset({ img, rawAtlas, spine, preload: true });