/**
 * Annotation Properties Panel
 * 
 * Shows properties for selected annotation (name, color, opacity, etc.)
 */

import { useState, useEffect } from 'react'
import type { SimpleAnnotation } from '@/types'

interface AnnotationPropertiesPanelProps {
  annotation: SimpleAnnotation | null
  onUpdate: (updates: Partial<SimpleAnnotation>) => void
  onDelete: () => void
  onClose: () => void
}

export function AnnotationPropertiesPanel({
  annotation,
  onUpdate,
  onDelete,
  onClose,
}: AnnotationPropertiesPanelProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#000000')
  const [opacity, setOpacity] = useState(1)
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')

  useEffect(() => {
    if (annotation) {
      setName(annotation.author || '')
      setColor(annotation.color)
      setOpacity(annotation.opacity || 1)
      setContent(annotation.content || '')
      setAuthor(annotation.author || '')
    }
  }, [annotation])

  if (!annotation) return null

  const handleSave = () => {
    onUpdate({
      author: name || author,
      color,
      opacity,
      content,
    })
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            <i className={getIconForType(annotation.type)} style={styles.icon} />
            {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)} Properties
          </h3>
          <button onClick={onClose} style={styles.closeButton}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div style={styles.body}>
          {/* Author/Name */}
          <div style={styles.field}>
            <label style={styles.label}>
              <i className="fas fa-user" style={styles.fieldIcon} />
              Author
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter author name..."
              style={styles.input}
            />
          </div>

          {/* Content/Note */}
          {(annotation.type === 'note' || annotation.type === 'free-text') && (
            <div style={styles.field}>
              <label style={styles.label}>
                <i className="fas fa-comment" style={styles.fieldIcon} />
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter content..."
                style={styles.textarea}
                rows={4}
              />
            </div>
          )}

          {/* Color */}
          <div style={styles.field}>
            <label style={styles.label}>
              <i className="fas fa-palette" style={styles.fieldIcon} />
              Color
            </label>
            <div style={styles.colorRow}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={styles.colorPicker}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={styles.colorInput}
              />
            </div>
          </div>

          {/* Opacity */}
          <div style={styles.field}>
            <label style={styles.label}>
              <i className="fas fa-adjust" style={styles.fieldIcon} />
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={styles.slider}
            />
          </div>

          {/* Position */}
          <div style={styles.field}>
            <label style={styles.label}>
              <i className="fas fa-arrows-alt" style={styles.fieldIcon} />
              Position
            </label>
            <div style={styles.positionGrid}>
              <div style={styles.positionItem}>
                <span>X:</span>
                <input
                  type="number"
                  value={Math.round(annotation.bounds.x)}
                  onChange={(e) => onUpdate({ 
                    bounds: { ...annotation.bounds, x: parseInt(e.target.value) || 0 }
                  })}
                  style={styles.numberInput}
                />
              </div>
              <div style={styles.positionItem}>
                <span>Y:</span>
                <input
                  type="number"
                  value={Math.round(annotation.bounds.y)}
                  onChange={(e) => onUpdate({ 
                    bounds: { ...annotation.bounds, y: parseInt(e.target.value) || 0 }
                  })}
                  style={styles.numberInput}
                />
              </div>
              <div style={styles.positionItem}>
                <span>Width:</span>
                <input
                  type="number"
                  value={Math.round(annotation.bounds.width)}
                  onChange={(e) => onUpdate({ 
                    bounds: { ...annotation.bounds, width: parseInt(e.target.value) || 0 }
                  })}
                  style={styles.numberInput}
                />
              </div>
              <div style={styles.positionItem}>
                <span>Height:</span>
                <input
                  type="number"
                  value={Math.round(annotation.bounds.height)}
                  onChange={(e) => onUpdate({ 
                    bounds: { ...annotation.bounds, height: parseInt(e.target.value) || 0 }
                  })}
                  style={styles.numberInput}
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div style={styles.metadata}>
            <div style={styles.metadataItem}>
              <i className="far fa-calendar" style={styles.fieldIcon} />
              Created: {new Date(annotation.createdAt).toLocaleString()}
            </div>
            <div style={styles.metadataItem}>
              <i className="far fa-clock" style={styles.fieldIcon} />
              Modified: {new Date(annotation.modifiedAt).toLocaleString()}
            </div>
            <div style={styles.metadataItem}>
              <i className="far fa-file" style={styles.fieldIcon} />
              Page: {annotation.pageNumber}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={handleSave} style={styles.saveButton}>
            <i className="fas fa-check" />
            Save Changes
          </button>
          <button onClick={onDelete} style={styles.deleteButton}>
            <i className="fas fa-trash" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    highlight: 'fas fa-highlighter',
    'free-text': 'fas fa-font',
    note: 'fas fa-sticky-note',
    ink: 'fas fa-pen',
    arrow: 'fas fa-long-arrow-alt-right',
    rectangle: 'far fa-square',
    ellipse: 'far fa-circle',
    signature: 'fas fa-signature',
    stamp: 'fas fa-stamp',
  }
  return icons[type] || 'fas fa-edit'
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  panel: {
    background: '#2b2b2b',
    borderRadius: '8px',
    width: '480px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #3a3a3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    color: '#0078d4',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#b0b0b0',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  body: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#e0e0e0',
  },
  fieldIcon: {
    color: '#0078d4',
    width: '16px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: '#1e1e1e',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    background: '#1e1e1e',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  colorRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  colorPicker: {
    width: '60px',
    height: '36px',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  colorInput: {
    flex: 1,
    padding: '8px 12px',
    background: '#1e1e1e',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '14px',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#3a3a3a',
    outline: 'none',
    cursor: 'pointer',
  },
  positionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  positionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#b0b0b0',
  },
  numberInput: {
    flex: 1,
    padding: '6px 8px',
    background: '#1e1e1e',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '13px',
  },
  metadata: {
    marginTop: '24px',
    padding: '16px',
    background: '#1e1e1e',
    borderRadius: '4px',
    border: '1px solid #3a3a3a',
  },
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#b0b0b0',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #3a3a3a',
    display: 'flex',
    gap: '12px',
  },
  saveButton: {
    flex: 1,
    padding: '10px 20px',
    background: '#0078d4',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  deleteButton: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid #d32f2f',
    borderRadius: '4px',
    color: '#d32f2f',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
}
