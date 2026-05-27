import { createAsset } from 'pixi-svelte';

import img from './buy_button.webp';
import rawAtlas from './buy_button.atlas?raw';
import spine from './buy_button.json';

export default createAsset({ img, rawAtlas, spine });