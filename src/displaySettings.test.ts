import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyCoreLanguage,
  applyDisplaySettings,
  getDisplaySettingsFromMessage,
  getInitialDisplaySettings,
  normalizeAccent,
  normalizeTextSize,
  normalizeTheme,
  normalizeUiStyle,
} from './displaySettings';
import type { DisplaySettings } from './types';

const current: DisplaySettings = {
  accent: 'green',
  language: 'en',
  languageSource: 'default',
  textSize: 'medium',
  theme: 'light',
  uiStyle: 'classic',
};

describe('display settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes supported Home values and rejects unsupported values', () => {
    expect(normalizeAccent('BLUE')).toBe('blue');
    expect(normalizeTextSize('extra-large')).toBe('extra-large');
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeUiStyle(' MODERN ')).toBe('modern');
    expect(normalizeAccent('neon')).toBeNull();
    expect(normalizeTextSize('extra-huge')).toBeNull();
    expect(normalizeTheme('sepia')).toBeNull();
    expect(normalizeUiStyle('retro')).toBeNull();
  });

  it('reads initial query params before Home globals', () => {
    vi.stubGlobal('window', {
      _qdnAccent: 'yellow',
      _qdnLang: 'fr',
      _qdnTextSize: 'small',
      _qdnTheme: 'light',
      _qdnUiStyle: 'classic',
      location: {
        search: '?theme=dark&textSize=huge&lang=ar&accent=blue&uiStyle=modern',
      },
    });

    expect(getInitialDisplaySettings()).toEqual({
      accent: 'blue',
      language: 'ar',
      languageSource: 'query',
      textSize: 'huge',
      theme: 'dark',
      uiStyle: 'modern',
    });
  });

  it('reads QDN alias globals and falls back from invalid values', () => {
    vi.stubGlobal('window', {
      qdnAccent: 'pink',
      qdnLanguage: '../en',
      qdnTextSize: 'extra-large',
      qdnTheme: 'banana',
      qdnUIStyle: 'modern',
      location: {
        search: '',
      },
    });

    expect(getInitialDisplaySettings()).toEqual({
      accent: 'pink',
      language: 'en',
      languageSource: 'default',
      textSize: 'extra-large',
      theme: 'light',
      uiStyle: 'modern',
    });
  });

  it('updates individual settings from Home messages and ignores invalid changes', () => {
    expect(getDisplaySettingsFromMessage({ action: 'ACCENT_CHANGED', requestedHandler: 'UI', qdnAccent: 'cyan' }, current)).toEqual({
      ...current,
      accent: 'cyan',
    });
    expect(getDisplaySettingsFromMessage({ action: 'TEXT_SIZE_CHANGED', _qdnTextSize: 'large' }, current)).toEqual({
      ...current,
      textSize: 'large',
    });
    expect(getDisplaySettingsFromMessage({ action: 'UI_STYLE_CHANGED', qdnUIStyle: 'modern' }, current)).toEqual({
      ...current,
      uiStyle: 'modern',
    });
    expect(getDisplaySettingsFromMessage({ action: 'THEME_CHANGED', qdnTheme: 'dark' }, current)).toEqual({
      ...current,
      theme: 'dark',
    });
    expect(getDisplaySettingsFromMessage({ action: 'LANGUAGE_CHANGED', qdnLanguage: 'en_US' }, current)).toEqual({
      ...current,
      language: 'en',
      languageSource: 'home',
    });
    expect(getDisplaySettingsFromMessage({ action: 'UI_STYLE_CHANGED', requestedHandler: 'OTHER', uiStyle: 'modern' }, current)).toBeNull();
    expect(getDisplaySettingsFromMessage({ action: 'TEXT_SIZE_CHANGED', textSize: 'massive' }, current)).toBeNull();
  });

  it('updates batched settings with aliases', () => {
    expect(
      getDisplaySettingsFromMessage(
        {
          _qdnAccent: 'red',
          _qdnTextSize: 'small',
          action: 'DISPLAY_SETTINGS_CHANGED',
          language: 'he',
          qdnTheme: 'dark',
          ui: 'modern',
        },
        current,
      ),
    ).toEqual({
      accent: 'red',
      language: 'he',
      languageSource: 'home',
      textSize: 'small',
      theme: 'dark',
      uiStyle: 'modern',
    });
  });

  it('applies settings to the document root and lets Core provide default language', () => {
    const root = {
      dataset: {} as Record<string, string>,
      dir: '',
      lang: '',
      style: {} as Record<string, string>,
    };

    vi.stubGlobal('document', {
      documentElement: root,
    });

    applyDisplaySettings({
      ...current,
      accent: 'purple',
      language: 'ar',
      textSize: 'huge',
      theme: 'dark',
      uiStyle: 'modern',
    });

    expect(root.dataset).toMatchObject({
      accent: 'purple',
      language: 'ar',
      textSize: 'huge',
      theme: 'dark',
      ui: 'modern',
    });
    expect(root.dir).toBe('rtl');
    expect(root.lang).toBe('ar');
    expect(root.style.colorScheme).toBe('dark');
    expect(applyCoreLanguage(current, 'es_MX')).toMatchObject({
      language: 'es',
      languageSource: 'core',
    });
    expect(applyCoreLanguage({ ...current, languageSource: 'query' }, 'es')).toMatchObject({
      language: 'en',
      languageSource: 'query',
    });
  });
});
