import type config from './config';

export type SymbolName = keyof typeof config.symbols;
export type PaySymbolName = Exclude<SymbolName, 'MAGNET' | 'SCATTER'>;
export type BetMode = keyof typeof config.betModes;
export type GameType = 'basegame' | 'freegame' | 'superspin' | 'feature';
export type SeriesKind = 'natural' | 'magnet' | 'super';

export type RawSymbol = {
	name: SymbolName;
	multiplier?: number;
	scatter?: boolean;
	magnet?: boolean;
};

export const SYMBOL_STATES = ['static', 'spin', 'land', 'win', 'locked', 'magnet'] as const;
export type SymbolState = (typeof SYMBOL_STATES)[number];

export type Position = {
	reel: number;
	row: number;
};

export type ClusterSeriesSnapshot = {
	id: string;
	symbol: PaySymbolName;
	kind: SeriesKind;
	anchorPositions: Position[];
	lockedPositions: Position[];
	multiplier: number;
	persistent: boolean;
};

export type BoardCell = RawSymbol & {
	key: string;
	position: Position;
	symbolState: SymbolState;
	locked: boolean;
	highlighted: boolean;
	anchor: boolean;
	target: boolean;
	persistent: boolean;
	fresh: boolean;
};
