import assert from 'assert';
import { memoize } from 'lodash';
import { MemoryInitializer } from './memory';

const MEMORY_KEY = '__WASABIO_MEMORY__';

async function init() {
  assert(typeof globalThis !== 'undefined', 'globalThis is not defined');
  assert(!isInitialized(), 'Wasabio has already been initialized in this context');

  console.log('Initializing Wasabio...');
  const memory = await MemoryInitializer.get();
  console.log('Wasabio initialized with memory:', memory);
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
