# Therp Timer

Therp Timer lets you track time on Odoo project work and post it back to Odoo timesheets. It ships as:

- **Browser extensions** — Chrome/Chromium and Firefox (the original form)
- **Desktop app** — a standalone Electron application (`dist/desktop/`)

---

## What it does

1. You configure one or more Odoo remotes in the options page.
2. You open the popup and choose a remote.
3. The app either reuses an existing Odoo session (JSON-RPC only) or logs in with credentials.
4. It loads project items from Odoo — `project.task` or `project.issue`.
5. You start a timer on a row.
6. When you stop the timer, the app creates the timesheet record in Odoo.
7. Optionally export CSV timesheet data.

---

## Odoo compatibility

| Odoo endpoint | Used when               |
|---------------|-------------------------|
| `account.analytic.line`   | `project.task` data source |
| `hr.analytic.timesheet`   | `project.issue` data source |

The **Desktop** edition additionally supports XML-RPC in addition to the standard JSON-RPC web API, which makes it compatible with Odoo versions that restrict the web API.

---

## Project layout

```text
odoo-timer/
├── src/
│   └── templates/          # OWL XML source templates
├── scripts/
│   ├── setup_nodeenv.sh    # Bootstrap nodeenv (browser ext tooling)
│   └── compile_owl_templates.sh
├── dist/
│   ├── chrome/             # Chrome/Chromium extension
│   ├── firefox/            # Firefox extension
│   └── desktop/            # ← Electron desktop app (NEW)
│       ├── main.js
│       ├── preload.js
│       ├── package.json
│       ├── renderer/       # HTML + JS + CSS for the UI
│       │   ├── popup.html
│       │   ├── options_main_page.html
│       │   ├── css/
│       │   ├── js/
│       │   │   ├── lib/
│       │   │   │   ├── common.js      # Desktop-adapted (Electron IPC storage)
│       │   │   │   ├── xmlrpc.js      # Pure-JS XML-RPC client
│       │   │   │   ├── alert.js
│       │   │   │   ├── owl.iife.js
│       │   │   │   └── ripple.js
│       │   │   ├── components/
│       │   │   │   ├── popup-app.js
│       │   │   │   ├── options-app.js
│       │   │   │   └── readmore.js
│       │   │   └── templates.js       # Compiled from XML (or stub fallback)
│       │   └── img/
│       └── scripts/
│           ├── setup.sh               # Bootstrap nodeenv + npm install
│           └── compile-templates.sh   # Compile OWL templates for desktop
└── README.md
```

---

## Desktop app

### Requirements

- Python 3.8 or newer (for nodeenv)
- Git (to clone the OWL repo during template compilation)
- Internet access on first run (npm downloads Electron, nodeenv downloads Node)

### First-time setup

```bash
cd dist/desktop

# 1. Bootstrap Python venv + nodeenv + npm install
bash scripts/setup.sh

# 2. Activate the Node environment
. .nodeenv/bin/activate

# 3. Run the app in development mode
npm start
```

`setup.sh` creates:
- `.tools-venv/` — Python venv with `nodeenv` installed
- `.nodeenv/` — isolated Node.js installation
- `node_modules/` — Electron and electron-builder

### Running

```bash
# From dist/desktop/ with nodeenv active:
npm start
```

### Compiling OWL templates (optional)

The UI ships with built-in code-based templates so the app runs without a
compile step.  If you want to use the XML source templates:

```bash
# From the repo root:
bash dist/desktop/scripts/compile-templates.sh

# Or with a specific OWL version:
bash dist/desktop/scripts/compile-templates.sh --owl-version=2.8.3
```

This writes `dist/desktop/renderer/js/templates.js`.

### Packaging for distribution

```bash
# With nodeenv active inside dist/desktop/:

npm run build:linux   # AppImage + .deb
npm run build:win     # NSIS installer (.exe)
npm run build:mac     # .dmg (macOS only)
npm run build         # current platform
```

Output lands in `dist/desktop/release/`.

### Desktop-specific features

#### JSON-RPC vs XML-RPC

Each remote can be configured to use either:

| Protocol | Odoo endpoint              | Session model              |
|----------|----------------------------|----------------------------|
| JSON-RPC (default) | `/web/session/authenticate` | Cookie-based session |
| XML-RPC  | `/xmlrpc/2/common`, `/xmlrpc/2/object` | uid + password per call |

When XML-RPC is selected:
- Credentials are stored locally by `electron-store` so you do not have to re-enter them on every launch.
- The "Use Existing Session" checkbox is disabled (it only applies to JSON-RPC cookies).
- Log out clears the stored credentials.

#### Odoo version tagging

Each remote accepts an optional **Odoo Version** field (e.g. `16.0`, `17.0`). This is informational only — the actual RPC protocol used is controlled by the **RPC Protocol** dropdown.

#### Options page columns

The saved-remotes table shows all configured fields:

| Column   | Description                          |
|----------|--------------------------------------|
| Remote   | Display name                         |
| Host     | Odoo URL                             |
| Database | Odoo database name                   |
| Version  | Odoo version tag (informational)     |
| Protocol | `jsonrpc` or `xmlrpc`               |
| Source   | `project.task` or `project.issue`   |
| State    | `Active` / `Inactive`               |

#### Storage

The desktop app stores all data in an OS-appropriate location via `electron-store`:

| Platform | Location                                                    |
|----------|-------------------------------------------------------------|
| Linux    | `~/.config/odoo-timer-desktop/odoo-timer-data.json`         |
| macOS    | `~/Library/Application Support/odoo-timer-desktop/odoo-timer-data.json` |
| Windows  | `%APPDATA%\odoo-timer-desktop\odoo-timer-data.json`         |

---

## Browser extensions

### Chrome / Chromium

```bash
# From repo root, with nodeenv active:
bash scripts/compile_owl_templates.sh   # regenerate templates.js
```

Load `dist/chrome/` as an unpacked extension in `chrome://extensions`.

### Firefox

Load `dist/firefox/` via `about:debugging` → "Load Temporary Add-on".

### Compiling templates for browser targets

```bash
# Uses nodeenv from .nodeenv/ (created by scripts/setup_nodeenv.sh):
bash scripts/setup_nodeenv.sh
. .nodeenv/bin/activate
bash scripts/compile_owl_templates.sh
```

---

## Architecture

- **OWL 2.8.2** — reactive component framework
- **`PopupApp`** — main timer + task list
- **`OptionsApp`** — remotes configuration
- **`ReadMore`** — shared text-truncation component
- **`OdooRpc`** — dual JSON-RPC / XML-RPC client
- **`alert.js`** — custom modal dialog library (replaces browser `alert`/`confirm`/`prompt`)

Templates are compiled from `src/templates/*.xml` by the OWL compiler and
shipped as `templates.js`.  The component files also contain built-in
code-generated fallback templates so the app runs without a compile step.

---

## Troubleshooting

**"No active Odoo session found"**  
Your browser/Electron session cookie expired.  Uncheck "Use Existing Session" and log in with credentials, or switch to XML-RPC.

**XML-RPC login fails immediately**  
Verify that the Odoo instance allows XML-RPC access (check the server configuration and any proxy headers).

**Template compilation error**  
Ensure the OWL version matches the one used by your Odoo instance.  Pass `--owl-version=X.Y.Z` to the compile script.

**Electron window does not open**  
Make sure `npm install` completed inside `dist/desktop/` and that the nodeenv is active.

---

## License

LGPL-3.0 — see `LICENSE.md`.


## Phase 1 desktop polish

This archive preserves existing remote management, including edit/remove actions, and adds the first desktop polish pass:

- Better desktop scaling and larger default window
- Therp Timer naming in the desktop app
- Tray icon uses pale idle icon and blue active icon
- Tray tooltip shows the active task label
- Improved options page spacing and back button
- Per-remote message check interval field for upcoming messaging work
