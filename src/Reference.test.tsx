import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Reference, REFERENCE_SNIPPETS } from './Reference';
import { PHASE_1_EDITABLE_SETTING_KEYS, parseGigabytesToBytes, parseHoursToMilliseconds } from './settingsEditor';
import { normalizeSettingsMetadata } from './settingsView';
import { referenceSectionUrl } from './ReferenceNavigation';
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
describe('developer reference', () => {
  it('renders public English/LTR documentation and accessible copy results', () => {
    const html = renderToStaticMarkup(<Reference />);
    expect(html).toContain('lang="en" dir="ltr"'); expect(html).toContain('aria-live="polite"');
    for (const key of PHASE_1_EDITABLE_SETTING_KEYS) expect(html).toContain(key);
    for (const key of Object.keys(REFERENCE_SNIPPETS)) expect(html).toContain(`aria-label="Copy ${key} example"`);
  });
  it('uses retained settings/query/fragment for section links', () => {
    expect(referenceSectionUrl('/render/APP/Node/Node?page=settings&x=a&x=b#retained','writes')).toBe('/render/APP/Node/Node?page=settings&x=a&x=b&view=developers&section=writes#retained');
  });
  it('discovers capabilities without executing settings writes', async () => {
    const request = vi.fn(async ({ action }) => action === 'SHOW_ACTIONS' ? ['UPDATE_NODE_SETTINGS'] : true);
    await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.capabilities)(request);
    expect(request.mock.calls.map(([r]) => r.action)).toEqual(['SHOW_ACTIONS', 'IS_USING_PUBLIC_NODE']);
  });
  it('rejects a failed read envelope rather than treating an error as peer data', async () => {
    const request = vi.fn(async ({ action }) => action === 'GET_NODE_STATUS' ? { height: 1 } : { ok: false, status: 403 });
    await expect(new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.reads)(request)).rejects.toThrow('403');
  });
  it('keeps write and restart examples inert until called and does not retry rejection', async () => {
    const request = vi.fn(async () => { throw new Error('Denied'); });
    const save = await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.save + '\nreturn saveReviewedPatch;')(request);
    const restart = await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.restart + '\nreturn requestRestart;')(request);
    expect(request).not.toHaveBeenCalled();
    await expect(save({ apiDocumentationEnabled: false })).rejects.toThrow('Denied');
    expect(request).toHaveBeenCalledExactlyOnceWith({ action: 'UPDATE_NODE_SETTINGS', settings: { apiDocumentationEnabled: false } });
    await expect(restart()).rejects.toThrow('Denied');expect(request).toHaveBeenCalledTimes(2);
  });
  it('matches documented writable metadata shapes to the app normalizer', () => {
    const value = { type: 'boolean', restartRequired: true };
    const entry = { key: 'apiDocumentationEnabled', value };
    expect(normalizeSettingsMetadata({ writable: { apiDocumentationEnabled: value } })?.writable).toEqual({ apiDocumentationEnabled: value });
    expect(normalizeSettingsMetadata({ writable: { entry: [entry] } })?.writable).toEqual({ apiDocumentationEnabled: value });
    expect(normalizeSettingsMetadata({ writable: [entry] })?.writable).toEqual({});
  });
  it('pins documented unit examples and boundaries to the real parsers', async () => {
    const result = await new AsyncFunction(REFERENCE_SNIPPETS.units + '\nreturn [storageBytes, retentionMilliseconds];')();
    expect(result).toEqual([parseGigabytesToBytes('2.5'), parseHoursToMilliseconds('24')]);
    expect(parseGigabytesToBytes('0.5')).toBeNull();expect(parseHoursToMilliseconds('1.0001')).toBeNull();
  });
});
