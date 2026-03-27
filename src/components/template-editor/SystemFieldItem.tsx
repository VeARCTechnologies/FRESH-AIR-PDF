/**
 * SystemFieldItem Component
 *
 * Draggable system field item in the sidebar overlay fields list.
 */

import { useCallback } from 'react'
import type { SystemField } from '@/types'
import { TEMPLATE_FIELD_COLORS } from '@/types'
import { DRAG_DATA_TYPE } from '@/hooks/useDragToCanvas'

interface SystemFieldItemProps {
  field: SystemField
  isPlaced?: boolean
  disabled?: boolean
}

export function SystemFieldItem({ field, isPlaced = false, disabled = false }: SystemFieldItemProps) {
  const color = TEMPLATE_FIELD_COLORS[field.fieldType]

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData(
      DRAG_DATA_TYPE,
      JSON.stringify({
        fieldType: field.fieldType,
        systemFieldId: field.id || field.name,
        systemFieldName: field.name,
        systemFieldDescription: field.description,
      })
    )
    e.dataTransfer.effectAllowed = 'copy'

    const ghost = document.createElement('div')
    ghost.textContent = field.name
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
  }, [field, color, disabled])

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      style={{
        ...styles.item,
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={styles.leftPart}>
        <div style={{ ...styles.dot, background: color }} />
        <span style={styles.fieldName}>{field.name}</span>
      </div>
      <div style={styles.rightPart}>
        {isPlaced && (
          <i className="fas fa-check" style={{ fontSize: 10, color: '#43A047', marginRight: 4 }} />
        )}
        <span style={styles.typeBadge}>{field.fieldType}</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px 6px 16px',
    fontSize: 13,
    color: '#333',
    transition: 'background 0.1s ease',
  },
  leftPart: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  fieldName: {
    fontSize: 13,
    color: '#333',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rightPart: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  typeBadge: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
}
