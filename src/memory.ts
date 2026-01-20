import JSZip from 'jszip';
import * as idb from 'idb';
import * as wasabio from 'wasabio';

const DATABASE_NAME = 'wasabio';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'memory';
const ARCHIVE_EXT = '.zip';
const ARCHIVE_NAME = 'workspace';
const METADATA_NAME = 'metadata.json';

async function db() {
  const db = await idb.openDB(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      db.createObjectStore(OBJECT_STORE_NAME);
    },
  });
  return db;
}

import wasabioPackageJson from '../node_modules/wasabio/package.json';
const METADATA = { version: wasabioPackageJson.version };

export class MemoryInitializer {
  private readonly _promise: Promise<WebAssembly.Memory>;
  private static _instance: MemoryInitializer;
  private static _busy: boolean = false;
  private constructor() {
    this._promise = MemoryInitializer.restore()
      .then((memory) => {
        if (!memory) throw new Error('No memory to restore');
        return wasabio.initialize(memory, { reboot: true });
      })
      .catch((err: any) => {
        console.error(err);
        console.warn('Failed to restore Wasabio memory, initializing new instance.');
        return wasabio.initialize();
      });
  }
  static get(): Promise<WebAssembly.Memory> {
    if (!MemoryInitializer._instance) {
      MemoryInitializer._instance = new MemoryInitializer();
    }
    return MemoryInitializer._instance._promise;
  }
  static async reset(): Promise<void> {
    const database = await db();
    await database.delete(OBJECT_STORE_NAME, 0);
  }
  static async persist(): Promise<void> {
    if (MemoryInitializer._busy) {
      return;
    }
    MemoryInitializer._busy = true;
    const memory = await MemoryInitializer.get();
    const buffer = wasabio.serialize(memory);
    const zippedBuffer = await uint8ArrayToZip(buffer);
    const database = await db();
    await database.put(OBJECT_STORE_NAME, zippedBuffer, 0);
    MemoryInitializer._busy = false;
  }
  static async restore(): Promise<WebAssembly.Memory | undefined> {
    const database = await db();
    const buffer = await database.get(OBJECT_STORE_NAME, 0);
    if (buffer) {
      const unzippedBuffer = await zipToUint8Array(buffer);
      if (unzippedBuffer) {
        return wasabio.deserialize(unzippedBuffer);
      }
    }
  }
  static async download(): Promise<void> {
    const memory = await MemoryInitializer.get();
    const buffer = wasabio.serialize(memory);
    const zippedBuffer = (await uint8ArrayToZip(buffer)) as any as ArrayBuffer;
    const blob = new Blob([zippedBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ARCHIVE_NAME}${ARCHIVE_EXT}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  static async upload(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${ARCHIVE_EXT},.zip`;
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.item?.(0);
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const zipBuffer = new Uint8Array(buffer);
      const unzippedBuffer = await zipToUint8Array(zipBuffer);
      if (unzippedBuffer) {
        const database = await db();
        await database.put(OBJECT_STORE_NAME, zipBuffer, 0);
        // todo: patch wasm bindgen to allow for hot reloading
        window.location.reload();
      }
    };
    input.click();
  }
}

async function uint8ArrayToZip(buffer: Uint8Array): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(OBJECT_STORE_NAME, buffer, { compression: 'DEFLATE' });
  zip.file(METADATA_NAME, JSON.stringify(METADATA), { compression: 'DEFLATE' });
  const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
  return zipBuffer;
}

async function zipToUint8Array(buffer: Uint8Array): Promise<Uint8Array | undefined> {
  const zip = await JSZip.loadAsync(buffer);
  const zipBuffer = await zip.file(OBJECT_STORE_NAME)?.async('uint8array');
  const metadata = await zip.file(METADATA_NAME)?.async('string');
  if (metadata) {
    const { version } = JSON.parse(metadata);
    if (typeof version === 'string' && version === METADATA.version) {
      return zipBuffer;
    } else {
      console.warn(`version mismatch: ${version} !== ${METADATA.version}`);
      console.table({ version, METADATA });
      // todo: returning undefined here will cause the wasm to be reinitialized with clean slate.
      // todo: maybe backup user data before nuking?
    }
  }
}
