import { beforeEach } from 'vitest'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number { return this.store.size }
  clear(): void { this.store.clear() }
  getItem(key: string): string | null { return this.store.get(key) ?? null }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null }
  removeItem(key: string): void { this.store.delete(key) }
  setItem(key: string, value: string): void { this.store.set(key, String(value)) }
}

const memoryLocalStorage = new MemoryStorage()
const memorySessionStorage = new MemoryStorage()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: memoryLocalStorage
})
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: memorySessionStorage
})

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: memoryLocalStorage
  })
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: memorySessionStorage
  })
}

beforeEach(() => {
  memoryLocalStorage.clear()
  memorySessionStorage.clear()
})
