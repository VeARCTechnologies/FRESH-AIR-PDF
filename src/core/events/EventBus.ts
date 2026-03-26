/**
 * Event Bus Implementation
 * 
 * Provides a centralized pub/sub event system.
 * Allows components to communicate without tight coupling.
 */

import type { EventBus, EventCallback } from '@/types'

export class EventBusImpl implements EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map()

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    this.listeners.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  off<T = any>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  emit<T = any>(event: string, data: T): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error)
        }
      })
    }
  }

  once<T = any>(event: string, callback: EventCallback<T>): void {
    const wrappedCallback = (data: T) => {
      this.off(event, wrappedCallback)
      callback(data)
    }
    this.on(event, wrappedCallback)
  }

  clear(): void {
    this.listeners.clear()
  }

  listenerCount(event?: string): number {
    if (event) {
      return this.listeners.get(event)?.size || 0
    }
    return Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0)
  }
}

// Singleton instance
export const eventBus = new EventBusImpl()
