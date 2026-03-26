/**
 * Form Field Properties Panel
 *
 * Allows editing form field properties (name, type, required, default value, etc.)
 * Light theme.
 */

import { useState, useEffect } from 'react'
import type { FormField } from '@/types'

// Add hover styles globally
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  .form-field-props-save:hover {
    background: #005a9e !important;
  }
  .form-field-props-delete:hover {
    background: rgba(211, 47, 47, 0.08) !important;
  }
  .form-field-props-add:hover {
    background: #005a9e !important;
  }
  .form-field-props-remove:hover {
    background: rgba(211, 47, 47, 0.08) !important;
  }
  .form-field-props-close:hover {
    background: #f0f0f0 !important;
  }
`
if (!document.head.querySelector('#form-field-props-styles')) {
  styleSheet.id = 'form-field-props-styles'
  document.head.appendChild(styleSheet)
}

interface FormFieldPropertiesPanelProps {
  field: FormField | null
  onUpdate: (updates: Partial<FormField>) => void
  onDelete: () => void
  onClose: () => void
  style?: React.CSSProperties
}

export function FormFieldPropertiesPanel({
  field,
  onUpdate,
  onDelete,
  onClose,
  style: styleProp,
}: FormFieldPropertiesPanelProps) {
  const [name, setName] = useState('')
  const [fieldType, setFieldType] = useState<FormField['type']>('text')
  const [required, setRequired] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [defaultValue, setDefaultValue] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [multiline, setMultiline] = useState(false)

  useEffect(() => {
    if (field) {
      setName(field.name)
      setFieldType(field.type)
      setRequired(field.required || false)
      setReadOnly(field.readOnly || false)
      setDefaultValue(field.defaultValue || '')
      setPlaceholder(field.placeholder || '')
      setOptions(field.options || [])
      setMultiline(field.multiline || false)
    }
  }, [field])

  if (!field) return null

  const handleSave = () => {
    onUpdate({
      name,
      type: fieldType,
      required,
      readOnly,
      defaultValue,
      placeholder,
      options: options.length > 0 ? options : undefined,
      multiline,
    })
    onClose()
  }

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  return (
    <div style={{ ...styles.panel, ...styleProp }}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          <i className={getIconForType(field.type)} style={styles.icon} />
          Form Field Properties
        </h3>
        <button onClick={onClose} className="form-field-props-close" style={styles.closeButton}>
          <i className="fas fa-times" />
        </button>
      </div>

      <div style={styles.body}>
          {/* Field Name */}
          <div style={styles.field}>
            <label style={styles.label}>
              <i className="fas fa-tag" style={styles.fieldIcon} />
              Field Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., firstName, email, dateOfBirth"
              style={styles.input}
              required
            />
            <span style={styles.hint}>Unique identifier for this field</span>
          </div>

          {/* Field Type */}
          <div style={styles.field}>
            <label style={styles.label}>
              <i className="fas fa-list" style={styles.fieldIcon} />
              Field Type
            </label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FormField['type'])}
              style={styles.select}
            >
              <option value="text">Text Input</option>
              <option value="checkbox">Checkbox</option>
              <option value="radio">Radio Button</option>
              <option value="dropdown">Dropdown</option>
              <option value="signature">Signature</option>
            </select>
          </div>

          {/* Required & Read-only */}
          <div style={styles.field}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                style={styles.checkbox}
              />
              <i className="fas fa-asterisk" style={styles.fieldIcon} />
              Required Field
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={readOnly}
                onChange={(e) => setReadOnly(e.target.checked)}
                style={styles.checkbox}
              />
              <i className="fas fa-lock" style={styles.fieldIcon} />
              Read Only
            </label>
          </div>

          {/* Text Field Options */}
          {fieldType === 'text' && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>
                  <i className="fas fa-i-cursor" style={styles.fieldIcon} />
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder="e.g., Enter your name"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={multiline}
                    onChange={(e) => setMultiline(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <i className="fas fa-align-left" style={styles.fieldIcon} />
                  Multiline (Textarea)
                </label>
              </div>
            </>
          )}

          {/* Dropdown/Radio Options */}
          {(fieldType === 'dropdown' || fieldType === 'radio') && (
            <div style={styles.field}>
              <label style={styles.label}>
                <i className="fas fa-list-ul" style={styles.fieldIcon} />
                Options
              </label>
              {options.map((option, index) => (
                <div key={index} style={styles.optionRow}>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    style={styles.optionInput}
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="form-field-props-remove"
                    style={styles.removeButton}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              ))}
              <button onClick={handleAddOption} className="form-field-props-add" style={styles.addButton}>
                <i className="fas fa-plus" />
                Add Option
              </button>
            </div>
          )}

          {/* Default Value */}
          <div style={styles.field}>
            <label style={styles.label}>
              <i className="fas fa-pen" style={styles.fieldIcon} />
              Default Value
            </label>
            {fieldType === 'checkbox' ? (
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={defaultValue === 'true'}
                  onChange={(e) => setDefaultValue(e.target.checked ? 'true' : 'false')}
                  style={styles.checkbox}
                />
                Checked by default
              </label>
            ) : fieldType === 'dropdown' || fieldType === 'radio' ? (
              <select
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                style={styles.select}
              >
                <option value="">None</option>
                {options.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="Default value..."
                style={styles.input}
              />
            )}
          </div>

          {/* Metadata */}
          <div style={styles.metadata}>
            <div style={styles.metadataItem}>
              <i className="far fa-file" style={styles.fieldIcon} />
              Page: {field.pageNumber}
            </div>
        </div>
      </div>

      <div style={styles.footer}>
        <button onClick={handleSave} className="form-field-props-save" style={styles.saveButton}>
          <i className="fas fa-check" />
          Save Changes
        </button>
        <button onClick={onDelete} className="form-field-props-delete" style={styles.deleteButton}>
          <i className="fas fa-trash" />
          Delete
        </button>
      </div>
    </div>
  )
}

function getIconForType(type: string): string {
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
  panel: {
    width: '350px',
    flexShrink: 0,
    height: '100%',
    background: '#ffffff',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fafafa',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
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
    color: '#999',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
    transition: 'all 0.2s ease',
  },
  body: {
    padding: '16px',
    overflowY: 'auto',
    flex: 1,
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#333',
  },
  fieldIcon: {
    color: '#0078d4',
    width: '16px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: '#f5f5f5',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    color: '#333',
    fontSize: '14px',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    background: '#f5f5f5',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    color: '#333',
    fontSize: '14px',
    cursor: 'pointer',
  },
  hint: {
    display: 'block',
    marginTop: '4px',
    fontSize: '12px',
    color: '#aaa',
    fontStyle: 'italic',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#333',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  optionRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  optionInput: {
    flex: 1,
    padding: '8px 12px',
    background: '#f5f5f5',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    color: '#333',
    fontSize: '14px',
  },
  removeButton: {
    padding: '8px 12px',
    background: 'transparent',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    color: '#d32f2f',
    cursor: 'pointer',
    fontSize: '14px',
  },
  addButton: {
    padding: '8px 16px',
    background: '#0078d4',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
    transition: 'all 0.2s ease',
  },
  metadata: {
    marginTop: '24px',
    padding: '16px',
    background: '#f5f5f5',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
  },
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#666',
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    gap: '8px',
    background: '#fafafa',
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
    transition: 'all 0.2s ease',
  },
  deleteButton: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    color: '#d32f2f',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
}
