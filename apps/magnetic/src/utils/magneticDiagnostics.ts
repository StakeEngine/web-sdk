type ForestDiagnosticLevel = 'info' | 'warn' | 'error';

const prefix = '[magnetic]';

export const logMagneticDiagnostic = (
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
