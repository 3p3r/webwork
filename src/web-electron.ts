import { EventEmitter } from 'events';

export default {};

// Mock thread data
const mockThread = {
  thread_id: 'mock-thread-1',
  created_at: new Date(),
  updated_at: new Date(),
  metadata: {},
  status: 'idle' as const,
  thread_values: {},
  title: 'Demo Thread',
};

// Mock responses for different channels
const mockResponses: Record<string, any> = {
  'threads:list': [mockThread],
  'threads:create': mockThread,
  'threads:get': mockThread,
  'threads:update': mockThread,
  'threads:delete': null,
  'threads:history': [],
  'models:list': [],
  'models:current': null,
  'models:listProviders': [],
  'models:getDefault': null,
  'workspace:get': null,
  'workspace:set': null,
  'agent:invoke': null,
};

export const ipcRenderer = new (class extends EventEmitter {
  send(channel: string, ...args: unknown[]): void {
    console.log(`ipcRenderer.send called with channel: ${channel}`, ...args);
  }

  sendSync(channel: string, ...args: unknown[]): unknown {
    console.log(`ipcRenderer.sendSync called with channel: ${channel}`, ...args);

    // Return mock data based on channel
    if (mockResponses.hasOwnProperty(channel)) {
      return mockResponses[channel];
    }

    // Default: return empty array for list operations, null for others
    if (channel.includes(':list')) {
      return [];
    }

    return null;
  }

  async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    console.log(`ipcRenderer.invoke called with channel: ${channel}`, ...args);

    // Return mock data based on channel
    if (mockResponses.hasOwnProperty(channel)) {
      return mockResponses[channel];
    }

    // Default: return empty array for list operations, null for others
    if (channel.includes(':list')) {
      return [];
    }

    return null;
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
  })();
  loadFile(filePath: string): void {
    console.log(`BrowserWindow.loadFile called with filePath: ${filePath}`);
  }
};

export const shell = {};

export const nativeImage = {};

export const ipcMain = new (class extends EventEmitter {
  handle(channel: string, listener: (...args: unknown[]) => Promise<unknown>): void {
    console.log(`ipcMain.handle called with channel: ${channel}`);
    this.on(channel, async (...args: unknown[]) => {
      await listener(...args);
    });
  }
})();

export const dialog = {};

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
