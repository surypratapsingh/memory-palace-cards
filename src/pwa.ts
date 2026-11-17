// Service worker registration (production only) and the non-blocking "New version ready" line.
// The worker never reloads the page by itself: a reload happens only after the player clicks Reload.

export interface WorkerLike {
  state?: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
}

export interface RegistrationLike {
  waiting: WorkerLike | null;
  installing: WorkerLike | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
}

export interface ContainerLike {
  controller: unknown | null;
  register(url: string): Promise<RegistrationLike>;
  addEventListener(type: 'controllerchange', listener: () => void): void;
}

/** Shows the line; `accept` is called when the player clicks Reload. Returns nothing the caller needs. */
export type ShowUpdate = (accept: () => void) => void;

export function showUpdateLine(doc: Document, accept: () => void): void {
  const line = doc.createElement('div');
  line.className = 'pwa-update';
  line.setAttribute('role', 'status');
  const text = doc.createElement('span');
  text.textContent = 'New version ready';
  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = 'Reload';
  button.addEventListener('click', () => {
    button.disabled = true;
    accept();
  });
  line.append(text, button);
  doc.body.append(line);
}

/**
 * Registers ./sw.js when `isProd` and a container exists. Offers an update only when a new worker
 * is waiting while an old one controls the page (a first install has nothing to update).
 */
export async function registerServiceWorker(
  isProd: boolean,
  container: ContainerLike | undefined = globalThis.navigator?.serviceWorker as unknown as ContainerLike | undefined,
  showUpdate: ShowUpdate = (accept) => showUpdateLine(document, accept),
  reload: () => void = () => globalThis.location.reload(),
): Promise<RegistrationLike | null> {
  if (!isProd || !container) return null;
  let reloadRequested = false;
  container.addEventListener('controllerchange', () => {
    if (!reloadRequested) return;
    reloadRequested = false;
    reload();
  });
  const registration = await container.register('./sw.js');
  let offered = false;
  const offer = (worker: WorkerLike): void => {
    if (offered || !container.controller) return;
    offered = true;
    showUpdate(() => {
      reloadRequested = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
  };
  if (registration.waiting) offer(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') offer(worker);
    });
  });
  return registration;
}
