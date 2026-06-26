#!/usr/bin/env python3
"""
Compose new splash.jpg:
  - design.png as background (cover-crop to 1440×1024)
  - forest_gang_logo.png centred at top area
Also regenerate press-to-continue sprite sheet with clean gold style.
"""

import os
import json
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

BASE = os.path.dirname(__file__)
ROOT = os.path.join(BASE, '..', '..', '..', '..')

BG_SRC   = os.path.expanduser('~/Downloads/design.png')
LOGO_SRC = os.path.join(ROOT, 'static/assets/components/ui/forest_gang_logo.png')
OUT_JPG  = os.path.join(BASE, 'splash.jpg')
OUT_WEBP = os.path.join(BASE, 'splash.webp')

W, H = 1920, 1080

# ── 1. Background ────────────────────────────────────────────────────────────
bg_orig = Image.open(BG_SRC).convert('RGBA')
bw, bh = bg_orig.size

# cover-scale: scale so both dims >= target
scale = max(W / bw, H / bh)
new_w = int(bw * scale)
new_h = int(bh * scale)
bg_scaled = bg_orig.resize((new_w, new_h), Image.LANCZOS)

# centre-crop
cx = (new_w - W) // 2
cy = (new_h - H) // 2
bg = bg_scaled.crop((cx, cy, cx + W, cy + H))

# ── 2. Logo overlay ──────────────────────────────────────────────────────────
logo = Image.open(LOGO_SRC).convert('RGBA')
lw, lh = logo.size

# Scale logo to ~38.5% of canvas width (original 55% reduced by 30%)
target_lw = int(W * 0.385)
target_lh = int(lh * target_lw / lw)
logo_scaled = logo.resize((target_lw, target_lh), Image.LANCZOS)

# Centre horizontally, sit in upper third
lx = (W - target_lw) // 2
ly = int(H * 0.04)

canvas = Image.new('RGBA', (W, H))
canvas.paste(bg, (0, 0))
canvas.paste(logo_scaled, (lx, ly), logo_scaled)

# ── 3. Save ──────────────────────────────────────────────────────────────────
final = canvas.convert('RGB')
final.save(OUT_JPG, 'JPEG', quality=95, optimize=True)
final.save(OUT_WEBP, 'WEBP', quality=90)
print(f'Saved splash {W}×{H}')
print(f'  {OUT_JPG}')
print(f'  {OUT_WEBP}')
