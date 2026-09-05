#!/usr/bin/env bash
# compile_owl_templates.sh — Compile OWL XML templates from src/templates/ into
# templates.js and distribute to one or more dist targets.
#
# Usage:
#   bash scripts/compile_owl_templates.sh [OPTIONS]
#
# Options:
#   --target=all          Copy to chrome, firefox, and desktop (default)
#   --target=chrome       Copy only to dist/chrome/js/templates.js
#   --target=firefox      Copy only to dist/firefox/js/templates.js
#   --target=desktop      Copy only to dist/desktop/renderer/js/templates.js
#   --owl-version=2.8.2   OWL version tag to use (default: 2.8.2)
#   --owl-git-branch=...  OWL branch to fall back to (default: owl-2.x)
#   --owl-remote=...      OWL git remote URL
#
# Examples:
#   bash scripts/compile_owl_templates.sh
#   bash scripts/compile_owl_templates.sh --target=desktop
#   bash scripts/compile_owl_templates.sh --target=all --owl-version=2.8.3

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$PROJECT_ROOT/src/templates"

OWL_VERSION="2.8.2"
OWL_GIT_BRANCH="owl-2.x"
OWL_REMOTE="https://github.com/odoo/owl.git"
OWL_DIR="$PROJECT_ROOT/owl"
TARGET="all"

usage() {
    cat <<EOF
Usage: $0 [--target=all|chrome|firefox|desktop] [--owl-version=2.8.2] [--owl-git-branch=owl-2.x] [--owl-remote=URL]

Targets:
  all      chrome + firefox + desktop (default)
  chrome   dist/chrome/js/templates.js only
  firefox  dist/firefox/js/templates.js only
  desktop  dist/desktop/renderer/js/templates.js only

Defaults:
  --owl-version=2.8.2
  --owl-git-branch=owl-2.x
  --owl-remote=https://github.com/odoo/owl.git
EOF
}

for arg in "$@"; do
    case "$arg" in
        --target=*)          TARGET="${arg#*=}" ;;
        --owl-version=*)     OWL_VERSION="${arg#*=}" ;;
        --owl-git-branch=*)  OWL_GIT_BRANCH="${arg#*=}" ;;
        --owl-remote=*)      OWL_REMOTE="${arg#*=}" ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Error: unknown argument: $arg"; echo; usage; exit 1 ;;
    esac
done

# Validate target
case "$TARGET" in
    all|chrome|firefox|desktop) ;;
    *) echo "Error: unknown target '$TARGET'. Use: all, chrome, firefox, or desktop."; exit 1 ;;
esac

OWL_TAG="v$OWL_VERSION"

# ── Resolve output paths based on target ──────────────────────────────────────
declare -a OUTPUT_FILES
case "$TARGET" in
    all)
        OUTPUT_FILES=(
            "$PROJECT_ROOT/dist/chrome/js/templates.js"
            "$PROJECT_ROOT/dist/firefox/js/templates.js"
            "$PROJECT_ROOT/dist/desktop/renderer/js/templates.js"
        )
        ;;
    chrome)  OUTPUT_FILES=("$PROJECT_ROOT/dist/chrome/js/templates.js") ;;
    firefox) OUTPUT_FILES=("$PROJECT_ROOT/dist/firefox/js/templates.js") ;;
    desktop) OUTPUT_FILES=("$PROJECT_ROOT/dist/desktop/renderer/js/templates.js") ;;
esac

if [[ ! -d "$TEMPLATE_DIR" ]]; then
    echo "Error: template directory not found: $TEMPLATE_DIR"; exit 1
fi

XML_COUNT="$(find "$TEMPLATE_DIR" -maxdepth 1 -type f -name '*.xml' | wc -l | tr -d ' ')"
if [[ "$XML_COUNT" -eq 0 ]]; then
    echo "Error: no XML template files found in $TEMPLATE_DIR"; exit 1
fi

echo "============================================================"
echo "OWL template compilation"
echo "============================================================"
echo "Project root  : $PROJECT_ROOT"
echo "Template dir  : $TEMPLATE_DIR"
echo "XML files     : $XML_COUNT"
echo "OWL version   : $OWL_VERSION  (tag $OWL_TAG)"
echo "Target        : $TARGET"
printf "Output files  :\n"
for f in "${OUTPUT_FILES[@]}"; do printf "  %s\n" "$f"; done
echo "============================================================"
echo

# ── Clone / update OWL repo ───────────────────────────────────────────────────
if [[ ! -d "$OWL_DIR/.git" ]]; then
    [[ -e "$OWL_DIR" ]] && { echo "Error: $OWL_DIR exists but is not a git repo."; exit 1; }
    echo "Cloning OWL…"
    git clone "$OWL_REMOTE" "$OWL_DIR"
fi
[[ ! -f "$OWL_DIR/package.json" ]] && { echo "Error: invalid OWL clone."; exit 1; }

cd "$OWL_DIR"
echo "Fetching OWL updates…"
git fetch origin "$OWL_GIT_BRANCH" --tags

if git rev-parse -q --verify "refs/tags/$OWL_TAG" >/dev/null 2>&1; then
    echo "Checking out tag $OWL_TAG…"
    git checkout -f "$OWL_TAG"
elif git show-ref --verify --quiet "refs/remotes/origin/$OWL_GIT_BRANCH"; then
    echo "Tag $OWL_TAG not found; using branch $OWL_GIT_BRANCH…"
    git checkout -f "$OWL_GIT_BRANCH"
    git reset --hard "origin/$OWL_GIT_BRANCH"
else
    echo "Error: neither tag $OWL_TAG nor branch $OWL_GIT_BRANCH found."; exit 1
fi

CURRENT_REF="$(git describe --tags --always 2>/dev/null || git rev-parse --abbrev-ref HEAD)"
echo "Using OWL: $CURRENT_REF"

echo "Installing OWL npm deps…"; npm install
echo "Building OWL runtime…";   npm run build:runtime
echo "Building OWL compiler…";  npm run build:compiler

rm -f "$TEMPLATE_DIR/templates.js" "$OWL_DIR/templates.js"

COMPILE_LOG="$(mktemp)"; TMP_COMPILED="$(mktemp)"
cleanup() { rm -f "$COMPILE_LOG" "$TMP_COMPILED"; }
trap cleanup EXIT

echo "Compiling XML templates…"
set +e
npm run compile_templates -- "$TEMPLATE_DIR" 2>&1 | tee "$COMPILE_LOG"
COMPILE_EXIT="${PIPESTATUS[0]}"
set -e

if [[ "$COMPILE_EXIT" -ne 0 ]] || grep -q "Error while compiling" "$COMPILE_LOG"; then
    echo "Error: template compilation failed."; exit 1
fi

COMPILED_COUNT="$(grep -Eo '[0-9]+ templates compiled' "$COMPILE_LOG" | tail -n 1 | awk '{print $1}')"
if [[ -z "$COMPILED_COUNT" ]]; then
    echo "Error: could not determine compiled template count."; exit 1
fi
if [[ "$COMPILED_COUNT" != "$XML_COUNT" ]]; then
    echo "Error: compiled $COMPILED_COUNT but expected $XML_COUNT templates."; exit 1
fi

GENERATED_FILE=""
[[ -f "$TEMPLATE_DIR/templates.js" ]] && GENERATED_FILE="$TEMPLATE_DIR/templates.js"
[[ -z "$GENERATED_FILE" && -f "$OWL_DIR/templates.js" ]] && GENERATED_FILE="$OWL_DIR/templates.js"
[[ -z "$GENERATED_FILE" ]] && { echo "Error: generated templates.js not found."; exit 1; }

# Append the global registry assignment
cp "$GENERATED_FILE" "$TMP_COMPILED"
printf '\n// Added by scripts/compile_owl_templates.sh\nglobalThis.__THERP_TIMER_TEMPLATES__ = templates;\n' >> "$TMP_COMPILED"

# ── Distribute to targets ──────────────────────────────────────────────────────
echo
for OUTPUT in "${OUTPUT_FILES[@]}"; do
    mkdir -p "$(dirname "$OUTPUT")"
    cp "$TMP_COMPILED" "$OUTPUT"
    echo "Copied → $OUTPUT"
done

echo
echo "Success. $COMPILED_COUNT templates compiled for target: $TARGET"
