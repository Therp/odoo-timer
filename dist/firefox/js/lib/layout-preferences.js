/* THERP ADVANCED LAYOUT PREFS V5
 *
 * Same preference features in Chrome/Chromium and Firefox.
 * Browser defaults are separate. No dynamic style is applied until the user
 * explicitly saves preferences, so each browser keeps its source CSS by default.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'therp_timer_layout_preferences_v4';
  const OLD_KEYS = [
    'therp_timer_layout_preferences_v1',
    'therp_timer_layout_preferences_v2',
    'therp_timer_layout_preferences_v3',
  ];

  const isFirefox = /Firefox\//i.test(navigator.userAgent || '');
  const browserKind = isFirefox ? 'firefox' : 'chromium';

  const COMMON = Object.freeze({
    toolbar: Object.freeze({
      searchFontSize: 13,
      controlHeight: 48,
      iconSize: 30,
      gap: 10,
    }),
    table: Object.freeze({
      fontSize: 15,
      headerFontSize: 15,
      cellPaddingY: 7,
      headerWrap: true,
      cellWrap: true,
      layoutMode: 'fixed',
      minWidth: 0,
      stripeEnabled: false,
      headerBg: '#f8fafc',
      headerColor: '#2f3640',
      rowBg: '#ffffff',
      stripeBg: '#f8fafc',
      hoverBg: '#f3fbff',
      activeBg: '#eaf8ff',
      borderColor: '#dde3ee',
      borderRadius: 12,
      actionWidth: 66,
      priorityWidth: 58,
      stageWidth: 118,
      itemWidth: 320,
      hoursWidth: 76,
      projectWidth: 160,
    }),
    options: Object.freeze({
      pageFontSize: 14,
      sidebarFontSize: 14,
      remotesTableFontSize: 14,
      remotesHeaderFontSize: 14,
      remotesHeaderWrap: true,
      remotesCellPaddingY: 7,
      remotesMinWidth: 760,
    }),
  });

  const DEFAULTS = Object.freeze({
    chromium: Object.freeze({
      main: Object.freeze({
        width: 960,
        height: 820,
        wrapperPaddingX: 16,
        wrapperPaddingTop: 18,
        wrapperPaddingBottom: 24,
      }),
      toolbar: COMMON.toolbar,
      table: COMMON.table,
      info: Object.freeze({
        fontSize: 13,
        valueFontSize: 14,
        labelColor: '#3f4854',
        valueColor: '#33baf6',
        background: '#ffffff',
        borderColor: '#dde3ee',
        paddingY: 14,
        paddingX: 16,
        borderRadius: 12,
        lineHeight: 17,
      }),
      options: COMMON.options,
    }),
    firefox: Object.freeze({
      main: Object.freeze({
        width: 960,
        height: 820,
        wrapperPaddingX: 16,
        wrapperPaddingTop: 18,
        wrapperPaddingBottom: 24,
      }),
      toolbar: COMMON.toolbar,
      table: COMMON.table,
      info: Object.freeze({
        fontSize: 14,
        valueFontSize: 14,
        labelColor: '#3f4854',
        valueColor: '#33baf6',
        background: '#ffffff',
        borderColor: '#dde3ee',
        paddingY: 14,
        paddingX: 16,
        borderRadius: 12,
        lineHeight: 17,
      }),
      options: COMMON.options,
    }),
  });

  const LIMITS = Object.freeze({
    mainWidth: [700, 1200],
    mainHeight: [500, 1000],
    fontSize: [10, 22],
    padding: [0, 60],
    radius: [0, 30],
    lineHeight: [10, 30],
    tableWidth: [0, 2400],
    columnWidth: [30, 700],
    optionsMinWidth: [600, 1800],
  });

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const integerToken = (value) => /^\d{1,4}$/.test(String(value ?? ''));
  const hexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(String(value ?? ''));

  function readInteger(value, range, label, errors) {
    if (!integerToken(value)) {
      errors.push(`${label} must contain whole-number digits only.`);
      return Number(value) || range[0];
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < range[0] || parsed > range[1]) {
      errors.push(`${label} must be ${range[0]}–${range[1]}.`);
    }
    return parsed;
  }

  function readColor(value, label, errors) {
    if (!hexColor(value)) {
      errors.push(`${label} must be a six-digit hex color such as #33baf6.`);
    }
    return String(value || '#000000').toLowerCase();
  }

  function readEnum(value, allowed, label, errors) {
    if (!allowed.includes(value)) {
      errors.push(`${label} is invalid.`);
      return allowed[0];
    }
    return value;
  }

  function readBoolean(value, label, errors) {
    if (typeof value !== 'boolean') {
      errors.push(`${label} must be true or false.`);
      return Boolean(value);
    }
    return value;
  }

  function validate(input) {
    const errors = [];
    const raw = input && typeof input === 'object' ? input : {};
    const m = raw.main || {};
    const tb = raw.toolbar || {};
    const t = raw.table || {};
    const i = raw.info || {};
    const o = raw.options || {};

    const value = {
      main: {
        width: readInteger(m.width, LIMITS.mainWidth, 'Main width', errors),
        height: readInteger(m.height, LIMITS.mainHeight, 'Main height', errors),
        wrapperPaddingX: readInteger(m.wrapperPaddingX, LIMITS.padding, 'Wrapper horizontal padding', errors),
        wrapperPaddingTop: readInteger(m.wrapperPaddingTop, LIMITS.padding, 'Wrapper top padding', errors),
        wrapperPaddingBottom: readInteger(m.wrapperPaddingBottom, LIMITS.padding, 'Wrapper bottom padding', errors),
      },
      toolbar: {
        searchFontSize: readInteger(tb.searchFontSize, LIMITS.fontSize, 'Search font size', errors),
        controlHeight: readInteger(tb.controlHeight, [28, 72], 'Toolbar control height', errors),
        iconSize: readInteger(tb.iconSize, [16, 48], 'Toolbar icon size', errors),
        gap: readInteger(tb.gap, [0, 30], 'Toolbar gap', errors),
      },
      table: {
        fontSize: readInteger(t.fontSize, LIMITS.fontSize, 'Table font size', errors),
        headerFontSize: readInteger(t.headerFontSize, LIMITS.fontSize, 'Table header font size', errors),
        cellPaddingY: readInteger(t.cellPaddingY, [0, 24], 'Table cell vertical padding', errors),
        headerWrap: readBoolean(t.headerWrap, 'Header wrapping', errors),
        cellWrap: readBoolean(t.cellWrap, 'Cell wrapping', errors),
        layoutMode: readEnum(t.layoutMode, ['fixed', 'auto'], 'Table layout mode', errors),
        minWidth: readInteger(t.minWidth, LIMITS.tableWidth, 'Table minimum width', errors),
        stripeEnabled: readBoolean(t.stripeEnabled, 'Alternating row stripes', errors),
        headerBg: readColor(t.headerBg, 'Header background', errors),
        headerColor: readColor(t.headerColor, 'Header text color', errors),
        rowBg: readColor(t.rowBg, 'Row background', errors),
        stripeBg: readColor(t.stripeBg, 'Stripe background', errors),
        hoverBg: readColor(t.hoverBg, 'Row hover background', errors),
        activeBg: readColor(t.activeBg, 'Active row background', errors),
        borderColor: readColor(t.borderColor, 'Table border color', errors),
        borderRadius: readInteger(t.borderRadius, LIMITS.radius, 'Table border radius', errors),
        actionWidth: readInteger(t.actionWidth, LIMITS.columnWidth, 'Action column width', errors),
        priorityWidth: readInteger(t.priorityWidth, LIMITS.columnWidth, 'Priority column width', errors),
        stageWidth: readInteger(t.stageWidth, LIMITS.columnWidth, 'Stage column width', errors),
        itemWidth: readInteger(t.itemWidth, LIMITS.columnWidth, 'Item column width', errors),
        hoursWidth: readInteger(t.hoursWidth, LIMITS.columnWidth, 'Hours column width', errors),
        projectWidth: readInteger(t.projectWidth, LIMITS.columnWidth, 'Project column width', errors),
      },
      info: {
        fontSize: readInteger(i.fontSize, LIMITS.fontSize, 'Info footer font size', errors),
        valueFontSize: readInteger(i.valueFontSize, LIMITS.fontSize, 'Info value font size', errors),
        labelColor: readColor(i.labelColor, 'Info label color', errors),
        valueColor: readColor(i.valueColor, 'Info value color', errors),
        background: readColor(i.background, 'Info background', errors),
        borderColor: readColor(i.borderColor, 'Info border color', errors),
        paddingY: readInteger(i.paddingY, LIMITS.padding, 'Info vertical padding', errors),
        paddingX: readInteger(i.paddingX, LIMITS.padding, 'Info horizontal padding', errors),
        borderRadius: readInteger(i.borderRadius, LIMITS.radius, 'Info border radius', errors),
        lineHeight: readInteger(i.lineHeight, LIMITS.lineHeight, 'Info line height', errors),
      },
      options: {
        pageFontSize: readInteger(o.pageFontSize, LIMITS.fontSize, 'Options page font size', errors),
        sidebarFontSize: readInteger(o.sidebarFontSize, LIMITS.fontSize, 'Options sidebar font size', errors),
        remotesTableFontSize: readInteger(o.remotesTableFontSize, LIMITS.fontSize, 'Remotes table font size', errors),
        remotesHeaderFontSize: readInteger(o.remotesHeaderFontSize, LIMITS.fontSize, 'Remotes header font size', errors),
        remotesHeaderWrap: readBoolean(o.remotesHeaderWrap, 'Remotes header wrapping', errors),
        remotesCellPaddingY: readInteger(o.remotesCellPaddingY, [0, 24], 'Remotes cell vertical padding', errors),
        remotesMinWidth: readInteger(o.remotesMinWidth, LIMITS.optionsMinWidth, 'Remotes table minimum width', errors),
      },
    };
    return { ok: errors.length === 0, value, errors };
  }

  async function storageGet(key) {
    try {
      if (globalThis.browser?.storage?.local) {
        const result = await globalThis.browser.storage.local.get(key);
        return result?.[key] ?? null;
      }
      if (globalThis.chrome?.storage?.local) {
        return await new Promise((resolve) => {
          globalThis.chrome.storage.local.get([key], (result) => resolve(result?.[key] ?? null));
        });
      }
    } catch (err) {
      console.debug('[LayoutPrefsV4] storage read failed.', err);
    }
    return null;
  }

  async function storageSet(key, value) {
    if (globalThis.browser?.storage?.local) {
      await globalThis.browser.storage.local.set({ [key]: value });
      return;
    }
    if (globalThis.chrome?.storage?.local) {
      await new Promise((resolve, reject) => {
        globalThis.chrome.storage.local.set({ [key]: value }, () => {
          const error = globalThis.chrome.runtime?.lastError;
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }

  async function storageRemove(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    if (globalThis.browser?.storage?.local) {
      await globalThis.browser.storage.local.remove(list);
      return;
    }
    if (globalThis.chrome?.storage?.local) {
      await new Promise((resolve, reject) => {
        globalThis.chrome.storage.local.remove(list, () => {
          const error = globalThis.chrome.runtime?.lastError;
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }

  function px(root, name, value) {
    root.style.setProperty(name, `${value}px`);
  }

  function addCustomizedClass() {
    document.documentElement.classList.add('tt-layout-customized');
    document.body?.classList.add('tt-layout-customized');
  }

  function removeCustomizedClass() {
    document.documentElement.classList.remove('tt-layout-customized');
    document.body?.classList.remove('tt-layout-customized');
  }

  function apply(value) {
    const result = validate(value);
    if (!result.ok) {
      console.warn('[LayoutPrefsV4] refusing invalid values:', result.errors);
      return;
    }
    const v = result.value;
    const root = document.documentElement;

    addCustomizedClass();

    px(root, '--tt-main-width', v.main.width);
    px(root, '--tt-main-height', v.main.height);
    px(root, '--tt-wrapper-pad-x', v.main.wrapperPaddingX);
    px(root, '--tt-wrapper-pad-top', v.main.wrapperPaddingTop);
    px(root, '--tt-wrapper-pad-bottom', v.main.wrapperPaddingBottom);

    px(root, '--tt-search-font-size', v.toolbar.searchFontSize);
    px(root, '--tt-toolbar-control-height', v.toolbar.controlHeight);
    px(root, '--tt-toolbar-icon-size', v.toolbar.iconSize);
    px(root, '--tt-toolbar-gap', v.toolbar.gap);

    px(root, '--tt-table-font-size', v.table.fontSize);
    px(root, '--tt-table-header-font-size', v.table.headerFontSize);
    px(root, '--tt-table-cell-pad-y', v.table.cellPaddingY);
    root.style.setProperty('--tt-table-header-wrap', v.table.headerWrap ? 'normal' : 'nowrap');
    root.style.setProperty('--tt-table-cell-wrap', v.table.cellWrap ? 'normal' : 'nowrap');
    root.style.setProperty('--tt-table-layout', v.table.layoutMode);
    px(root, '--tt-table-min-width', v.table.minWidth);
    root.style.setProperty('--tt-table-header-bg', v.table.headerBg);
    root.style.setProperty('--tt-table-header-color', v.table.headerColor);
    root.style.setProperty('--tt-table-row-bg', v.table.rowBg);
    root.style.setProperty('--tt-table-stripe-bg', v.table.stripeEnabled ? v.table.stripeBg : v.table.rowBg);
    root.style.setProperty('--tt-table-hover-bg', v.table.hoverBg);
    root.style.setProperty('--tt-table-active-bg', v.table.activeBg);
    root.style.setProperty('--tt-table-border-color', v.table.borderColor);
    px(root, '--tt-table-radius', v.table.borderRadius);
    px(root, '--tt-col-action', v.table.actionWidth);
    px(root, '--tt-col-priority', v.table.priorityWidth);
    px(root, '--tt-col-stage', v.table.stageWidth);
    px(root, '--tt-col-item', v.table.itemWidth);
    px(root, '--tt-col-hours', v.table.hoursWidth);
    px(root, '--tt-col-project', v.table.projectWidth);

    px(root, '--tt-info-font-size', v.info.fontSize);
    px(root, '--tt-info-value-font-size', v.info.valueFontSize);
    root.style.setProperty('--tt-info-label-color', v.info.labelColor);
    root.style.setProperty('--tt-info-value-color', v.info.valueColor);
    root.style.setProperty('--tt-info-bg', v.info.background);
    root.style.setProperty('--tt-info-border-color', v.info.borderColor);
    px(root, '--tt-info-pad-y', v.info.paddingY);
    px(root, '--tt-info-pad-x', v.info.paddingX);
    px(root, '--tt-info-radius', v.info.borderRadius);
    root.style.setProperty('--tt-info-line-height', String(v.info.lineHeight / 10));

    px(root, '--tt-options-font-size', v.options.pageFontSize);
    px(root, '--tt-options-sidebar-font-size', v.options.sidebarFontSize);
    px(root, '--tt-remotes-font-size', v.options.remotesTableFontSize);
    px(root, '--tt-remotes-header-font-size', v.options.remotesHeaderFontSize);
    root.style.setProperty('--tt-remotes-header-wrap', v.options.remotesHeaderWrap ? 'normal' : 'nowrap');
    px(root, '--tt-remotes-cell-pad-y', v.options.remotesCellPaddingY);
    px(root, '--tt-remotes-min-width', v.options.remotesMinWidth);
  }

  function clear() {
    const root = document.documentElement;
    for (const name of Array.from(root.style)) {
      if (name.startsWith('--tt-')) root.style.removeProperty(name);
    }
    removeCustomizedClass();
  }

  async function getState() {
    const stored = await storageGet(STORAGE_KEY);
    const defaults = clone(DEFAULTS[browserKind]);
    if (stored == null) {
      return { stored: false, value: defaults };
    }
    const result = validate(stored);
    if (!result.ok) {
      console.warn('[LayoutPrefsV4] corrupt stored settings removed:', result.errors);
      await storageRemove(STORAGE_KEY).catch(() => {});
      return { stored: false, value: defaults };
    }
    return { stored: true, value: result.value };
  }

  async function save(value) {
    const result = validate(value);
    if (!result.ok) {
      const error = new Error(result.errors.join(' '));
      error.validationErrors = result.errors;
      throw error;
    }
    await storageSet(STORAGE_KEY, result.value);
    await storageRemove(OLD_KEYS).catch(() => {});
    return result.value;
  }

  async function reset() {
    await storageRemove([STORAGE_KEY, ...OLD_KEYS]).catch(() => {});
    clear();
    return clone(DEFAULTS[browserKind]);
  }

  function suggestedPreset() {
    const value = clone(DEFAULTS[browserKind]);
    value.main.width = 800;
    value.table.headerWrap = false;
    value.table.layoutMode = 'auto';
    value.table.stripeEnabled = true;
    value.table.actionWidth = 42;
    value.table.headerBg = '#f8fafc';
    value.table.stripeBg = '#f8fafc';
    value.table.minWidth = 800;
    return value;
  }

  globalThis.TherpLayoutPrefs = {
    validate,
    apply,
    clear,
    getState,
    save,
    reset,
    defaults: () => clone(DEFAULTS[browserKind]),
    suggestedPreset,
    canCustomize: () => true,
    browserKind: () => browserKind,
    browserLabel: () => (isFirefox ? 'Firefox' : 'Chrome / Chromium'),
  };

  getState().then((state) => {
    if (state.stored) apply(state.value);
    else clear();
  }).catch((err) => {
    console.warn('[LayoutPrefsV4] using source CSS defaults.', err);
    clear();
  });
})();
