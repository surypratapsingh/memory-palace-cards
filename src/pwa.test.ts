import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { registerServiceWorker, showUpdateLine, type ContainerLike, type RegistrationLike, type WorkerLike } from './pwa.ts';

// ---------- registration ----------

function fakeWorker(state = 'installing'): WorkerLike & { messages: unknown[]; fire(): void; state: string } {
  const listeners: Array<() => void> = [];
  return {
    state,
    messages: [],
    postMessage(message) { this.messages.push(message); },
    addEventListener(_type, listener) { listeners.push(listener); },
    fire() { for (const l of listeners) l(); },
  };
}

function fakeContainer(options: { controller?: unknown; waiting?: WorkerLike | null } = {}) {
  const controllerListeners: Array<() => void> = [];
  const updateListeners: Array<() => void> = [];
  const registration = {
    waiting: options.waiting ?? null,
    installing: null as WorkerLike | null,
    addEventListener(_type: 'updatefound', listener: () => void) { updateListeners.push(listener); },
  };
  const container = {
    controller: options.controller ?? null,
    registeredUrls: [] as string[],
    async register(url: string) { this.registeredUrls.push(url); return registration as RegistrationLike; },
    addEventListener(_type: 'controllerchange', listener: () => void) { controllerListeners.push(listener); },
    controllerChange() { for (const l of controllerListeners) l(); },
  };
  return {
    container: container as ContainerLike & { registeredUrls: string[]; controllerChange(): void },
    registration,
    updateFound(installing: WorkerLike) {
      registration.installing = installing;
      for (const l of updateListeners) l();
    },
  };
}

test('registration: nothing happens outside production or without a container', async () => {
  const { container } = fakeContainer();
  assert.equal(await registerServiceWorker(false, container, () => assert.fail('no offer in dev'), () => assert.fail('no reload')), null);
  assert.deepEqual(container.registeredUrls, []);
  assert.equal(await registerServiceWorker(true, undefined), null);
});

test('registration: production registers the worker at ./sw.js', async () => {
  const { container } = fakeContainer();
  const registration = await registerServiceWorker(true, container, () => assert.fail('no offer on first install'));
  assert.ok(registration);
  assert.deepEqual(container.registeredUrls, ['./sw.js']);
});

test('registration: a first install (no controller yet) offers no update', async () => {
  const { container } = fakeContainer({ controller: null, waiting: fakeWorker('installed') });
  let offers = 0;
  await registerServiceWorker(true, container, () => { offers++; });
  assert.equal(offers, 0);
});

test('registration: a waiting worker under an old controller is offered once', async () => {
  const waiting = fakeWorker('installed');
  const { container } = fakeContainer({ controller: {}, waiting });
  let offers = 0;
  await registerServiceWorker(true, container, () => { offers++; });
  assert.equal(offers, 1);
});

test('registration: a worker that finishes installing is offered, and only once', async () => {
  const { container, updateFound } = fakeContainer({ controller: {} });
  let offers = 0;
  await registerServiceWorker(true, container, () => { offers++; });
  const installing = fakeWorker('installing');
  updateFound(installing);
  installing.state = 'installing';
  installing.fire();
  assert.equal(offers, 0, 'still installing: no line');
  installing.state = 'installed';
  installing.fire();
  installing.fire();
  assert.equal(offers, 1);
});

test('registration: the page never reloads by itself', async () => {
  const waiting = fakeWorker('installed');
  const { container } = fakeContainer({ controller: {}, waiting });
  let reloads = 0;
  await registerServiceWorker(true, container, () => {}, () => { reloads++; });
  container.controllerChange();
  assert.equal(reloads, 0);
});

test('registration: Reload asks the waiting worker to take over, then reloads once', async () => {
  const waiting = fakeWorker('installed');
  const { container } = fakeContainer({ controller: {}, waiting });
  let accept: (() => void) | null = null;
  let reloads = 0;
  await registerServiceWorker(true, container, (fn) => { accept = fn; }, () => { reloads++; });
  assert.ok(accept);
  accept!();
  assert.deepEqual(waiting.messages, [{ type: 'SKIP_WAITING' }]);
  assert.equal(reloads, 0, 'reload waits for controllerchange');
  container.controllerChange();
  container.controllerChange();
  assert.equal(reloads, 1);
});

// ---------- the line ----------

class FakeEl {
  children: FakeEl[] = [];
  attrs: Record<string, string> = {};
  textContent = '';
  className = '';
  type = '';
  disabled = false;
  listeners: Record<string, Array<() => void>> = {};
  tag: string;
  constructor(tag: string) {
    this.tag = tag;
  }
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  append(...nodes: FakeEl[]) { this.children.push(...nodes); }
  addEventListener(type: string, fn: () => void) { (this.listeners[type] ??= []).push(fn); }
  click() { for (const fn of this.listeners.click ?? []) fn(); }
}

test('update line: polite status with a real button; click calls accept once and disables it', () => {
  const body = new FakeEl('body');
  const doc = { body, createElement: (tag: string) => new FakeEl(tag) } as unknown as Document;
  let accepted = 0;
  showUpdateLine(doc, () => { accepted++; });
  const line = body.children[0];
  assert.equal(line.className, 'pwa-update');
  assert.equal(line.attrs.role, 'status');
  assert.equal(line.children[0].textContent, 'New version ready');
  const button = line.children[1];
  assert.equal(button.tag, 'button');
  assert.equal(button.type, 'button');
  assert.equal(button.textContent, 'Reload');
  button.click();
  button.click();
  assert.equal(accepted, 2, 'listener fires per click; the disabled attribute stops real repeats');
  assert.equal(button.disabled, true);
});

// ---------- sw.js, run in a sandbox with fake caches and fetch ----------

type Resp = { ok: boolean; status: number; type: string; body: string; clone(): Resp };
function response(status: number, body = 'x', type = 'basic'): Resp {
  const r: Resp = { ok: status >= 200 && status < 300, status, type, body, clone() { return { ...r, clone: r.clone }; } };
  return r;
}

const ORIGIN = 'https://palace.test';
const SW_URL = `${ORIGIN}/app/sw.js`;
const swSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function sandbox(network: (url: string, init?: { method?: string }) => Promise<Resp> | Resp) {
  const listeners = new Map<string, Array<(event: any) => void>>();
  const stores = new Map<string, Map<string, Resp>>(); // cache name -> url -> response
  const fetched: string[] = [];
  let skipWaiting = 0;
  let claimed = 0;
  const key = (u: string) => new URL(u, SW_URL).href;
  const cacheApi = (name: string) => {
    const map = stores.get(name) ?? new Map<string, Resp>();
    stores.set(name, map);
    return {
      async addAll(urls: string[]) { for (const u of urls) map.set(key(u), response(200, `shell ${u}`)); },
      async put(req: string | { url: string }, res: Resp) { map.set(key(typeof req === 'string' ? req : req.url), res); },
      async match(req: string | { url: string }) { return map.get(key(typeof req === 'string' ? req : req.url)); },
    };
  };
  const caches = {
    open: async (name: string) => cacheApi(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    async match(req: { url: string }) {
      for (const map of stores.values()) {
        const hit = map.get(key(req.url));
        if (hit) return hit;
      }
      return undefined;
    },
  };
  const self = {
    location: { origin: ORIGIN, href: SW_URL },
    addEventListener(type: string, fn: (event: any) => void) { listeners.set(type, [...(listeners.get(type) ?? []), fn]); },
    skipWaiting() { skipWaiting++; },
    clients: { claim() { claimed++; return Promise.resolve(); } },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response: { error: () => response(0, '', 'error') },
    fetch: async (req: { url: string; method?: string }) => {
      fetched.push(req.url);
      return network(req.url, { method: req.method });
    },
    console,
  });
  vm.runInContext(swSource, context, { filename: 'sw.js' });

  async function dispatch(type: string, event: Record<string, unknown> = {}) {
    const handled: { respond?: Promise<unknown>; waits: Promise<unknown>[] } = { waits: [] };
    const full = {
      ...event,
      waitUntil(p: Promise<unknown>) { handled.waits.push(p); },
      respondWith(p: Promise<unknown>) { handled.respond = p; },
    };
    for (const fn of listeners.get(type) ?? []) fn(full);
    await Promise.all(handled.waits);
    return handled;
  }
  return {
    dispatch,
    stores,
    fetched,
    get skipWaiting() { return skipWaiting; },
    get claimed() { return claimed; },
  };
}

const get = (url: string, mode = 'no-cors') => ({ url, method: 'GET', mode });

test('sw: install caches the shell and never calls skipWaiting by itself', async () => {
  const sw = sandbox(async () => response(200));
  await sw.dispatch('install');
  const shell = sw.stores.get('memory-palace-v1');
  assert.ok(shell?.has(`${ORIGIN}/app/`), 'caches ./');
  assert.ok(shell?.has(`${ORIGIN}/app/index.html`), 'caches ./index.html');
  assert.equal(sw.skipWaiting, 0, 'a new version waits for the page');
});

test('sw: only the SKIP_WAITING message makes the new worker take over', async () => {
  const sw = sandbox(async () => response(200));
  await sw.dispatch('message', { data: { type: 'OTHER' } });
  assert.equal(sw.skipWaiting, 0);
  await sw.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(sw.skipWaiting, 1);
});

test('sw: cross-origin and non-GET requests are never handled or cached', async () => {
  const sw = sandbox(async (url) => response(200, 'remote', 'cors'));
  const cross = await sw.dispatch('fetch', { request: get('https://cdn.example.test/lib.js') });
  assert.equal(cross.respond, undefined);
  const post = await sw.dispatch('fetch', { request: { url: `${ORIGIN}/app/assets/a.js`, method: 'POST', mode: 'cors' } });
  assert.equal(post.respond, undefined);
  assert.deepEqual(sw.fetched, []);
});

test('sw: navigation is network first and refreshes the cached shell', async () => {
  let online = true;
  const sw = sandbox(async () => {
    if (!online) throw new TypeError('offline');
    return response(200, 'fresh index');
  });
  const nav = await sw.dispatch('fetch', { request: get(`${ORIGIN}/app/`, 'navigate') });
  const res = await nav.respond as Resp;
  assert.equal(res.body, 'fresh index');
  assert.equal(sw.stores.get('memory-palace-v1')?.get(`${ORIGIN}/app/index.html`)?.body, 'fresh index');
});

test('sw: offline navigation falls back to the cached shell', async () => {
  const sw = sandbox(async () => { throw new TypeError('offline'); });
  await sw.dispatch('install');
  const nav = await sw.dispatch('fetch', { request: get(`${ORIGIN}/app/`, 'navigate') });
  assert.equal((await nav.respond as Resp).body, 'shell ./index.html');
});

test('sw: cached assets are served without touching the network', async () => {
  const sw = sandbox(async () => response(200, 'network'));
  await sw.dispatch('install');
  sw.stores.get('memory-palace-v1')!.set(`${ORIGIN}/app/assets/index-abc.js`, response(200, 'cached js'));
  const hit = await sw.dispatch('fetch', { request: get(`${ORIGIN}/app/assets/index-abc.js`, 'no-cors') });
  assert.equal((await hit.respond as Resp).body, 'cached js');
  assert.deepEqual(sw.fetched, []);
});

test('sw: a missing asset is fetched and cached when it succeeds', async () => {
  const sw = sandbox(async () => response(200, 'new chunk'));
  const miss = await sw.dispatch('fetch', { request: get(`${ORIGIN}/app/assets/palace-1.js`) });
  assert.equal((await miss.respond as Resp).body, 'new chunk');
  assert.ok(sw.stores.get('memory-palace-v1')?.has(`${ORIGIN}/app/assets/palace-1.js`));
});

test('sw: a 404 asset is returned but never cached', async () => {
  const sw = sandbox(async () => response(404, 'nope'));
  const missing = await sw.dispatch('fetch', { request: get(`${ORIGIN}/app/assets/gone.js`) });
  assert.equal((await missing.respond as Resp).status, 404);
  assert.equal(sw.stores.get('memory-palace-v1')?.has(`${ORIGIN}/app/assets/gone.js`) ?? false, false);
});

test('sw: opaque cross-origin-style responses are never cached', async () => {
  const sw = sandbox(async () => response(200, 'opaque', 'opaque'));
  const odd = await sw.dispatch('fetch', { request: get(`${ORIGIN}/app/assets/odd.js`) });
  await odd.respond;
  assert.equal(sw.stores.get('memory-palace-v1')?.has(`${ORIGIN}/app/assets/odd.js`) ?? false, false);
});

test('sw: activate deletes old caches, keeps the current one and claims clients', async () => {
  const sw = sandbox(async () => response(200));
  await sw.dispatch('install');
  sw.stores.set('memory-palace-v0', new Map([[`${ORIGIN}/app/old.js`, response(200)]]));
  await sw.dispatch('activate');
  assert.deepEqual([...sw.stores.keys()], ['memory-palace-v1']);
  assert.equal(sw.claimed, 1);
});

test('sw: the worker never touches the save (localStorage)', () => {
  const code = swSource.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(code), false);
  assert.ok(swSource.split('\n').length < 80, 'stays under 80 lines');
});
