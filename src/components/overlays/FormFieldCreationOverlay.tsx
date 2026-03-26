/**
 * Form Field Creation Overlay
 * 
 * Interactive overlay for creating form fields by drawing on the PDF
 */

import { useState, useRef } from 'react'
import type { FormField, Viewport } from '@/types'
import { ToolMode } from '@/types'
import { FormFieldPropertiesPanel } from '@/components/panels/FormFieldPropertiesPanel'

interface FormFieldCreationOverlayProps {
  pageNumber: number
  viewport: Viewport
  fields: FormField[]
  activeTool: ToolMode
  onFieldCreate: (field: Omit<FormField, 'id'>) => void
  onFieldUpdate: (id: string, updates: Partial<FormField>) => void
  onFieldDelete: (id: string) => void
}

export function FormFieldCreationOverlay({
  pageNumber,
  viewport,
  fields,
  activeTool,
  onFieldCreate,
  onFieldUpdate,
  onFieldDelete,
}: FormFieldCreationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentBounds, setCurrentBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [selectedField, setSelectedField] = useState<string | null>(null)

  const isFormFieldTool = (tool: ToolMode): boolean => {
    return [
      ToolMode.FormTextField,
      ToolMode.FormCheckbox,
      ToolMode.FormRadio,
      ToolMode.FormDropdown,
      ToolMode.FormSignature,
    ].includes(tool)
  }

  const getFieldTypeFromTool = (tool: ToolMode): FormField['type'] => {
    switch (tool) {
      case ToolMode.FormTextField:
        return 'text'
      case ToolMode.FormCheckbox:
        return 'checkbox'
      case ToolMode.FormRadio:
        return 'radio'
      case ToolMode.FormDropdown:
        return 'dropdown'
      case ToolMode.FormSignature:
        return 'signature'
      default:
        return 'text'
    }
  }

  const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (e.clientX - rect.left) / viewport.scale,
      y: (e.clientY - rect.top) / viewport.scale,
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFormFieldTool(activeTool)) return

    const pos = getMousePos(e)
    setIsDrawing(true)
    setDrawStart(pos)
    setCurrentBounds({ x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return

    const pos = getMousePos(e)
    const minX = Math.min(drawStart.x, pos.x)
    const minY = Math.min(drawStart.y, pos.y)
    const maxX = Math.max(drawStart.x, pos.x)
    const maxY = Math.max(drawStart.y, pos.y)

    setCurrentBounds({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    })
  }

  const handleMouseUp = (_e: React.MouseEvent) => {
    if (!isDrawing || !drawStart || !currentBounds) return

    setIsDrawing(false)

    // Minimum size check
    if (currentBounds.width < 20 || currentBounds.height < 20) {
      setDrawStart(null)
      setCurrentBounds(null)
      return
    }

    const fieldType = getFieldTypeFromTool(activeTool)
    
    // Create field with default name
    const fieldCount = fields.filter(f => f.type === fieldType).length + 1
    const defaultName = `${fieldType}Field${fieldCount}`

    const newField: Omit<FormField, 'id'> = {
      name: defaultName,
      type: fieldType,
      pageNumber,
      bounds: currentBounds,
      required: false,
      readOnly: false,
      placeholder: fieldType === 'text' ? 'Enter text...' : undefined,
      defaultValue: '',
      options: fieldType === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] :
               fieldType === 'dropdown' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
    }

    onFieldCreate(newField)

    setDrawStart(null)
    setCurrentBounds(null)
  }

  const handleFieldClick = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.button === 2 || e.ctrlKey) {
      // Right-click or Ctrl+click
      setSelectedField(fieldId)
    }
  }

  const pageFields = fields.filter((f) => f.pageNumber === pageNumber)

  return (
    <>
      <div
        ref={overlayRef}
        style={styles.overlay}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Existing fields */}
        {pageFields.map((field) => (
          <div
            key={field.id}
            style={{
              ...styles.existingField,
              left: field.bounds.x * viewport.scale,
              top: field.bounds.y * viewport.scale,
              width: field.bounds.width * viewport.scale,
              height: field.bounds.height * viewport.scale,
            }}
            onClick={(e) => handleFieldClick(field.id, e)}
            onContextMenu={(e) => {
              e.preventDefault()
              setSelectedField(field.id)
            }}
          >
            <div style={styles.fieldLabel}>
              <i className={getIconForFieldType(field.type)} style={styles.fieldIcon} />
              <span style={styles.fieldName}>{field.name}</span>
            </div>
          </div>
        ))}

        {/* Drawing preview */}
        {isDrawing && currentBounds && currentBounds.width > 0 && currentBounds.height > 0 && (
          <div
            style={{
              ...styles.drawingPreview,
              left: currentBounds.x * viewport.scale,
              top: currentBounds.y * viewport.scale,
              width: currentBounds.width * viewport.scale,
              height: currentBounds.height * viewport.scale,
            }}
          >
            <span style={styles.previewLabel}>
              <i className={getIconForFieldType(getFieldTypeFromTool(activeTool))} />
              {' '}
              {getFieldTypeFromTool(activeTool)} field
            </span>
          </div>
        )}
      </div>

      {/* Field Properties Panel */}
      {selectedField && (
        <FormFieldPropertiesPanel
          field={fields.find((f) => f.id === selectedField) || null}
          onUpdate={(updates) => {
            if (selectedField) {
              onFieldUpdate(selectedField, updates)
            }
          }}
          onDelete={() => {
            if (selectedField) {
              onFieldDelete(selectedField)
              setSelectedField(null)
            }
          }}
          onClose={() => setSelectedField(null)}
        />
      )}
    </>
  )
}

function getIconForFieldType(type: string): string {
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
    pointerEvents: 'auto',
    cursor: 'crosshair',
  },
  existingField: {
    position: 'absolute',
    background: 'rgba(100, 181, 246, 0.1)',
    border: '2px solid #64b5f6',
    borderRadius: '2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: '2px',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  },
  fieldLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    background: 'rgba(100, 181, 246, 0.95)',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 600,
    borderRadius: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
  },
  fieldIcon: {
    fontSize: '10px',
  },
  fieldName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  drawingPreview: {
    position: 'absolute',
    background: 'rgba(100, 181, 246, 0.15)',
    border: '2px dashed #64b5f6',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  previewLabel: {
    padding: '4px 10px',
    background: 'rgba(100, 181, 246, 0.95)',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
}
