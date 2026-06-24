// CHANGE ME: replace symbol names with your game's symbols
export type SymbolName =
	| 'H1' | 'H2' | 'H3' | 'H4' | 'H5'   // high-pay symbols
	| 'L1' | 'L2' | 'L3' | 'L4' | 'L5'   // low-pay symbols
	| 'WILD'
	| 'SCATTER';

export type SymbolState = 'spin' | 'land' | 'static' | 'win';
export const SYMBOL_STATES: SymbolState[] = ['spin', 'land', 'static', 'win'];

export type GameType = 'basegame' | 'freegame';

export type RawSymbol = { name: SymbolName; multiplier?: number };

export type Position = { reel: number; row: number };

export type BetMode = 'BASE' | 'BONUS';
