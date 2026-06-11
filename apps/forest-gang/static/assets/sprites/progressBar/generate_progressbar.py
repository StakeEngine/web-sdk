"""
Generate the progress-bar spritesheet from existing game art.

Sprites produced:
  progressBarBackground.png  — hud_frame.png resized (dark wood bar + leaf corners)
  progressBarLeaf.png        — leaf cursor (game-art leaf cluster on transparent bg)

Leaf source (in order of preference):
  1. leaf_source.png  — drop your game-art leaf PNG here (preferred)
  2. bonus_buy_button_frame.png  — fallback: bottom overhang leaves, flipped upward

Atlas: 626×89 px  (2 sprites + 1px padding)
Scale: 0.25  (sprites are displayed at 1/4 source size in-game)
"""
import os, json
import numpy as np
from PIL import Image, ImageFilter

DIR = os.path.dirname(os.path.abspath(__file__))
HUD = os.path.join(DIR, '..', '..', 'components', 'frames', 'hud_frame.png')
OUT_PNG  = os.path.join(DIR, 'progressBar.png')
OUT_WEBP = os.path.join(DIR, 'progressBar.webp')
JSON_F   = os.path.join(DIR, 'progressBar.json')

FW, FH = 492, 87    # background sprite
LW, LH = 100, 111   # leaf sprite slot (listo.png, 512×568 → 0.902 aspect)
X_BG   = 1
X_LEAF = 1 + FW + 2   # 495
ATL_W  = X_LEAF + LW + 1  # 596
ATL_H  = 1 + max(FH, LH) + 1  # 113

# ── Background ────────────────────────────────────────────────────────────────
print('Generating background from hud_frame…')
hud = Image.open(HUD).convert('RGBA')
bg  = hud.resize((FW, FH), Image.LANCZOS)

# ── Leaf cursor ────────────────────────────────────────────────────────────────
# Extract the center leaf from play_button-frame (top-center cluster, on transparent bg).
print('Extracting leaf cursor from play_button-frame…')
LEAF_SRC = os.path.join(DIR, 'leaf_source.png')

LISTO = os.path.join(DIR, 'leaf_source.png')  # drop listo.png here as leaf_source.png

if os.path.exists(LISTO):
    leaf_img = Image.open(LISTO).convert('RGBA')
    print('Using leaf_source.png (listo.png)')
else:
    # Fallback: extract the top-left overhanging leaf cluster from hud_frame.
    hud_full = Image.open(HUD).convert('RGBA')
    region = hud_full.crop((0, 0, 220, 95))
    arr = np.array(region, dtype=float)
    gl, rl, al = arr[:,:,1], arr[:,:,0], arr[:,:,3]
    is_neon = (gl > 160) & (gl > rl * 2.5) & (al > 50)
    arr[:,:,3][is_neon] = 0
    leaf_raw = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    leaf_raw = leaf_raw.filter(ImageFilter.GaussianBlur(0.8))
    bbox = leaf_raw.getbbox()
    leaf_img = leaf_raw.crop(bbox) if bbox else leaf_raw
    print('Fallback: hud_frame top-left leaf overhang')

# Resize leaf to fill the slot exactly (tight fit, no padding)
leaf_slot = leaf_img.resize((LW, LH), Image.LANCZOS)

# ── Pack atlas ────────────────────────────────────────────────────────────────
print('Packing atlas…')
atlas = Image.new('RGBA', (ATL_W, ATL_H), (0, 0, 0, 0))
atlas.paste(bg,        (X_BG,   1))
atlas.paste(leaf_slot, (X_LEAF, 1))
atlas.save(OUT_PNG)
atlas.save(OUT_WEBP, format='WEBP', quality=92)
print(f'Saved: {OUT_PNG}  ({ATL_W}×{ATL_H})')

# ── Update JSON ───────────────────────────────────────────────────────────────
def frame(x, y, w, h):
    return {'frame': {'x':x,'y':y,'w':w,'h':h}, 'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x':0,'y':0,'w':w,'h':h}, 'sourceSize': {'w':w,'h':h}}

data = {
    'frames': {
        'progressBarBackground.png': frame(X_BG,   1, FW, FH),
        'progressBarLeaf.png':       frame(X_LEAF, 1, LW, LH),
    },
    'meta': {
        'app': 'custom', 'version': '1.0',
        'image': 'progressBar.webp', 'format': 'RGBA8888',
        'size': {'w': ATL_W, 'h': ATL_H}, 'scale': '0.25',
    }
}
with open(JSON_F, 'w') as f:
    json.dump(data, f, indent='\t')
print(f'Updated: {JSON_F}')
print('Done!')
