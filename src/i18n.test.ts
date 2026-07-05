import { describe, expect, it } from 'vitest';
import { createTranslator, isRtlLanguage, normalizeLanguage } from './i18n';

describe('i18n fallback behavior', () => {
  it('normalizes Home and Core language tags', () => {
    expect(normalizeLanguage('en-US')).toBe('en');
    expect(normalizeLanguage('zh_CN')).toBe('zh-CN');
    expect(normalizeLanguage('zh-Hant')).toBe('zh-TW');
    expect(normalizeLanguage('es-MX')).toBe('es');
  });

  it('detects RTL languages', () => {
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('he-IL')).toBe(true);
    expect(isRtlLanguage('en')).toBe(false);
  });

  it('uses English strings as fallback', () => {
    const t = createTranslator('es');

    expect(t('label.refresh')).toBe('Refresh');
    expect(t('message.sockets', { count: 3 })).toBe('3 sockets');
  });
});
