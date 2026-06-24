import { createAsset } from 'pixi-svelte';

import img from './multiframe.webp';
import rawAtlas from './multiframe.atlas?raw';
import spine from './multiframe.json';

export default createAsset({ img, rawAtlas, spine });