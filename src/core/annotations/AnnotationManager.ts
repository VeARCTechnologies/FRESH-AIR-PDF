/**
 * Annotation Manager
 * 
 * Manages all annotation operations: creation, modification, deletion, persistence.
 * Provides undo/redo functionality and event emission.
 */

import type {
  Annotation,
  AnnotationType,
  AnnotationChangedEvent,
  EventBus,
} from '@/types'
import { ViewerEvent } from '@/types'

interface AnnotationHistory {
  undo: Array<() => void>
  redo: Array<() => void>
}

export class AnnotationManager {
  private annotations: Map<number, Annotation[]> = new Map()
  private history: AnnotationHistory = { undo: [], redo: [] }
  private selectedAnnotationId: string | null = null
  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  /**
   * Add a new annotation
   */
  addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'>): string {
    const id = this.generateId()
    const now = new Date()
    
    const fullAnnotation: Annotation = {
      ...annotation,
      id,
      createdAt: now,
      modifiedAt: now,
    } as Annotation

    const pageNumber = annotation.pageNumber
    if (!this.annotations.has(pageNumber)) {
      this.annotations.set(pageNumber, [])
    }

    this.annotations.get(pageNumber)!.push(fullAnnotation)

    // Add to undo history
    this.addToHistory(() => {
      this.deleteAnnotation(id, false)
    })

    // Emit event
    this.eventBus.emit<AnnotationChangedEvent>(ViewerEvent.AnnotationAdded, {
      annotation: fullAnnotation,
      action: 'added',
    })

    return id
  }

  /**
   * Update an existing annotation
   */
  updateAnnotation(id: string, changes: Partial<Annotation>): void {
    const annotation = this.findAnnotation(id)
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`)
    }

    const oldState = { ...annotation }
    const allowedKeys = ['color', 'opacity', 'author', 'content', 'text', 'rect', 'quads',
      'start', 'end', 'paths', 'width', 'fontSize', 'fontFamily', 'textAlign',
      'fillColor', 'borderWidth', 'borderColor', 'lineColor', 'inkColor', 'selected'] as const
    for (const key of allowedKeys) {
      if (key in changes) {
        (annotation as any)[key] = (changes as any)[key]
      }
    }
    annotation.modifiedAt = new Date()

    // Add to undo history
    this.addToHistory(() => {
      this.updateAnnotation(id, oldState)
    })

    // Emit event
    this.eventBus.emit<AnnotationChangedEvent>(ViewerEvent.AnnotationModified, {
      annotation,
      action: 'modified',
    })
  }

  /**
   * Delete an annotation
   */
  deleteAnnotation(id: string, addToHistory = true): void {
    const annotation = this.findAnnotation(id)
    if (!annotation) {
      return
    }

    const pageNumber = annotation.pageNumber
    const pageAnnotations = this.annotations.get(pageNumber)
    if (!pageAnnotations) {
      return
    }

    const index = pageAnnotations.findIndex(a => a.id === id)
    if (index === -1) {
      return
    }

    pageAnnotations.splice(index, 1)

    if (addToHistory) {
      // Add to undo history
      this.addToHistory(() => {
        this.addAnnotation(annotation)
      })
    }

    // Clear selection if this annotation was selected
    if (this.selectedAnnotationId === id) {
      this.selectedAnnotationId = null
    }

    // Emit event
    this.eventBus.emit<AnnotationChangedEvent>(ViewerEvent.AnnotationDeleted, {
      annotation,
      action: 'deleted',
    })
  }

  /**
   * Get all annotations for a specific page
   */
  getAnnotations(pageNumber?: number): Annotation[] {
    if (pageNumber !== undefined) {
      return this.annotations.get(pageNumber) || []
    }

    // Return all annotations from all pages
    const allAnnotations: Annotation[] = []
    this.annotations.forEach(pageAnnotations => {
      allAnnotations.push(...pageAnnotations)
    })
    return allAnnotations
  }

  /**
   * Get all annotations from all pages
   */
  getAllAnnotations(): Annotation[] {
    return this.getAnnotations()
  }

  /**
   * Get a specific annotation by ID
   */
  getAnnotation(id: string): Annotation | null {
    return this.findAnnotation(id)
  }

  /**
   * Select an annotation
   */
  selectAnnotation(id: string | null): void {
    const previousId = this.selectedAnnotationId
    this.selectedAnnotationId = id

    // Update selected state
    if (previousId) {
      const prevAnnotation = this.findAnnotation(previousId)
      if (prevAnnotation) {
        prevAnnotation.selected = false
      }
    }

    if (id) {
      const annotation = this.findAnnotation(id)
      if (annotation) {
        annotation.selected = true
        this.eventBus.emit(ViewerEvent.AnnotationSelected, { annotation })
      }
    }
  }

  /**
   * Get currently selected annotation
   */
  getSelectedAnnotation(): Annotation | null {
    return this.selectedAnnotationId ? this.findAnnotation(this.selectedAnnotationId) : null
  }

  /**
   * Clear all annotations
   */
  clearAnnotations(pageNumber?: number): void {
    if (pageNumber !== undefined) {
      this.annotations.delete(pageNumber)
    } else {
      this.annotations.clear()
    }
    this.selectedAnnotationId = null
    this.history = { undo: [], redo: [] }
  }

  /**
   * Export annotations to JSON
   */
  exportAnnotations(): string {
    const annotationsArray = this.getAnnotations()
    return JSON.stringify(annotationsArray, null, 2)
  }

  /**
   * Import annotations from JSON
   */
  importAnnotations(json: string): void {
    try {
      const annotationsArray = JSON.parse(json) as Annotation[]
      
      // Clear existing annotations
      this.clearAnnotations()

      // Import each annotation
      annotationsArray.forEach(annotation => {
        const pageNumber = annotation.pageNumber
        if (!this.annotations.has(pageNumber)) {
          this.annotations.set(pageNumber, [])
        }
        this.annotations.get(pageNumber)!.push(annotation)
      })

      this.eventBus.emit(ViewerEvent.AnnotationsImported, { count: annotationsArray.length })
    } catch (error) {
      throw new Error('Invalid annotation JSON')
    }
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    const action = this.history.undo.pop()
    if (action) {
      // Temporarily disable history recording
      const currentRedo = this.history.redo
      action()
      this.history.redo = currentRedo
      return true
    }
    return false
  }

  /**
   * Redo last undone action
   */
  redo(): boolean {
    const action = this.history.redo.pop()
    if (action) {
      action()
      return true
    }
    return false
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.undo.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.history.redo.length > 0
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private findAnnotation(id: string): Annotation | null {
    for (const pageAnnotations of this.annotations.values()) {
      const annotation = pageAnnotations.find(a => a.id === id)
      if (annotation) {
        return annotation
      }
    }
    return null
  }

  private generateId(): string {
    return `annot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private addToHistory(undoAction: () => void): void {
    this.history.undo.push(undoAction)
    // Clear redo history when new action is performed
    this.history.redo = []

    // Limit history size to prevent memory issues
    const MAX_HISTORY = 50
    if (this.history.undo.length > MAX_HISTORY) {
      this.history.undo.shift()
    }
  }
}
