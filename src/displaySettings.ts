import type { DisplaySettings } from './types';
import { isRtlLanguage, normalizeLanguage } from './i18n';

const TEXT_SIZE_VALUES = ['extra-small', 'small', 'medium', 'large', 'extra-large', 'huge'] as const;
const ACCENT_VALUES = ['green', 'blue', 'orange', 'purple', 'red', 'teal', 'cyan', 'pink', 'yellow'] as const;
const UI_STYLE_VALUES = ['classic', 'modern'] as const;

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  accent: 'green',
  language: 'en',
  languageSource: 'default',
  textSize: 'medium',
  theme: 'light',
  uiStyle: 'classic',
};

type HostWindow = Window & {
  _qdnAccent?: unknown;
  _qdnLang?: unknown;
  _qdnLanguage?: unknown;
  _qdnTextSize?: unknown;
  _qdnTheme?: unknown;
  _qdnUiStyle?: unknown;
  _qdnUIStyle?: unknown;
  qdnAccent?: unknown;
  qdnLang?: unknown;
  qdnLanguage?: unknown;
  qdnTextSize?: unknown;
  qdnTheme?: unknown;
  qdnUiStyle?: unknown;
  qdnUIStyle?: unknown;
};

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeTheme(value: unknown): DisplaySettings['theme'] | null {
  const normalized = getString(value)?.toLowerCase();

  return normalized === 'dark' || normalized === 'light' ? normalized : null;
}

export function normalizeTextSize(value: unknown): DisplaySettings['textSize'] | null {
  const normalized = getString(value)?.toLowerCase();

  return TEXT_SIZE_VALUES.includes(normalized as DisplaySettings['textSize'])
    ? normalized as DisplaySettings['textSize']
    : null;
}

export function normalizeAccent(value: unknown): DisplaySettings['accent'] | null {
  const normalized = getString(value)?.toLowerCase();

  return ACCENT_VALUES.includes(normalized as DisplaySettings['accent']) ? normalized as DisplaySettings['accent'] : null;
}

export function normalizeUiStyle(value: unknown): DisplaySettings['uiStyle'] | null {
  const normalized = getString(value)?.toLowerCase();

  return UI_STYLE_VALUES.includes(normalized as DisplaySettings['uiStyle'])
    ? normalized as DisplaySettings['uiStyle']
    : null;
}

function normalizeDisplayLanguage(value: unknown) {
  const language = getString(value);

  if (!language || !/^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})?$/i.test(language)) {
    return null;
  }

  return normalizeLanguage(language);
}

function firstPresent(...values: unknown[]) {
  for (const value of values) {
    const stringValue = getString(value);

    if (stringValue) {
      return stringValue;
    }
  }

  return null;
}

export function getInitialDisplaySettings(): DisplaySettings {
  const query = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
  const hostWindow = typeof window === 'undefined' ? null : (window as HostWindow);
  const queryLanguage = normalizeDisplayLanguage(
    firstPresent(query?.get('lang'), query?.get('language'), query?.get('qdnLang'), query?.get('qdnLanguage')),
  );
  const homeLanguage = normalizeDisplayLanguage(
    firstPresent(hostWindow?._qdnLang, hostWindow?._qdnLanguage, hostWindow?.qdnLang, hostWindow?.qdnLanguage),
  );
  const language = queryLanguage ?? homeLanguage ?? DEFAULT_DISPLAY_SETTINGS.language;

  return {
    accent:
      normalizeAccent(firstPresent(query?.get('accent'), query?.get('qdnAccent'))) ??
      normalizeAccent(firstPresent(hostWindow?._qdnAccent, hostWindow?.qdnAccent)) ??
      DEFAULT_DISPLAY_SETTINGS.accent,
    language,
    languageSource: queryLanguage ? 'query' : homeLanguage ? 'home' : DEFAULT_DISPLAY_SETTINGS.languageSource,
    textSize:
      normalizeTextSize(firstPresent(query?.get('textSize'), query?.get('text-size'), query?.get('qdnTextSize'))) ??
      normalizeTextSize(firstPresent(hostWindow?._qdnTextSize, hostWindow?.qdnTextSize)) ??
      DEFAULT_DISPLAY_SETTINGS.textSize,
    theme:
      normalizeTheme(firstPresent(query?.get('theme'), query?.get('qdnTheme'))) ??
      normalizeTheme(firstPresent(hostWindow?._qdnTheme, hostWindow?.qdnTheme)) ??
      DEFAULT_DISPLAY_SETTINGS.theme,
    uiStyle:
      normalizeUiStyle(firstPresent(query?.get('uiStyle'), query?.get('ui-style'), query?.get('qdnUiStyle'), query?.get('qdnUIStyle'))) ??
      normalizeUiStyle(firstPresent(hostWindow?._qdnUiStyle, hostWindow?._qdnUIStyle, hostWindow?.qdnUiStyle, hostWindow?.qdnUIStyle)) ??
      DEFAULT_DISPLAY_SETTINGS.uiStyle,
  };
}

export function applyDisplaySettings(settings: DisplaySettings) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  root.dataset.accent = settings.accent;
  root.dataset.language = normalizeLanguage(settings.language);
  root.dataset.textSize = settings.textSize;
  root.dataset.theme = settings.theme;
  root.dataset.ui = settings.uiStyle;
  root.dir = isRtlLanguage(settings.language) ? 'rtl' : 'ltr';
  root.lang = normalizeLanguage(settings.language);
  root.style.colorScheme = settings.theme;
}

export function getDisplaySettingsFromMessage(data: unknown, current: DisplaySettings): DisplaySettings | null {
  if (!data || typeof data !== 'object' || typeof (data as { action?: unknown }).action !== 'string') {
    return null;
  }

  const message = data as Record<string, unknown>;

  if ('requestedHandler' in message && message.requestedHandler !== 'UI') {
    return null;
  }

  switch (message.action) {
    case 'ACCENT_CHANGED': {
      const accent = normalizeAccent(firstPresent(message.accent, message.qdnAccent, message._qdnAccent));

      return accent ? { ...current, accent } : null;
    }
    case 'DISPLAY_SETTINGS_CHANGED': {
      const language = normalizeDisplayLanguage(
        firstPresent(message.language, message.lang, message.qdnLang, message.qdnLanguage, message._qdnLang, message._qdnLanguage),
      );

      return {
        accent: normalizeAccent(firstPresent(message.accent, message.qdnAccent, message._qdnAccent)) ?? current.accent,
        language: language ?? current.language,
        languageSource: language ? 'home' : current.languageSource,
        textSize: normalizeTextSize(firstPresent(message.textSize, message.qdnTextSize, message._qdnTextSize)) ?? current.textSize,
        theme: normalizeTheme(firstPresent(message.theme, message.qdnTheme, message._qdnTheme)) ?? current.theme,
        uiStyle:
          normalizeUiStyle(firstPresent(message.uiStyle, message.ui, message.qdnUiStyle, message.qdnUIStyle, message._qdnUiStyle, message._qdnUIStyle)) ??
          current.uiStyle,
      };
    }
    case 'LANGUAGE_CHANGED': {
      const language = normalizeDisplayLanguage(
        firstPresent(message.language, message.lang, message.qdnLang, message.qdnLanguage, message._qdnLang, message._qdnLanguage),
      );

      return language
        ? {
            ...current,
            language,
            languageSource: 'home',
          }
        : null;
    }
    case 'TEXT_SIZE_CHANGED': {
      const textSize = normalizeTextSize(firstPresent(message.textSize, message.qdnTextSize, message._qdnTextSize));

      return textSize ? { ...current, textSize } : null;
    }
    case 'THEME_CHANGED': {
      const theme = normalizeTheme(firstPresent(message.theme, message.qdnTheme, message._qdnTheme));

      return theme ? { ...current, theme } : null;
    }
    case 'UI_STYLE_CHANGED': {
      const uiStyle = normalizeUiStyle(firstPresent(message.uiStyle, message.ui, message.qdnUiStyle, message.qdnUIStyle, message._qdnUiStyle, message._qdnUIStyle));

      return uiStyle ? { ...current, uiStyle } : null;
    }
    default:
      return null;
  }
}

export function applyCoreLanguage(settings: DisplaySettings, coreLanguage: unknown): DisplaySettings {
  const language = normalizeDisplayLanguage(coreLanguage);

  if (settings.languageSource !== 'default' || !language) {
    return settings;
  }

  return {
    ...settings,
    language,
    languageSource: 'core',
  };
}
