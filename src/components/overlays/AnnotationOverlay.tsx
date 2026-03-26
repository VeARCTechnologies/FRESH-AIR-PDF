/**
 * Annotation Overlay Component
 * 
 * Handles interactive annotation creation and rendering on top of PDF pages
 */

import { useState, useRef, useEffect } from 'react'
import type { SimpleAnnotation, Viewport } from '@/types'
import { ToolMode } from '@/types'
import { AnnotationPropertiesPanel } from '@/components/panels/AnnotationPropertiesPanel'

interface AnnotationOverlayProps {
  pageNumber: number
  viewport: Viewport
  annotations: SimpleAnnotation[]
  activeTool: ToolMode
  onAnnotationCreate: (annotation: Omit<SimpleAnnotation, 'id'>) => void
  onAnnotationUpdate: (id: string, updates: Partial<SimpleAnnotation>) => void
  onAnnotationDelete: (id: string) => void
}

export function AnnotationOverlay({
  pageNumber,
  viewport,
  annotations,
  activeTool,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
}: AnnotationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)

  // Render annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render each annotation
    annotations.forEach((annotation) => {
      if (annotation.pageNumber !== pageNumber) return

      ctx.save()

      const scale = viewport.scale

      switch (annotation.type) {
        case 'rectangle':
          ctx.strokeStyle = annotation.color
          ctx.lineWidth = 2
          ctx.strokeRect(
            annotation.bounds.x * scale,
            annotation.bounds.y * scale,
            annotation.bounds.width * scale,
            annotation.bounds.height * scale
          )
          break

        case 'ellipse':
          ctx.strokeStyle = annotation.color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(
            (annotation.bounds.x + annotation.bounds.width / 2) * scale,
            (annotation.bounds.y + annotation.bounds.height / 2) * scale,
            (annotation.bounds.width / 2) * scale,
            (annotation.bounds.height / 2) * scale,
            0,
            0,
            2 * Math.PI
          )
          ctx.stroke()
          break

        case 'arrow':
          if (annotation.path && annotation.path.length >= 2) {
            const start = annotation.path[0]
            const end = annotation.path[annotation.path.length - 1]
            
            ctx.strokeStyle = annotation.color
            ctx.lineWidth = 2 * scale
            ctx.beginPath()
            ctx.moveTo(start.x * scale, start.y * scale)
            ctx.lineTo(end.x * scale, end.y * scale)
            ctx.stroke()

            // Draw arrowhead
            const angle = Math.atan2(end.y - start.y, end.x - start.x)
            const headLength = 10 * scale
            ctx.beginPath()
            ctx.moveTo(end.x * scale, end.y * scale)
            ctx.lineTo(
              end.x * scale - headLength * Math.cos(angle - Math.PI / 6),
              end.y * scale - headLength * Math.sin(angle - Math.PI / 6)
            )
            ctx.moveTo(end.x * scale, end.y * scale)
            ctx.lineTo(
              end.x * scale - headLength * Math.cos(angle + Math.PI / 6),
              end.y * scale - headLength * Math.sin(angle + Math.PI / 6)
            )
            ctx.stroke()
          }
          break

        case 'ink':
          if (annotation.path && annotation.path.length > 1) {
            ctx.strokeStyle = annotation.color
            ctx.lineWidth = 2 * scale
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            ctx.moveTo(annotation.path[0].x * scale, annotation.path[0].y * scale)
            for (let i = 1; i < annotation.path.length; i++) {
              ctx.lineTo(annotation.path[i].x * scale, annotation.path[i].y * scale)
            }
            ctx.stroke()
          }
          break
      }

      // Draw selection handles if selected
      if (selectedAnnotation === annotation.id) {
        ctx.strokeStyle = '#0078d4'
        ctx.lineWidth = 1 * scale
        ctx.setLineDash([5 * scale, 5 * scale])
        ctx.strokeRect(
          (annotation.bounds.x - 2) * scale,
          (annotation.bounds.y - 2) * scale,
          (annotation.bounds.width + 4) * scale,
          (annotation.bounds.height + 4) * scale
        )
      }

      ctx.restore()
    })
  }, [annotations, pageNumber, selectedAnnotation])

  const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    // Return position in PDF coordinates (not scaled)
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === ToolMode.TextSelect) return
    
    // For highlight tool, allow drawing rectangles over content
    const pos = getMousePos(e)
    setIsDrawing(true)
    setDrawStart(pos)
    setCurrentPath([pos])
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return

    const pos = getMousePos(e)

    if (activeTool === ToolMode.Ink) {
      setCurrentPath((prev) => [...prev, pos])
      
      // Draw preview
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      if (currentPath.length > 1) {
        const prev = currentPath[currentPath.length - 2]
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
    } else if (activeTool === ToolMode.Rectangle || activeTool === ToolMode.Ellipse || activeTool === ToolMode.Arrow) {
      // Draw preview for box-based tools
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Clear and redraw
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const minX = Math.min(drawStart.x, pos.x)
      const minY = Math.min(drawStart.y, pos.y)
      const width = Math.abs(pos.x - drawStart.x)
      const height = Math.abs(pos.y - drawStart.y)

      if (activeTool === ToolMode.Rectangle) {
        ctx.strokeStyle = '#0078d4'
        ctx.lineWidth = 2
        ctx.strokeRect(minX, minY, width, height)
      } else if (activeTool === ToolMode.Ellipse) {
        ctx.strokeStyle = '#0078d4'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(
          (minX + width / 2),
          (minY + height / 2),
          (width / 2),
          (height / 2),
          0, 0, 2 * Math.PI
        )
        ctx.stroke()
      } else if (activeTool === ToolMode.Arrow) {
        ctx.strokeStyle = '#0078d4'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(drawStart.x, drawStart.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return

    const pos = getMousePos(e)
    setIsDrawing(false)

    // Calculate bounds for other tools
    const minX = Math.min(drawStart.x, pos.x)
    const minY = Math.min(drawStart.y, pos.y)
    const maxX = Math.max(drawStart.x, pos.x)
    const maxY = Math.max(drawStart.y, pos.y)

    const bounds = {
      x: minX / viewport.scale,
      y: minY / viewport.scale,
      width: (maxX - minX) / viewport.scale,
      height: (maxY - minY) / viewport.scale,
    }

    // Only create annotation if it has some size
    if (bounds.width < 5 && bounds.height < 5 && activeTool !== ToolMode.Note) {
      setDrawStart(null)
      setCurrentPath([])
      return
    }

    // Create annotation based on active tool
    const annotation: Omit<SimpleAnnotation, 'id'> = {
      type: activeTool as any,
      pageNumber,
      bounds,
      color: getColorForTool(activeTool),
      content: '',
      createdAt: new Date(),
      modifiedAt: new Date(),
    }

    // Add path for drawing tools
    if (activeTool === ToolMode.Ink || activeTool === ToolMode.Arrow) {
      annotation.path = activeTool === ToolMode.Ink ? currentPath : [drawStart, pos]
    }

    onAnnotationCreate(annotation)

    setDrawStart(null)
    setCurrentPath([])
  }

  const getColorForTool = (tool: ToolMode): string => {
    switch (tool) {
      case ToolMode.Note:
        return '#ffeb3b'
      case ToolMode.Ink:
        return '#ff0000'
      case ToolMode.Arrow:
      case ToolMode.Rectangle:
      case ToolMode.Ellipse:
        return '#0078d4'
      default:
        return '#000000'
    }
  }

  const getCursorStyle = () => {
    if (activeTool === ToolMode.TextSelect) {
      return 'text'
    }
    return 'crosshair'
  }

  return (
    <div
      ref={overlayRef}
      style={{
        ...styles.overlay,
        cursor: getCursorStyle(),
        userSelect: activeTool === ToolMode.TextSelect ? 'text' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={viewport.width}
        height={viewport.height}
        style={styles.canvas}
      />
      
      {/* Render text annotations and notes */}
      {annotations
        .filter((a) => a.pageNumber === pageNumber)
        .map((annotation) => {
          if (annotation.type === 'free-text') {
            return (
              <div
                key={annotation.id}
                style={{
                  ...styles.textAnnotation,
                  left: annotation.bounds.x,
                  top: annotation.bounds.y,
                  width: annotation.bounds.width,
                  height: annotation.bounds.height,
                  color: annotation.color,
                }}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                {annotation.content}
              </div>
            )
          }

          if (annotation.type === 'note') {
            return (
              <div
                key={annotation.id}
                style={{
                  ...styles.noteIcon,
                  left: annotation.bounds.x,
                  top: annotation.bounds.y,
                }}
                title={annotation.content}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                <i className="fas fa-sticky-note" />
              </div>
            )
          }

          if (annotation.type === 'signature') {
            return (
              <div
                key={annotation.id}
                style={{
                  ...styles.signature,
                  left: annotation.bounds.x,
                  top: annotation.bounds.y,
                  width: annotation.bounds.width,
                  height: annotation.bounds.height,
                }}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                <i className="fas fa-signature" />
              </div>
            )
          }

          if (annotation.type === 'stamp') {
            return (
              <div
                key={annotation.id}
                style={{
                  ...styles.stamp,
                  left: annotation.bounds.x,
                  top: annotation.bounds.y,
                }}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                <i className="fas fa-stamp" />
                {annotation.content && <span>{annotation.content}</span>}
              </div>
            )
          }

          return null
        })}
      
      {/* Annotation Properties Panel */}
      {selectedAnnotation && (
        <AnnotationPropertiesPanel
          annotation={annotations.find((a) => a.id === selectedAnnotation) || null}
          onUpdate={(updates) => {
            if (selectedAnnotation) {
              onAnnotationUpdate(selectedAnnotation, updates)
            }
          }}
          onDelete={() => {
            if (selectedAnnotation) {
              onAnnotationDelete(selectedAnnotation)
              setSelectedAnnotation(null)
            }
          }}
          onClose={() => setSelectedAnnotation(null)}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'auto',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },
  textAnnotation: {
    position: 'absolute',
    padding: '4px',
    background: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #ccc',
    borderRadius: '2px',
    fontSize: '14px',
    cursor: 'move',
    overflow: 'auto',
  },
  noteIcon: {
    position: 'absolute',
    width: '24px',
    height: '24px',
    background: '#ffeb3b',
    border: '1px solid #fbc02d',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#f57f17',
  },
  signature: {
    position: 'absolute',
    background: 'transparent',
    border: '2px dashed #0078d4',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'move',
    fontSize: '32px',
    color: '#0078d4',
  },
  stamp: {
    position: 'absolute',
    padding: '8px 12px',
    background: 'rgba(255, 0, 0, 0.1)',
    border: '2px solid #ff0000',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'move',
    fontSize: '16px',
    color: '#ff0000',
    fontWeight: 'bold',
  },
}
