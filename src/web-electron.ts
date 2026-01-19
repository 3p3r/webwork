/// <reference types="../openwork/node_modules/electron/electron" />

import { EventEmitter } from 'events';
import * as fs from 'fs';

export default {};

type ElectronOpenDialogOptions = Electron.OpenDialogOptions;

export const ipcRenderer = new (class extends EventEmitter {
  send(channel: string, ...args: unknown[]): void {
    console.log(`ipcRenderer.send called with channel: ${channel}`, ...args);
    ipcMain.emit(channel, {}, ...args);
  }

  async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    console.log(`ipcRenderer.invoke called with channel: ${channel}`, ...args);
    return await ipcMain.emitAsync(channel, ...args);
  }
})();

export const contextBridge = {
  exposeInMainWorld: (key: string, api: unknown): void => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>)[key] = api;
    }
    if (typeof globalThis !== 'undefined') {
      (globalThis as unknown as Record<string, unknown>)[key] = api;
    }
  },
};

const BrowserWindow = class extends EventEmitter {
  private static instance: InstanceType<typeof BrowserWindow>;

  constructor() {
    super();
    BrowserWindow.instance = this;
  }

  static getAllWindows(): InstanceType<typeof BrowserWindow>[] {
    return BrowserWindow.instance ? [BrowserWindow.instance] : [];
  }

  static fromWebContents(_webContents: unknown): InstanceType<typeof BrowserWindow> | null {
    return BrowserWindow.instance || null;
  }

  webContents = new (class {
    setWindowOpenHandler(
      handler: (details: { url: string }) => { action: 'allow' | 'deny' },
    ): void {
      console.log('setWindowOpenHandler called with handler:', handler);
    }
    send(channel: string, ...args: unknown[]): void {
      console.log(`webContents.send called with channel: ${channel}`, ...args);
      // Emit with null as first argument to match Electron's event object
      ipcRenderer.emit(channel, null, ...args);
    }
  })();
  loadFile(filePath: string): void {
    console.log(`BrowserWindow.loadFile called with filePath: ${filePath}`);
  }
};

export { BrowserWindow };

export const shell = {
  openExternal: async (url: string): Promise<void> => {
    console.log(`shell.openExternal called with url: ${url}`);
  },
};

export const nativeImage = {};

export const ipcMain = new (class extends EventEmitter {
  private handlers = new Map<string, (event: null, ...args: unknown[]) => Promise<unknown>>();

  handle(channel: string, listener: (event: null, ...args: unknown[]) => Promise<unknown>): void {
    console.log(`ipcMain.handle called with channel: ${channel}`);
    this.handlers.set(channel, listener);
  }

  async emitAsync(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = this.handlers.get(channel);
    if (handler) {
      return await handler(null, ...args);
    }
    return undefined;
  }
})();

export const dialog = {
  showOpenDialog: async (
    options?: ElectronOpenDialogOptions,
  ): Promise<{ canceled: boolean; filePaths: string[] }> => {
    console.log('dialog.showOpenDialog called with options:', options);

    try {
      const properties = options?.properties || [];

      if (properties.includes('openDirectory')) {
        // Use showDirectoryPicker for directories
        const dirHandle = await window.showDirectoryPicker();
        const basePath = `/${dirHandle.name}`;

        // Recursively sync directory to wasabio
        await syncDirectoryToWasabio(dirHandle, basePath);

        return { canceled: false, filePaths: [basePath] };
      } else {
        // Use showOpenFilePicker for files (default behavior)
        const multiple = properties.includes('multiSelections');
        const fileHandles = await window.showOpenFilePicker({ multiple });
        const filePaths: string[] = [];

        // Sync each file to wasabio
        for (const fileHandle of fileHandles) {
          const filePath = `/${fileHandle.name}`;
          await syncFileToWasabio(fileHandle, filePath);
          filePaths.push(filePath);
        }

        return { canceled: false, filePaths };
      }
    } catch (error) {
      // User canceled the dialog or error occurred
      console.log('Dialog canceled or error:', error);
      return { canceled: true, filePaths: [] };
    }
  },
};

/**
 * Sync a file from FileSystemFileHandle to wasabio virtual filesystem
 */
async function syncFileToWasabio(
  fileHandle: FileSystemFileHandle,
  targetPath: string,
): Promise<void> {
  const file = await fileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Ensure parent directory exists
  const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
  if (parentDir) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // Write file to wasabio
  fs.writeFileSync(targetPath, uint8Array);
  console.log(`Synced file to wasabio: ${targetPath}`);
}

/**
 * Recursively sync a directory from FileSystemDirectoryHandle to wasabio virtual filesystem
 */
async function syncDirectoryToWasabio(
  dirHandle: FileSystemDirectoryHandle,
  targetPath: string,
): Promise<void> {
  // Create the directory in wasabio
  fs.mkdirSync(targetPath, { recursive: true });
  console.log(`Created directory in wasabio: ${targetPath}`);

  // Iterate through all entries in the directory
  for await (const entry of dirHandle.values()) {
    const entryPath = `${targetPath}/${entry.name}`;

    if (entry.kind === 'file') {
      await syncFileToWasabio(entry as FileSystemFileHandle, entryPath);
    } else if (entry.kind === 'directory') {
      await syncDirectoryToWasabio(entry as FileSystemDirectoryHandle, entryPath);
    }
  }
}

export const app = new (class extends EventEmitter {
  whenReady = () => Promise.resolve();
  getPath = (name: string) => {
    // Return mock paths for common electron app paths
    const paths: Record<string, string> = {
      userData: '/tmp/openwork-userdata',
      appData: '/tmp/openwork-appdata',
      temp: '/tmp',
      home: '/home',
    };
    const path = paths[name] || '/tmp';

    // Ensure the directory exists in wasabio
    if (!fs.existsSync(path)) {
      try {
        fs.mkdirSync(path, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${path}:`, error);
      }
    }

    return path;
  };
})();
