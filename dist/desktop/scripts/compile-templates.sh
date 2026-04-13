#!/usr/bin/env bash
# compile-templates.sh — Compile OWL XML templates into renderer/js/templates.js
#
# Usage:
#   bash scripts/compile-templates.sh [OPTIONS]
#
# Options:
#   --owl-version=2.8.2        OWL release tag  (default: 2.8.2)
#   --owl-git-branch=owl-2.x   Fallback branch  (default: owl-2.x)
#   --owl-remote=<URL>         OWL git remote   (default: GitHub)
#
# The OWL repo is cloned into dist/desktop/owl/ and reused on subsequent runs.
# Delete that directory to force a fresh clone.
#
# NOTE: We only install OWL's npm deps and run compile_owl_templates.mjs directly.
# We do NOT run build:runtime or build:compiler because:
#   - The runtime (owl.iife.js) is already pre-built in renderer/js/lib/
#   - build:runtime / build:compiler use rollup which breaks on Node.js >= 24
#   - compile_owl_templates.mjs is a standalone Node script with no rollup dependency

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATES_DIR="${DESKTOP_DIR}/templates"
OUTPUT_FILE="${DESKTOP_DIR}/renderer/js/templates.js"

OWL_VERSION="${OWL_VERSION:-2.8.2}"
OWL_GIT_BRANCH="${OWL_GIT_BRANCH:-owl-2.x}"
OWL_REMOTE="${OWL_REMOTE:-https://github.com/odoo/owl.git}"
OWL_DIR="${DESKTOP_DIR}/owl"
OWL_TAG="v${OWL_VERSION}"

for arg in "$@"; do
    case "$arg" in
        --owl-version=*)    OWL_VERSION="${arg#*=}"; OWL_TAG="v${OWL_VERSION}" ;;
        --owl-git-branch=*) OWL_GIT_BRANCH="${arg#*=}" ;;
        --owl-remote=*)     OWL_REMOTE="${arg#*=}" ;;
        -h|--help) grep '^#' "$0" | sed 's/^# \?//'; exit 0 ;;
        *) echo "Unknown argument: $arg"; exit 1 ;;
    esac
done

# ── Prerequisites ──────────────────────────────────────────────────────────────
for cmd in node npm git; do
    command -v "$cmd" &>/dev/null || { echo "Error: $cmd not found."; exit 1; }
done

NODE_MAJOR="$(node --version | grep -Eo '[0-9]+' | head -1)"
echo "Node.js version: $(node --version)  (major: ${NODE_MAJOR})"

[[ -d "${TEMPLATES_DIR}" ]] || { echo "Error: templates dir not found: ${TEMPLATES_DIR}"; exit 1; }
XML_COUNT="$(find "${TEMPLATES_DIR}" -maxdepth 1 -type f -name '*.xml' ! -name '_*' | wc -l | tr -d ' ')"
[[ "${XML_COUNT}" -gt 0 ]] || { echo "Error: no XML files in ${TEMPLATES_DIR}"; exit 1; }

echo "============================================================"
echo " Therp Timer — OWL template compilation"
echo "============================================================"
echo " Templates dir : ${TEMPLATES_DIR} (${XML_COUNT} XML files)"
echo " OWL version   : ${OWL_VERSION}  (tag ${OWL_TAG})"
echo " OWL dir       : ${OWL_DIR}"
echo " Output        : ${OUTPUT_FILE}"
echo "============================================================"
echo

# ── Clone / update OWL ────────────────────────────────────────────────────────
if [[ ! -d "${OWL_DIR}/.git" ]]; then
    [[ -e "${OWL_DIR}" ]] && { echo "Error: ${OWL_DIR} exists but is not a git repo."; exit 1; }
    echo "Cloning OWL (${OWL_GIT_BRANCH})…"
    git clone "${OWL_REMOTE}" "${OWL_DIR}"
fi

[[ -f "${OWL_DIR}/package.json" ]] || { echo "Error: invalid OWL clone at ${OWL_DIR}"; exit 1; }

echo "Fetching OWL updates…"
git -C "${OWL_DIR}" fetch origin "${OWL_GIT_BRANCH}" --tags

if git -C "${OWL_DIR}" rev-parse -q --verify "refs/tags/${OWL_TAG}" >/dev/null 2>&1; then
    echo "Checking out tag ${OWL_TAG}…"
    git -C "${OWL_DIR}" checkout -f "${OWL_TAG}"
elif git -C "${OWL_DIR}" show-ref --verify --quiet "refs/remotes/origin/${OWL_GIT_BRANCH}"; then
    echo "Tag ${OWL_TAG} not found; using branch ${OWL_GIT_BRANCH}…"
    git -C "${OWL_DIR}" checkout -f "${OWL_GIT_BRANCH}"
    git -C "${OWL_DIR}" reset --hard "origin/${OWL_GIT_BRANCH}"
else
    echo "Error: neither tag ${OWL_TAG} nor branch ${OWL_GIT_BRANCH} found."; exit 1
fi

echo "Using OWL: $(git -C "${OWL_DIR}" describe --tags --always 2>/dev/null)"
echo

# ── Install npm deps (no build steps — avoids rollup/Node.js version conflicts) ─
echo "Installing OWL npm deps (deps only, no build)…"
npm --prefix "${OWL_DIR}" install --silent

# ── Locate the compiler tool ──────────────────────────────────────────────────
# OWL 2.8.x ships tools/compile_owl_templates.mjs — a standalone Node script.
# It does NOT require rollup and works on any modern Node.js version.
COMPILER_TOOL=""
for candidate in \
    "${OWL_DIR}/tools/compile_owl_templates.mjs" \
    "${OWL_DIR}/tools/compile_templates.mjs" \
    "${OWL_DIR}/tools/compile_templates.js"; do
    [[ -f "$candidate" ]] && { COMPILER_TOOL="$candidate"; break; }
done

if [[ -z "${COMPILER_TOOL}" ]]; then
    echo "Error: OWL compiler tool not found in ${OWL_DIR}/tools/"
    echo "Files present:"
    ls "${OWL_DIR}/tools/" 2>/dev/null || echo "  (tools/ directory not found)"
    exit 1
fi
echo "Using compiler: ${COMPILER_TOOL}"
echo

# ── Compile templates ─────────────────────────────────────────────────────────
rm -f "${TEMPLATES_DIR}/templates.js" "${OWL_DIR}/templates.js"

COMPILE_LOG="$(mktemp /tmp/owl-compile-XXXXXX.log)"
TMP_COMPILED="$(mktemp /tmp/owl-compiled-XXXXXX.js)"
cleanup() { rm -f "${COMPILE_LOG}" "${TMP_COMPILED}"; }
trap cleanup EXIT

echo "Compiling ${XML_COUNT} XML template(s) from ${TEMPLATES_DIR}…"
set +e
node "${COMPILER_TOOL}" "${TEMPLATES_DIR}" 2>&1 | tee "${COMPILE_LOG}"
COMPILE_EXIT="${PIPESTATUS[0]}"
set -e

if [[ "${COMPILE_EXIT}" -ne 0 ]]; then
    echo; echo "Error: OWL template compilation failed (exit ${COMPILE_EXIT})."; exit 1
fi

if grep -qi "error while compiling\|uncaught exception\|SyntaxError" "${COMPILE_LOG}"; then
    echo; echo "Error: Compilation errors detected. Check output above."; exit 1
fi

# ── Check compiled count ──────────────────────────────────────────────────────
COMPILED_COUNT="$(grep -Eo '[0-9]+ templates? compiled' "${COMPILE_LOG}" \
                  | tail -n 1 | grep -Eo '^[0-9]+' || echo '')"

if [[ -z "${COMPILED_COUNT}" ]]; then
    echo "Warning: could not parse compiled template count."
elif [[ "${COMPILED_COUNT}" -lt "${XML_COUNT}" ]]; then
    echo "Warning: compiled ${COMPILED_COUNT}/${XML_COUNT} templates."
    echo "Check templates/*.xml for syntax errors."
    echo "The app will use inline fallback templates for any missing ones."
else
    echo "All ${COMPILED_COUNT}/${XML_COUNT} templates compiled successfully."
fi

# ── Locate generated templates.js ─────────────────────────────────────────────
GENERATED_FILE=""
[[ -f "${TEMPLATES_DIR}/templates.js" ]] && GENERATED_FILE="${TEMPLATES_DIR}/templates.js"
[[ -z "${GENERATED_FILE}" && -f "${OWL_DIR}/templates.js" ]] && GENERATED_FILE="${OWL_DIR}/templates.js"
[[ -n "${GENERATED_FILE}" ]] || { echo "Error: generated templates.js not found."; exit 1; }

# ── Write final output ────────────────────────────────────────────────────────
cp "${GENERATED_FILE}" "${TMP_COMPILED}"
printf '\n// Added by scripts/compile-templates.sh\nglobalThis.__THERP_TIMER_TEMPLATES__ = templates;\n' \
    >> "${TMP_COMPILED}"

mkdir -p "$(dirname "${OUTPUT_FILE}")"
cp "${TMP_COMPILED}" "${OUTPUT_FILE}"
rm -f "${TEMPLATES_DIR}/templates.js"

echo
echo "✓ Output → ${OUTPUT_FILE}"
echo
echo "Compiled template keys:"
grep -oE '"(PopupApp|OptionsApp|MessagesApp|ReadMore)"' "${OUTPUT_FILE}" \
  | sort -u | sed 's/^/  /' || true
