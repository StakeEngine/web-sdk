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
  export let tokenSpineSize: (depth: number) => number = () => 64;
  export let coinAssetKey: (token: Token) => string = () => 'coin_bronze';
  export let itemSpawnOffset: number | (() => number) = 0;
  export let animationTimeScale = 1;
  export let showSteps = false;
  export let stepSpacing = 0;
  export let pickupTriggerAt: (stepIndex: number, type?: string, spawnDelay?: number) => number = () => 0;

  const getSpawnOffset = () =>
    typeof itemSpawnOffset === 'function' ? itemSpawnOffset() : Number(itemSpawnOffset ?? 0);

  const PICKUP_VISUAL_SCALE = 0.333;
  const GLOBAL_PICKUP_SIZE_MULTIPLIER = 1.0625;
  // Goal art has more transparent padding, so it needs a stronger multiplier
  // to remain the visibly largest pickup on screen.
  const GOAL_PICKUP_SIZE_MULTIPLIER = 1.734;
  const MIN_COIN_GLYPH_HEIGHT = 6.0;
  const MIN_STAR_GLYPH_HEIGHT = 5.0;

  const resolveLane = (token: Token) => {
    const lockLane = Number(token.extra?.lockLane);
    if (Number.isFinite(lockLane)) return lockLane;
    return Number.isFinite(token.spawnLane ?? token.lane) ? Number(token.spawnLane ?? token.lane) : token.lane;
  };

  const normalizeTokenType = (token: Token) => String(token.type ?? '').trim().toLowerCase();
  const isCoinType = (type: string) => type === 'coin' || type.startsWith('coin_') || type.startsWith('+');
  const isStarType = (type: string) => type === 'star' || type.startsWith('star_') || type.startsWith('x');
  const isNothingType = (type: string) =>
    !type || type === 'empty' || type === 'nothing' || type === 'none' || type === 'null' || type === 'undefined';

  const resolveAssetKey = (token: Token) => {
    const type = normalizeTokenType(token);
    if (isCoinType(type)) return coinAssetKey(token);
    if (isStarType(type)) return 'star';
    if (type === 'lifering' || type === 'life_ring' || type === 'life_vest' || type === 'lifebelt') return 'lifering';
    if (type === 'goal') return 'goal';
    if (type === 'stone' || type === 'stone_collect') return 'goal';
    if (type === 'banana' || type === 'slip' || type === 'sink') return 'banana';
    if (!type || type === 'empty' || type === 'nothing' || type === 'none' || type === 'null' || type === 'undefined') return 'empty';
    return 'empty';
  };

  const getAnimationName = (token: Token) => {
    const type = normalizeTokenType(token);
    if (type === 'goal') return 'activate';
    if (token.activate && (isCoinType(type) || isStarType(type) || type === 'lifering' || type === 'banana')) {
      return 'destroy';
    }
    if (isCoinType(type) || isStarType(type) || type === 'lifering' || type === 'banana') {
      return 'idle';
    }
    return 'idle';
  };

  const visualSizeMultiplier = (token: Token) => {
    const type = normalizeTokenType(token);
    if (type === 'lifering') return 1.7 * GLOBAL_PICKUP_SIZE_MULTIPLIER;
    if (type === 'goal') return GOAL_PICKUP_SIZE_MULTIPLIER;
    return GLOBAL_PICKUP_SIZE_MULTIPLIER;
  };

  const visualYOffset = (token: Token) => {
    const type = normalizeTokenType(token);
    if (type === 'lifering' || type === 'life_ring' || type === 'life_vest' || type === 'lifebelt') {
      const baseOffset = getSpawnOffset();
      return Math.max(12, baseOffset * 0.05);
    }
    return 0;
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
    if (char === 'x' || char === 'X') return glyphHeight * 0.62;
    return glyphHeight * 0.56;
  };

  const digitScale = (digitCount: number) => {
    if (digitCount >= 6) return 0.38;
    if (digitCount === 5) return 0.44;
    if (digitCount === 4) return 0.6;
    if (digitCount === 3) return 0.78;
    return 1;
  };

  const logGlyphIssue = (token: Token, reason: string, details: Record<string, unknown> = {}) => {
    void token;
    void reason;
    void details;
  };

  const parseFiniteNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseLooseNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/,/g, '').replace(/[^\d.+-]/g, '');
    if (!normalized || normalized === '+' || normalized === '-' || normalized === '.') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const coinGlyphValue = (token: Token) => {
    const rawValue = token.extra?.coinValue ?? token.extra?.value ?? token.value;
    const parsedValue = parseLooseNumber(rawValue) ?? parseFiniteNumber(rawValue);
    if (parsedValue != null && parsedValue > 0) {
      return parsedValue;
    }

    const outcomeRaw = String(token.extra?.item ?? token.extra?.outcome ?? '').trim();
    const fallbackOutcome = parseLooseNumber(outcomeRaw.startsWith('+') ? outcomeRaw.slice(1) : outcomeRaw);
    if (fallbackOutcome != null && fallbackOutcome > 0) {
      return fallbackOutcome;
    }

    if (parsedValue != null && parsedValue >= 0) {
      return parsedValue;
    }

    logGlyphIssue(token, 'invalid_coin_value', {
      rawValue,
      coinValue: token.extra?.coinValue,
      extraValue: token.extra?.value,
      tokenValue: token.value,
      outcomeRaw
    });
    return 1;
  };

  const buildGlyphs = (
    token: Token,
    assetKey: string,
    size: number,
    animationName: string,
    sizeMultiplier: number
  ): GlyphSprite[] => {
    const type = normalizeTokenType(token);
    const coinType = isCoinType(type);
    const starType = isStarType(type);
    if (!coinType && !starType) return [];
    if (token.activate || animationName === 'destroy') return [];

    const valueString =
      coinType
        ? formatNumberForGlyphs(coinGlyphValue(token))
        : (() => {
            const rawMultiplier = token.extra?.multiplier ?? 1;
            const parsedMultiplier = parseFiniteNumber(rawMultiplier);
            if (parsedMultiplier == null) {
              logGlyphIssue(token, 'invalid_star_multiplier', {
                rawMultiplier,
                tokenExtra: token.extra
              });
              return 'x1';
            }
            return `x${formatNumberForGlyphs(parsedMultiplier)}`;
          })();

    const prefix = coinType ? coinGlyphPrefix(assetKey) : 'bitmap_mult_';
    const rawChars = [...valueString];
    const invalidChars = rawChars.filter((char) => !charToGlyphKey(prefix, char));
    if (invalidChars.length) {
      logGlyphIssue(token, 'unsupported_glyph_characters', {
        valueString,
        prefix,
        invalidChars: Array.from(new Set(invalidChars))
      });
    }
    let chars = rawChars.filter((char) => charToGlyphKey(prefix, char));
    if (!chars.length) {
      const fallbackChars = starType ? ['x', '1'] : ['1'];
      chars = fallbackChars.filter((char) => charToGlyphKey(prefix, char));
    }
    if (!chars.length) {
      logGlyphIssue(token, 'no_glyph_sprites_generated', {
        valueString,
        prefix,
        assetKey
      });
      return [];
    }

    const effectiveSize = size * PICKUP_VISUAL_SCALE * sizeMultiplier;
    const baseGlyphHeight = effectiveSize * (starType ? 0.122 : 0.152);
    const numericDigits = chars.filter((char) => char >= '0' && char <= '9').length;
    const coinDigits = coinType ? numericDigits : 0;
    const coinScale = coinType ? digitScale(coinDigits) : 1;
    const starScale = starType ? digitScale(numericDigits) : 1;
    const singleDigitBoost =
      numericDigits === 1 ? (coinType ? 1.22 : starType ? 1.16 : 1) : 1;
    const glyphHeight = Math.max(
      baseGlyphHeight * coinScale * starScale * singleDigitBoost,
      starType ? MIN_STAR_GLYPH_HEIGHT : MIN_COIN_GLYPH_HEIGHT
    );
    const glyphY = starType ? effectiveSize * 0.022 : 0;
    const baseSpacing = glyphHeight * (starType ? 0.02 : 0.04);

    const hasMultiCoinSymbols = coinType && chars.length > 1;
    const compactCoinSpacing = coinType && coinDigits >= 3;
    const spacing = hasMultiCoinSymbols
      ? baseSpacing * (compactCoinSpacing ? 0.192 : 1.05)
      : baseSpacing;
    const widths = chars.map((char) => charWidth(char, glyphHeight));
    const advances = widths;
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (chars.length - 1);

    let cursor = -totalWidth * 0.5;
    return chars.map((char, index) => {
      const width = widths[index] ?? glyphHeight * 0.56;
      const x = cursor + width * 0.5;
      const advance = advances[index] ?? width;
      cursor += advance + spacing;
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
    const visibleEntries: RenderEntry[] = [];
    for (const token of tokens) {
      const pose = tokenRender(token.stepIndex);
      if (!pose) continue;
      const liveDepth = Math.max(0, Math.min(1, pose.depth ?? 0));
      const lane = token.activate
        ? toFiniteNumber(token.extra?.activatedLane, resolveLane(token))
        : resolveLane(token);
      const depth = token.activate
        ? Math.max(0, Math.min(1, toFiniteNumber(token.extra?.activatedDepth, liveDepth)))
        : liveDepth;
      const lanePos = lanePosition(depth, lane);
      const offsetY = lanePos.y + getSpawnOffset() + visualYOffset(token);
      const assetKey = resolveAssetKey(token);
      const tokenType = normalizeTokenType(token);
      const size = tokenSpineSize(depth);
      const animationName = getAnimationName(token);
      const sizeMultiplier = visualSizeMultiplier(token);
      const scaledSize = size * PICKUP_VISUAL_SCALE * sizeMultiplier;
      const entry = {
        token,
        pose,
        assetKey,
        depth,
        offsetX: lanePos.x,
        offsetY,
        size,
        scaledSize,
        animationName,
        glyphs: buildGlyphs(token, assetKey, size, animationName, sizeMultiplier)
      };
      if (entry.assetKey !== 'empty') visibleEntries.push(entry);
    }
    return visibleEntries;
  })();
</script>

<Container>
  {#each visibleTokens as entry (entry.token.id)}
    <Container x={entry.offsetX} y={entry.offsetY}>
      {#if entry.assetKey !== 'empty'}
        <SpineProvider
          key={entry.assetKey}
          x={0}
          y={0}
          width={entry.scaledSize}
          height={entry.scaledSize}
        >
          <SpineTrack
            trackIndex={0}
            animationName={entry.animationName}
            loop={entry.animationName !== 'destroy'}
            timeScale={animationTimeScale}
          />
        </SpineProvider>
      {/if}

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
