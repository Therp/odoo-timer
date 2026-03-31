# Therp Timer

Therp Timer is a browser extension for recording time on Odoo project work and posting that time to Odoo timesheets.

It lets you:

- connect to one or more Odoo instances
- load assigned issues or tasks
- start and stop a timer from the browser popup
- write the result back to Odoo timesheets
- optionally export timesheet data to CSV

The extension has separate manifests for Chromium-based browsers and Firefox because background script support differs between the two browser families.

## What it does

At a high level, the extension works like this:

1. You configure one or more Odoo remotes in the options page.
2. You open the popup and choose a remote.
3. The extension either reuses an existing Odoo browser session or logs in with a username and password.
4. It loads project items from Odoo, usually `project.task` or `project.issue` depending on the configured data source.
5. You start a timer on a selected row.
6. When you stop the timer, the extension creates the correct timesheet record in Odoo.
7. Optionally, it can download CSV timesheet data.

## Odoo behavior

The extension supports two common flows.

### `project.task`

When the remote is configured to use `project.task`, the extension writes time to:

- `account.analytic.line`

### `project.issue`

When the remote is configured to use `project.issue`, the extension writes time to:

- `hr.analytic.timesheet`

The extension also tries to find the correct analytic account from the issue/task or its related project.

## Main features

- popup-based timer UI
- support for multiple Odoo remotes
- use existing browser Odoo session or manual login
- task/issue filtering and search
- automatic timer state persistence
- CSV export for current month timesheets
- optional download of issue/task-specific timesheets
- browser-specific manifests for Chromium and Firefox

## Recommended project layout

A practical layout is:

```text
therp_timer_owl/
  src/
    popup.html
    options_main_page.html
    js/
    css/
    img/

  dist/
    chrome/
      manifest.json
      popup.html
      options_main_page.html
      js/
      css/
      img/

    firefox/
      manifest.json
      popup.html
      options_main_page.html
      js/
      css/
      img/
```

In this structure:

- `src` is your editable source
- `dist/chrome` is the loadable Chromium build
- `dist/firefox` is the loadable Firefox build

Each browser folder must contain its own root `manifest.json`.

## Why there are separate manifests

Chromium-based browsers and Firefox handle extension background execution differently.

### Chromium-based browsers

Use a service worker background definition:

```json
{
  "background": {
    "service_worker": "js/background.js"
  }
}
```

### Firefox

Use background scripts:

```json
{
  "background": {
    "scripts": ["js/background.js"],
    "type": "module"
  }
}
```

Because of that difference, keeping separate browser build folders is the easiest setup.

## Setup

### Requirements

Before loading the extension, make sure you have:

- a working Odoo instance
- access to tasks or issues you want to track
- a browser supported by one of the two builds
- the extension files arranged so the correct `manifest.json` is at the root of the browser-specific folder

## Usage

### Chromium-based browsers

Examples:

- Brave
- Chrome
- Chromium
- Edge
- Vivaldi

#### Setup steps

1. Open the extensions page in your browser.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the browser-specific extension folder, for example:

```text
/dist/chrome
```

5. Confirm that the extension appears in the extensions list.
6. Pin the extension to the toolbar if desired.

#### Chromium manifest notes

The Chromium build should use a `manifest.json` with a background service worker, for example:

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "js/background.js"
  }
}
```

#### First use in Chromium

1. Click the extension icon.
2. Open **Options**.
3. Add an Odoo remote:
   - name
   - base URL
   - database
   - data source such as `project.task` or `project.issue`
4. Save the remote.
5. Return to the popup.
6. Select the remote.
7. Either:
   - keep **Use Existing Session** enabled if already logged into Odoo in the browser, or
   - disable it and log in manually
8. Start a timer on a task or issue.
9. Stop the timer to write the timesheet back to Odoo.

### Firefox-based browsers

Examples:

- Firefox
- Firefox Developer Edition

#### Setup steps

1. Open:

```text
about:debugging#/runtime/this-firefox
```

2. Click **Load Temporary Add-on...**.
3. Select the actual Firefox manifest file:

```text
/dist/firefox/manifest.json
```

4. The temporary add-on should load into Firefox.

#### Important Firefox note

Firefox expects the file to be named exactly:

```text
manifest.json
```

Do not try to load a file called `manifest.firefox.json` directly unless you have copied or renamed it to `manifest.json` inside the Firefox build folder.

#### Firefox manifest notes

The Firefox build should use background scripts instead of a service worker:

```json
{
  "manifest_version": 3,
  "background": {
    "scripts": ["js/background.js"],
    "type": "module"
  }
}
```

#### First use in Firefox

The usage flow is the same as Chromium:

1. Open **Options**.
2. Add a remote.
3. Return to the popup.
4. Select the remote.
5. Reuse an existing Odoo session or log in manually.
6. Start and stop timers as needed.

## Remote configuration

A remote usually includes:

- **Name**: friendly label shown in the popup
- **URL**: base Odoo URL, for example `https://example.odoo.com`
- **Database**: target database name
- **Data source**: usually `project.task` or `project.issue`

If the wrong data source is selected, the extension may load the wrong model or fail to create the expected timesheet record type.

## Typical workflow

### Using an existing session

This is the easiest option when you are already logged into Odoo in the same browser.

1. Log into Odoo normally in a browser tab.
2. Open the extension popup.
3. Choose the remote.
4. Leave **Use Existing Session** enabled.
5. Click **Login**.

If the session is valid, the extension will load your tasks/issues.

### Manual login

Use this when there is no active browser Odoo session.

1. Open the popup.
2. Disable **Use Existing Session**.
3. Enter username and password.
4. Click **Login**.

## Timer behavior

When you start a timer:

- the active item is remembered
- the start time is stored in extension storage
- the popup can continue showing elapsed time

When you stop a timer:

- the elapsed time is calculated
- rounding logic is applied
- you may be prompted for a description
- a new timesheet record is created in Odoo

## CSV export

The extension can export:

- current month timesheets
- issue/task-specific timesheets

This is useful for local backup, manual review, or reporting.

## Troubleshooting

### Firefox does not load the extension

Check the following:

- the selected file is named `manifest.json`
- the file is inside the Firefox build folder
- the Firefox manifest uses `background.scripts`
- the JSON is valid

### Chromium loads but Firefox fails

This usually means the Chromium manifest was used in Firefox. Switch to the Firefox build folder.

### Session restore fails

Possible causes:

- Odoo session expired
- remote URL does not match the actual Odoo login host
- browser cookies are missing or blocked

Try disabling **Use Existing Session** and log in manually.

### Tasks do not appear

Possible causes:

- wrong data source configured
- current user has no assigned records
- Odoo model fields differ from what the extension expects
- slow Odoo response during startup

### Timer stops but no timesheet is created

Check:

- the related project or task has an analytic account
- the remote is using the correct model
- your Odoo user has permission to create timesheets
- the correct journal exists for the issue-based flow

## Development notes

A good workflow is:

1. maintain common source files in `src`
2. produce separate `dist/chrome` and `dist/firefox` builds
3. keep the code shared as much as possible
4. only vary the manifest and browser-specific behavior where required

## Summary

Therp Timer is a practical browser-based Odoo timer that helps users quickly record work against Odoo project items.

Use:

- the **Chrome/Brave** build for Chromium-based browsers
- the **Firefox** build for Firefox-based browsers

Keep a separate `manifest.json` in each browser build folder, and load that folder with the browser’s extension developer tools.


## Owl template compilation for developers

The extension currently keeps its working runtime templates in the JavaScript
entry files under:

- `dist/chrome/js/components/popup-app.js`
- `dist/chrome/js/components/options-app.js`
- `dist/chrome/js/components/readmore.js`
- `dist/firefox/js/components/popup-app.js`
- `dist/firefox/js/components/options-app.js`
- `dist/firefox/js/components/readmore.js`

Those `createBlock(...)` templates remain the runtime fallback so that the
extension keeps working even when ahead-of-time compiled Owl templates are not
available.

Editable source XML templates live under:

- `src/templates/popup_app.xml`
- `src/templates/options_app.xml`
- `src/templates/readmore.xml`

At runtime, the extension loads `js/templates.js` before the app modules.
If that file registers compiled templates on
`globalThis.__THERP_TIMER_TEMPLATES__`, the app will use them. If not, it
falls back to the current JavaScript `createBlock(...)` templates.

### Why this fallback exists

Browser extensions often cannot rely on runtime template compilation in the way
standard Odoo web builds do. Keeping the JavaScript fallback avoids breaking
the popup or options page while developers gradually move templates into XML
source files.

### Set up Node tooling with Python `nodeenv`

To avoid changing the host system Node installation, create an isolated Node
environment with Python:

```bash
python3 -m pip install --user nodeenv
python3 -m nodeenv .nodeenv
. .nodeenv/bin/activate
```

A helper script is included:

```bash
./scripts/setup_nodeenv.sh
. .nodeenv/bin/activate
```

### Compile Owl templates ahead of time

1. Clone the Owl repository locally.
2. Activate the `nodeenv` environment.
3. Build the runtime and compiler.
4. Compile the XML templates from `src/templates`.

Example workflow:

```bash
git clone https://github.com/odoo/owl.git
cd owl
npm install
npm run build:runtime
npm run build:compiler
npm run compile_templates -- /path/to/odoo-timer/src/templates
```

A helper script is also included in this repository:

```bash
./scripts/compile_owl_templates.sh /path/to/owl #(i.e path to owl is the cloned Odoo's OWL repo => https://github.com/odoo/owl.git)
```

**NB:**
- **Make sure you have templates to be compile by the scrip in `src/template/*.xml*` otherwise script might fail.**
- **Please note you need to clone Odoo's OWL repo branch that is identical to your owl js library when compiling templates otherwise you will get templat errors when generating `template.js`. For instance: this current project is using OWL lib v2.8.2. So we need to clone owl repo branch owl-2.x (i.e https://github.com/odoo/owl/tree/owl-2.x) to compile template with.**

### Register generated templates

The extension expects compiled templates to be made available through:

```js
globalThis.__THERP_TIMER_TEMPLATES__ = {
  ReadMore: /* compiled template */,
  PopupApp: /* compiled template */,
  OptionsApp: /* compiled template */,
};
```

The distributed `dist/*/js/templates.js` files are safe placeholders.
Replace them during development with your generated template registration code,
or adapt the generated Owl output into that registry shape.

### Current runtime layout

Shared libraries now live under:

- `dist/chrome/js/lib/`
- `dist/firefox/js/lib/`

Application entry modules now live under:

- `dist/chrome/js/components/`
- `dist/firefox/js/components/`

This keeps library-style files such as `browser-polyfill.js`, `owl.iife.js`,
and `common.js` separated from the popup and options app modules.
