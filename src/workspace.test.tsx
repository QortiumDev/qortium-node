// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
let root: Root;let container: HTMLDivElement;
const tab = (index: number) => container.querySelectorAll<HTMLButtonElement>('.tab-button')[index];
async function click(e: HTMLElement) { await act(async () => e.click()); }
async function mount() { await act(async () => root.render(<App />)); }
async function traverse(direction: 'back' | 'forward') { await act(async () => new Promise<void>(resolve => { window.addEventListener('popstate', () => resolve(), { once: true });window.history[direction](); })); }
function bridge(publicNode = false) {
 const request = vi.fn(async ({ action, path }: {action: string;path?: string}) => {
  if(action==='SHOW_ACTIONS')return ['FETCH_NODE_API','GET_NODE_STATUS','GET_NODE_SETTINGS_METADATA','UPDATE_NODE_SETTINGS','RESTART_NODE'];
  if(action==='WHICH_UI')return 'QORTIUM_HOME';
  if(action==='IS_USING_PUBLIC_NODE')return publicNode;
  if(action==='GET_NODE_STATUS')return {height:123,syncPercent:100};
  if(action==='GET_NODE_SETTINGS_METADATA')return {writable:{apiDocumentationEnabled:{type:'boolean',restartRequired:false}}};
  if(action==='FETCH_NODE_API')return {ok:true,data:path==='/admin/settings'?{apiDocumentationEnabled:true}:[]};
  throw new Error('Unexpected '+action);
 });window.qdnRequest=request as NonNullable<typeof window.qdnRequest>;return request;
}
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);window.history.replaceState({host:7},'', '/?page=settings&future=a&future=b#retained');container=document.createElement('div');document.body.append(container);root=createRoot(container); });
afterEach(async () => {await act(async () => root.unmount());container.remove();delete window.qdnRequest;vi.unstubAllGlobals();vi.restoreAllMocks();window.history.replaceState(null,'','/');});
describe('workspace integration', () => {
 it('keeps Developers usable when the host is unavailable', async () => {
  window.qdnRequest=vi.fn(async () => {throw new Error('Offline');}) as NonNullable<typeof window.qdnRequest>;
  await mount();await click(tab(2));expect(container.querySelector('.reference')).not.toBeNull();expect(container.querySelector('.notice')).toBeNull();
 });
 it('retains an unsaved settings draft through tabs and real Back/Forward without writes', async () => {
  const request=bridge();await mount();const input=container.querySelector<HTMLSelectElement>('.setting-control')!;
  await act(async () => {input.value='false';input.dispatchEvent(new Event('change',{bubbles:true}));});
  await click(tab(2));await traverse('back');expect(container.querySelector<HTMLSelectElement>('.setting-control')?.value).toBe('false');
  await traverse('forward');expect(container.querySelector('.reference')).not.toBeNull();await click(tab(1));expect(container.querySelector<HTMLSelectElement>('.setting-control')?.value).toBe('false');
  expect(new URLSearchParams(location.search).getAll('future')).toEqual(['a','b']);expect(location.hash).toBe('#retained');expect(window.history.state).toEqual({host:7});
  expect(request.mock.calls.some(([r])=>/UPDATE_NODE_SETTINGS|RESTART_NODE/.test(r.action))).toBe(false);
 });
 it('keeps public-node settings read-only while reference and copying remain usable', async () => {
  const request=bridge(true);await mount();expect(container.querySelector<HTMLSelectElement>('.setting-control')?.disabled).toBe(true);
  await click(tab(2));const writeText=vi.fn(async()=>{});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
  await click(container.querySelector('[aria-label="Copy save example"]')!);expect(container.querySelector('[role=status]')?.textContent).toContain('Copied save');expect(writeText).toHaveBeenCalledOnce();
  expect(request.mock.calls.some(([r])=>/UPDATE_NODE_SETTINGS|RESTART_NODE/.test(r.action))).toBe(false);
 });
 it('does not replace Developers when an initial status response arrives late',async()=>{
  const request=bridge();let finish!: (v:unknown)=>void;const pending=new Promise(r=>{finish=r});const original=window.qdnRequest!;
  window.qdnRequest=vi.fn((r:{action:string})=>r.action==='GET_NODE_STATUS'?pending:original(r)) as NonNullable<typeof window.qdnRequest>;
  await mount();await click(tab(2));await act(async()=>finish({height:1}));expect(container.querySelector('.reference')).not.toBeNull();expect(request.mock.calls.some(([r])=>r.action==='UPDATE_NODE_SETTINGS')).toBe(false);
 });
});
