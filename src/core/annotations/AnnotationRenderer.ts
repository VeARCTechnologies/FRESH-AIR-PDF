/**
 * Annotation Renderer
 * 
 * Handles rendering of annotations on canvas layers above PDF pages.
 * Supports all annotation types with visual feedback for selection/hover.
 */

import type {
  Annotation,
  TextMarkupAnnotation,
  FreeTextAnnotation,
  ShapeAnnotation,
  LineAnnotation,
  InkAnnotation,
  Viewport,
} from '@/types'
import { AnnotationType } from '@/types'

export class AnnotationRenderer {
  /**
   * Render all annotations for a page
   */
  renderAnnotations(
    annotations: Annotation[],
    canvas: HTMLCanvasElement,
    viewport: Viewport
  ): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match viewport
    canvas.width = viewport.width
    canvas.height = viewport.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render each annotation
    annotations.forEach(annotation => {
      this.renderAnnotation(annotation, ctx, viewport)
    })
  }

  /**
   * Render a single annotation
   */
  private renderAnnotation(
    annotation: Annotation,
    ctx: CanvasRenderingContext2D,
    viewport: Viewport
  ): void {
    ctx.save()

    // Apply opacity
    ctx.globalAlpha = annotation.opacity || 1.0

    switch (annotation.type) {
      case AnnotationType.Underline:
      case AnnotationType.Strikeout:
        this.renderTextMarkup(annotation as TextMarkupAnnotation, ctx, viewport)
        break

      case AnnotationType.FreeText:
        this.renderFreeText(annotation as FreeTextAnnotation, ctx, viewport)
        break

      case AnnotationType.Rectangle:
      case AnnotationType.Circle:
        this.renderShape(annotation as ShapeAnnotation, ctx, viewport)
        break

      case AnnotationType.Line:
      case AnnotationType.Arrow:
        this.renderLine(annotation as LineAnnotation, ctx, viewport)
        break

      case AnnotationType.Ink:
        this.renderInk(annotation as InkAnnotation, ctx, viewport)
        break
    }

    // Draw selection indicator if selected
    if (annotation.selected) {
      this.renderSelectionIndicator(annotation, ctx, viewport)
    }

    ctx.restore()
  }

  /**
   * Render text markup annotations (underline, strikeout)
   */
  private renderTextMarkup(
    annotation: TextMarkupAnnotation,
    ctx: CanvasRenderingContext2D,
    viewport: Viewport
  ): void {
    const color = annotation.color || '#FFFF00'
    ctx.fillStyle = color

    annotation.quads.forEach(quad => {
      const x = quad.topLeft.x * viewport.scale
      const y = quad.topLeft.y * viewport.scale
      const width = (quad.topRight.x - quad.topLeft.x) * viewport.scale
      const height = (quad.bottomLeft.y - quad.topLeft.y) * viewport.scale

      if (annotation.type === AnnotationType.Underline) {
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y + height)
        ctx.lineTo(x + width, y + height)
        ctx.stroke()
      } else if (annotation.type === AnnotationType.Strikeout) {
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y + height / 2)
        ctx.lineTo(x + width, y + height / 2)
        ctx.stroke()
      }
    })
  }

  /**
   * Render free text annotation
   */
  private renderFreeText(
    annotation: FreeTextAnnotation,
    ctx: CanvasRenderingContext2D,
    viewport: Viewport
  ): void {
    const rect = annotation.rect
    const x = rect.x * viewport.scale
    const y = rect.y * viewport.scale
    const width = rect.width * viewport.scale
    const height = rect.height * viewport.scale

    // Draw background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(x, y, width, height)

    // Draw border
    if (annotation.borderWidth) {
      ctx.strokeStyle = annotation.borderColor || '#000000'
      ctx.lineWidth = annotation.borderWidth
      ctx.strokeRect(x, y, width, height)
    }

    // Draw text
    ctx.fillStyle = annotation.color || '#000000'
    ctx.font = `${annotation.fontSize * viewport.scale}px ${annotation.fontFamily}`
    ctx.textAlign = annotation.textAlign
    ctx.textBaseline = 'top'

    const textX = annotation.textAlign === 'center' ? x + width / 2 : 
                  annotation.textAlign === 'right' ? x + width - 5 : x + 5
    const textY = y + 5

    // Simple word wrap
    const words = annotation.content.split(' ')
    let line = ''
    let lineY = textY
    const lineHeight = annotation.fontSize * viewport.scale * 1.2

    words.forEach(word => {
      const testLine = line + word + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > width - 10 && line !== '') {
        ctx.fillText(line, textX, lineY)
        line = word + ' '
        lineY += lineHeight
      } else {
        line = testLine
      }
    })
    ctx.fillText(line, textX, lineY)
  }

  /**
   * Render shape annotations (rectangle, circle)
   */
  private renderShape(
    annotation: ShapeAnnotation,
    ctx: CanvasRenderingContext2D,
    viewport: Viewport
  ): void {
    const rect = annotation.rect
    const x = rect.x * viewport.scale
    const y = rect.y * viewport.scale
    const width = rect.width * viewport.scale
    const height = rect.height * viewport.scale

    // Fill
    if (annotation.fillColor) {
      ctx.fillStyle = annotation.fillColor
      if (annotation.type === AnnotationType.Rectangle) {
        ctx.fillRect(x, y, width, height)
      } else {
        ctx.beginPath()
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Border
    ctx.strokeStyle = annotation.borderColor
    ctx.lineWidth = annotation.borderWidth

    if (annotation.type === AnnotationType.Rectangle) {
      ctx.strokeRect(x, y, width, height)
    } else {
      ctx.beginPath()
      ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  /**
   * Render line/arrow annotations
   */
  private renderLine(
    annotation: LineAnnotation,
    ctx: CanvasRenderingContext2D,
    viewport: Viewport
  ): void {
    const startX = annotation.start.x * viewport.scale
    const startY = annotation.start.y * viewport.scale
    const endX = annotation.end.x * viewport.scale
    const endY = annotation.end.y * viewport.scale

    ctx.strokeStyle = annotation.lineColor
    ctx.lineWidth = annotation.width

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // Draw arrow head if it's an arrow
    if (annotation.type === AnnotationType.Arrow) {
      const angle = Math.atan2(endY - startY, endX - startX)
      const arrowLength = 15
      const arrowAngle = Math.PI / 6

      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - arrowAngle),
        endY - arrowLength * Math.sin(angle - arrowAngle)
      )
      ctx.moveTo(endX, endY)
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + arrowAngle),
        endY - arrowLength * Math.sin(angle + arrowAngle)
      )
      ctx.stroke()
    }
  }

  /**
   * Render ink/freehand annotation
   */
  private renderInk(
    annotation: InkAnnotation,
    ctx: CanvasRenderingContext2D,
    viewport: Viewport
  ): void {
    ctx.strokeStyle = annotation.inkColor
    ctx.lineWidth = annotation.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    annotation.paths.forEach(path => {
      if (path.length < 2) return

      ctx.beginPath()
      ctx.moveTo(path[0].x * viewport.scale, path[0].y * viewport.scale)

      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * viewport.scale, path[i].y * viewport.scale)
      }

      ctx.stroke()
    })
  }

  /**
   * Render selection indicator around annotation
   */
  private renderSelectionIndicator(
    annotation: Annotation,
    ctx: CanvasRenderingContext2D,
    viewport: Viewport
  ): void {
    // Get bounding box based on annotation type
    let bounds: { x: number; y: number; width: number; height: number }

    if ('rect' in annotation) {
      bounds = annotation.rect
    } else if ('start' in annotation && 'end' in annotation) {
      const line = annotation as LineAnnotation
      bounds = {
        x: Math.min(line.start.x, line.end.x),
        y: Math.min(line.start.y, line.end.y),
        width: Math.abs(line.end.x - line.start.x),
        height: Math.abs(line.end.y - line.start.y),
      }
    } else {
      return
    }

    const x = bounds.x * viewport.scale - 5
    const y = bounds.y * viewport.scale - 5
    const width = bounds.width * viewport.scale + 10
    const height = bounds.height * viewport.scale + 10

    // Draw dashed border
    ctx.strokeStyle = '#0066FF'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])

    // Draw resize handles
    const handleSize = 8
    const handles = [
      { x: x, y: y },
      { x: x + width, y: y },
      { x: x, y: y + height },
      { x: x + width, y: y + height },
    ]

    ctx.fillStyle = '#0066FF'
    handles.forEach(handle => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      )
    })
  }
}
