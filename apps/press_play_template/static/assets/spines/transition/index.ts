import { createAsset } from 'pixi-svelte';

import img from './transition.webp';
import rawAtlas from './transition.atlas?raw';
import spine from './transition.json';

export default createAsset({ img, rawAtlas, spine });