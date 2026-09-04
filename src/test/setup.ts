/* Minimal browser-storage stubs so storage-backed modules can be unit-tested
   under the Node environment without pulling in a full DOM implementation. */

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

const globalWithWindow = globalThis as unknown as {
  window?: unknown;
  localStorage?: Storage;
  sessionStorage?: Storage;
};

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();

globalWithWindow.localStorage = localStorage;
globalWithWindow.sessionStorage = sessionStorage;
globalWithWindow.window = globalThis;
