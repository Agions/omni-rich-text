/**
 * Zero-dependency In-Memory LRU Cache for AST parsing results.
 */

export class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, V>;

  constructor(capacity: number = 50) {
    this.capacity = capacity > 0 ? capacity : 50;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    // Re-insert to mark as most recently used
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      // Evict the least recently used entry (first entry in Map iterator)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

/**
 * Fast 32-bit FNV-1a hash function for strings.
 */
export function hashString(str: string): string {
  let hash = 2166136261;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Generate a cache key combining content hash, content length, and relevant parse options.
 */
export function generateCacheKey(content: string, options?: Record<string, any>): string {
  const contentHash = hashString(content);
  if (!options) return `${contentHash}_${content.length}`;

  const optKey = [
    options.format || 'html',
    options.mode || 'default',
    options.maxDepth ?? 8,
    options.extractStyles ? '1' : '0',
    options.rootFontSize ?? 18.75,
    options.remScale ?? 0.5,
    options.fontScale ?? 1,
    options.baseFontSize ?? 15,
    options.contentBaseFontSize ?? 22,
    options.fontSize || ''
  ].join('|');

  return `${contentHash}_${content.length}_${optKey}`;
}
