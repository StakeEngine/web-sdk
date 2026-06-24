type DiagnosticLevel = 'info' | 'warn' | 'error';

// CHANGE ME: update prefix to match your game name
const prefix = '[press_play_template]';

export const logDiagnostic = (level: DiagnosticLevel, code: string, payload?: Record<string, unknown>) => {
	const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
	logger(`${prefix} ${code}`, payload ?? {});
};
