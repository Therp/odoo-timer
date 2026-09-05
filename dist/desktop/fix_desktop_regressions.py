#!/usr/bin/env python3
from pathlib import Path
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

OPTIONS = Path("dist/desktop/renderer/js/components/options-app.js")
POPUP = Path("dist/desktop/renderer/js/components/popup-app.js")
POPUP_XML = Path("dist/desktop/templates/popup_app.xml")
MARKER = "THERP UX FIX: build Edit Remote dialog with DOM APIs"


def root():
    for p in [Path.cwd().resolve(), *Path.cwd().resolve().parents]:
        if (p / "dist/desktop").is_dir():
            return p
    raise RuntimeError("Run from inside the desktop odoo-timer repository.")


SAFE_DIALOG = r'''        // THERP UX FIX: build Edit Remote dialog with DOM APIs.
        const dialog = document.createElement('div');
        dialog.style.cssText =
            'min-width:420px;max-width:560px;text-align:left;font-family:Arial,Helvetica,sans-serif;';

        const title = document.createElement('div');
        title.style.cssText =
            'margin-bottom:16px;font-weight:700;font-size:17px;color:#42475a;text-align:center;';
        title.textContent = 'Edit Remote';

        const form = document.createElement('div');
        const style =
            'width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;' +
            'box-sizing:border-box;font-size:14px;';

        const addField = (caption, control) => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:10px;';
            const label = document.createElement('label');
            label.style.cssText = 'display:block;font-size:13px;margin-bottom:4px;color:#555;';
            label.textContent = caption;
            control.style.cssText = style;
            wrap.append(label, control);
            form.appendChild(wrap);
        };

        const nameInput = document.createElement('input');
        nameInput.id = `${pfx}-name`;
        nameInput.value = remote.name || '';
        addField('Display Name', nameInput);

        const hostInput = document.createElement('input');
        hostInput.id = `${pfx}-host`;
        hostInput.value = remote.url || '';
        addField('Odoo Host', hostInput);

        const dbInput = document.createElement('input');
        dbInput.id = `${pfx}-database`;
        dbInput.value = remote.database || '';
        addField('Database', dbInput);

        const versionInput = document.createElement('input');
        versionInput.id = `${pfx}-version`;
        versionInput.value = remote.odooVersion || '';
        versionInput.placeholder = '16.0';
        addField('Odoo Version (e.g. 16.0)', versionInput);

        const sourceSelect = document.createElement('select');
        sourceSelect.id = `${pfx}-datasrc`;
        for (const [value, caption] of [
            ['project.issue', 'From Issues (project.issue)'],
            ['project.task', 'From Tasks (project.task)'],
            ['helpdesk.ticket', 'From Helpdesk Tickets (helpdesk.ticket)'],
        ]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = caption;
            option.selected = (remote.datasrc || 'project.issue') === value;
            sourceSelect.appendChild(option);
        }
        addField('Data Source', sourceSelect);

        dialog.append(title, form);
        const result = await alert.show(dialog, ['Cancel', 'Save'], { accentColor: 'orange' });'''


def patch_options(path):
    text = path.read_text()
    if MARKER in text:
        return False
    pattern = re.compile(
        r"        const html = `.*?`;\s*\n"
        r"        const result = await alert\.show\(html, \['Cancel', 'Save'\], \{ accentColor: 'orange' \}\);",
        re.S,
    )
    m = pattern.search(text)
    if not m:
        print("Edit Remote HTML block not found; skipping")
        return False
    path.write_text(text[:m.start()] + SAFE_DIALOG + text[m.end():])
    print("fixed desktop Edit Remote")
    return True


def patch_stage(path):
    text = path.read_text()
    original = text
    text = text.replace("helpdeskStageFilter: ''", "stageFilter: ''")
    if "stageFilter: ''" not in text:
        text = text.replace("searchQuery:       ''", "searchQuery:       '',\n            stageFilter:       ''", 1)
        text = text.replace("searchQuery: ''", "searchQuery: '',\n            stageFilter: ''", 1)
    text = text.replace("helpdeskStageFilter", "stageFilter")
    text = text.replace("helpdeskStageOptions", "stageOptions")
    text = text.replace("updateHelpdeskStageFilter", "updateStageFilter")
    text = text.replace(
        "let issues = [...this.state.issues];",
        "let issues = Array.isArray(this.state.issues) ? [...this.state.issues] : [];",
    )
    if text != original:
        path.write_text(text)
        print("hardened desktop stage state")
        return True
    return False


def patch_xml(path):
    text = path.read_text()
    original = text
    text = text.replace("helpdeskStageFilter", "stageFilter")
    text = text.replace("helpdeskStageOptions", "stageOptions")
    text = text.replace("updateHelpdeskStageFilter", "updateStageFilter")
    text = text.replace('t-if="stageOptions.length"', 't-if="(stageOptions || []).length"')
    text = text.replace('t-foreach="stageOptions"', 't-foreach="stageOptions || []"')
    if text != original:
        path.write_text(text)
        print("made desktop stage XML defensive")
        return True
    return False


def main():
    try:
        r = root()
        changed = []
        if (r / OPTIONS).is_file() and patch_options(r / OPTIONS):
            changed.append(r / OPTIONS)
        if (r / POPUP).is_file() and patch_stage(r / POPUP):
            changed.append(r / POPUP)
        if (r / POPUP_XML).is_file() and patch_xml(r / POPUP_XML):
            changed.append(r / POPUP_XML)

        node = shutil.which("node")
        for p in changed:
            if p.suffix == ".js" and node:
                subprocess.run([node, "--check", str(p)], check=True)
            elif p.suffix == ".xml":
                ET.parse(p)
        print("validation: OK")
        print("Recompile desktop templates.js if popup_app.xml changed.")
        return 0
    except Exception as exc:
        print("ERROR:", exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
