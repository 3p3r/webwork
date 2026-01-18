import { EventEmitter } from 'events';

export default {};

export const ipcRenderer = new (class extends EventEmitter {
  send(channel: string, ...args: unknown[]): void {
    console.log(`ipcRenderer.send called with channel: ${channel}`, ...args);
    ipcMain.emit(channel, {}, ...args);
  }

  async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    console.log(`ipcRenderer.invoke called with channel: ${channel}`, ...args);
    const payload = { output: null };
    ipcMain.emit(channel, payload, ...args);
    return new Promise((resolve) => {
      setTimeout(() => resolve(payload.output), 0);
    });
  }
})();

export const contextBridge = {
  exposeInMainWorld: (key: string, api: unknown): void => {
    if (typeof window !== 'undefined') {
      (window as any)[key] = api;
    }
    if (typeof globalThis !== 'undefined') {
      (globalThis as any)[key] = api;
    }
  },
};

export const BrowserWindow = class extends EventEmitter {
  webContents = new (class {
    setWindowOpenHandler(handler: (details: any) => { action: 'allow' | 'deny' }) {
      console.log('setWindowOpenHandler called with handler:', handler);
    }
    send(channel: string, ...args: unknown[]): void {
      console.log(`webContents.send called with channel: ${channel}`, ...args);
      ipcRenderer.emit(channel, ...args);
    }
  })();
  loadFile(filePath: string): void {
    console.log(`BrowserWindow.loadFile called with filePath: ${filePath}`);
  }
};

export const shell = {
  openExternal: async (url: string): Promise<void> => {
    console.log(`shell.openExternal called with url: ${url}`);
  },
};

export const nativeImage = {};

export const ipcMain = new (class extends EventEmitter {
  public LOOKUP = new Map<string, (...args: unknown[]) => Promise<unknown>>();
  handle(channel: string, listener: (...args: unknown[]) => Promise<unknown>): void {
    console.log(`ipcMain.handle called with channel: ${channel}`);
    this.removeAllListeners(channel);
    this.on(channel, async (payload: { output: unknown }, ...args: unknown[]) => {
      const output = await listener(null, ...args);
      console.log(`ipcMain event emitted for channel: ${channel} - ${output}`, ...args);
      payload.output = output;
    });
  }
})();

export const dialog = {
  showOpenDialog: async (options: any): Promise<{ canceled: boolean; filePaths: string[] }> => {
    console.log('dialog.showOpenDialog called with options:', options);
    return { canceled: true, filePaths: [] };
  },
};

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
    return paths[name] || '/tmp';
  };
})();
