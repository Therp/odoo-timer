#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$PROJECT_ROOT/src/templates"

OWL_VERSION="2.8.2"
OWL_GIT_BRANCH="owl-2.x"
OWL_REMOTE="https://github.com/odoo/owl.git"
OWL_DIR="$PROJECT_ROOT/owl"

usage() {
    cat <<EOF
Usage:
  $0 [--owl-version=2.8.2] [--owl-git-branch=owl-2.x] [--owl-remote=https://github.com/odoo/owl.git]

Examples:
  $0
  $0 --owl-version=2.8.3 --owl-git-branch=owl-2.x
  $0 --owl-version=2.8.2 --owl-git-branch=owl-2.x --owl-remote=https://github.com/odoo/owl.git

Defaults:
  --owl-version=2.8.2
  --owl-git-branch=owl-2.x
  --owl-remote=https://github.com/odoo/owl.git

Behavior:
  - clones or reuses: ./owl
  - prefers exact tag: v<version>
  - falls back to branch if the tag is unavailable
  - compiles XML templates from: src/templates
  - copies output to:
      dist/chrome/js/templates.js
      dist/firefox/js/templates.js
EOF
}

for arg in "$@"; do
    case "$arg" in
        --owl-version=*)
            OWL_VERSION="${arg#*=}"
            ;;
        --owl-git-branch=*)
            OWL_GIT_BRANCH="${arg#*=}"
            ;;
        --owl-remote=*)
            OWL_REMOTE="${arg#*=}"
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Error: unknown argument: $arg"
            echo
            usage
            exit 1
            ;;
    esac
done

OWL_TAG="v$OWL_VERSION"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
    echo "Error: template directory not found:"
    echo "  $TEMPLATE_DIR"
    exit 1
fi

XML_COUNT="$(find "$TEMPLATE_DIR" -maxdepth 1 -type f -name '*.xml' | wc -l | tr -d ' ')"
if [[ "$XML_COUNT" -eq 0 ]]; then
    echo "Error: no XML template files found in:"
    echo "  $TEMPLATE_DIR"
    exit 1
fi

echo "============================================================"
echo "OWL template compilation"
echo "============================================================"
echo "Project root     : $PROJECT_ROOT"
echo "Template dir     : $TEMPLATE_DIR"
echo "OWL repo dir     : $OWL_DIR"
echo "OWL remote       : $OWL_REMOTE"
echo "OWL version      : $OWL_VERSION"
echo "OWL git branch   : $OWL_GIT_BRANCH"
echo "Preferred git tag: $OWL_TAG"
echo "XML files found  : $XML_COUNT"
echo "============================================================"
echo

if [[ ! -d "$OWL_DIR/.git" ]]; then
    if [[ -e "$OWL_DIR" ]]; then
        echo "Error: $OWL_DIR exists but is not a git repository."
        exit 1
    fi

    echo "Cloning OWL repository into:"
    echo "  $OWL_DIR"
    git clone "$OWL_REMOTE" "$OWL_DIR"
    echo
fi

if [[ ! -f "$OWL_DIR/package.json" ]]; then
    echo "Error: invalid OWL repository, expected file missing:"
    echo "  $OWL_DIR/package.json"
    exit 1
fi

cd "$OWL_DIR"

echo "Fetching OWL repository updates..."
git fetch origin "$OWL_GIT_BRANCH" --tags
echo

if git rev-parse -q --verify "refs/tags/$OWL_TAG" >/dev/null 2>&1; then
    echo "Checking out exact OWL tag: $OWL_TAG"
    git checkout -f "$OWL_TAG"
elif git show-ref --verify --quiet "refs/remotes/origin/$OWL_GIT_BRANCH"; then
    echo "Exact tag $OWL_TAG not found."
    echo "Falling back to branch: $OWL_GIT_BRANCH"
    git checkout -f "$OWL_GIT_BRANCH"
    git reset --hard "origin/$OWL_GIT_BRANCH"
else
    echo "Error: neither tag $OWL_TAG nor remote branch origin/$OWL_GIT_BRANCH was found."
    exit 1
fi
echo

CURRENT_COMMIT="$(git rev-parse --short HEAD)"
CURRENT_REF="$(git describe --tags --always 2>/dev/null || git rev-parse --abbrev-ref HEAD)"

echo "Using OWL source:"
echo "  ref    : $CURRENT_REF"
echo "  commit : $CURRENT_COMMIT"
echo

echo "Installing npm dependencies..."
npm install
echo

echo "Building OWL runtime..."
npm run build:runtime
echo

echo "Building OWL compiler..."
npm run build:compiler
echo

echo "Cleaning old generated templates..."
rm -f "$TEMPLATE_DIR/templates.js"
rm -f "$OWL_DIR/templates.js"
echo

COMPILE_LOG="$(mktemp)"
TMP_CHROME="$(mktemp)"
TMP_FIREFOX="$(mktemp)"

cleanup() {
    rm -f "$COMPILE_LOG" "$TMP_CHROME" "$TMP_FIREFOX"
}
trap cleanup EXIT

echo "Compiling XML templates from:"
echo "  $TEMPLATE_DIR"
echo

set +e
npm run compile_templates -- "$TEMPLATE_DIR" 2>&1 | tee "$COMPILE_LOG"
COMPILE_EXIT="${PIPESTATUS[0]}"
set -e

if [[ "$COMPILE_EXIT" -ne 0 ]]; then
    echo
    echo "Error: OWL compile command failed."
    echo "Aborting without copying templates.js."
    exit 1
fi

if grep -q "Error while compiling" "$COMPILE_LOG"; then
    echo
    echo "Error: one or more XML templates failed to compile."
    echo "Aborting without copying templates.js."
    exit 1
fi

COMPILED_COUNT="$(
    grep -Eo '[0-9]+ templates compiled' "$COMPILE_LOG" \
        | tail -n 1 \
        | awk '{print $1}'
)"

if [[ -z "$COMPILED_COUNT" ]]; then
    echo
    echo "Error: could not determine compiled template count."
    echo "Aborting without copying templates.js."
    exit 1
fi

if [[ "$COMPILED_COUNT" != "$XML_COUNT" ]]; then
    echo
    echo "Error: compiled template count does not match XML file count."
    echo "  XML files    : $XML_COUNT"
    echo "  Compiled     : $COMPILED_COUNT"
    echo "Aborting without copying templates.js."
    exit 1
fi

GENERATED_FILE=""
if [[ -f "$TEMPLATE_DIR/templates.js" ]]; then
    GENERATED_FILE="$TEMPLATE_DIR/templates.js"
elif [[ -f "$OWL_DIR/templates.js" ]]; then
    GENERATED_FILE="$OWL_DIR/templates.js"
fi

if [[ -z "$GENERATED_FILE" || ! -f "$GENERATED_FILE" ]]; then
    echo
    echo "Error: could not find generated templates.js after successful compilation."
    exit 1
fi

echo
echo "Generated templates file:"
echo "  $GENERATED_FILE"
echo

cp "$GENERATED_FILE" "$TMP_CHROME"
cp "$GENERATED_FILE" "$TMP_FIREFOX"

printf '\n// Added by scripts/compile_owl_templates.sh\nglobalThis.__THERP_TIMER_TEMPLATES__ = templates;\n' >> "$TMP_CHROME"
printf '\n// Added by scripts/compile_owl_templates.sh\nglobalThis.__THERP_TIMER_TEMPLATES__ = templates;\n' >> "$TMP_FIREFOX"

mkdir -p "$PROJECT_ROOT/dist/chrome/js" "$PROJECT_ROOT/dist/firefox/js"

mv "$TMP_CHROME" "$PROJECT_ROOT/dist/chrome/js/templates.js"
mv "$TMP_FIREFOX" "$PROJECT_ROOT/dist/firefox/js/templates.js"

echo "Copied compiled templates to:"
echo "  $PROJECT_ROOT/dist/chrome/js/templates.js"
echo "  $PROJECT_ROOT/dist/firefox/js/templates.js"
echo
echo "Success."
echo
echo "Recommended .gitignore entry:"
echo "  /owl/"