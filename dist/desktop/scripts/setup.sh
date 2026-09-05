#!/usr/bin/env bash
# scripts/setup.sh — Bootstrap the desktop development environment.
#
# Uses nodeenv (installed via pip into an isolated Python venv) to avoid
# touching the system-wide Node installation, mirroring the pattern used by
# the browser-extension build toolchain.
#
# Usage:
#   bash scripts/setup.sh [--nodeenv-dir=.nodeenv] [--tools-venv=.tools-venv]
#
# After running this script:
#   1. Activate the Node environment:  . .nodeenv/bin/activate
#   2. Install npm dependencies:       npm install
#   3. Start the app:                  npm start

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

NODEENV_DIR="${NODEENV_DIR:-$DESKTOP_DIR/.nodeenv}"
TOOLS_VENV="${TOOLS_VENV:-$DESKTOP_DIR/.tools-venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

# ─── Parse arguments ──────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --nodeenv-dir=*) NODEENV_DIR="${arg#*=}" ;;
    --tools-venv=*)  TOOLS_VENV="${arg#*=}"  ;;
    -h|--help)
      echo "Usage: $0 [--nodeenv-dir=PATH] [--tools-venv=PATH]"
      exit 0 ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

echo "============================================================"
echo "Therp Timer Desktop — environment setup"
echo "============================================================"
echo "Desktop dir  : $DESKTOP_DIR"
echo "Python bin   : $PYTHON_BIN"
echo "Tools venv   : $TOOLS_VENV"
echo "nodeenv dir  : $NODEENV_DIR"
echo "============================================================"
echo

# ─── Python tooling venv ──────────────────────────────────────────────────────
if [ ! -d "$TOOLS_VENV" ]; then
  echo "Creating Python tools venv in $TOOLS_VENV …"
  "$PYTHON_BIN" -m venv "$TOOLS_VENV"
fi

TOOLS_PY="$TOOLS_VENV/bin/python"

echo "Upgrading pip in tools venv …"
"$TOOLS_PY" -m pip install --quiet --upgrade pip

echo "Installing nodeenv …"
"$TOOLS_PY" -m pip install --quiet nodeenv

# ─── Node environment ─────────────────────────────────────────────────────────
if [ ! -d "$NODEENV_DIR" ]; then
  echo "Creating nodeenv in $NODEENV_DIR (this may take a while) …"
  "$TOOLS_PY" -m nodeenv "$NODEENV_DIR"
else
  echo "nodeenv already exists at $NODEENV_DIR"
fi

# ─── npm dependencies ─────────────────────────────────────────────────────────
echo
echo "Activating nodeenv and installing npm dependencies …"

# shellcheck disable=SC1090
source "$NODEENV_DIR/bin/activate"

cd "$DESKTOP_DIR"
npm install

echo
echo "============================================================"
echo "Setup complete!"
echo
echo "Next steps:"
echo "  # Activate the Node environment:"
echo "  . $NODEENV_DIR/bin/activate"
echo
echo "  # Run the desktop app in development mode:"
echo "  cd $DESKTOP_DIR && npm start"
echo
echo "  # Package for distribution:"
echo "  cd $DESKTOP_DIR && npm run build"
echo "============================================================"
