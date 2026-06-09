type ForestDiagnosticLevel = 'info' | 'warn' | 'error';

const prefix = '[forest-gang]';

export const logForestDiagnostic = (
	level: ForestDiagnosticLevel,
	code: string,
	payload?: Record<string, unknown>,
) => {
	const logger =
		level === 'error'
			? console.error
			: level === 'warn'
				? console.warn
				: console.info;

	logger(`${prefix} ${code}`, payload ?? {});
};
