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
for cmd in node npm git python3; do
    command -v "$cmd" &>/dev/null || { echo "Error: $cmd not found."; exit 1; }
done

NODE_MAJOR="$(node --version | grep -Eo '[0-9]+' | head -1)"
echo "Node.js version: $(node --version)  (major: ${NODE_MAJOR})"

[[ -d "${TEMPLATES_DIR}" ]] || { echo "Error: templates dir not found: ${TEMPLATES_DIR}"; exit 1; }
XML_FILES=("${TEMPLATES_DIR}/"*.xml)
XML_COUNT="${#XML_FILES[@]}"
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

# ── Pre-flight: validate XML well-formedness before invoking the compiler ──────
# The OWL compiler silently skips templates with invalid XML, giving a confusing
# "N templates compiled" count with no error message. Catching it here gives a
# clear error pointing to the exact file and line.
echo "Validating XML files…"
XML_ERRORS=0
for xml_file in "${XML_FILES[@]}"; do
    xml_name="$(basename "${xml_file}")"
    error_msg="$(python3 -c "
import xml.etree.ElementTree as ET, sys
try:
    ET.parse('${xml_file}')
except ET.ParseError as e:
    print(f'  ✗ ${xml_name}: {e}')
    sys.exit(1)
" 2>&1)" || {
        echo "${error_msg}"
        XML_ERRORS=$((XML_ERRORS + 1))
    }
    [[ "${XML_ERRORS}" -eq 0 ]] && true || true
done

# Print per-file status after the loop
for xml_file in "${XML_FILES[@]}"; do
    xml_name="$(basename "${xml_file}")"
    if python3 -c "
import xml.etree.ElementTree as ET, sys
try:
    ET.parse('${xml_file}')
except ET.ParseError as e:
    sys.exit(1)
" 2>/dev/null; then
        echo "  ✓ ${xml_name}"
    else
        err="$(python3 -c "
import xml.etree.ElementTree as ET
try:
    ET.parse('${xml_file}')
except ET.ParseError as e:
    print(e)
" 2>&1)"
        echo "  ✗ ${xml_name}: ${err}"
        XML_ERRORS=$((XML_ERRORS + 1))
    fi
done

if [[ "${XML_ERRORS}" -gt 0 ]]; then
    echo
    echo "Error: ${XML_ERRORS} XML file(s) failed validation."
    echo "Fix the errors above before running the compiler."
    echo
    echo "Common causes:"
    echo "  • Unescaped & in expressions — use &amp;&amp; instead of &&"
    echo "  • Unescaped < — use &lt;"
    echo "  • if ( ) in t-on-* handlers — OWL treats 'if' as a context var; use ternary or a method"
    exit 1
fi
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

# ── Install npm deps ──────────────────────────────────────────────────────────
echo "Installing OWL npm deps (deps only, no build)…"
npm --prefix "${OWL_DIR}" install --silent

# ── Locate the compiler tool ──────────────────────────────────────────────────
COMPILER_TOOL=""
for candidate in \
    "${OWL_DIR}/tools/compile_owl_templates.mjs" \
    "${OWL_DIR}/tools/compile_templates.mjs" \
    "${OWL_DIR}/tools/compile_templates.js"; do
    [[ -f "$candidate" ]] && { COMPILER_TOOL="$candidate"; break; }
done

if [[ -z "${COMPILER_TOOL}" ]]; then
    echo "Error: OWL compiler tool not found in ${OWL_DIR}/tools/"
    ls "${OWL_DIR}/tools/" 2>/dev/null || echo "  (tools/ directory not found)"
    exit 1
fi
echo "Using compiler: ${COMPILER_TOOL}"
echo

# ── Compile templates ─────────────────────────────────────────────────────────
# Run from TEMPLATES_DIR so the OWL compiler writes templates.js there.
# (The compiler always outputs to the current working directory.)
rm -f "${TEMPLATES_DIR}/templates.js"

COMPILE_LOG="$(mktemp /tmp/owl-compile-XXXXXX.log)"
TMP_COMPILED="$(mktemp /tmp/owl-compiled-XXXXXX.js)"
cleanup() { rm -f "${COMPILE_LOG}" "${TMP_COMPILED}"; }
trap cleanup EXIT

# ── Per-file dry-run: compile each XML individually to show what each produces ─
# This runs BEFORE the main compile so errors are visible per-file.
echo "Per-file compilation check:"
PER_FILE_ERRORS=0
for xml_file in "${XML_FILES[@]}"; do
    xml_name="$(basename "${xml_file}")"
    tmp_dir="$(mktemp -d /tmp/owl-single-XXXXXX)"
    cp "${xml_file}" "${tmp_dir}/"
    per_out="$(cd "${tmp_dir}" && node "${COMPILER_TOOL}" . 2>&1)"
    per_count="$(echo "${per_out}" | grep -oE '^[0-9]+' | tail -1)"
    rm -rf "${tmp_dir}"

    if echo "${per_out}" | grep -qi "OwlError\|Error while compiling\|SyntaxError"; then
        echo "  ✗ ${xml_name}"
        echo "${per_out}" | grep -E "OwlError:|Error:|cause:" | sed 's/^/      /'
        PER_FILE_ERRORS=$((PER_FILE_ERRORS + 1))
    elif [[ "${per_count}" == "0" ]]; then
        echo "  ✗ ${xml_name} — compiled 0 templates (silent failure)"
        echo "      Hint: run 'python3 -c \"import xml.etree.ElementTree as ET; ET.parse(\\\"${xml_file}\\\")\"'"
        echo "            to check for XML parse errors."
        PER_FILE_ERRORS=$((PER_FILE_ERRORS + 1))
    else
        # Extract template name(s) from the per-file output
        tname=""
        if [[ -f "${tmp_dir}/../templates.js" ]]; then
            tname="$(grep -oE '"[A-Za-z]+"' "${tmp_dir}/../templates.js" | head -1)"
        fi
        echo "  ✓ ${xml_name} — ${per_count} template(s)"
    fi
done

if [[ "${PER_FILE_ERRORS}" -gt 0 ]]; then
    echo
    echo "Error: ${PER_FILE_ERRORS} file(s) failed per-file check."
    echo
    echo "OWL 2.x template restrictions (common pitfalls):"
    echo "  • Unescaped &  → use &amp;&amp; for &&, &amp; for &"
    echo "  • String(x)    → OWL compiles as ctx['String'](x) which is undefined"
    echo "                   Use '' + x  instead"
    echo "  • Number(x)    → Same issue. Use +x or parseInt(x,10) — but note parseInt"
    echo "                   also fails! Best: pass ev.target.value directly (it's a string)"
    echo "                   or extract logic to a component method"
    echo "  • if (...)     → OWL treats 'if' as ctx['if']. Use ternary: cond ? a : b"
    echo "  • Math.xxx     → ctx['Math'] is undefined. Add a component getter: get Math() { return Math; }"
    exit 1
fi
echo

# ── Main compilation (all files together → single templates.js output) ─────────
echo "Compiling all ${XML_COUNT} template(s) together…"
set +e
(cd "${TEMPLATES_DIR}" && node "${COMPILER_TOOL}" .) 2>&1 | tee "${COMPILE_LOG}"
COMPILE_EXIT="${PIPESTATUS[0]}"
set -e

if [[ "${COMPILE_EXIT}" -ne 0 ]]; then
    echo; echo "Error: OWL template compilation failed (exit ${COMPILE_EXIT})."; exit 1
fi

if grep -qi "error while compiling\|uncaught exception\|SyntaxError\|OwlError" "${COMPILE_LOG}"; then
    echo
    echo "Error: Template compilation errors detected — see output above."
    exit 1
fi

# ── Verify compiled count vs expected ─────────────────────────────────────────
COMPILED_COUNT="$(grep -Eo '[0-9]+ templates? compiled' "${COMPILE_LOG}" \
                  | tail -n 1 | grep -Eo '^[0-9]+' || echo '')"

EXPECTED_KEYS=("MessagesApp" "OptionsApp" "PopupApp" "ReadMore")

if [[ -z "${COMPILED_COUNT}" ]]; then
    echo "Warning: could not parse compiled template count."
elif [[ "${COMPILED_COUNT}" -lt "${XML_COUNT}" ]]; then
    echo
    echo "Error: compiled ${COMPILED_COUNT}/${XML_COUNT} templates — some templates were silently dropped."
    GENERATED="${TEMPLATES_DIR}/templates.js"
    if [[ -f "${GENERATED}" ]]; then
        echo "Missing template keys:"
        for key in "${EXPECTED_KEYS[@]}"; do
            if ! grep -q "\"${key}\"" "${GENERATED}" 2>/dev/null; then
                echo "  ✗ ${key}"
            fi
        done
    fi
    exit 1
fi

echo "All ${COMPILED_COUNT}/${XML_COUNT} templates compiled successfully."

# ── Locate and finalize output ────────────────────────────────────────────────
GENERATED_FILE="${TEMPLATES_DIR}/templates.js"
[[ -f "${GENERATED_FILE}" ]] || { echo "Error: generated templates.js not found in ${TEMPLATES_DIR}."; exit 1; }

cp "${GENERATED_FILE}" "${TMP_COMPILED}"
printf '\n// Added by scripts/compile-templates.sh\nglobalThis.__THERP_TIMER_TEMPLATES__ = templates;\n' \
    >> "${TMP_COMPILED}"

mkdir -p "$(dirname "${OUTPUT_FILE}")"
cp "${TMP_COMPILED}" "${OUTPUT_FILE}"
rm -f "${GENERATED_FILE}"

echo
echo "✓ Output → ${OUTPUT_FILE}"
echo
echo "Compiled template keys:"
grep -oE '"(PopupApp|OptionsApp|MessagesApp|ReadMore)"' "${OUTPUT_FILE}" \
  | sort -u | sed 's/^/  /' || true
