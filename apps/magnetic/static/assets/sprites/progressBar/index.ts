import { createAsset } from 'pixi-svelte';

import img from './progressBar.webp';
import atlas from './progressBar.json';

export default createAsset({ img, atlas, preload: true });