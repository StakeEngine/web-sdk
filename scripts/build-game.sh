#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAME="${1:-}"

if [[ -z "${GAME}" && -n "${npm_config_game:-}" ]]; then
	GAME="${npm_config_game}"
fi

if [[ -z "${GAME}" && -n "${npm_config_argv:-}" ]]; then
	prev=""
	while IFS= read -r token; do
		if [[ "${prev}" == "build-game" && "${token}" != "--" ]]; then
			GAME="${token}"
			break
		fi
		prev="${token}"
	done < <(printf '%s' "${npm_config_argv}" | grep -o '"[^"]*"' | tr -d '"')
fi

if [[ -z "${GAME}" ]]; then
	echo "Usage: pnpm run build-game -- <game-name>"
	echo "Example: pnpm run build-game -- penguin-slide"
	exit 1
fi

APP_DIR="${ROOT_DIR}/apps/${GAME}"
if [[ ! -d "${APP_DIR}" ]]; then
	echo "Unknown game: ${GAME}"
	echo "Expected app directory: ${APP_DIR}"
	exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
	echo "pnpm is required but was not found in PATH."
	exit 1
fi

echo "Building game: ${GAME}"
pnpm --dir "${ROOT_DIR}" run build --filter="${GAME}"

TARGET_DIR="${APP_DIR}/build"
PRERENDER_INDEX="${APP_DIR}/.svelte-kit/output/prerendered/pages/index.html"
CLIENT_DIR="${APP_DIR}/.svelte-kit/output/client"
DIST_INDEX="${APP_DIR}/dist/index.html"
DIST_DIR="${APP_DIR}/dist"

if [[ -f "${PRERENDER_INDEX}" && -d "${CLIENT_DIR}" ]]; then
	TMP_DIR="${APP_DIR}/.build-game-tmp"
	rm -rf "${TMP_DIR}"
	mkdir -p "${TMP_DIR}"
	cp "${PRERENDER_INDEX}" "${TMP_DIR}/index.html"
	cp -R "${CLIENT_DIR}/." "${TMP_DIR}/"
	rm -rf "${TARGET_DIR}"
	mv "${TMP_DIR}" "${TARGET_DIR}"
	echo "Build export created at: ${TARGET_DIR}"
	exit 0
fi

if [[ -f "${TARGET_DIR}/index.html" ]]; then
	echo "Build export available at: ${TARGET_DIR}"
	exit 0
fi

if [[ -f "${DIST_INDEX}" ]]; then
	rm -rf "${TARGET_DIR}"
	mkdir -p "${TARGET_DIR}"
	cp -R "${DIST_DIR}/." "${TARGET_DIR}/"
	echo "Build export created at: ${TARGET_DIR}"
	exit 0
fi

echo "Build finished, but no exportable output was found for ${GAME}."
echo "Checked:"
echo "  - ${PRERENDER_INDEX} + ${CLIENT_DIR}"
echo "  - ${TARGET_DIR}/index.html"
echo "  - ${DIST_INDEX}"
exit 1
