#!/usr/bin/env bash
set -eu

OWL_REPO="${1:-}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$PROJECT_ROOT/src/templates"
TMP_OUT_DIR="$PROJECT_ROOT/.tmp-owl-templates"
TMP_OUT_FILE="$TMP_OUT_DIR/templates.js"

if [ -z "$OWL_REPO" ]; then
    echo "Usage: $0 /path/to/owl/Repo i.e path must be the folder containing the cloned OWL repo project files"
    exit 1
fi

if [ ! -d "$OWL_REPO" ]; then
    echo "Error: OWL repo not found: $OWL_REPO"
    exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "Error: template directory not found: $TEMPLATE_DIR"
    exit 1
fi

mkdir -p "$TMP_OUT_DIR"
rm -f "$TMP_OUT_FILE"

echo "Project root: $PROJECT_ROOT"
echo "Template dir: $TEMPLATE_DIR"
echo "OWL repo: $OWL_REPO"
echo

cd "$OWL_REPO"

npm install
npm run build:runtime
npm run build:compiler

# Compile all XML templates from src/templates
npm run compile_templates -- "$TEMPLATE_DIR"

# Try to locate generated templates.js
GENERATED_FILE=""

if [ -f "$TEMPLATE_DIR/templates.js" ]; then
    GENERATED_FILE="$TEMPLATE_DIR/templates.js"
elif [ -f "$OWL_REPO/templates.js" ]; then
    GENERATED_FILE="$OWL_REPO/templates.js"
else
    GENERATED_FILE="$(find "$PROJECT_ROOT" "$OWL_REPO" -type f -name templates.js | head -n 1 || true)"
fi

if [ -z "$GENERATED_FILE" ] || [ ! -f "$GENERATED_FILE" ]; then
    echo "Error: could not find generated templates.js after compilation"
    exit 1
fi

echo "Found generated templates file:"
echo "  $GENERATED_FILE"
echo

cp "$GENERATED_FILE" "$PROJECT_ROOT/dist/chrome/js/templates.js"
cp "$GENERATED_FILE" "$PROJECT_ROOT/dist/firefox/js/templates.js"

echo "Copied compiled templates to:"
echo "  dist/chrome/js/templates.js"
echo "  dist/firefox/js/templates.js"
echo
echo "Done."