/**
 * FieldTypeButton Component
 *
 * Draggable colored button representing a field type in the sidebar.
 */

import { useCallback } from 'react'
import type { TemplateFieldType } from '@/types'
import { TEMPLATE_FIELD_COLORS } from '@/types'
import { DRAG_DATA_TYPE } from '@/hooks/useDragToCanvas'

interface FieldTypeButtonProps {
  fieldType: TemplateFieldType
  label: string
  icon: string
  disabled?: boolean
}

export function FieldTypeButton({ fieldType, label, icon, disabled = false }: FieldTypeButtonProps) {
  const color = TEMPLATE_FIELD_COLORS[fieldType]

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify({ fieldType }))
    e.dataTransfer.effectAllowed = 'copy'

    // Custom drag ghost
    const ghost = document.createElement('div')
    ghost.textContent = label
    ghost.style.cssText = `
      padding: 4px 12px;
      background: ${color};
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      font-family: "Segoe UI", -apple-system, sans-serif;
      position: absolute;
      top: -1000px;
      white-space: nowrap;
    `
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }, [fieldType, label, color, disabled])

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      title={`Drag ${label} field onto the canvas`}
      style={{
        ...styles.button,
        background: color,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'grab',
      }}
    >
      <i className={icon} style={styles.icon} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 14,
    transition: 'opacity 0.15s ease',
  },
  icon: {
    fontSize: 14,
  },
}
