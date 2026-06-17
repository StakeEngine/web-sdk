name	sprite-sheet
description	Generate consistent sprite sheets for games using the Anchor-First Pipeline. Produces master sheets with multiple states and directions in a single image, then slices into individual sprites with automatic horizontal flipping. Use when the user asks to create sprite sheets, game sprites, character animations, unit assets, tilesets, or any batch of related images that must be visually consistent. Works alongside the gemini-image-gen skill. Triggers on "sprite sheet", "sprite", "game assets", "unit sprites", "animation frames", "tileset", "slice sprites".
Sprite Sheet Generator
Generate consistent sprite sheets using the Anchor-First Pipeline, then slice them into individual assets. Works alongside the gemini-image-gen skill.

The Problem
Individual AI image generation calls drift in style, proportions, and details. AI cannot rotate sprites — each "rotation" is a new generation that invents different details. This skill solves consistency.

The Anchor-First Pipeline
Phase 1: Anchor
Generate a single hero sprite (canonical view, idle state). The user approves it. This is the style reference for everything after.

One anchor per project/art style. If generating 5 unit types, only 1 anchor is needed — subsequent entities reference it.

python3 .claude/skills/gemini-image-gen/scripts/generate.py "<detailed prompt>" -o assets/anchor.png
Show the user. Get approval. Do not proceed until they approve.

Phase 2: Master Sheet
One Gemini call per entity. All states x 2 real directions in a single image, using the anchor as -r reference.

Grid layout: rows = states, columns = directions. Only generate 2 real directions (front-facing and back-facing). Example for 3 states:

| idle_ne    | idle_sw    |
| broken_ne  | broken_sw  |
| ghost_ne   | ghost_sw   |
python3 .claude/skills/gemini-image-gen/scripts/generate.py "<prompt>" \
  -r assets/anchor.png \
  -o assets/units/scout/scout-master.png
Phase 3: Slice + Flip
python3 .claude/skills/sprite-sheet/scripts/slice.py \
  assets/units/scout/scout-master.png \
  --rows 3 --cols 2 \
  --labels "idle_ne,idle_sw,broken_ne,broken_sw,ghost_ne,ghost_sw" \
  --flip \
  -o assets/units/scout/
This produces 12 files: 3 states x 4 directions (2 real + 2 flipped).

Prompt Engineering Rules
These rules are mandatory for all master sheet prompts.

Rule 1: Grid description is explicit and structural
Bad: "Show this robot from different angles in different states"

Good: "Generate a sprite sheet. 3 rows, 2 columns. Row 1: idle. Row 2: destroyed. Row 3: hologram. Column 1: front-right (NE). Column 2: back-left (SW)."

Rule 2: Hammer consistency language
Always include: "ALL cells must be the EXACT same entity — same proportions, same design, same details. Only the STATE and ANGLE change between cells."

Rule 3: Describe deltas, not full descriptions
Describe the anchor once, then only describe what changes per state:

Destroyed: "cracked, split open, sparks, smoke, fallen tilt, dimmed colors"
Hologram: "semi-transparent blue, scan lines, wireframe quality, ethereal glow"
Rule 4: Never ask AI to rotate — describe the camera position
Bad: "rotate 90 degrees"

Good: "front-right isometric view showing the face" vs "back-left isometric view showing the rear"

Rule 5: Reference image is mandatory after Phase 1
Every Phase 2 call uses -r anchor.png. No exceptions.

Rule 6: Specify orientation and grid layout explicitly
Gemini ignores exact pixel dimensions but respects orientation cues. For a 3-row × 2-column sheet, say "TALL sprite sheet image" or "portrait orientation, taller than wide." For 2-row × 4-column, say "WIDE sprite sheet, landscape." Also enumerate every cell explicitly:

[Row 1, Col 1] idle, front-right (NE)
[Row 1, Col 2] idle, back-left (SW)
[Row 2, Col 1] destroyed, front-right (NE)
...
Always end with "Do NOT add labels or text" — the model likes to add row labels which break slicing.

Asset Type Decision Tree
Does this asset have directional variants?
  YES → Master sheet pipeline (Phase 2 + 3)
  NO  → Single image with -r anchor

Does this asset have multiple states?
  YES → Include states as rows in the sheet
  NO  → Single image with -r anchor
Full pipeline: unit sprites, base/factory sprites — anything with directions + states.

Single image with -r anchor: icons, portraits, tiles, effects, UI mockups.

Direction Conventions
The NE/SW + flip approach is optimized for isometric views. Adapt for other projections:

Isometric: columns = NE, SW. Flip NE→NW, SW→SE.
Side-scroll: columns = right, left. Flip right→left or vice versa.
Top-down: columns as needed (N, S, E, W). Flip axis depends on symmetry.
File Organization
<project>/assets/
├── anchor.png                    # Style anchor
├── units/<entity>/
│   ├── <entity>-master.png       # Master sheet
│   ├── idle_ne.png               # Sliced sprites
│   ├── idle_nw.png               # (flipped)
│   └── ...
├── tiles/
└── ui/