/**
 * TemplateFieldPropertiesPanel Component
 *
 * Right panel for editing a selected template field's properties:
 * system field mapping, position, typography, options.
 */

import { useState, useEffect, useMemo } from 'react'
import type { TemplateField, SystemField, SystemFieldCategory } from '@/types'
import { TEMPLATE_FIELD_COLORS } from '@/types'

interface TemplateFieldPropertiesPanelProps {
  field: TemplateField | null
  allFields?: TemplateField[]
  systemFieldCategories?: SystemFieldCategory[]
  allowCustomFields?: boolean
  onUpdate: (id: string, updates: Partial<TemplateField>) => void
  onDelete: (id: string) => void
  onFieldSelect?: (id: string | null) => void
  onGoToPage?: (page: number) => void
  onClose?: () => void
}

export function TemplateFieldPropertiesPanel({
  field,
  allFields = [],
  systemFieldCategories = [],
  allowCustomFields = false,
  onUpdate,
  onDelete,
  onFieldSelect,
  onGoToPage,
}: TemplateFieldPropertiesPanelProps) {
  const [mappingSearch, setMappingSearch] = useState('')
  const [showMappingDropdown, setShowMappingDropdown] = useState(false)

  const hasSystemFields = systemFieldCategories.length > 0 &&
    systemFieldCategories.some(cat => cat.fields.length > 0)
  const requireMapping = hasSystemFields && !allowCustomFields
  const [newDropdownOption, setNewDropdownOption] = useState('')
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null)
  const [editingOptionValue, setEditingOptionValue] = useState('')

  // Reset search when field changes
  useEffect(() => {
    setMappingSearch('')
    setShowMappingDropdown(false)
    setNewDropdownOption('')
    setEditingOptionIndex(null)
    setEditingOptionValue('')
  }, [field?.id])

  const allSystemFields = useMemo(() => {
    return systemFieldCategories.flatMap(cat => cat.fields)
  }, [systemFieldCategories])

  const mappedSystemField = useMemo(() => {
    if (!field?.systemFieldId) return null
    return allSystemFields.find(sf => (sf.id || sf.name) === field.systemFieldId) || null
  }, [field?.systemFieldId, allSystemFields])

  const filteredSystemFields = useMemo(() => {
    if (!mappingSearch) return systemFieldCategories
    const q = mappingSearch.toLowerCase()
    return systemFieldCategories.map(cat => ({
      ...cat,
      fields: cat.fields.filter(f => f.name.toLowerCase().includes(q)),
    })).filter(cat => cat.fields.length > 0)
  }, [mappingSearch, systemFieldCategories])

  if (!field) {
    return (
      <div style={styles.panel}>
        <div style={styles.listHeader}>
          <span style={styles.listHeaderTitle}>All Fields</span>
          <span style={styles.listHeaderCount}>{allFields.length}</span>
        </div>
        {allFields.length === 0 ? (
          <div style={styles.emptyState}>
            <i className="far fa-hand-pointer" style={{ fontSize: 40, color: '#ccc', marginBottom: 12 }} />
            <p style={styles.emptyText}>Drag fields from the left sidebar onto the canvas</p>
          </div>
        ) : (
          <div style={styles.fieldList}>
            {allFields.map(f => {
              const fColor = TEMPLATE_FIELD_COLORS[f.fieldType]
              const unmapped = requireMapping && !f.systemFieldId
              return (
                <button
                  key={f.id}
                  style={styles.fieldListItem}
                  onClick={() => {
                    onGoToPage?.(f.pageNumber)
                    onFieldSelect?.(f.id)
                  }}
                >
                  <div style={{ ...styles.fieldListDot, background: unmapped ? '#E53935' : fColor }} />
                  <div style={styles.fieldListInfo}>
                    <span style={styles.fieldListName}>{f.systemFieldName || f.name}</span>
                    <span style={styles.fieldListMeta}>
                      {f.fieldType} · Page {f.pageNumber}
                      {f.requiredAtGeneration && <span style={{ color: '#E53935' }}> · required</span>}
                    </span>
                  </div>
                  {unmapped && (
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: 10, color: '#E53935', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const fieldColor = TEMPLATE_FIELD_COLORS[field.fieldType]
  const isUnmapped = requireMapping && !field.systemFieldId

  const handleMapField = (sf: SystemField) => {
    onUpdate(field.id, {
      systemFieldId: sf.id || sf.name,
      systemFieldName: sf.name,
      fieldType: sf.fieldType,
    })
    setShowMappingDropdown(false)
    setMappingSearch('')
  }

  const handleClearMapping = () => {
    onUpdate(field.id, {
      systemFieldId: undefined,
      systemFieldName: undefined,
    })
  }

  const handleBoundsChange = (key: 'x' | 'y' | 'width' | 'height', value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    onUpdate(field.id, {
      bounds: { ...field.bounds, [key]: num },
    })
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {allFields.length > 0 && (
            <button
              style={styles.backButton}
              onClick={() => onFieldSelect?.(null)}
              title="Back to field list"
            >
              <i className="fas fa-chevron-left" style={{ fontSize: 10 }} />
            </button>
          )}
          <span style={{ ...styles.typeBadge, background: fieldColor }}>
            {field.fieldType.toUpperCase()}
          </span>
          <span style={styles.headerTitle}>Properties</span>
        </div>
      </div>

      <div style={styles.body}>
        {/* Field Name — shown when allowCustomFields is on or no system fields */}
        {(allowCustomFields || !hasSystemFields) && (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>FIELD NAME</label>
              <input
                type="text"
                value={field.name}
                onChange={(e) => onUpdate(field.id, { name: e.target.value })}
                placeholder="Enter field name"
                style={styles.fieldNameInput}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>FIELD DESCRIPTION</label>
              <input
                type="text"
                value={field.description || ''}
                onChange={(e) => onUpdate(field.id, { description: e.target.value })}
                placeholder="Enter field description"
                style={styles.fieldNameInput}
              />
            </div>
          </>
        )}

        {/* System Field Mapping — shown when system fields exist */}
        {hasSystemFields && (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                SYSTEM FIELD MAPPING
                {isUnmapped && !allowCustomFields && <span style={styles.requiredStar}> *</span>}
              </label>
              <div style={{ position: 'relative' }}>
                {field.systemFieldId ? (
                  <div style={styles.mappedFieldDisplay}>
                    <span style={styles.mappedFieldName}>{field.systemFieldName}</span>
                    <button
                      style={styles.clearMappingButton}
                      onClick={handleClearMapping}
                      title="Clear mapping"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.mappingInput,
                      borderColor: isUnmapped && !allowCustomFields ? '#E53935' : '#e0e0e0',
                    }}
                    onClick={() => setShowMappingDropdown(true)}
                  >
                    <input
                      type="text"
                      placeholder={allowCustomFields ? 'Optionally map to a system field' : 'Map to a system field'}
                      value={mappingSearch}
                      onChange={(e) => {
                        setMappingSearch(e.target.value)
                        setShowMappingDropdown(true)
                      }}
                      onFocus={() => setShowMappingDropdown(true)}
                      style={styles.mappingInputInner}
                    />
                    <i className="fas fa-chevron-down" style={{ fontSize: 10, color: '#999' }} />
                  </div>
                )}

                {showMappingDropdown && !field.systemFieldId && (
                  <>
                    <div style={styles.dropdownBackdrop} onClick={() => setShowMappingDropdown(false)} />
                    <div style={styles.mappingDropdown}>
                      {filteredSystemFields.length === 0 ? (
                        <div style={styles.dropdownEmpty}>No matching fields</div>
                      ) : (
                        filteredSystemFields.map(cat => (
                          <div key={cat.id || cat.name}>
                            <div style={styles.dropdownCategoryHeader}>{cat.name}</div>
                            {cat.fields.map(sf => (
                              <button
                                key={sf.id || sf.name}
                                style={styles.dropdownItem}
                                onClick={() => handleMapField(sf)}
                              >
                                <span>{sf.name}</span>
                                <span style={styles.dropdownItemType}>{sf.fieldType}</span>
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {isUnmapped && !allowCustomFields && (
                <div style={styles.mappingError}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }} />
                  Required — map this field to save the template
                </div>
              )}
            </div>

            {/* Field Description */}
            {mappedSystemField?.description && (
              <div style={styles.descriptionBox}>
                <div style={styles.descriptionLabel}>FIELD DESCRIPTION</div>
                <div style={styles.descriptionText}>{mappedSystemField.description}</div>
              </div>
            )}
          </>
        )}

        {/* Position */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>POSITION</label>
          <div style={styles.positionGrid}>
            <PositionInput label="X" value={field.bounds.x} onChange={(v) => handleBoundsChange('x', v)} />
            <PositionInput label="Y" value={field.bounds.y} onChange={(v) => handleBoundsChange('y', v)} />
            <PositionInput label="W" value={field.bounds.width} onChange={(v) => handleBoundsChange('width', v)} />
            <PositionInput label="H" value={field.bounds.height} onChange={(v) => handleBoundsChange('height', v)} />
          </div>
        </div>

        {/* Default Value */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>DEFAULT VALUE</label>
          {field.fieldType === 'checkbox' ? (
            <ToggleOption
              label="Checked by default"
              checked={field.defaultValue === 'true'}
              onChange={(v) => onUpdate(field.id, { defaultValue: v ? 'true' : '' })}
            />
          ) : field.fieldType === 'date' ? (
            <input
              type="date"
              value={field.defaultValue || ''}
              onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value })}
              style={styles.fieldNameInput}
            />
          ) : field.fieldType === 'number' ? (
            <input
              type="number"
              value={field.defaultValue || ''}
              onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value })}
              placeholder="Enter default number"
              style={styles.fieldNameInput}
            />
          ) : field.fieldType === 'signature' ? (
            <span style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
              Not applicable for signature fields
            </span>
          ) : (
            <input
              type="text"
              value={field.defaultValue || ''}
              onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value })}
              placeholder="Enter default value"
              style={styles.fieldNameInput}
            />
          )}
        </div>

        {/* Dropdown Options Manager */}
        {field.fieldType === 'dropdown' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>DROPDOWN OPTIONS</label>
            <div style={styles.dropdownOptionsAddRow}>
              <input
                type="text"
                value={newDropdownOption}
                onChange={(e) => setNewDropdownOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newDropdownOption.trim()) {
                    onUpdate(field.id, { options: [...(field.options || []), newDropdownOption.trim()] })
                    setNewDropdownOption('')
                  }
                }}
                placeholder="Add an option"
                style={{ ...styles.fieldNameInput, flex: 1 }}
              />
              <button
                style={styles.addOptionButton}
                onClick={() => {
                  if (newDropdownOption.trim()) {
                    onUpdate(field.id, { options: [...(field.options || []), newDropdownOption.trim()] })
                    setNewDropdownOption('')
                  }
                }}
              >
                +
              </button>
            </div>
            {(field.options || []).map((opt, idx) => (
              <div key={idx} style={styles.optionItemRow}>
                {editingOptionIndex === idx ? (
                  <input
                    type="text"
                    value={editingOptionValue}
                    onChange={(e) => setEditingOptionValue(e.target.value)}
                    onBlur={() => {
                      if (editingOptionValue.trim()) {
                        const updated = [...(field.options || [])]
                        updated[idx] = editingOptionValue.trim()
                        onUpdate(field.id, { options: updated })
                      }
                      setEditingOptionIndex(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingOptionValue.trim()) {
                          const updated = [...(field.options || [])]
                          updated[idx] = editingOptionValue.trim()
                          onUpdate(field.id, { options: updated })
                        }
                        setEditingOptionIndex(null)
                      }
                    }}
                    autoFocus
                    style={{ ...styles.fieldNameInput, flex: 1 }}
                  />
                ) : (
                  <span
                    style={styles.optionItemText}
                    onClick={() => {
                      setEditingOptionIndex(idx)
                      setEditingOptionValue(opt)
                    }}
                  >
                    {opt}
                  </span>
                )}
                <button
                  style={styles.removeOptionButton}
                  onClick={() => {
                    const updated = (field.options || []).filter((_, i) => i !== idx)
                    onUpdate(field.id, { options: updated })
                    if (editingOptionIndex === idx) setEditingOptionIndex(null)
                  }}
                  title="Remove option"
                >
                  <i className="fas fa-trash-alt" style={{ fontSize: 11 }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Date Format Selector */}
        {field.fieldType === 'date' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>DATE FORMAT</label>
            <select
              value={field.dateFormat || 'DD/MM/YYYY'}
              onChange={(e) => onUpdate(field.id, { dateFormat: e.target.value as 'DD/MM/YYYY' | 'MM-DD-YYYY' | 'Month D YYYY' | 'YYYY-MM-DD' })}
              style={styles.select}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM-DD-YYYY">MM-DD-YYYY</option>
              <option value="Month D YYYY">Month D YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        )}

        {/* Checkbox Style */}
        {field.fieldType === 'checkbox' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>CHECKBOX STYLE</label>
            <div>
              <label style={styles.subLabel}>Tick Style</label>
              <div style={styles.tickStyleRow}>
                {([['check', '\u2713'], ['cross', '\u2717'], ['filled', '\u25A0']] as const).map(([value, symbol]) => (
                  <button
                    key={value}
                    style={{
                      ...styles.tickStyleButton,
                      borderColor: (field.tickStyle || 'check') === value ? '#1E88E5' : '#e0e0e0',
                    }}
                    onClick={() => onUpdate(field.id, { tickStyle: value })}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={styles.subLabel}>Box Size</label>
              <div style={styles.boxSizeRow}>
                <input
                  type="number"
                  value={field.boxSize || 24}
                  onChange={(e) => {
                    const num = parseInt(e.target.value)
                    if (!isNaN(num)) onUpdate(field.id, { boxSize: num })
                  }}
                  style={{ ...styles.fieldNameInput, flex: 1 }}
                />
                <span style={styles.pxSuffix}>px</span>
              </div>
            </div>
          </div>
        )}

        {/* Signature Style */}
        {field.fieldType === 'signature' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>SIGNATURE STYLE</label>
            <div>
              <label style={styles.subLabel}>Border Style</label>
              <select
                value={field.signatureBorderStyle || 'dashed'}
                onChange={(e) => onUpdate(field.id, { signatureBorderStyle: e.target.value as 'solid' | 'dashed' | 'none' })}
                style={styles.select}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label style={styles.subLabel}>Label Text</label>
              <input
                type="text"
                value={field.signatureLabel || ''}
                onChange={(e) => onUpdate(field.id, { signatureLabel: e.target.value })}
                placeholder="Enter label text"
                style={styles.fieldNameInput}
              />
            </div>
          </div>
        )}

        {/* Typography */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>TYPOGRAPHY</label>
          <div>
            <label style={styles.subLabel}>Font Size</label>
            <select
              value={field.fontSize || 12}
              onChange={(e) => onUpdate(field.id, { fontSize: parseInt(e.target.value) })}
              style={styles.select}
            >
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map(size => (
                <option key={size} value={size}>{size} pt</option>
              ))}
            </select>
          </div>
        </div>

        {/* Options */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>OPTIONS</label>
          <div style={styles.optionsList}>
            <ToggleOption
              label="Required at generation"
              checked={field.requiredAtGeneration || false}
              onChange={(v) => onUpdate(field.id, { requiredAtGeneration: v })}
            />
            {(field.fieldType === 'text' || field.fieldType === 'number' || field.fieldType === 'dropdown') && (
              <ToggleOption
                label="Border Visible"
                checked={field.borderVisible !== false}
                onChange={(v) => onUpdate(field.id, { borderVisible: v })}
              />
            )}
            {field.fieldType === 'text' && (
              <ToggleOption
                label="Multi-line"
                checked={field.multiline || false}
                onChange={(v) => onUpdate(field.id, { multiline: v })}
              />
            )}
          </div>
        </div>

        {/* Remove Field */}
        <button
          style={styles.removeButton}
          onClick={() => onDelete(field.id)}
        >
          <i className="fas fa-trash-alt" style={{ marginRight: 6 }} />
          Remove Field
        </button>
      </div>
    </div>
  )
}

function PositionInput({ label, value, onChange }: {
  label: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <div style={styles.positionInputContainer}>
      <span style={styles.positionLabel}>{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(e.target.value)}
        style={styles.positionInput}
      />
    </div>
  )
}

function ToggleOption({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label style={styles.toggleRow}>
      <div
        style={{
          ...styles.toggle,
          background: checked ? '#43A047' : '#ccc',
        }}
        onClick={() => onChange(!checked)}
      >
        <div style={{
          ...styles.toggleThumb,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }} />
      </div>
      <span style={styles.toggleLabel}>{label}</span>
    </label>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 280,
    minWidth: 280,
    height: '100%',
    background: '#ffffff',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 32,
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    margin: 0,
    lineHeight: 1.5,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    whiteSpace: 'nowrap' as const,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  body: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#666',
    letterSpacing: 0.5,
  },
  requiredStar: {
    color: '#E53935',
  },
  subLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    display: 'block',
  },
  mappedFieldDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
  },
  mappedFieldName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#333',
  },
  clearMappingButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#999',
    fontSize: 11,
    cursor: 'pointer',
  },
  mappingInput: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    background: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    cursor: 'pointer',
  },
  mappingInputInner: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    background: 'transparent',
    fontSize: 13,
    color: '#333',
    outline: 'none',
  },
  mappingError: {
    fontSize: 11,
    color: '#E53935',
    fontWeight: 500,
    marginTop: 2,
  },
  dropdownBackdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  mappingDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 100,
    maxHeight: 240,
    overflowY: 'auto' as const,
  },
  dropdownCategoryHeader: {
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 700,
    color: '#999',
    background: '#fafafa',
    borderBottom: '1px solid #f0f0f0',
    letterSpacing: 0.3,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f5f5f5',
    cursor: 'pointer',
    fontSize: 13,
    color: '#333',
    textAlign: 'left' as const,
  },
  dropdownItemType: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  dropdownEmpty: {
    padding: '12px 10px',
    fontSize: 13,
    color: '#999',
    textAlign: 'center' as const,
  },
  descriptionBox: {
    padding: 10,
    background: '#E8F5E9',
    border: '1px solid #C8E6C9',
    borderRadius: 6,
  },
  descriptionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#2E7D32',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 1.4,
  },
  positionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  positionInputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    background: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
  },
  positionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#999',
    width: 14,
    flexShrink: 0,
  },
  positionInput: {
    flex: 1,
    width: '100%',
    padding: '4px 0',
    border: 'none',
    background: 'transparent',
    fontSize: 13,
    color: '#333',
    outline: 'none',
    textAlign: 'right' as const,
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    background: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    fontSize: 13,
    color: '#333',
    outline: 'none',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    flexShrink: 0,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s ease',
  },
  toggleLabel: {
    fontSize: 13,
    color: '#333',
  },
  fieldNameInput: {
    width: '100%',
    padding: '8px 10px',
    background: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    fontSize: 13,
    color: '#333',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  dropdownOptionsAddRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  addOptionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    background: '#1E88E5',
    border: 'none',
    borderRadius: 4,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  optionItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    background: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
  },
  optionItemText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    cursor: 'pointer',
  },
  removeOptionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    background: 'transparent',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    flexShrink: 0,
  },
  tickStyleRow: {
    display: 'flex',
    gap: 8,
  },
  tickStyleButton: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fafafa',
    border: '2px solid #e0e0e0',
    borderRadius: 4,
    fontSize: 18,
    cursor: 'pointer',
    color: '#333',
  },
  boxSizeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  pxSuffix: {
    fontSize: 13,
    color: '#666',
    flexShrink: 0,
  },
  removeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid #E53935',
    borderRadius: 6,
    color: '#E53935',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: 'auto',
    transition: 'background 0.15s ease',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    background: 'transparent',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    color: '#666',
    cursor: 'pointer',
    flexShrink: 0,
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  listHeaderCount: {
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    background: '#1976D2',
    borderRadius: 10,
    padding: '1px 8px',
    minWidth: 20,
    textAlign: 'center' as const,
  },
  fieldList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '4px 0',
  },
  fieldListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f5f5f5',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 0.1s ease',
  },
  fieldListDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  fieldListInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    minWidth: 0,
  },
  fieldListName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  fieldListMeta: {
    fontSize: 11,
    color: '#999',
  },
}
