import type { SoundKey } from '../constants/penguinSlideAudioConstants';

export function createAutoplayController(args: {
	getAutoplay: () => boolean;
	getAutoplayRemaining: () => number;
	setAutoplayRemaining: (value: number) => void;
	setAutoplay: (value: boolean) => void;
	isRoundBusy: () => boolean;
	isSliding: () => boolean;
	getLastRoundEndAt: () => number;
	getAutoplayCooldownMs: () => number;
	play: () => void;
}) {
	let timer: ReturnType<typeof setInterval> | null = null;
	let spinDispatchLock = false;

	const start = () => {
		if (timer) return;
		timer = setInterval(() => {
			const remaining = args.getAutoplayRemaining();
			if (!args.getAutoplay() || remaining <= 0) return;
			if (spinDispatchLock) return;
			if (args.isRoundBusy() || args.isSliding()) return;
			const lastRoundEndAt = args.getLastRoundEndAt();
			if (lastRoundEndAt && performance.now() - lastRoundEndAt < args.getAutoplayCooldownMs()) return;
			spinDispatchLock = true;
			const nextRemaining = Math.max(0, remaining - 1);
			args.setAutoplayRemaining(nextRemaining);
			if (nextRemaining <= 0) {
				args.setAutoplay(false);
			}
			args.play();
			setTimeout(() => {
				spinDispatchLock = false;
			}, 250);
		}, 120);
	};

	const stop = () => {
		if (!timer) return;
		clearInterval(timer);
		timer = null;
		spinDispatchLock = false;
	};

	return { start, stop };
}

export function createHudControlHandlers(args: {
	isRoundBusy: () => boolean;
	isRoundRunning: () => boolean;
	getAutoplay: () => boolean;
	getAutoplayOpen: () => boolean;
	setAutoplay: (value: boolean) => void;
	setAutoplayRemaining: (value: number) => void;
	setAutoplayTotal: (value: number) => void;
	setAutoplayOpen: (value: boolean) => void;
	getAutoplayDraftCount: () => number;
	setAutoplayDraftCount: (value: number) => void;
	startRoundAudio: () => void | Promise<void>;
	playOneShot: (key: SoundKey) => void;
	play: () => void;
	getHudVolume: () => number;
	setHudVolumeValue: (value: number) => void;
	getMusicMuted: () => boolean;
	setMusicMuted: (value: boolean) => void;
	ensureAudioUnlocked: () => void | Promise<boolean>;
	startBackgroundMusic: () => void;
	getMenuOpen: () => boolean;
	setMenuOpen: (value: boolean) => void;
	setVolatilityHelpOpen: (value: boolean) => void;
	getVolatilityHelpOpen: () => boolean;
	setMenuInfoOpenValue: (value: boolean) => void;
	getBetIndex: () => number;
	setBetIndex: (value: number) => void;
	getBetLevels: () => number[];
	setBetAmount: (value: number) => void;
	getSpeedFactor: () => number;
	setSpeedFactor: (value: number) => void;
}) {
	const startAutoplayRun = (count: number) => {
		if (args.isRoundBusy()) return;
		args.setAutoplayTotal(count);
		args.setAutoplayRemaining(count);
		args.setAutoplay(true);
		args.setAutoplayOpen(false);
	};

	const closeOtherMenus = (except: 'menu' | 'volatility-help' | 'info' | 'autoplay' | null = null) => {
		if (except !== 'menu') args.setMenuOpen(false);
		if (except !== 'volatility-help') args.setVolatilityHelpOpen(false);
		if (except !== 'info') args.setMenuInfoOpenValue(false);
		if (except !== 'autoplay') args.setAutoplayOpen(false);
	};

	const handleBetClick = async () => {
		await args.startRoundAudio();
		args.playOneShot('start_button');
		args.setAutoplayOpen(false);
		if (args.getAutoplay()) {
			args.setAutoplay(false);
			args.setAutoplayRemaining(0);
		}
		args.play();
	};

	const setHudVolume = (value: number) => {
		const next = Math.max(0, Math.min(100, Math.round(value)));
		args.setHudVolumeValue(next);
	};

	const toggleHudMute = () => {
		const nextMuted = !args.getMusicMuted();
		args.setMusicMuted(nextMuted);
		if (!nextMuted && args.getHudVolume() > 0) {
			args.ensureAudioUnlocked();
			args.startBackgroundMusic();
		}
	};

	const toggleMenuOpen = () => {
		const nextOpen = !args.getMenuOpen();
		if (nextOpen) {
			closeOtherMenus('menu');
			args.setMenuOpen(true);
			return;
		}
		args.setMenuOpen(false);
		args.setVolatilityHelpOpen(false);
	};

	const toggleVolatilityHelp = (event?: MouseEvent) => {
		event?.stopPropagation();
		const nextOpen = !args.getVolatilityHelpOpen();
		if (nextOpen) {
			closeOtherMenus('volatility-help');
			args.setMenuOpen(true);
			args.setVolatilityHelpOpen(true);
			return;
		}
		args.setVolatilityHelpOpen(false);
	};

	const setMenuInfoOpen = (value: boolean) => {
		if (value) {
			args.setVolatilityHelpOpen(false);
			args.setAutoplayOpen(false);
		}
		args.setMenuInfoOpenValue(value);
	};

	const toggleAutoplayOpen = () => {
		const nextOpen = !args.getAutoplayOpen();
		if (nextOpen) {
			closeOtherMenus('autoplay');
			args.setAutoplayOpen(true);
			return;
		}
		args.setAutoplayOpen(false);
	};

	const setAutoplayDraft = (count: number) => {
		args.setAutoplayDraftCount(count);
	};

	const handleStartAutoplay = async () => {
		if (args.isRoundBusy()) return;
		await args.startRoundAudio();
		args.playOneShot('start_button');
		startAutoplayRun(args.getAutoplayDraftCount());
	};

	const increaseBet = () => {
		if (args.isRoundRunning() || args.getAutoplay()) return;
		args.playOneShot('ui_bet_up');
		const next = Math.min(args.getBetLevels().length - 1, args.getBetIndex() + 1);
		args.setBetIndex(next);
		args.setBetAmount(args.getBetLevels()[next]);
	};

	const decreaseBet = () => {
		if (args.isRoundRunning() || args.getAutoplay()) return;
		args.playOneShot('ui_bet_down');
		const next = Math.max(0, args.getBetIndex() - 1);
		args.setBetIndex(next);
		args.setBetAmount(args.getBetLevels()[next]);
	};

	const setSpeed = (value: number) => {
		if (args.getAutoplay()) return;
		args.setSpeedFactor(value);
	};

	const cycleSpeed = () => {
		if (args.getAutoplay()) return;
		const order = [2, 4, 6] as const;
		const currentIndex = order.indexOf(args.getSpeedFactor() as (typeof order)[number]);
		const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % order.length;
		setSpeed(order[nextIndex]);
	};

	return {
		startAutoplayRun,
		handleBetClick,
		setHudVolume,
		toggleHudMute,
		toggleMenuOpen,
		toggleVolatilityHelp,
		setMenuInfoOpen,
		toggleAutoplayOpen,
		setAutoplayDraft,
		handleStartAutoplay,
		increaseBet,
		decreaseBet,
		setSpeed,
		cycleSpeed
	};
}
