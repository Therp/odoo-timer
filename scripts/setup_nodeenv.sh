#!/usr/bin/env bash
set -eu

NODEENV_DIR="${1:-.nodeenv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
TOOLS_VENV="${TOOLS_VENV:-.tools-venv}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    echo "Error: $PYTHON_BIN not found"
    exit 1
fi

if [ ! -d "$TOOLS_VENV" ]; then
    "$PYTHON_BIN" -m venv "$TOOLS_VENV"
fi

TOOLS_PY="$TOOLS_VENV/bin/python"

"$TOOLS_PY" -m pip install --upgrade pip
"$TOOLS_PY" -m pip install nodeenv

"$TOOLS_PY" -m nodeenv "$NODEENV_DIR"

echo "Node environment created in $NODEENV_DIR"
echo "Helper Python venv created in $TOOLS_VENV"
echo "Activate nodeenv with:"
echo ". $NODEENV_DIR/bin/activate"