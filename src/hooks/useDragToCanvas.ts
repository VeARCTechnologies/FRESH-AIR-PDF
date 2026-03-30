/**
 * useDragToCanvas Hook
 *
 * Handles HTML5 drag-and-drop from the sidebar onto the PDF canvas.
 * Converts pixel drop coordinates to PDF-space coordinates.
 */

import { useState, useEffect, useCallback, RefObject } from 'react'
import type { Rect, DragFieldData, TemplateFieldType } from '@/types'

const DRAG_DATA_TYPE = 'application/template-field'

const DEFAULT_FIELD_SIZES: Record<TemplateFieldType, { width: number; height: number }> = {
  text: { width: 200, height: 30 },
  date: { width: 150, height: 30 },
  number: { width: 120, height: 30 },
  checkbox: { width: 30, height: 30 },
  signature: { width: 200, height: 60 },
  dropdown: { width: 180, height: 30 },
  currency: { width: 140, height: 30 },
  boolean: { width: 30, height: 30 },
  decimal: { width: 120, height: 30 },
  integer: { width: 120, height: 30 },
  image: { width: 200, height: 120 },
  formula: { width: 180, height: 30 },
}

interface UseDragToCanvasOptions {
  containerRef: RefObject<HTMLDivElement | null>
  pageRefs: Map<number, HTMLDivElement>
  scale: number
  /** PDF page dimensions (unscaled) per page number. Used for accurate coordinate conversion. */
  pageDimensions?: Map<number, { width: number; height: number }>
  enabled?: boolean
  onFieldDrop: (pageNumber: number, bounds: Rect, data: DragFieldData) => void
}

export { DRAG_DATA_TYPE }

export function useDragToCanvas({
  containerRef,
  pageRefs,
  scale,
  pageDimensions,
  enabled = true,
  onFieldDrop,
}: UseDragToCanvasOptions) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragOverPage, setDragOverPage] = useState<number | null>(null)

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!enabled) return
    if (!e.dataTransfer?.types.includes(DRAG_DATA_TYPE)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)

    // Determine which page is being hovered
    for (const [pageNum, el] of pageRefs.entries()) {
      const rect = el.getBoundingClientRect()
      if (
        e.clientY >= rect.top && e.clientY <= rect.bottom &&
        e.clientX >= rect.left && e.clientX <= rect.right
      ) {
        setDragOverPage(pageNum)
        return
      }
    }
    setDragOverPage(null)
  }, [enabled, pageRefs])

  const handleDragLeave = useCallback((e: DragEvent) => {
    // Only clear if actually leaving the container
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (containerRef.current && !containerRef.current.contains(relatedTarget)) {
      setIsDragOver(false)
      setDragOverPage(null)
    }
  }, [containerRef])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragOverPage(null)

    if (!enabled) return

    const raw = e.dataTransfer?.getData(DRAG_DATA_TYPE)
    if (!raw) return

    let data: DragFieldData
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    // Find which page the drop landed on
    for (const [pageNum, el] of pageRefs.entries()) {
      const rect = el.getBoundingClientRect()
      if (
        e.clientY >= rect.top && e.clientY <= rect.bottom &&
        e.clientX >= rect.left && e.clientX <= rect.right
      ) {
        const defaultSize = DEFAULT_FIELD_SIZES[data.fieldType] || { width: 200, height: 30 }
        const invScale = 1 / scale
        const pdfX = (e.clientX - rect.left) * invScale - defaultSize.width / 2
        const pdfY = (e.clientY - rect.top) * invScale - defaultSize.height / 2

        const bounds: Rect = {
          x: Math.max(0, pdfX),
          y: Math.max(0, pdfY),
          width: defaultSize.width,
          height: defaultSize.height,
        }

        onFieldDrop(pageNum, bounds, data)
        return
      }
    }
  }, [enabled, pageRefs, scale, pageDimensions, onFieldDrop])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)

    return () => {
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('dragleave', handleDragLeave)
      container.removeEventListener('drop', handleDrop)
    }
  }, [containerRef, enabled, handleDragOver, handleDragLeave, handleDrop])

  return { isDragOver, dragOverPage }
}
