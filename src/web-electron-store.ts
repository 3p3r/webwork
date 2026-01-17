// Mock implementation of electron-store for web environment

class Store<T extends Record<string, any> = Record<string, any>> {
  private data: Map<string, any> = new Map();
  private name: string;

  constructor(options?: { name?: string; cwd?: string }) {
    this.name = options?.name || 'store';
    this.loadFromLocalStorage();
  }

  private getStorageKey(): string {
    return `electron-store:${this.name}`;
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        this.data = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load store from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const obj = Object.fromEntries(this.data.entries());
      localStorage.setItem(this.getStorageKey(), JSON.stringify(obj));
    } catch (error) {
      console.warn('Failed to save store to localStorage:', error);
    }
  }

  get<K extends keyof T>(key: K): T[K] | undefined;
  get<K extends keyof T>(key: K, defaultValue: T[K]): T[K];
  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K] | undefined {
    const value = this.data.get(key as string);
    return value !== undefined ? value : defaultValue;
  }

  set<K extends keyof T>(key: K, value: T[K]): void;
  set(object: Partial<T>): void;
  set<K extends keyof T>(keyOrObject: K | Partial<T>, value?: T[K]): void {
    if (typeof keyOrObject === 'object') {
      Object.entries(keyOrObject).forEach(([k, v]) => {
        this.data.set(k, v);
      });
    } else {
      this.data.set(keyOrObject as string, value);
    }
    this.saveToLocalStorage();
  }

  has<K extends keyof T>(key: K): boolean {
    return this.data.has(key as string);
  }

  delete<K extends keyof T>(key: K): void {
    this.data.delete(key as string);
    this.saveToLocalStorage();
  }

  clear(): void {
    this.data.clear();
    this.saveToLocalStorage();
  }

  get store(): T {
    return Object.fromEntries(this.data.entries()) as T;
  }

  set store(value: T) {
    this.data = new Map(Object.entries(value));
    this.saveToLocalStorage();
  }

  get size(): number {
    return this.data.size;
  }

  // Mock static method for initRenderer
  static initRenderer(): void {
    // No-op in web environment
  }
}

export default Store;
