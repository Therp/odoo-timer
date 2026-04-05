# Therp Timer

Therp Timer lets you track time on Odoo project work and post it back to Odoo timesheets. It ships as:

- **Browser extensions** — Chrome/Chromium and Firefox
- **Desktop app** — a standalone Electron application (`dist/desktop/`)

---

## Desktop quick start

```bash
cd dist/desktop
bash scripts/setup.sh        # one-time: Python venv + nodeenv + npm install
. .nodeenv/bin/activate
npm start
```

---

## Project layout

```
therp-timer/
├── src/templates/              OWL XML source templates
├── scripts/                   Browser-extension build scripts
└── dist/
    ├── chrome/                Chrome extension
    ├── firefox/               Firefox extension
    └── desktop/               Electron desktop app
        ├── main.js            Main process (tray, IPC, notifications, recorder)
        ├── preload.js         Context bridge
        ├── package.json
        ├── renderer/
        │   ├── popup.html           Timer window
        │   ├── options_main_page.html
        │   ├── messages.html        Messages / chatter window
        │   ├── css/
        │   │   ├── popup.css
        │   │   ├── options_main_page.css
        │   │   └── messages.css
        │   └── js/
        │       ├── lib/common.js    OdooRpc + storage + helpers
        │       ├── components/      OWL components (popup-app, options-app, readmore)
        │       ├── messages.js      Chatter panel (vanilla JS)
        │       └── templates.js     Compiled OWL templates (or stub)
        └── scripts/
            ├── setup.sh             Bootstrap environment
            └── compile-templates.sh Compile OWL XML → templates.js
```

---

## Desktop features

### Timer window

- Browse `project.task` or `project.issue` from your Odoo instance.
- Start / stop a timer — creates a timesheet record in Odoo on stop.
- Discard the active timer without saving.
- Search, filter, limit and sort items.
- Show your items or everyone's items.
- Download current-month timesheet as CSV.
- Auto-download the timed item's timesheet when the timer stops.
- **💬 Messages** button opens the chatter panel.
- **⚙ Options** button opens the options page.

### System tray

| State | Icon | Tooltip |
|---|---|---|
| No timer | Pale icon | "Therp Timer — idle" |
| Timer running | Blue T icon | "⏱ #42 — Fix login bug" |

- Right-click: **Timer · Messages · Options · Quit**
- Closing the window hides it to tray. The app keeps running.
- Only **Quit** from the tray menu stops the process.

### Options

| Field | Description |
|---|---|
| Odoo Host | Base URL (`https://…`) |
| Display Name | Human label for this remote |
| Database | Odoo database name |
| Odoo Version | Informational tag (e.g. `16.0`) |
| Poll Interval (s) | Background message check frequency (0 = off) |
| Data Source | `project.task` or `project.issue` |

Saved remotes table columns: Remote · Host · Database · Version · Poll(s) · Source · State  
Actions per row: **✏ Edit** · **🗑 Delete**

### Messages / Chatter panel

Open with the **💬** toolbar button or tray → Messages.

**Sidebar**
- Lists all tasks for the active remote.
- Unread badge shows new messages since last view.
- Filter by task name.

**Chat header**
- Task name is a clickable link → opens the Odoo form in your browser.
- Filter pills: **All · Public · Internal** with colour legend.
- Colour coding: 🔵 Public comment · 🟡 Internal note · ⬜ System log

**Compose**
- Toggle between **Message** (public) and **Internal Note**.
- `@name` triggers a mention autocomplete from all known partners.
- Attach a file via 📎 — uploaded to Odoo as `ir.attachment`.
- **Ctrl+Enter** to send. Posts via `message_post` on the task/issue.

**Attachments**
- Download chips appear on messages that have attachments.
- Click → system save dialog.

**Background polling**
- Checks for new messages at the configured poll interval (per remote).
- OS notification for new messages on tasks not currently visible.
- Click notification → opens the Messages window.
- Memory-safe: single `setInterval`, errors silently ignored.

### Screen recorder

Inside the Messages window → **⏺ Record**

1. Captures the primary screen (full desktop).
2. Live duration counter.
3. **Stop & Save** → save dialog → `.webm` (VP8).

---

## Packaging for distribution

```bash
# Inside dist/desktop/ with nodeenv active:
npm run build:linux   # AppImage + .deb
npm run build:win     # NSIS .exe
npm run build:mac     # .dmg (macOS host only)
npm run build         # current platform
```

Output: `dist/desktop/release/`

---

## Compiling OWL templates (optional)

The app ships built-in code-based template fallbacks and works without this step.

```bash
# Desktop target:
bash dist/desktop/scripts/compile-templates.sh

# Browser targets:
bash scripts/setup_nodeenv.sh && . .nodeenv/bin/activate
bash scripts/compile_owl_templates.sh
```

---

## Architecture

| Layer | Technology |
|---|---|
| Timer / Options UI | OWL 2.8.2 reactive components |
| Messages UI | Vanilla JS (no framework needed) |
| Desktop shell | Electron 29 + electron-store |
| Odoo API | JSON-RPC (`fetch` + Electron Chromium session cookies) |
| Notifications | Electron `Notification` API |
| Screen capture | `desktopCapturer` + `MediaRecorder` (WebM/VP8) |
| Dialogs | `alert.js` custom modal library |

---

## Troubleshooting

**"Not connected" in Messages**  
Log in via the Timer window first. Messages reads the session from storage.

**No tasks in Messages sidebar**  
Check the data source in Options matches your Odoo setup (`project.task` vs `project.issue`).

**Screen recorder — no sources found**  
On Wayland (Linux) add `--enable-features=WebRTCPipeWireCapturer` to the Electron launch flags.

**"No active Odoo session found"**  
Uncheck "Use Existing Session" and enter your credentials.

**Tasks show "No matching items"**  
Tasks are filtered to active stages (not Done/Cancelled/Hold). Check your Odoo stages or tick "Show for everyone".

---

## License

LGPL-3.0 — see `LICENSE.md`.
