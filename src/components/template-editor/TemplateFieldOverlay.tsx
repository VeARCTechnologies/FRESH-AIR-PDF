/**
 * TemplateFieldOverlay Component
 *
 * Renders placed template fields as colored dashed-border placeholders on the PDF canvas.
 * Supports drag-to-move, resize, click-to-select, and keyboard delete.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { TemplateField } from '@/types'
import { TEMPLATE_FIELD_COLORS, TEMPLATE_FIELD_ICONS } from '@/types'

/** Format a date default value according to the field's dateFormat */
function formatDateValue(value: string, format?: string): string {
  if (!value) return ''
  // value is typically ISO: YYYY-MM-DD
  const parts = value.split('-')
  if (parts.length !== 3) return value
  const [y, m, d] = parts
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  switch (format) {
    case 'DD/MM/YYYY': return `${d}/${m}/${y}`
    case 'MM-DD-YYYY': return `${m}-${d}-${y}`
    case 'Month D YYYY': return `${months[parseInt(m, 10) - 1] || m} ${parseInt(d, 10)} ${y}`
    case 'YYYY-MM-DD': return value
    default: return `${d}/${m}/${y}`
  }
}

// Inject hover styles once
const styleEl = document.createElement('style')
styleEl.id = 'template-field-overlay-styles'
styleEl.textContent = `
  .tpl-field-resize-handle:hover { transform: scale(1.3); }
`
if (!document.head.querySelector('#template-field-overlay-styles')) {
  document.head.appendChild(styleEl)
}

const MIN_W = 20
const MIN_H = 16

function computeResizedBounds(
  handle: string,
  dx: number,
  dy: number,
  startWidth: number,
  startHeight: number,
  startX: number,
  startY: number,
) {
  let x = startX, y = startY, w = startWidth, h = startHeight

  // Horizontal
  if (handle.includes('e')) { w = Math.max(MIN_W, startWidth + dx) }
  if (handle.includes('w')) {
    const nw = Math.max(MIN_W, startWidth - dx)
    x = startX + startWidth - nw
    w = nw
  }
  // Vertical
  if (handle.includes('s') || handle === 's') { h = Math.max(MIN_H, startHeight + dy) }
  if (handle.includes('n') && handle !== 'ne' && handle !== 'nw') {
    // pure 'n'
    const nh = Math.max(MIN_H, startHeight - dy)
    y = startY + startHeight - nh
    h = nh
  }
  if (handle === 'ne' || handle === 'nw') {
    const nh = Math.max(MIN_H, startHeight - dy)
    y = startY + startHeight - nh
    h = nh
  }

  return { x, y, width: w, height: h }
}

interface TemplateFieldOverlayProps {
  pageNumber: number
  fields: TemplateField[]
  scale: number
  pageWidth: number
  pageHeight: number
  selectedFieldId: string | null
  readOnly?: boolean
  /** When true, fields without systemFieldId show as unmapped (red border + warning). Defaults to false. */
  requireSystemMapping?: boolean
  onFieldSelect: (id: string) => void
  onFieldUpdate: (id: string, updates: Partial<TemplateField>) => void
  onFieldDelete: (id: string) => void
}

export function TemplateFieldOverlay({
  pageNumber,
  fields,
  scale,
  pageWidth,
  pageHeight,
  selectedFieldId,
  readOnly = false,
  requireSystemMapping = false,
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
}: TemplateFieldOverlayProps) {
  const pageFields = fields.filter(f => f.pageNumber === pageNumber)

  return (
    <div style={overlayStyles.overlay} data-template-overlay>
      {pageFields.map(field => (
        <InteractiveTemplateField
          key={field.id}
          field={field}
          scale={scale}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          isSelected={field.id === selectedFieldId}
          readOnly={readOnly}
          requireSystemMapping={requireSystemMapping}
          onSelect={() => onFieldSelect(field.id)}
          onUpdate={(updates) => onFieldUpdate(field.id, updates)}
          onDelete={() => onFieldDelete(field.id)}
        />
      ))}
    </div>
  )
}

interface InteractiveTemplateFieldProps {
  field: TemplateField
  scale: number
  pageWidth: number
  pageHeight: number
  isSelected: boolean
  readOnly: boolean
  requireSystemMapping: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<TemplateField>) => void
  onDelete: () => void
}

function InteractiveTemplateField({
  field,
  scale,
  pageWidth,
  pageHeight,
  isSelected,
  readOnly,
  requireSystemMapping,
  onSelect,
  onUpdate,
  onDelete,
}: InteractiveTemplateFieldProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 })
  const [resizeOffset, setResizeOffset] = useState({ dx: 0, dy: 0 })

  const dragStartPos = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0 })
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0, fieldX: 0, fieldY: 0 })

  const fieldRef = useRef(field)
  fieldRef.current = field
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const isDraggingRef = useRef(isDragging)
  isDraggingRef.current = isDragging
  const isResizingRef = useRef(isResizing)
  isResizingRef.current = isResizing
  const pageWidthRef = useRef(pageWidth)
  pageWidthRef.current = pageWidth
  const pageHeightRef = useRef(pageHeight)
  pageHeightRef.current = pageHeight

  const color = TEMPLATE_FIELD_COLORS[field.fieldType]
  const isUnmapped = requireSystemMapping && !field.systemFieldId
  const borderColor = isUnmapped ? '#E53935' : color
  const borderVisible = field.borderVisible !== false

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return
    const target = e.target as HTMLElement
    if (target.closest('.tpl-field-resize-handle')) return

    e.stopPropagation()
    onSelect()
    setIsDragging(true)
    setDragOffset({ dx: 0, dy: 0 })
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      fieldX: field.bounds.x,
      fieldY: field.bounds.y,
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    if (readOnly) return
    e.stopPropagation()
    onSelect()
    setIsResizing(handle)
    setResizeOffset({ dx: 0, dy: 0 })
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: field.bounds.width,
      height: field.bounds.height,
      fieldX: field.bounds.x,
      fieldY: field.bounds.y,
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const invScale = 1 / scaleRef.current
    if (isDraggingRef.current) {
      const f = fieldRef.current
      const rawDx = (e.clientX - dragStartPos.current.x) * invScale
      const rawDy = (e.clientY - dragStartPos.current.y) * invScale
      const pw = pageWidthRef.current
      const ph = pageHeightRef.current
      const minDx = -dragStartPos.current.fieldX
      const maxDx = pw > 0 ? pw - f.bounds.width - dragStartPos.current.fieldX : rawDx
      const minDy = -dragStartPos.current.fieldY
      const maxDy = ph > 0 ? ph - f.bounds.height - dragStartPos.current.fieldY : rawDy
      setDragOffset({
        dx: Math.max(minDx, Math.min(maxDx, rawDx)),
        dy: Math.max(minDy, Math.min(maxDy, rawDy)),
      })
    } else if (isResizingRef.current) {
      const rawDx = (e.clientX - resizeStartPos.current.x) * invScale
      const rawDy = (e.clientY - resizeStartPos.current.y) * invScale
      setResizeOffset({ dx: rawDx, dy: rawDy })
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    const f = fieldRef.current
    if (isDraggingRef.current) {
      setDragOffset(prev => {
        if (prev.dx !== 0 || prev.dy !== 0) {
          onUpdate({
            bounds: {
              ...f.bounds,
              x: dragStartPos.current.fieldX + prev.dx,
              y: dragStartPos.current.fieldY + prev.dy,
            },
          })
        }
        return { dx: 0, dy: 0 }
      })
    } else if (isResizingRef.current) {
      const handle = isResizingRef.current
      setResizeOffset(prev => {
        if (prev.dx !== 0 || prev.dy !== 0) {
          const { width, height, fieldX, fieldY } = resizeStartPos.current
          const newBounds = computeResizedBounds(handle, prev.dx, prev.dy, width, height, fieldX, fieldY)
          onUpdate({ bounds: newBounds })
        }
        return { dx: 0, dy: 0 }
      })
    }
    setIsDragging(false)
    setIsResizing(null)
  }, [onUpdate])

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  // Keyboard delete
  useEffect(() => {
    if (!isSelected || readOnly) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement).tagName.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          onDelete()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelected, readOnly, onDelete])

  // Compute visual bounds
  const vb = { ...field.bounds }
  if (isDragging) {
    vb.x = dragStartPos.current.fieldX + dragOffset.dx
    vb.y = dragStartPos.current.fieldY + dragOffset.dy
  }
  if (isResizing) {
    const { width, height, fieldX, fieldY } = resizeStartPos.current
    const resized = computeResizedBounds(isResizing, resizeOffset.dx, resizeOffset.dy, width, height, fieldX, fieldY)
    vb.x = resized.x
    vb.y = resized.y
    vb.width = resized.width
    vb.height = resized.height
  }

  const showHandles = isSelected && !readOnly
  const iconClass = TEMPLATE_FIELD_ICONS[field.fieldType] || 'fas fa-edit'
  const displayName = field.systemFieldName || field.name

  return (
    <div
      style={{
        position: 'absolute',
        left: vb.x * scale,
        top: vb.y * scale,
        width: vb.width * scale,
        height: vb.height * scale,
        border: borderVisible || isSelected || isHovered
          ? `2px ${isSelected ? 'solid' : 'dashed'} ${borderColor}`
          : '2px dashed transparent',
        background: isSelected
          ? `${borderColor}18`
          : isHovered ? `${borderColor}0D` : borderVisible ? 'transparent' : `${borderColor}06`,
        borderRadius: 3,
        pointerEvents: 'auto',
        cursor: readOnly ? 'default' : isDragging ? 'grabbing' : 'grab',
        transition: isDragging || isResizing ? 'none' : 'background 0.15s ease',
        boxSizing: 'border-box',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      {/* Field type badge — positioned outside, top-left above the field */}
      {(field.labelVisible !== false || isSelected || isHovered) && <div style={{
        position: 'absolute',
        top: -18,
        left: -1,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '1px 5px',
        background: borderColor,
        color: '#fff',
        borderRadius: '3px 3px 0 0',
        fontSize: 9,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        lineHeight: '15px',
      }}>
        <i className={iconClass} style={{ fontSize: 8 }} />
        <span>{displayName}</span>
        {field.requiredAtGeneration && (
          <span style={{ color: '#ffcdd2', fontSize: 10, lineHeight: 1 }}>*</span>
        )}
        {isUnmapped && (
          <i className="fas fa-exclamation-triangle" style={{ fontSize: 8, color: '#ffcdd2' }} />
        )}
      </div>}

      {/* Field content inside */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        fontSize: Math.max(9, Math.min((field.fontSize || 12) * scale * 0.7, 14)),
        color: borderColor,
        fontWeight: 500,
        whiteSpace: field.multiline ? 'normal' : 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        pointerEvents: 'none',
        userSelect: 'none',
        height: '100%',
        alignContent: 'center',
        opacity: 0.7,
      }}>
        {field.defaultValue && field.fieldType !== 'checkbox' && field.fieldType !== 'boolean' && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {field.fieldType === 'date' ? formatDateValue(field.defaultValue, field.dateFormat) : field.defaultValue}
          </span>
        )}
        {(field.fieldType === 'checkbox' || field.fieldType === 'boolean') && field.defaultValue === 'true' && (
          <span style={{ fontSize: Math.max(11, (field.boxSize || 24) * scale * 0.5), opacity: 0.8, lineHeight: 1 }}>
            {field.tickStyle === 'cross' ? '\u2717' : field.tickStyle === 'filled' ? '\u25A0' : '\u2713'}
          </span>
        )}
      </div>

      {/* Resize tooltip */}
      {isResizing && (
        <div style={{
          position: 'absolute',
          bottom: -22,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 20,
        }}>
          {Math.round(vb.width)} &times; {Math.round(vb.height)}
        </div>
      )}

      {/* Resize handles — 4 corners + 4 edges */}
      {showHandles && (
        <>
          {/* Corner handles */}
          {(['nw', 'ne', 'sw', 'se'] as const).map(h => (
            <div
              key={h}
              className="tpl-field-resize-handle"
              style={{
                ...cornerHandleStyle,
                background: borderColor,
                ...(h === 'nw' ? { top: -4, left: -4, cursor: 'nw-resize' } : {}),
                ...(h === 'ne' ? { top: -4, right: -4, cursor: 'ne-resize' } : {}),
                ...(h === 'sw' ? { bottom: -4, left: -4, cursor: 'sw-resize' } : {}),
                ...(h === 'se' ? { bottom: -4, right: -4, cursor: 'se-resize' } : {}),
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, h)}
            />
          ))}
          {/* Edge handles */}
          {(['n', 'e', 's', 'w'] as const).map(h => (
            <div
              key={h}
              className="tpl-field-resize-handle"
              style={{
                ...edgeHandleStyle,
                background: borderColor,
                ...(h === 'n' ? { top: -3, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize', width: 14, height: 6, borderRadius: 3 } : {}),
                ...(h === 's' ? { bottom: -3, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize', width: 14, height: 6, borderRadius: 3 } : {}),
                ...(h === 'e' ? { right: -3, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize', width: 6, height: 14, borderRadius: 3 } : {}),
                ...(h === 'w' ? { left: -3, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize', width: 6, height: 14, borderRadius: 3 } : {}),
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, h)}
            />
          ))}
        </>
      )}
    </div>
  )
}

const cornerHandleStyle: React.CSSProperties = {
  position: 'absolute',
  width: 8,
  height: 8,
  border: '1px solid #ffffff',
  borderRadius: '50%',
  zIndex: 10,
  transition: 'transform 0.15s ease',
}

const edgeHandleStyle: React.CSSProperties = {
  position: 'absolute',
  border: '1px solid #ffffff',
  zIndex: 10,
  transition: 'transform 0.15s ease',
}

const overlayStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
}
