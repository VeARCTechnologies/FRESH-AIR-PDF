/**
 * Performance Utilities
 * 
 * Utilities for monitoring and optimizing performance.
 */

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options)
  }

  // Fallback for browsers that don't support requestIdleCallback
  return setTimeout(() => {
    const start = Date.now()
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    })
  }, 1) as any
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}

/**
 * Measure render time
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map()
  private measurements: Map<string, number[]> = new Map()

  start(label: string): void {
    this.marks.set(label, performance.now())
  }

  end(label: string): number {
    const startTime = this.marks.get(label)
    if (!startTime) {
      console.warn(`No start mark found for "${label}"`)
      return 0
    }

    const duration = performance.now() - startTime
    this.marks.delete(label)

    // Store measurement
    if (!this.measurements.has(label)) {
      this.measurements.set(label, [])
    }
    this.measurements.get(label)!.push(duration)

    return duration
  }

  getStats(label: string): { min: number; max: number; avg: number; count: number } | null {
    const measurements = this.measurements.get(label)
    if (!measurements || measurements.length === 0) {
      return null
    }

    const min = Math.min(...measurements)
    const max = Math.max(...measurements)
    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length
    const count = measurements.length

    return { min, max, avg, count }
  }

  clear(label?: string): void {
    if (label) {
      this.marks.delete(label)
      this.measurements.delete(label)
    } else {
      this.marks.clear()
      this.measurements.clear()
    }
  }

  report(): void {
    console.group('Performance Report')
    this.measurements.forEach((_, label) => {
      const stats = this.getStats(label)
      if (stats) {
        console.log(
          `${label}: avg ${stats.avg.toFixed(2)}ms (min: ${stats.min.toFixed(2)}ms, max: ${stats.max.toFixed(2)}ms, count: ${stats.count})`
        )
      }
    })
    console.groupEnd()
  }
}

/**
 * Memory usage monitor
 */
export function getMemoryUsage(): { used: number; limit: number; percentage: number } | null {
  if ('memory' in performance && (performance as any).memory) {
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize / 1024 / 1024, // MB
      limit: memory.jsHeapSizeLimit / 1024 / 1024, // MB
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    }
  }
  return null
}

/**
 * Canvas pool for reusing canvas elements
 */
export class CanvasPool {
  private pool: HTMLCanvasElement[] = []
  private maxSize: number

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize
  }

  acquire(): HTMLCanvasElement {
    return this.pool.pop() || document.createElement('canvas')
  }

  release(canvas: HTMLCanvasElement): void {
    if (this.pool.length < this.maxSize) {
      // Clear canvas before returning to pool
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      canvas.width = 0
      canvas.height = 0
      this.pool.push(canvas)
    }
  }

  clear(): void {
    this.pool = []
  }

  get size(): number {
    return this.pool.length
  }
}

/**
 * LRU Cache for page data
 */
export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map()
  private maxSize: number

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)

    return value
  }

  set(key: K, value: V): void {
    // Delete if exists (to re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Add to end
    this.cache.set(key, value)

    // Evict oldest if over size
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/**
 * Batch operations for performance
 */
export class BatchProcessor<T> {
  private queue: T[] = []
  private processor: (items: T[]) => void
  private batchSize: number
  private timeout: ReturnType<typeof setTimeout> | null = null
  private maxWait: number

  constructor(processor: (items: T[]) => void, batchSize: number = 10, maxWait: number = 100) {
    this.processor = processor
    this.batchSize = batchSize
    this.maxWait = maxWait
  }

  add(item: T): void {
    this.queue.push(item)

    if (this.queue.length >= this.batchSize) {
      this.flush()
    } else if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.maxWait)
    }
  }

  flush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    if (this.queue.length > 0) {
      const items = this.queue.splice(0, this.queue.length)
      this.processor(items)
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()
