#!/usr/bin/env python3
"""
Restyle MM_pressanywhere.png/webp to clean metallic gold.
Keeps outlines dark, remaps fill pixels to a gold gradient.
"""
import os
import numpy as np
from PIL import Image

BASE = os.path.dirname(__file__)
SRC  = os.path.join(BASE, 'MM_pressanywhere.png')
OUT_PNG  = SRC
OUT_WEBP = os.path.join(BASE, 'MM_pressanywhere.webp')

img = Image.open(SRC).convert('RGBA')
arr = np.array(img, dtype=np.float32)

R, G, B, A = arr[...,0], arr[...,1], arr[...,2], arr[...,3]

# Luminance of each pixel
lum = (R * 0.299 + G * 0.587 + B * 0.114) / 255.0  # 0..1

# Where text exists (non-transparent)
mask = A > 10

# Classify: "dark outline" pixels have low luminance
is_outline = mask & (lum < 0.35)
is_fill    = mask & (lum >= 0.35)

# Gold palette – ramp brightness 0..1 to gold gradient
# bright gold: (245, 205, 50) ; deep gold: (170, 110, 10)
# Normalised t = (lum - 0.35) / 0.65  clamped 0..1 for fill pixels
t = np.clip((lum - 0.35) / 0.65, 0, 1)

gold_r = 170 + (245 - 170) * t   # 170 → 245
gold_g = 110 + (205 - 110) * t   # 110 → 205
gold_b =  10 + ( 50 -  10) * t   #  10 →  50

out = arr.copy()
# apply gold to fill pixels
out[is_fill, 0] = gold_r[is_fill]
out[is_fill, 1] = gold_g[is_fill]
out[is_fill, 2] = gold_b[is_fill]

# darken outline slightly to deep brown (keeps legibility)
out[is_outline, 0] = 40
out[is_outline, 1] = 22
out[is_outline, 2] =  5

result = Image.fromarray(out.astype(np.uint8), 'RGBA')
result.save(OUT_PNG,  'PNG')
result.save(OUT_WEBP, 'WEBP', quality=90)
print(f'Saved gold press-to-continue: {img.size}')
