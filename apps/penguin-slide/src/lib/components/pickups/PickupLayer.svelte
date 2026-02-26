<script lang="ts">
  import { Container, SpineProvider, SpineTrack, Sprite } from 'pixi-svelte';

  type Token = {
    id: number;
    stepIndex: number;
    type: string;
    value: number;
    lane: number;
    hit: boolean;
    activate: boolean;
    spawnLane?: number;
    extra?: Record<string, unknown>;
  };

  type Pose = {
    depth: number;
    passed?: boolean;
    drop?: number;
  };

  type GlyphSprite = {
    id: string;
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };

  export let tokens: Token[] = [];
  export let renderStep = 0;
  export let viewport = { w: 0, h: 0 };
  export let tokenRender: (stepIndex: number) => Pose | null = () => null;
  export let lanePosition: (depth: number, offset: number) => { x: number; y: number; width: number } = () => ({
    x: 0,
    y: 0,
    width: 0
  });
  export let tokenScale: (depth: number) => number = () => 1;
  export let tokenSpineSize: (depth: number) => number = () => 64;
  export let coinAssetKey: (token: Token) => string = () => 'coin_bronze';
  export let itemSpawnOffset: number | (() => number) = 0;
  export let showSteps = false;
  export let stepSpacing = 0;
  export let pickupTriggerAt: (stepIndex: number, type?: string, spawnDelay?: number) => number = () => 0;

  const getSpawnOffset = () =>
    typeof itemSpawnOffset === 'function' ? itemSpawnOffset() : Number(itemSpawnOffset ?? 0);

  const PICKUP_VISUAL_SCALE = 0.32;

  const resolveLane = (token: Token) =>
    Number.isFinite(token.spawnLane ?? token.lane) ? Number(token.spawnLane ?? token.lane) : token.lane;

  const resolveAssetKey = (token: Token) => {
    if (token.type === 'coin') return coinAssetKey(token);
    if (token.type === 'star') return 'star';
    if (token.type === 'lifering') return 'lifering';
    if (token.type === 'goal') return 'goal';
    if (token.type === 'banana') return 'banana';
    return token.type || 'banana';
  };

  const getAnimationName = (token: Token) => {
    if (token.type === 'goal') return 'activate';
    if (token.activate && (token.type === 'coin' || token.type === 'star' || token.type === 'lifering' || token.type === 'banana')) {
      return 'destroy';
    }
    if (token.type === 'coin' || token.type === 'star' || token.type === 'lifering' || token.type === 'banana') {
      return 'idle';
    }
    return 'idle';
  };

  const visualSizeMultiplier = (token: Token) => {
    if (token.type === 'lifering' || token.type === 'goal') return 1.7;
    return 1;
  };

  const toFiniteNumber = (value: unknown, fallback = 0) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  };

  const formatNumberForGlyphs = (value: number) => {
    const absolute = Math.abs(value);
    const fixed = Number.isInteger(absolute) ? absolute.toString() : absolute.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
    const [intPart, decimalPart] = fixed.split('.');
    const withGrouping = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimalPart ? `${withGrouping}.${decimalPart}` : withGrouping;
  };

  const coinGlyphPrefix = (assetKey: string) => {
    if (assetKey === 'coin_gold') return 'bitmap_coins_gold_';
    if (assetKey === 'coin_silver') return 'bitmap_coins_silver_';
    return 'bitmap_coins_bronze_';
  };

  const charToGlyphKey = (prefix: string, char: string) => {
    if (char >= '0' && char <= '9') return `${prefix}${char}`;
    if (char === '.') return `${prefix}dot`;
    if (char === ',') return `${prefix}comma`;
    if (char === 'x' || char === 'X') return `${prefix}x`;
    return '';
  };

  const charWidth = (char: string, glyphHeight: number) => {
    if (char === '.' || char === ',') return glyphHeight * 0.32;
    if (char === 'x' || char === 'X') return glyphHeight * 0.72;
    return glyphHeight * 0.56;
  };

  const coinGlyphValue = (token: Token) => {
    const itemValue = String(token.extra?.item ?? token.extra?.outcome ?? '').trim();
    if (itemValue.startsWith('+')) {
      const parsed = Number(itemValue.slice(1));
      if (Number.isFinite(parsed)) return parsed;
    }
    return toFiniteNumber(token.extra?.coinValue ?? token.extra?.value ?? token.value, 0);
  };

  const buildGlyphs = (token: Token, assetKey: string, size: number, animationName: string): GlyphSprite[] => {
    if (token.type !== 'coin' && token.type !== 'star') return [];
    if (token.activate || animationName === 'destroy') return [];

    const effectiveSize = size * PICKUP_VISUAL_SCALE;
    const glyphHeight = effectiveSize * (token.type === 'star' ? 0.14 : 0.12);
    const glyphY = token.type === 'star' ? effectiveSize * 0.022 : 0;
    const spacing = glyphHeight * 0.04;

    const valueString =
      token.type === 'coin'
        ? formatNumberForGlyphs(coinGlyphValue(token))
        : `x${formatNumberForGlyphs(toFiniteNumber(token.extra?.multiplier ?? 1, 1))}`;

    const prefix = token.type === 'coin' ? coinGlyphPrefix(assetKey) : 'bitmap_mult_';
    let chars = [...valueString].filter((char) => charToGlyphKey(prefix, char));
    if (!chars.length) {
      const fallbackChars = token.type === 'star' ? ['x', '1'] : ['0'];
      chars = fallbackChars.filter((char) => charToGlyphKey(prefix, char));
    }
    if (!chars.length) return [];

    const widths = chars.map((char) => charWidth(char, glyphHeight));
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (chars.length - 1);

    let cursor = -totalWidth * 0.5;
    return chars.map((char, index) => {
      const width = widths[index] ?? glyphHeight * 0.56;
      const x = cursor + width * 0.5;
      cursor += width + spacing;
      return {
        id: `${token.id}:${index}:${char}`,
        key: charToGlyphKey(prefix, char),
        x,
        y: glyphY,
        width,
        height: glyphHeight
      };
    });
  };

  type RenderEntry = {
    token: Token;
    pose: Pose;
    assetKey: string;
    depth: number;
    offsetX: number;
    offsetY: number;
    size: number;
    scaledSize: number;
    scale: number;
    animationName: string;
    glyphs: GlyphSprite[];
  };

  $: visibleTokens = (() => {
    const { w, h } = viewport;
    void w;
    void h;
    renderStep;
    void showSteps;
    void stepSpacing;
    void pickupTriggerAt;
    return tokens
      .map((token) => {
      const pose = tokenRender(token.stepIndex);
      if (!pose) return null;
      const liveDepth = Math.max(0, Math.min(1, pose.depth ?? 0));
      const lane = token.activate
        ? toFiniteNumber(token.extra?.activatedLane, resolveLane(token))
        : resolveLane(token);
      const depth = token.activate
        ? Math.max(0, Math.min(1, toFiniteNumber(token.extra?.activatedDepth, liveDepth)))
        : liveDepth;
      const lanePos = lanePosition(depth, lane);
      const offsetY = lanePos.y + getSpawnOffset();
      const assetKey = resolveAssetKey(token);
      const size = tokenSpineSize(depth);
      const scale = tokenScale(depth);
      const animationName = getAnimationName(token);
      const sizeMultiplier = visualSizeMultiplier(token);
      return {
        token,
        pose,
        assetKey,
        depth,
        offsetX: lanePos.x,
        offsetY,
        size,
        scaledSize: size * PICKUP_VISUAL_SCALE * sizeMultiplier,
        scale,
        animationName,
        glyphs: buildGlyphs(token, assetKey, size, animationName)
      };
      })
      .filter((entry): entry is RenderEntry => entry !== null && entry.assetKey !== 'empty');
  })();
</script>

<Container>
  {#each visibleTokens as entry (entry.token.id)}
    <Container x={entry.offsetX} y={entry.offsetY}>
      <SpineProvider
        key={entry.assetKey}
        x={0}
        y={0}
        width={entry.scaledSize}
        height={entry.scaledSize}
      >
        <SpineTrack trackIndex={0} animationName={entry.animationName} loop={entry.animationName !== 'destroy'} />
      </SpineProvider>

      {#if entry.glyphs.length > 0}
        <Container>
          {#each entry.glyphs as glyph (glyph.id)}
            <Sprite
              key={glyph.key}
              x={glyph.x}
              y={glyph.y}
              width={glyph.width}
              height={glyph.height}
              anchor={{ x: 0.5, y: 0.5 }}
            />
          {/each}
        </Container>
      {/if}
    </Container>
  {/each}
</Container>
