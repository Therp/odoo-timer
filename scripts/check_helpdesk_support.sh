#!/usr/bin/env bash
# Fast local regression check for the Helpdesk adapter and compiled templates.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "${ROOT_DIR}/tests/resource-adapters.test.mjs"

for js_file in \
  "${ROOT_DIR}/dist/chrome/js/components/popup-app.js" \
  "${ROOT_DIR}/dist/chrome/js/components/options-app.js" \
  "${ROOT_DIR}/dist/chrome/js/lib/resource-adapters.js" \
  "${ROOT_DIR}/dist/firefox/js/components/popup-app.js" \
  "${ROOT_DIR}/dist/firefox/js/components/options-app.js" \
  "${ROOT_DIR}/dist/firefox/js/lib/resource-adapters.js"; do
  node --check "${js_file}"
done

python3 - "${ROOT_DIR}" <<'PY'
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

root = Path(sys.argv[1])
for xml_file in (root / "src" / "templates").glob("*.xml"):
    ET.parse(xml_file)
for compiled in (
    root / "dist/chrome/js/templates.js",
    root / "dist/firefox/js/templates.js",
):
    text = compiled.read_text(encoding="utf-8")
    for marker in ("PopupApp", "OptionsApp", "helpdesk.ticket"):
        if marker not in text:
            raise SystemExit(f"{compiled}: missing compiled marker {marker!r}")
print("XML and compiled-template checks passed")
PY

echo "Helpdesk browser checks passed"

