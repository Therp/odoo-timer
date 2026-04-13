#!/usr/bin/env bash
# compile-templates.sh — Standalone OWL template compiler for dist/desktop.
#
# Compiles all XML files in dist/desktop/templates/ and writes the output to
# dist/desktop/renderer/js/templates.js, registering every compiled template on:
#   globalThis.__THERP_TIMER_TEMPLATES__
#
# Usage:
#   bash scripts/compile-templates.sh [OPTIONS]
#
# Options:
#   --owl-version=2.8.2        OWL release tag  (default: 2.8.2)
#   --owl-git-branch=owl-2.x   Fallback branch  (default: owl-2.x)
#   --owl-remote=<URL>         OWL git remote   (default: GitHub)
#
# The OWL repo is cloned once into dist/desktop/owl/ and reused on
# subsequent runs.  Delete that directory to force a fresh clone.
#
# NOTE: The compiled templates.js is optional.  The app falls back to the
# inline createBlock()-based templates when it is absent.

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATES_DIR="${DESKTOP_DIR}/templates"
OUTPUT_FILE="${DESKTOP_DIR}/renderer/js/templates.js"

# ── OWL config (overridable via CLI flags or env) ─────────────────────────────
OWL_VERSION="${OWL_VERSION:-2.8.2}"
OWL_GIT_BRANCH="${OWL_GIT_BRANCH:-owl-2.x}"
OWL_REMOTE="${OWL_REMOTE:-https://github.com/odoo/owl.git}"
OWL_DIR="${DESKTOP_DIR}/owl"
OWL_TAG="v${OWL_VERSION}"

# ── Parse CLI arguments ───────────────────────────────────────────────────────
for arg in "$@"; do
    case "$arg" in
        --owl-version=*)    OWL_VERSION="${arg#*=}"; OWL_TAG="v${OWL_VERSION}" ;;
        --owl-git-branch=*) OWL_GIT_BRANCH="${arg#*=}" ;;
        --owl-remote=*)     OWL_REMOTE="${arg#*=}" ;;
        -h|--help)
            sed -n '/^# /s/^# //p' "$0"
            exit 0
            ;;
        *)
            echo "Error: unknown argument: $arg"
            echo "Usage: $0 [--owl-version=2.8.2] [--owl-git-branch=owl-2.x] [--owl-remote=URL]"
            exit 1
            ;;
    esac
done

# ── Validate prerequisites ────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo "Error: Node.js not found. Install Node.js >= 18."
    exit 1
fi
if ! command -v npm &>/dev/null; then
    echo "Error: npm not found. Install Node.js >= 18 (includes npm)."
    exit 1
fi
if ! command -v git &>/dev/null; then
    echo "Error: git not found."
    exit 1
fi

# ── Validate templates directory ──────────────────────────────────────────────
if [[ ! -d "${TEMPLATES_DIR}" ]]; then
    echo "Error: templates directory not found: ${TEMPLATES_DIR}"
    echo "Expected XML files at: ${TEMPLATES_DIR}/*.xml"
    exit 1
fi

XML_COUNT="$(find "${TEMPLATES_DIR}" -maxdepth 1 -type f -name '*.xml' | wc -l | tr -d ' ')"
if [[ "${XML_COUNT}" -eq 0 ]]; then
    echo "Error: no XML template files found in ${TEMPLATES_DIR}"
    exit 1
fi

echo "============================================================"
echo " Therp Timer — OWL template compilation (desktop)"
echo "============================================================"
echo " Desktop dir  : ${DESKTOP_DIR}"
echo " Templates    : ${TEMPLATES_DIR} (${XML_COUNT} XML files)"
echo " OWL version  : ${OWL_VERSION}  (tag ${OWL_TAG})"
echo " OWL dir      : ${OWL_DIR}"
echo " Output       : ${OUTPUT_FILE}"
echo "============================================================"
echo

# ── Clone or update OWL ───────────────────────────────────────────────────────
if [[ ! -d "${OWL_DIR}/.git" ]]; then
    if [[ -e "${OWL_DIR}" ]]; then
        echo "Error: ${OWL_DIR} exists but is not a git repository."
        echo "Remove it and re-run to clone fresh."
        exit 1
    fi
    echo "Cloning OWL (${OWL_REMOTE}, branch ${OWL_GIT_BRANCH})…"
    git clone "${OWL_REMOTE}" "${OWL_DIR}"
fi

[[ ! -f "${OWL_DIR}/package.json" ]] && {
    echo "Error: ${OWL_DIR}/package.json not found — OWL clone may be corrupt."
    exit 1
}

echo "Fetching OWL updates…"
git -C "${OWL_DIR}" fetch origin "${OWL_GIT_BRANCH}" --tags

# Prefer the exact version tag; fall back to the branch tip
if git -C "${OWL_DIR}" rev-parse -q --verify "refs/tags/${OWL_TAG}" >/dev/null 2>&1; then
    echo "Checking out tag ${OWL_TAG}…"
    git -C "${OWL_DIR}" checkout -f "${OWL_TAG}"
elif git -C "${OWL_DIR}" show-ref --verify --quiet "refs/remotes/origin/${OWL_GIT_BRANCH}"; then
    echo "Tag ${OWL_TAG} not found; using branch tip of ${OWL_GIT_BRANCH}…"
    git -C "${OWL_DIR}" checkout -f "${OWL_GIT_BRANCH}"
    git -C "${OWL_DIR}" reset --hard "origin/${OWL_GIT_BRANCH}"
else
    echo "Error: neither tag ${OWL_TAG} nor branch ${OWL_GIT_BRANCH} found in ${OWL_REMOTE}."
    exit 1
fi

CURRENT_REF="$(git -C "${OWL_DIR}" describe --tags --always 2>/dev/null \
                || git -C "${OWL_DIR}" rev-parse --abbrev-ref HEAD)"
echo "Using OWL: ${CURRENT_REF}"
echo

# ── Install OWL npm dependencies ──────────────────────────────────────────────
echo "Installing OWL npm dependencies…"
npm --prefix "${OWL_DIR}" install --silent

# ── Build OWL (runtime + compiler) ───────────────────────────────────────────
ROLLUP_BIN="${OWL_DIR}/node_modules/rollup/dist/bin/rollup"
if [[ ! -f "${ROLLUP_BIN}" ]]; then
    echo "Error: Rollup binary not found after npm install: ${ROLLUP_BIN}"
    exit 1
fi

echo "Building OWL runtime…"
(
    cd "${OWL_DIR}"
    node "./node_modules/rollup/dist/bin/rollup" -c --failAfterWarnings runtime
)

echo "Building OWL compiler…"
(
    cd "${OWL_DIR}"
    node "./node_modules/rollup/dist/bin/rollup" -c --failAfterWarnings compiler
)
echo

# ── Run the OWL template compiler ────────────────────────────────────────────
# The OWL compile_templates script reads all *.xml files in the given directory
# and writes templates.js into the same directory.
rm -f "${TEMPLATES_DIR}/templates.js" "${OWL_DIR}/templates.js"

COMPILE_LOG="$(mktemp /tmp/owl-compile-log-XXXXXX)"
TMP_COMPILED="$(mktemp /tmp/owl-compiled-XXXXXX.js)"
cleanup() { rm -f "${COMPILE_LOG}" "${TMP_COMPILED}"; }
trap cleanup EXIT

echo "Compiling ${XML_COUNT} XML template(s) from ${TEMPLATES_DIR}…"
set +e
(
    cd "${OWL_DIR}"
    npm run compile_templates -- "${TEMPLATES_DIR}"
) 2>&1 | tee "${COMPILE_LOG}"
COMPILE_EXIT="${PIPESTATUS[0]}"
set -e

# ── Run the OWL template compiler ────────────────────────────────────────────
# The OWL compile_templates script reads all *.xml files in the given directory
# and writes templates.js into the same directory.
rm -f "${TEMPLATES_DIR}/templates.js" "${OWL_DIR}/templates.js"

COMPILE_LOG="$(mktemp /tmp/owl-compile-log-XXXXXX)"
TMP_COMPILED="$(mktemp /tmp/owl-compiled-XXXXXX.js)"
cleanup() { rm -f "${COMPILE_LOG}" "${TMP_COMPILED}"; }
trap cleanup EXIT

echo "Compiling ${XML_COUNT} XML template(s) from ${TEMPLATES_DIR}…"
set +e
npm --prefix "${OWL_DIR}" run compile_templates -- "${TEMPLATES_DIR}" \
    2>&1 | tee "${COMPILE_LOG}"
COMPILE_EXIT="${PIPESTATUS[0]}"
set -e

if [[ "${COMPILE_EXIT}" -ne 0 ]] || grep -q "Error while compiling" "${COMPILE_LOG}"; then
    echo
    echo "Error: OWL template compilation failed (exit ${COMPILE_EXIT})."
    echo "Review the output above for details."
    exit 1
fi

# Verify expected template count
COMPILED_COUNT="$(grep -Eo '[0-9]+ templates compiled' "${COMPILE_LOG}" \
                  | tail -n 1 | awk '{print $1}' || true)"
if [[ -z "${COMPILED_COUNT}" ]]; then
    echo "Warning: could not confirm compiled template count from compiler output."
elif [[ "${COMPILED_COUNT}" != "${XML_COUNT}" ]]; then
    echo "Error: compiled ${COMPILED_COUNT} template(s) but expected ${XML_COUNT}."
    exit 1
fi

# Locate the generated templates.js
GENERATED_FILE=""
[[ -f "${TEMPLATES_DIR}/templates.js" ]] && GENERATED_FILE="${TEMPLATES_DIR}/templates.js"
[[ -z "${GENERATED_FILE}" && -f "${OWL_DIR}/templates.js" ]] \
    && GENERATED_FILE="${OWL_DIR}/templates.js"
if [[ -z "${GENERATED_FILE}" ]]; then
    echo "Error: generated templates.js not found in ${TEMPLATES_DIR} or ${OWL_DIR}."
    exit 1
fi

# ── Append global registry assignment and write output ────────────────────────
cp "${GENERATED_FILE}" "${TMP_COMPILED}"
printf '\n// Added by scripts/compile-templates.sh\nglobalThis.__THERP_TIMER_TEMPLATES__ = templates;\n' \
    >> "${TMP_COMPILED}"

mkdir -p "$(dirname "${OUTPUT_FILE}")"
cp "${TMP_COMPILED}" "${OUTPUT_FILE}"

# Clean up the generated file from the templates directory
rm -f "${TEMPLATES_DIR}/templates.js"

echo
echo "✓ ${COMPILED_COUNT:-?} template(s) compiled → ${OUTPUT_FILE}"
echo
echo "Template keys:"
grep -o '"[A-Za-z]*App"\|"ReadMore"' "${OUTPUT_FILE}" | sort -u | sed 's/^/  /' || true