"""
Use scatter_frame.png directly as the fsIntro board texture.
Resize it to 368×616 (atlas pixels for 460×770 display @ scale 0.8),
pack into the existing fs_screen atlas, update atlas + json.
"""
import json, os, re
from PIL import Image

DIR      = os.path.dirname(os.path.abspath(__file__))
SRC_FRAME = "/Users/stanislavmilev/Development/stake/forestSlot/apps/forest-gang/static/assets/components/frames/scatter_frame.png"
ATLAS    = os.path.join(DIR, "fs_screen.atlas")
JSON     = os.path.join(DIR, "fs_screen.json")
SRC_PNG  = os.path.join(DIR, "fs_screen.png")
OUT_PNG  = SRC_PNG
OUT_WEBP = os.path.join(DIR, "fs_screen.webp")

W,  H  = 460, 770            # Spine display units
ATL_W  = round(W * 0.8)      # 368 atlas px
ATL_H  = round(H * 0.8)      # 616 atlas px
ORIG_AH = 1243               # original atlas height before our extensions
AW      = 1744

# ── Resize scatter_frame to atlas pixel size ──────────────────────────────────
frame = Image.open(SRC_FRAME).convert("RGBA")
print(f"scatter_frame original: {frame.size}")
board = frame.resize((ATL_W, ATL_H), Image.LANCZOS)
print(f"Board resized to: {board.size}")

# ── Load original atlas base and extend ───────────────────────────────────────
existing = Image.open(SRC_PNG).convert("RGBA")
base     = existing.crop((0, 0, AW, ORIG_AH))

PAD    = 4
BX     = 2
BY     = ORIG_AH + PAD       # 1247
AH_NEW = BY + ATL_H + PAD    # 1867

print(f"Atlas: {AW}×{ORIG_AH} → {AW}×{AH_NEW}  (board at {BX},{BY})")
canvas = Image.new("RGBA", (AW, AH_NEW), (0, 0, 0, 0))
canvas.paste(base,  (0,  0))
canvas.paste(board, (BX, BY))

canvas.save(OUT_PNG)
canvas.save(OUT_WEBP, format="WEBP", quality=92)
print("Saved PNG + WEBP")

# Save preview
board.resize((ATL_W * 2, ATL_H * 2), Image.NEAREST).save("/tmp/fs_board_preview.png")

# ── Patch atlas ───────────────────────────────────────────────────────────────
with open(ATLAS) as f:
    src = f.read()

if "fs_screen_board.png" in src:
    src = src[:src.index("fs_screen_board.png")].rstrip()

src = re.sub(r"size:\d+,\d+", f"size:{AW},{AH_NEW}", src, count=1)
src = re.sub(r"\nFS_Frame_A\nbounds:.*\noffsets:.*", "", src)

ANCHOR = "FS_Frame_A_landscape\nbounds:2,5,708,541\noffsets:14,18,736,576"
INSERT = (f"{ANCHOR}\n"
          f"FS_Frame_A\nbounds:{BX},{BY},{ATL_W},{ATL_H}\noffsets:0,0,{ATL_W},{ATL_H}")
src = src.replace(ANCHOR, INSERT)

with open(ATLAS, "w") as f:
    f.write(src.rstrip() + "\n")
print("Updated: fs_screen.atlas")

# ── Patch JSON ────────────────────────────────────────────────────────────────
with open(JSON) as f:
    spine = json.load(f)
changed = 0
for skin in spine.get("skins", []):
    for slot_name, slot_atts in skin.get("attachments", {}).items():
        for att_name, att_data in slot_atts.items():
            if att_name == "FS_Frame_A" or slot_name in ("FS_Frame_A", "FS_Frame_A2"):
                att_data["width"]  = W
                att_data["height"] = H
                changed += 1
with open(JSON, "w") as f:
    json.dump(spine, f, separators=(",", ":"))
print(f"Updated: fs_screen.json  ({changed} attachment(s) → {W}×{H})")
print("Done!")
