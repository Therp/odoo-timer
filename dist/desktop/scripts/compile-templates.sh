#!/usr/bin/env bash
# scripts/compile-templates.sh — Compile OWL XML templates for the desktop target.
#
# This script mirrors the behaviour of scripts/compile_owl_templates.sh at the
# project root but writes the compiled output into:
#
#   dist/desktop/renderer/js/templates.js
#
# Run it from the repository root (not from inside dist/desktop):
#
#   bash dist/desktop/scripts/compile-templates.sh
#
# Or with a custom OWL version:
#
#   bash dist/desktop/scripts/compile-templates.sh --owl-version=2.8.3

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DESKTOP_DIR/../.." && pwd)"

TEMPLATE_DIR="$PROJECT_ROOT/src/templates"
OWL_DIR="$PROJECT_ROOT/owl"

OWL_VERSION="${OWL_VERSION:-2.8.2}"
OWL_GIT_BRANCH="${OWL_GIT_BRANCH:-owl-2.x}"
OWL_REMOTE="${OWL_REMOTE:-https://github.com/odoo/owl.git}"

usage() {
  cat <<EOF
Usage: $0 [--owl-version=2.8.2] [--owl-git-branch=owl-2.x] [--owl-remote=URL]

Compiles OWL XML templates and writes the output to:
  $DESKTOP_DIR/renderer/js/templates.js

Defaults:
  --owl-version=2.8.2
  --owl-git-branch=owl-2.x
  --owl-remote=https://github.com/odoo/owl.git
EOF
}

for arg in "$@"; do
  case "$arg" in
    --owl-version=*)    OWL_VERSION="${arg#*=}"    ;;
    --owl-git-branch=*) OWL_GIT_BRANCH="${arg#*=}" ;;
    --owl-remote=*)     OWL_REMOTE="${arg#*=}"     ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Error: unknown argument: $arg"; echo; usage; exit 1 ;;
  esac
done

OWL_TAG="v$OWL_VERSION"
OUTPUT_FILE="$DESKTOP_DIR/renderer/js/templates.js"

echo "============================================================"
echo "OWL template compilation — Desktop target"
echo "============================================================"
echo "Project root : $PROJECT_ROOT"
echo "Template dir : $TEMPLATE_DIR"
echo "OWL dir      : $OWL_DIR"
echo "OWL version  : $OWL_VERSION  (tag $OWL_TAG)"
echo "Output       : $OUTPUT_FILE"
echo "============================================================"
echo

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "Error: template directory not found: $TEMPLATE_DIR"; exit 1
fi

XML_COUNT="$(find "$TEMPLATE_DIR" -maxdepth 1 -type f -name '*.xml' | wc -l | tr -d ' ')"
if [[ "$XML_COUNT" -eq 0 ]]; then
  echo "Error: no XML template files found in $TEMPLATE_DIR"; exit 1
fi

echo "XML files found: $XML_COUNT"
echo

# ─── Clone / update the OWL repository ───────────────────────────────────────
if [[ ! -d "$OWL_DIR/.git" ]]; then
  [[ -e "$OWL_DIR" ]] && { echo "Error: $OWL_DIR exists but is not a git repository."; exit 1; }
  echo "Cloning OWL …"; git clone "$OWL_REMOTE" "$OWL_DIR"; echo
fi

[[ ! -f "$OWL_DIR/package.json" ]] && { echo "Error: invalid OWL clone."; exit 1; }

cd "$OWL_DIR"

echo "Fetching OWL updates …"
git fetch origin "$OWL_GIT_BRANCH" --tags
echo

if git rev-parse -q --verify "refs/tags/$OWL_TAG" >/dev/null 2>&1; then
  echo "Checking out tag $OWL_TAG …"; git checkout -f "$OWL_TAG"
elif git show-ref --verify --quiet "refs/remotes/origin/$OWL_GIT_BRANCH"; then
  echo "Tag $OWL_TAG not found; using branch $OWL_GIT_BRANCH …"
  git checkout -f "$OWL_GIT_BRANCH"; git reset --hard "origin/$OWL_GIT_BRANCH"
else
  echo "Error: neither tag $OWL_TAG nor branch $OWL_GIT_BRANCH found."; exit 1
fi
echo

CURRENT_REF="$(git describe --tags --always 2>/dev/null || git rev-parse --abbrev-ref HEAD)"
echo "Using OWL ref: $CURRENT_REF"
echo

echo "Installing OWL npm deps …"; npm install; echo
echo "Building OWL runtime …";   npm run build:runtime; echo
echo "Building OWL compiler …";  npm run build:compiler; echo

rm -f "$TEMPLATE_DIR/templates.js" "$OWL_DIR/templates.js"

COMPILE_LOG="$(mktemp)"; TMP_OUT="$(mktemp)"
cleanup() { rm -f "$COMPILE_LOG" "$TMP_OUT"; }
trap cleanup EXIT

echo "Compiling XML templates …"; echo

set +e
npm run compile_templates -- "$TEMPLATE_DIR" 2>&1 | tee "$COMPILE_LOG"
COMPILE_EXIT="${PIPESTATUS[0]}"
set -e

if [[ "$COMPILE_EXIT" -ne 0 ]] || grep -q "Error while compiling" "$COMPILE_LOG"; then
  echo; echo "Error: template compilation failed."; exit 1
fi

COMPILED_COUNT="$(grep -Eo '[0-9]+ templates compiled' "$COMPILE_LOG" | tail -n 1 | awk '{print $1}')"
if [[ -z "$COMPILED_COUNT" ]]; then
  echo; echo "Error: could not determine compiled template count."; exit 1
fi
if [[ "$COMPILED_COUNT" != "$XML_COUNT" ]]; then
  echo; echo "Error: compiled count ($COMPILED_COUNT) != XML file count ($XML_COUNT)."; exit 1
fi

GENERATED_FILE=""
[[ -f "$TEMPLATE_DIR/templates.js" ]] && GENERATED_FILE="$TEMPLATE_DIR/templates.js"
[[ -z "$GENERATED_FILE" && -f "$OWL_DIR/templates.js" ]] && GENERATED_FILE="$OWL_DIR/templates.js"
[[ -z "$GENERATED_FILE" ]] && { echo "Error: generated templates.js not found."; exit 1; }

cp "$GENERATED_FILE" "$TMP_OUT"
printf '\n// Added by dist/desktop/scripts/compile-templates.sh\nglobalThis.__THERP_TIMER_TEMPLATES__ = templates;\n' >> "$TMP_OUT"

mkdir -p "$(dirname "$OUTPUT_FILE")"
mv "$TMP_OUT" "$OUTPUT_FILE"

echo
echo "Templates written to: $OUTPUT_FILE"
echo "Success."
