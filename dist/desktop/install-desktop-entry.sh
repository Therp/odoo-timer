#!/usr/bin/env bash
# install-desktop-entry.sh
#
# Installs the Therp Timer .desktop entry and icon so it appears
# in your application launcher (GNOME, KDE, XFCE, etc.).
#
# Usage:
#   bash install-desktop-entry.sh [--uninstall]
#
# Supports two install modes:
#   User install   (default) — installs to ~/.local/share/  (no sudo needed)
#   System install           — installs to /usr/share/      (requires sudo)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="Therp Timer"
EXEC_NAME="therp-timer"
DESKTOP_FILE="$SCRIPT_DIR/therp-timer.desktop"
ICON_SRC="$SCRIPT_DIR/renderer/img/icon_128.png"

# ── Argument parsing ──────────────────────────────────────────────────────────
MODE="user"
UNINSTALL=false

for arg in "$@"; do
  case "$arg" in
    --system)    MODE="system" ;;
    --uninstall) UNINSTALL=true ;;
    -h|--help)
      echo "Usage: $0 [--system] [--uninstall]"
      echo ""
      echo "  (no flags)   Install for current user only (no sudo needed)"
      echo "  --system     Install system-wide (requires sudo)"
      echo "  --uninstall  Remove the desktop entry and icon"
      exit 0 ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Paths ─────────────────────────────────────────────────────────────────────
if [[ "$MODE" == "system" ]]; then
  APPS_DIR="/usr/share/applications"
  ICON_DIR="/usr/share/icons/hicolor/128x128/apps"
  INSTALL_LABEL="system-wide"
else
  APPS_DIR="${HOME}/.local/share/applications"
  ICON_DIR="${HOME}/.local/share/icons/hicolor/128x128/apps"
  INSTALL_LABEL="user (~/.local/share)"
fi

DESKTOP_DEST="$APPS_DIR/$EXEC_NAME.desktop"
ICON_DEST="$ICON_DIR/$EXEC_NAME.png"

# ── Uninstall ─────────────────────────────────────────────────────────────────
if [[ "$UNINSTALL" == "true" ]]; then
  echo "Removing $APP_NAME desktop entry ($INSTALL_LABEL)…"
  rm -f "$DESKTOP_DEST" && echo "  Removed: $DESKTOP_DEST" || echo "  Not found: $DESKTOP_DEST"
  rm -f "$ICON_DEST"    && echo "  Removed: $ICON_DEST"    || echo "  Not found: $ICON_DEST"
  # Refresh the desktop database
  if command -v update-desktop-database &>/dev/null; then
    update-desktop-database "$APPS_DIR" 2>/dev/null || true
  fi
  if command -v gtk-update-icon-cache &>/dev/null; then
    gtk-update-icon-cache -f -t "$(dirname "$(dirname "$ICON_DIR")")" 2>/dev/null || true
  fi
  echo "Done. $APP_NAME removed from your application launcher."
  exit 0
fi

# ── Install ───────────────────────────────────────────────────────────────────
echo "Installing $APP_NAME desktop entry ($INSTALL_LABEL)…"
echo ""

# Verify source files exist
if [[ ! -f "$DESKTOP_FILE" ]]; then
  echo "Error: $DESKTOP_FILE not found."
  echo "Run this script from dist/desktop/"
  exit 1
fi
if [[ ! -f "$ICON_SRC" ]]; then
  echo "Error: icon not found at $ICON_SRC"
  exit 1
fi

# Create target directories
mkdir -p "$APPS_DIR" "$ICON_DIR"

# ── Resolve the Exec= path ────────────────────────────────────────────────────
# Priority:
#   1. AppImage in dist/desktop/release/  (built binary)
#   2. System-installed binary at /usr/bin/therp-timer or /usr/local/bin/therp-timer
#   3. npx electron fallback (dev mode)

APPIMAGE="$(find "$SCRIPT_DIR/release" -maxdepth 1 -name "*.AppImage" 2>/dev/null | head -1)"

if [[ -n "$APPIMAGE" ]]; then
  EXEC_PATH="\"$APPIMAGE\""
  echo "  Using AppImage: $APPIMAGE"
elif command -v "$EXEC_NAME" &>/dev/null; then
  EXEC_PATH="$EXEC_NAME"
  echo "  Using system binary: $(command -v "$EXEC_NAME")"
else
  # Fallback: launch via electron from the dist/desktop directory
  NODE_BIN="$(command -v electron 2>/dev/null || true)"
  if [[ -n "$NODE_BIN" ]]; then
    EXEC_PATH="electron $SCRIPT_DIR"
    echo "  Using electron fallback: $EXEC_PATH"
  else
    EXEC_PATH="bash -c 'cd $SCRIPT_DIR && npm start'"
    echo "  Warning: no binary found — using npm start fallback"
    echo "  Run 'npm run build:linux' inside dist/desktop/ to build a proper binary."
  fi
fi

# ── Write the .desktop file ───────────────────────────────────────────────────
cat > "$DESKTOP_DEST" << DESKTOP
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
GenericName=Odoo Time Tracker
Comment=Track and post time to Odoo timesheets
Exec=$EXEC_PATH %U
Icon=$EXEC_NAME
Terminal=false
StartupNotify=true
StartupWMClass=$EXEC_NAME
Categories=Office;ProjectManagement;
Keywords=odoo;timer;timesheet;time;tracking;project;task;
MimeType=x-scheme-handler/$EXEC_NAME;
DESKTOP

echo "  Written: $DESKTOP_DEST"

# ── Install icon ──────────────────────────────────────────────────────────────
cp "$ICON_SRC" "$ICON_DEST"
echo "  Written: $ICON_DEST"

# ── Refresh desktop database ──────────────────────────────────────────────────
echo ""
echo "Refreshing desktop database…"

if command -v update-desktop-database &>/dev/null; then
  update-desktop-database "$APPS_DIR" 2>/dev/null && echo "  update-desktop-database ✓" || true
fi

if command -v gtk-update-icon-cache &>/dev/null; then
  gtk-update-icon-cache -f -t "$(dirname "$(dirname "$ICON_DIR")")" 2>/dev/null && echo "  gtk-update-icon-cache ✓" || true
fi

if command -v xdg-desktop-menu &>/dev/null; then
  xdg-desktop-menu install --novendor "$DESKTOP_DEST" 2>/dev/null && echo "  xdg-desktop-menu ✓" || true
fi

echo ""
echo "✓  $APP_NAME is now in your application launcher."
echo ""
echo "To remove later:"
echo "  bash $0 --uninstall"
