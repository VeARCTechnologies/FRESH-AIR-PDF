/**
 * Form Field Overlay Component
 * 
 * Handles interactive form fields for PDF forms with resize, move, edit, and delete capabilities
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import type { FormField } from '@/types'
import { SignatureModal } from '../modals/SignatureModal'

// Add global hover styles
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  .form-field-action-button:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 120, 212, 0.4);
  }
  .form-field-delete-button:hover {
    background: #b71c1c !important;
    box-shadow: 0 2px 8px rgba(211, 47, 47, 0.4);
  }
  .form-field-resize-handle:hover {
    transform: scale(1.3);
    background: #005a9e !important;
  }
  .signature-field-clickable:hover {
    background: rgba(0, 120, 212, 0.05) !important;
    border: 2px solid #0078d4 !important;
  }
  .signature-field-clickable:hover .signature-placeholder {
    color: #005a9e !important;
  }
`
if (!document.head.querySelector('#form-field-overlay-styles')) {
  styleSheet.id = 'form-field-overlay-styles'
  document.head.appendChild(styleSheet)
}

interface FormFieldOverlayProps {
  pageNumber: number
  fields: FormField[]
  scale: number
  pageWidth?: number
  pageHeight?: number
  onFieldChange: (fieldId: string, value: any) => void
  onFieldUpdate?: (fieldId: string, updates: Partial<FormField>) => void
  onFieldDelete?: (fieldId: string) => void
  onFieldEdit?: (field: FormField) => void
}

export function FormFieldOverlay({
  pageNumber,
  fields,
  scale,
  pageWidth = 0,
  pageHeight = 0,
  onFieldChange,
  onFieldUpdate,
  onFieldDelete,
  onFieldEdit,
}: FormFieldOverlayProps) {
  const pageFields = fields.filter((f) => f.pageNumber === pageNumber)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [activeSignatureFieldId, setActiveSignatureFieldId] = useState<string | null>(null)

  const handleOpenSignatureModal = (fieldId: string) => {
    setActiveSignatureFieldId(fieldId)
    setShowSignatureModal(true)
  }

  const handleSaveSignature = (signatureDataUrl: string) => {
    if (activeSignatureFieldId) {
      onFieldChange(activeSignatureFieldId, signatureDataUrl)
    }
    setShowSignatureModal(false)
    setActiveSignatureFieldId(null)
  }

  return (
    <>
      <div style={styles.overlay}>
        {pageFields.map((field) => (
          <InteractiveFormField
            key={field.id}
            field={field}
            scale={scale}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            onFieldChange={onFieldChange}
            onFieldUpdate={onFieldUpdate}
            onFieldDelete={onFieldDelete}
            onFieldEdit={onFieldEdit}
            onOpenSignatureModal={handleOpenSignatureModal}
          />
        ))}
      </div>
      {showSignatureModal && activeSignatureFieldId && (
        <SignatureModal
          onClose={() => {
            setShowSignatureModal(false)
            setActiveSignatureFieldId(null)
          }}
          onSave={handleSaveSignature}
          existingSignature={fields.find(f => f.id === activeSignatureFieldId)?.value as string | undefined}
        />
      )}
    </>
  )
}

interface InteractiveFormFieldProps {
  field: FormField
  scale: number
  pageWidth: number
  pageHeight: number
  onFieldChange: (fieldId: string, value: any) => void
  onFieldUpdate?: (fieldId: string, updates: Partial<FormField>) => void
  onFieldDelete?: (fieldId: string) => void
  onFieldEdit?: (field: FormField) => void
  onOpenSignatureModal?: (fieldId: string) => void
}

function InteractiveFormField({
  field,
  scale,
  pageWidth,
  pageHeight,
  onFieldChange,
  onFieldUpdate,
  onFieldDelete,
  onFieldEdit,
  onOpenSignatureModal,
}: InteractiveFormFieldProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Local drag/resize offset — drives visual position without triggering parent re-renders
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 })
  const [resizeOffset, setResizeOffset] = useState({ dx: 0, dy: 0 })

  const dragStartPos = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0 })
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0, fieldX: 0, fieldY: 0 })

  // Keep refs to latest values so event handlers never go stale
  const fieldRef = useRef(field)
  fieldRef.current = field
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const isResizingRef = useRef(isResizing)
  isResizingRef.current = isResizing
  const isDraggingRef = useRef(isDragging)
  isDraggingRef.current = isDragging
  const pageWidthRef = useRef(pageWidth)
  pageWidthRef.current = pageWidth
  const pageHeightRef = useRef(pageHeight)
  pageHeightRef.current = pageHeight

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const tagName = target.tagName.toLowerCase()

    // Don't start drag if clicking on interactive form elements
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea' || tagName === 'button') {
      return
    }

    // Don't start drag if clicking on resize handles, action buttons, or signature field
    if (target.closest('.form-field-resize-handle, .form-field-action-button, .form-field-delete-button, .signature-field-clickable')) {
      return
    }

    e.stopPropagation()
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
    e.stopPropagation()
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

  // Stable event handlers using refs — no stale closures
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingRef.current) {
      const f = fieldRef.current
      const rawDx = (e.clientX - dragStartPos.current.x) / scaleRef.current
      const rawDy = (e.clientY - dragStartPos.current.y) / scaleRef.current
      const pw = pageWidthRef.current
      const ph = pageHeightRef.current
      // Clamp so field stays within page bounds
      const minDx = -dragStartPos.current.fieldX
      const maxDx = pw > 0 ? pw - f.bounds.width - dragStartPos.current.fieldX : rawDx
      const minDy = -dragStartPos.current.fieldY
      const maxDy = ph > 0 ? ph - f.bounds.height - dragStartPos.current.fieldY : rawDy
      const dx = Math.max(minDx, Math.min(maxDx, rawDx))
      const dy = Math.max(minDy, Math.min(maxDy, rawDy))
      setDragOffset({ dx, dy })
    } else if (isResizingRef.current) {
      const rawDx = (e.clientX - resizeStartPos.current.x) / scaleRef.current
      const rawDy = (e.clientY - resizeStartPos.current.y) / scaleRef.current
      const pw = pageWidthRef.current
      const ph = pageHeightRef.current
      const { width, height, fieldX, fieldY } = resizeStartPos.current
      const handle = isResizingRef.current
      let dx = rawDx, dy = rawDy

      // Clamp resize so field doesn't go outside page
      if (pw > 0 && ph > 0) {
        if (handle === 'se' || handle === 'ne') {
          dx = Math.min(dx, pw - fieldX - width)
        }
        if (handle === 'sw' || handle === 'nw') {
          dx = Math.max(dx, -fieldX - (width - 20))
        }
        if (handle === 'se' || handle === 'sw') {
          dy = Math.min(dy, ph - fieldY - height)
        }
        if (handle === 'ne' || handle === 'nw') {
          dy = Math.max(dy, -fieldY - (height - 15))
        }
      }
      setResizeOffset({ dx, dy })
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    const f = fieldRef.current
    if (isDraggingRef.current && onFieldUpdate) {
      const startX = dragStartPos.current.fieldX
      const startY = dragStartPos.current.fieldY
      setDragOffset(prev => {
        if (prev.dx !== 0 || prev.dy !== 0) {
          onFieldUpdate(f.id, {
            bounds: {
              ...f.bounds,
              x: startX + prev.dx,
              y: startY + prev.dy,
            },
          })
        }
        return { dx: 0, dy: 0 }
      })
    } else if (isResizingRef.current && onFieldUpdate) {
      const handle = isResizingRef.current
      setResizeOffset(prev => {
        if (prev.dx !== 0 || prev.dy !== 0) {
          const newBounds = { ...f.bounds }
          const minWidth = 20
          const minHeight = 15
          const { width, height, fieldX, fieldY } = resizeStartPos.current

          switch (handle) {
            case 'se':
              newBounds.width = Math.max(minWidth, width + prev.dx)
              newBounds.height = Math.max(minHeight, height + prev.dy)
              break
            case 'sw': {
              const w = Math.max(minWidth, width - prev.dx)
              newBounds.width = w
              newBounds.height = Math.max(minHeight, height + prev.dy)
              newBounds.x = fieldX + width - w
              break
            }
            case 'ne': {
              const h = Math.max(minHeight, height - prev.dy)
              newBounds.width = Math.max(minWidth, width + prev.dx)
              newBounds.height = h
              newBounds.y = fieldY + height - h
              break
            }
            case 'nw': {
              const w = Math.max(minWidth, width - prev.dx)
              const h = Math.max(minHeight, height - prev.dy)
              newBounds.width = w
              newBounds.height = h
              newBounds.x = fieldX + width - w
              newBounds.y = fieldY + height - h
              break
            }
          }
          onFieldUpdate(f.id, { bounds: newBounds })
        }
        return { dx: 0, dy: 0 }
      })
    }
    setIsDragging(false)
    setIsResizing(null)
  }, [onFieldUpdate])

  // Add/remove global event listeners — stable refs, no stale closures
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

  // Compute visual bounds: base position + local offset (no parent re-render needed during drag)
  const visualBounds = { ...field.bounds }
  if (isDragging) {
    visualBounds.x = dragStartPos.current.fieldX + dragOffset.dx
    visualBounds.y = dragStartPos.current.fieldY + dragOffset.dy
  }
  if (isResizing) {
    const { width, height, fieldX, fieldY } = resizeStartPos.current
    const minWidth = 20
    const minHeight = 15
    switch (isResizing) {
      case 'se':
        visualBounds.width = Math.max(minWidth, width + resizeOffset.dx)
        visualBounds.height = Math.max(minHeight, height + resizeOffset.dy)
        break
      case 'sw': {
        const w = Math.max(minWidth, width - resizeOffset.dx)
        visualBounds.width = w
        visualBounds.height = Math.max(minHeight, height + resizeOffset.dy)
        visualBounds.x = fieldX + width - w
        break
      }
      case 'ne': {
        const h = Math.max(minHeight, height - resizeOffset.dy)
        visualBounds.width = Math.max(minWidth, width + resizeOffset.dx)
        visualBounds.height = h
        visualBounds.y = fieldY + height - h
        break
      }
      case 'nw': {
        const w = Math.max(minWidth, width - resizeOffset.dx)
        const h = Math.max(minHeight, height - resizeOffset.dy)
        visualBounds.width = w
        visualBounds.height = h
        visualBounds.x = fieldX + width - w
        visualBounds.y = fieldY + height - h
        break
      }
    }
  }

  // Determine if action buttons/label need to flip position
  const buttonsAboveSpace = visualBounds.y * scale // space above field in px
  const buttonsBelowSpace = (pageHeight - visualBounds.y - visualBounds.height) * scale
  const showButtonsBelow = buttonsAboveSpace < 36
  const showLabelAbove = buttonsBelowSpace < 28

  const containerStyle: React.CSSProperties = {
    ...styles.fieldContainer,
    left: visualBounds.x * scale,
    top: visualBounds.y * scale,
    width: visualBounds.width * scale,
    height: visualBounds.height * scale,
    ...(isHovered || isDragging || isResizing ? styles.hoveredContainer : {}),
    ...(isFocused ? styles.focusedContainer : {}),
    cursor: isDragging ? 'grabbing' : (isHovered ? 'move' : 'default'),
    // Disable CSS transition during drag/resize to prevent ghosting
    transition: isDragging || isResizing ? 'none' : undefined,
  }

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
    >
      {/* Field Content */}
      <div className="field-content" style={styles.fieldContent}>
        {field.type === 'text' && (
          field.multiline ? (
            <textarea
              value={field.value || ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={field.readOnly}
              required={field.required}
              placeholder={field.placeholder}
              style={styles.textArea}
            />
          ) : (
            <input
              type="text"
              value={field.value || ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={field.readOnly}
              required={field.required}
              placeholder={field.placeholder}
              style={styles.textField}
            />
          )
        )}

        {field.type === 'checkbox' && (
          <label style={styles.checkboxField}>
            <input
              type="checkbox"
              checked={field.value || false}
              onChange={(e) => onFieldChange(field.id, e.target.checked)}
              disabled={field.readOnly}
              style={styles.checkbox}
            />
          </label>
        )}

        {field.type === 'radio' && (
          <div style={styles.radioField}>
            {field.options && field.options.length > 0 ? (
              field.options.map((option) => (
                <label key={option} style={styles.radioOption}>
                  <input
                    type="radio"
                    name={`radio-${field.id}`}
                    checked={field.value === option}
                    onChange={() => onFieldChange(field.id, option)}
                    disabled={field.readOnly}
                    style={styles.radio}
                  />
                  <span style={styles.radioLabel}>{option}</span>
                </label>
              ))
            ) : (
              <label style={styles.radioOption}>
                <input
                  type="radio"
                  checked={!!field.value}
                  onChange={() => onFieldChange(field.id, !field.value)}
                  disabled={field.readOnly}
                  style={styles.radio}
                />
              </label>
            )}
          </div>
        )}

        {field.type === 'dropdown' && (
          <select
            value={field.value || ''}
            onChange={(e) => onFieldChange(field.id, e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={field.readOnly}
            required={field.required}
            style={styles.dropdown}
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}

        {field.type === 'signature' && (
          <div
            className="signature-field-clickable"
            style={{
              ...styles.signatureField,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onOpenSignatureModal?.(field.id)
            }}
            title="Click to add signature"
          >
            {field.value && typeof field.value === 'string' && field.value.startsWith('data:image/') ? (
              <img src={field.value} alt="Signature" style={styles.signatureImage} />
            ) : (
              <div className="signature-placeholder" style={styles.signaturePlaceholder}>
                <i className="fas fa-signature" />
                <span>Click to sign</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover Controls */}
      {(isHovered || isDragging || isResizing) && (
        <>
          {/* Action Buttons */}
          <div style={{
            ...styles.actionButtons,
            ...(showButtonsBelow
              ? { top: 'auto', bottom: -32 }
              : { top: -32, bottom: 'auto' }),
          }}>
            {onFieldEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFieldEdit(field)
                }}
                className="form-field-action-button"
                style={styles.actionButton}
                title="Edit properties"
              >
                <i className="fas fa-edit" />
              </button>
            )}
            {onFieldDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFieldDelete(field.id)
                }}
                className="form-field-delete-button"
                style={{ ...styles.actionButton, ...styles.deleteButton }}
                title="Delete field"
              >
                <i className="fas fa-trash" />
              </button>
            )}
          </div>

          {/* Resize Handles */}
          {onFieldUpdate && (
            <>
              <div
                className="form-field-resize-handle"
                style={{ ...styles.resizeHandle, ...styles.resizeNW }}
                onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                title="Resize"
              />
              <div
                className="form-field-resize-handle"
                style={{ ...styles.resizeHandle, ...styles.resizeNE }}
                onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                title="Resize"
              />
              <div
                className="form-field-resize-handle"
                style={{ ...styles.resizeHandle, ...styles.resizeSW }}
                onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                title="Resize"
              />
              <div
                className="form-field-resize-handle"
                style={{ ...styles.resizeHandle, ...styles.resizeSE }}
                onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                title="Resize"
              />
            </>
          )}

          {/* Field Label */}
          <div style={{
            ...styles.fieldLabel,
            ...(showLabelAbove
              ? { bottom: 'auto', top: -24 }
              : { bottom: -24, top: 'auto' }),
          }}>
            <i className={getFieldIcon(field.type)} style={styles.fieldLabelIcon} />
            <span>{field.name}</span>
          </div>
        </>
      )}
    </div>
  )
}

function getFieldIcon(type: string): string {
  const icons: Record<string, string> = {
    text: 'fas fa-font',
    checkbox: 'far fa-check-square',
    radio: 'far fa-dot-circle',
    dropdown: 'fas fa-caret-square-down',
    signature: 'fas fa-signature',
  }
  return icons[type] || 'fas fa-edit'
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  fieldContainer: {
    position: 'absolute',
    pointerEvents: 'auto',
    border: '2px solid transparent',
    transition: 'border-color 0.2s ease',
  },
  hoveredContainer: {
    border: '2px solid #64b5f6',
    boxShadow: '0 0 0 1px rgba(100, 181, 246, 0.3)',
  },
  focusedContainer: {
    border: '2px solid #0078d4',
    boxShadow: '0 0 0 1px rgba(0, 120, 212, 0.3)',
  },
  fieldContent: {
    width: '100%',
    height: '100%',
    pointerEvents: 'auto',
  },
  textField: {
    width: '100%',
    height: '100%',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.95)',
    border: 'none',
    borderRadius: '2px',
    fontSize: '14px',
    cursor: 'text',
    pointerEvents: 'auto',
  },
  textArea: {
    width: '100%',
    height: '100%',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.95)',
    border: 'none',
    borderRadius: '2px',
    fontSize: '14px',
    cursor: 'text',
    pointerEvents: 'auto',
    resize: 'none' as const,
    fontFamily: 'inherit',
  },
  checkboxField: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  radioField: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    gap: '2px',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '2px',
    overflowY: 'auto' as const,
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  radio: {
    width: '14px',
    height: '14px',
    cursor: 'pointer',
    flexShrink: 0,
    margin: 0,
  },
  radioLabel: {
    color: '#333',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  dropdown: {
    width: '100%',
    height: '100%',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.95)',
    pointerEvents: 'auto',
    border: 'none',
    borderRadius: '2px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  signatureField: {
    width: '100%',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  signatureImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  signaturePlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: '#0078d4',
    fontSize: '12px',
  },
  actionButtons: {
    position: 'absolute',
    top: -32,
    right: 0,
    display: 'flex',
    gap: '4px',
    background: '#252526',
    padding: '4px',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  actionButton: {
    padding: '6px 10px',
    background: '#0078d4',
    border: 'none',
    borderRadius: '3px',
    color: '#ffffff',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deleteButton: {
    background: '#d32f2f',
  },
  resizeHandle: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: '#0078d4',
    border: '1px solid #ffffff',
    borderRadius: '50%',
    zIndex: 10,
    transition: 'all 0.2s ease',
  },
  resizeNW: {
    top: -4,
    left: -4,
    cursor: 'nw-resize',
  },
  resizeNE: {
    top: -4,
    right: -4,
    cursor: 'ne-resize',
  },
  resizeSW: {
    bottom: -4,
    left: -4,
    cursor: 'sw-resize',
  },
  resizeSE: {
    bottom: -4,
    right: -4,
    cursor: 'se-resize',
  },
  fieldLabel: {
    position: 'absolute',
    bottom: -24,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#252526',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    color: '#e0e0e0',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  fieldLabelIcon: {
    color: '#64b5f6',
    fontSize: '10px',
  },
}
