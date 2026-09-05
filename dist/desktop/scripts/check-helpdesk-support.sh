#!/usr/bin/env bash
# Fast local regression check for the Electron Helpdesk adapter and templates.
set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "${DESKTOP_DIR}/../.." && pwd)"

NODE_NO_WARNINGS=1 node "${REPO_DIR}/tests/resource-adapters.test.mjs"

for js_file in \
  "${DESKTOP_DIR}/renderer/js/components/popup-app.js" \
  "${DESKTOP_DIR}/renderer/js/components/options-app.js" \
  "${DESKTOP_DIR}/renderer/js/components/messages-app.js" \
  "${DESKTOP_DIR}/renderer/js/lib/resource-adapters.js"; do
  node --check "${js_file}"
done

python3 - "${DESKTOP_DIR}" <<'PY'
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

desktop = Path(sys.argv[1])
for xml_file in (desktop / "templates").glob("*.xml"):
    ET.parse(xml_file)
compiled = (desktop / "renderer/js/templates.js").read_text(encoding="utf-8")
for marker in ("PopupApp", "OptionsApp", "MessagesApp", "helpdesk.ticket"):
    if marker not in compiled:
        raise SystemExit(f"compiled templates missing marker {marker!r}")
print("XML and compiled-template checks passed")
PY

echo "Helpdesk desktop checks passed"
