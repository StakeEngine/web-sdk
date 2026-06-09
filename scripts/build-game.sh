#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAME="${1:-}"

if [[ "${GAME}" == "--" ]]; then
	GAME="${2:-}"
fi

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
pnpm --dir "${APP_DIR}" run build

TARGET_DIR="${APP_DIR}/build"
PRERENDER_INDEX="${APP_DIR}/.svelte-kit/output/prerendered/pages/index.html"
CLIENT_DIR="${APP_DIR}/.svelte-kit/output/client"
MANIFEST_FILE="${CLIENT_DIR}/.vite/manifest.json"
DIST_INDEX="${APP_DIR}/dist/index.html"
DIST_DIR="${APP_DIR}/dist"

TMP_DIR="${APP_DIR}/.build-game-tmp"
rm -rf "${TMP_DIR}"

if [[ -f "${PRERENDER_INDEX}" && -d "${CLIENT_DIR}" ]]; then
	mkdir -p "${TMP_DIR}"
	cp "${PRERENDER_INDEX}" "${TMP_DIR}/index.html"
	cp -R "${CLIENT_DIR}/." "${TMP_DIR}/"
	rm -rf "${TARGET_DIR}"
	mv "${TMP_DIR}" "${TARGET_DIR}"
	echo "Build export created at: ${TARGET_DIR}"
	exit 0
fi

if [[ -d "${CLIENT_DIR}" && -f "${MANIFEST_FILE}" ]]; then
	OLD_INDEX="${TARGET_DIR}/index.html"
	if [[ -f "${OLD_INDEX}" ]]; then
		mkdir -p "${TMP_DIR}"
		cp "${OLD_INDEX}" "${TMP_DIR}/index.html"
	fi

	rm -rf "${TARGET_DIR}"
	mkdir -p "${TARGET_DIR}"
	cp -R "${CLIENT_DIR}/." "${TARGET_DIR}/"

	if [[ -f "${TMP_DIR}/index.html" ]]; then
		mv "${TMP_DIR}/index.html" "${TARGET_DIR}/index.html"
		NEW_BUNDLE=$(node --input-type=module -e "import fs from 'node:fs'; const m = JSON.parse(fs.readFileSync('${MANIFEST_FILE}', 'utf8')); const entry = Object.values(m).find((v) => v && v.isEntry); if (!entry) process.exit(1); console.log(entry.file);")
		NEW_STYLE=$(node --input-type=module -e "import fs from 'node:fs'; const m = JSON.parse(fs.readFileSync('${MANIFEST_FILE}', 'utf8')); const style = m['style.css']; if (!style) process.exit(1); console.log(style.file);")
		perl -0pi -e "s#_app/immutable/bundle\\.[^\"']+\\.js#${NEW_BUNDLE}#g; s#_app/immutable/assets/style\\.[^\"']+\\.css#${NEW_STYLE}#g" "${TARGET_DIR}/index.html"
	fi

	echo "Build export created at: ${TARGET_DIR}"
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
