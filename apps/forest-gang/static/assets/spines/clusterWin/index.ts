import { createAsset } from 'pixi-svelte';

import img from './clusterpay.webp';
import rawAtlas from './clusterpay.atlas?raw';
import spine from './clusterpay.json';

export default createAsset({ img, rawAtlas, spine });