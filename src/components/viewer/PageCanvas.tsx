/**
 * PageCanvas Component
 * 
 * Renders a single PDF page with annotations and form field overlays.
 * Handles page rendering, annotation layer, and user interactions.
 */

import { useEffect, useRef, useState } from 'react'
import type { PageRotation, Viewport, Annotation, SimpleAnnotation, FormField } from '@/types'
import { ToolMode, AnnotationType } from '@/types'
import { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'
import { AnnotationRenderer } from '@/core/annotations/AnnotationRenderer'
import { AnnotationOverlay } from '@/components/overlays/AnnotationOverlay'
import { FormFieldCreationOverlay } from '@/components/overlays/FormFieldCreationOverlay'
import { FormFieldOverlay } from '@/components/overlays/FormFieldOverlay'

interface PageCanvasProps {
  pageNumber: number
  scale: number
  rotation: PageRotation
  engine: PDFDocumentEngine
  annotations: Annotation[]
  formFields?: FormField[]
  activeTool?: ToolMode
  onPageClick?: (pageNumber: number) => void
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id'>) => void
  onAnnotationUpdate?: (id: string, updates: Partial<Annotation>) => void
  onAnnotationDelete?: (id: string) => void
  onFormFieldCreate?: (field: Omit<FormField, 'id'>) => void
  onFormFieldUpdate?: (id: string, updates: Partial<FormField>) => void
  onFormFieldDelete?: (id: string) => void
  onFormFieldEdit?: (field: FormField) => void
  isMobile?: boolean
  className?: string
}

// Convert complex Annotation type to SimpleAnnotation for overlay
function toSimpleAnnotation(annotation: Annotation): SimpleAnnotation {
  const baseProps = {
    id: annotation.id,
    pageNumber: annotation.pageNumber,
    color: annotation.color || '#000000',
    opacity: annotation.opacity || 1,
    author: annotation.author,
    createdAt: annotation.createdAt,
    modifiedAt: annotation.modifiedAt,
  }

  // Map complex annotation types to simple format
  if ('quads' in annotation) {
    // TextMarkupAnnotation (underline, strikeout)
    const quad = annotation.quads[0] || { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } }
    return {
      ...baseProps,
      type: annotation.type as any,
      bounds: {
        x: quad.topLeft.x,
        y: quad.topLeft.y,
        width: quad.topRight ? quad.topRight.x - quad.topLeft.x : 0,
        height: quad.bottomLeft ? quad.bottomLeft.y - quad.topLeft.y : 0,
      },
      content: annotation.text,
    }
  }

  if ('rect' in annotation) {
    // FreeTextAnnotation or ShapeAnnotation
    return {
      ...baseProps,
      type: annotation.type === 'circle' ? 'ellipse' : annotation.type as any,
      bounds: annotation.rect,
      content: 'content' in annotation ? annotation.content : undefined,
    }
  }

  if ('start' in annotation && 'end' in annotation) {
    // LineAnnotation
    const minX = Math.min(annotation.start.x, annotation.end.x)
    const minY = Math.min(annotation.start.y, annotation.end.y)
    const maxX = Math.max(annotation.start.x, annotation.end.x)
    const maxY = Math.max(annotation.start.y, annotation.end.y)
    return {
      ...baseProps,
      type: annotation.type as any,
      bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      path: [annotation.start, annotation.end],
    }
  }

  if ('paths' in annotation) {
    // InkAnnotation
    const allPoints = annotation.paths.flat()
    const xs = allPoints.map(p => p.x)
    const ys = allPoints.map(p => p.y)
    return {
      ...baseProps,
      type: 'ink',
      bounds: {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      },
      path: allPoints,
    }
  }

  // Fallback
  return {
    ...baseProps,
    type: 'note',
    bounds: { x: 0, y: 0, width: 24, height: 24 },
  }
}

// Convert SimpleAnnotation from overlay to proper Annotation type
function fromSimpleAnnotation(simple: Omit<SimpleAnnotation, 'id'>): Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'> {
  const baseProps = {
    pageNumber: simple.pageNumber,
    color: simple.color,
    opacity: simple.opacity || 1,
    author: simple.author,
  }

  if (simple.type === 'free-text') {
    return {
      ...baseProps,
      type: AnnotationType.FreeText,
      rect: simple.bounds,
      content: simple.content || '',
      fontSize: 12,
      fontFamily: 'Arial',
      textAlign: 'left',
    } as any
  }

  if (simple.type === 'rectangle') {
    return {
      ...baseProps,
      type: AnnotationType.Rectangle,
      rect: simple.bounds,
      borderWidth: 2,
      borderColor: simple.color,
    } as any
  }

  if (simple.type === 'ellipse') {
    return {
      ...baseProps,
      type: AnnotationType.Circle,
      rect: simple.bounds,
      borderWidth: 2,
      borderColor: simple.color,
    } as any
  }

  if ((simple.type === 'arrow' || simple.type === 'line') && simple.path && simple.path.length >= 2) {
    return {
      ...baseProps,
      type: simple.type === 'arrow' ? AnnotationType.Arrow : AnnotationType.Line,
      start: simple.path[0],
      end: simple.path[simple.path.length - 1],
      width: 2,
      lineColor: simple.color,
    } as any
  }

  if (simple.type === 'ink' && simple.path) {
    return {
      ...baseProps,
      type: AnnotationType.Ink,
      paths: [simple.path],
      width: 2,
      inkColor: simple.color,
    } as any
  }

  // Fallback to rectangle
  return {
    ...baseProps,
    type: AnnotationType.Rectangle,
    rect: simple.bounds,
    borderWidth: 2,
    borderColor: simple.color,
  } as any
}

export function PageCanvas({
  pageNumber,
  scale,
  rotation,
  engine,
  annotations,
  formFields = [],
  activeTool = ToolMode.TextSelect,
  onPageClick,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  onFormFieldCreate,
  onFormFieldUpdate,
  onFormFieldDelete,
  onFormFieldEdit,
  isMobile = false,
  className = '',
}: PageCanvasProps) {
  const pageCanvasRef = useRef<HTMLCanvasElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const annotationRenderer = useRef(new AnnotationRenderer())

  // Render PDF page
  useEffect(() => {
    let cancelled = false

    const renderPage = async () => {
      if (!pageCanvasRef.current || cancelled) return

      // Check if document is loaded first
      if (!engine.getNumPages()) {
        return
      }

      setIsRendering(true)

      try {
        if (cancelled) return

        const pageInfo = await engine.getPageInfo(pageNumber)
        
        if (cancelled) return

        const currentViewport: Viewport = {
          width: pageInfo.width * scale,
          height: pageInfo.height * scale,
          scale,
          rotation,
          offsetX: 0,
          offsetY: 0,
        }

        setViewport(currentViewport)

        if (cancelled || !pageCanvasRef.current) return

        await engine.renderPage(pageNumber, pageCanvasRef.current, currentViewport)
      } catch (error) {
        // Ignore errors during cancellation or document transitions
        if (cancelled) return
        if (error instanceof Error && (error.message.includes('Transport destroyed') || error.message.includes('No document loaded'))) {
          return
        }
        // Only log unexpected errors
        console.error(`Failed to render page ${pageNumber}:`, error)
      } finally {
        if (!cancelled) {
          setIsRendering(false)
        }
      }
    }

    renderPage()

    return () => {
      cancelled = true
    }
  }, [pageNumber, scale, rotation, engine])

  // Render annotations
  useEffect(() => {
    if (!annotationCanvasRef.current || !pageCanvasRef.current) return

    const canvas = pageCanvasRef.current
    const viewport: Viewport = {
      width: canvas.width,
      height: canvas.height,
      scale,
      rotation,
      offsetX: 0,
      offsetY: 0,
    }

    annotationRenderer.current.renderAnnotations(
      annotations,
      annotationCanvasRef.current,
      viewport
    )
  }, [annotations, scale, rotation])

  const handleClick = () => {
    onPageClick?.(pageNumber)
  }

  return (
    <div
      ref={containerRef}
      className={`page-canvas-container ${className}`}
      onClick={handleClick}
      style={{
        position: 'relative',
        marginBottom: isMobile ? '12px' : '32px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        background: '#fff',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      {/* PDF Page Canvas */}
      <canvas
        ref={pageCanvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
        }}
      />

      {/* Annotation Layer Canvas */}
      <canvas
        ref={annotationCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Interactive Annotation Overlay */}
      {viewport && onAnnotationCreate && (
        <AnnotationOverlay
          pageNumber={pageNumber}
          viewport={viewport}
          annotations={annotations.map(toSimpleAnnotation)}
          activeTool={activeTool}
          onAnnotationCreate={(simpleAnnotation) => {
            const annotation = fromSimpleAnnotation(simpleAnnotation)
            const now = new Date()
            onAnnotationCreate({
              ...annotation,
              createdAt: now,
              modifiedAt: now,
            } as Omit<Annotation, 'id'>)
          }}
          onAnnotationUpdate={onAnnotationUpdate as any || (() => {})}
          onAnnotationDelete={onAnnotationDelete || (() => {})}
        />
      )}

      {/* Form Field Creation Overlay */}
      {viewport && onFormFieldCreate && (
        <FormFieldCreationOverlay
          pageNumber={pageNumber}
          viewport={viewport}
          fields={formFields}
          activeTool={activeTool}
          onFieldCreate={onFormFieldCreate}
          onFieldUpdate={onFormFieldUpdate || (() => {})}
          onFieldDelete={onFormFieldDelete || (() => {})}
        />
      )}

      {/* Form Field Overlay - Interactive existing fields */}
      {formFields && formFields.length > 0 && (
        <FormFieldOverlay
          pageNumber={pageNumber}
          fields={formFields}
          scale={scale}
          pageWidth={viewport ? viewport.width / viewport.scale : 0}
          pageHeight={viewport ? viewport.height / viewport.scale : 0}
          onFieldChange={(fieldId, value) => {
            if (onFormFieldUpdate) {
              onFormFieldUpdate(fieldId, { value })
            }
          }}
          onFieldUpdate={onFormFieldUpdate}
          onFieldDelete={onFormFieldDelete}
          onFieldEdit={onFormFieldEdit}
        />
      )}

      {/* Loading overlay */}
      {isRendering && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <div className="spinner">Rendering page {pageNumber}...</div>
        </div>
      )}

      {/* Page number indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          padding: '4px 8px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none',
        }}
      >
        Page {pageNumber}
      </div>
    </div>
  )
}
