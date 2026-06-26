import { createAsset } from 'pixi-svelte';

import img from './loader.webp';
import rawAtlas from './loader.atlas?raw';
import spine from './loader.json';

export default createAsset({ img, rawAtlas, spine, preload: true });