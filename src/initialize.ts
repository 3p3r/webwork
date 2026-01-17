import assert from 'assert';
import { memoize } from 'lodash';
import { initialize } from 'wasabio';

const MEMORY_KEY = '__WASABIO_MEMORY__';

async function init() {
  assert(typeof globalThis !== 'undefined', 'globalThis is not defined');
  assert(!isInitialized(), 'Wasabio has already been initialized in this context');

  const memory = await initialize();
  (globalThis as any)[MEMORY_KEY] = memory;
}

const initializeOnce = memoize(() => init());

initializeOnce().catch((error) => {
  console.error('Failed to initialize Wasabio:', error);
});

export function isInitialized(): boolean {
  return MEMORY_KEY in globalThis;
}

export async function waitForInitialization(): Promise<void> {
  await initializeOnce();
}
