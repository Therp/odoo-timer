#!/usr/bin/env bash
# compile-templates.sh — Desktop shortcut: compiles OWL templates
# targeting dist/desktop only.
#
# Delegates to scripts/compile_owl_templates.sh with --target=desktop.
#
# Usage:
#   bash dist/desktop/scripts/compile-templates.sh [--owl-version=2.8.2] [--owl-git-branch=owl-2.x]
#
# To compile for ALL targets instead:
#   bash scripts/compile_owl_templates.sh --target=all

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ROOT_SCRIPT="$PROJECT_ROOT/scripts/compile_owl_templates.sh"

if [[ ! -f "$ROOT_SCRIPT" ]]; then
    echo "Error: root compile script not found at $ROOT_SCRIPT"
    exit 1
fi

echo "Therp Timer — compiling OWL templates for target: desktop"
echo "Delegating to: $ROOT_SCRIPT"
echo

exec bash "$ROOT_SCRIPT" --target=desktop "$@"
