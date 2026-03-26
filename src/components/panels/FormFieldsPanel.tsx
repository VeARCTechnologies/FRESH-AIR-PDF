/**
 * Form Fields Panel
 *
 * Shows list of all form fields in the document with filtering and actions.
 * Light theme.
 */

import { useState } from 'react'
import type { FormField } from '@/types'

// Add hover styles globally
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  .form-fields-action-button:hover {
    background: rgba(0, 120, 212, 0.08) !important;
    border-color: #0078d4 !important;
    color: #0078d4 !important;
  }
  .form-fields-delete-button:hover {
    background: rgba(211, 47, 47, 0.08) !important;
  }
  .form-fields-filter-tab:hover:not(.active) {
    background: #f0f0f0 !important;
  }
  .form-fields-item:hover {
    background: #f5f5f5 !important;
    border-color: #d0d0d0 !important;
  }
`
if (!document.head.querySelector('#form-fields-panel-styles')) {
  styleSheet.id = 'form-fields-panel-styles'
  document.head.appendChild(styleSheet)
}

interface FormFieldsPanelProps {
  fields: FormField[]
  onFieldClick: (field: FormField) => void
  onFieldEdit: (field: FormField) => void
  onFieldDelete: (fieldId: string) => void
  style?: React.CSSProperties
}

export function FormFieldsPanel({
  fields,
  onFieldClick,
  onFieldEdit,
  onFieldDelete,
  style: styleProp,
}: FormFieldsPanelProps) {
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFields = fields.filter((field) => {
    const matchesType = filterType === 'all' || field.type === filterType
    const matchesSearch =
      searchQuery === '' ||
      field.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const fieldsByType = {
    all: fields.length,
    text: fields.filter((f) => f.type === 'text').length,
    checkbox: fields.filter((f) => f.type === 'checkbox').length,
    radio: fields.filter((f) => f.type === 'radio').length,
    dropdown: fields.filter((f) => f.type === 'dropdown').length,
    signature: fields.filter((f) => f.type === 'signature').length,
  }

  return (
    <div style={{ ...styles.panel, ...styleProp }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <i className="fas fa-file-invoice" style={styles.headerIcon} />
          <span>Form Fields</span>
        </div>
        <div style={styles.fieldCount}>{fields.length}</div>
      </div>

      {/* Search */}
      <div style={styles.searchBox}>
        <i className="fas fa-search" style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search fields..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterTabs}>
        <FilterTab
          label="All"
          count={fieldsByType.all}
          active={filterType === 'all'}
          onClick={() => setFilterType('all')}
        />
        <FilterTab
          label="Text"
          icon="fas fa-font"
          count={fieldsByType.text}
          active={filterType === 'text'}
          onClick={() => setFilterType('text')}
        />
        <FilterTab
          label="Check"
          icon="far fa-check-square"
          count={fieldsByType.checkbox}
          active={filterType === 'checkbox'}
          onClick={() => setFilterType('checkbox')}
        />
        <FilterTab
          label="Radio"
          icon="far fa-dot-circle"
          count={fieldsByType.radio}
          active={filterType === 'radio'}
          onClick={() => setFilterType('radio')}
        />
        <FilterTab
          label="Select"
          icon="fas fa-caret-square-down"
          count={fieldsByType.dropdown}
          active={filterType === 'dropdown'}
          onClick={() => setFilterType('dropdown')}
        />
        <FilterTab
          label="Sign"
          icon="fas fa-signature"
          count={fieldsByType.signature}
          active={filterType === 'signature'}
          onClick={() => setFilterType('signature')}
        />
      </div>

      {/* Field List */}
      <div style={styles.fieldList}>
        {filteredFields.length === 0 ? (
          <div style={styles.emptyState}>
            <i className="fas fa-inbox" style={styles.emptyIcon} />
            <p style={styles.emptyText}>
              {searchQuery ? 'No fields match your search' : 'No form fields yet'}
            </p>
            <p style={styles.emptyHint}>
              Select a form field tool and draw on the PDF to add fields
            </p>
          </div>
        ) : (
          filteredFields.map((field) => (
            <FieldListItem
              key={field.id}
              field={field}
              onClick={() => onFieldClick(field)}
              onEdit={() => onFieldEdit(field)}
              onDelete={() => onFieldDelete(field.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function FilterTab({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string
  icon?: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`form-fields-filter-tab ${active ? 'active' : ''}`}
      style={{
        ...styles.filterTab,
        ...(active ? styles.filterTabActive : {}),
      }}
      title={label}
    >
      {icon && <i className={icon} style={styles.filterTabIcon} />}
      {!icon && <span style={styles.filterTabLabel}>{label}</span>}
      {count > 0 && <span style={styles.filterTabCount}>{count}</span>}
    </button>
  )
}

function FieldListItem({
  field,
  onClick,
  onEdit,
  onDelete,
}: {
  field: FormField
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="form-fields-item" style={styles.fieldItem} onClick={onClick}>
      <div style={styles.fieldItemHeader}>
        <div style={styles.fieldItemTitle}>
          <i className={getIconForFieldType(field.type)} style={styles.fieldItemIcon} />
          <span style={styles.fieldItemName}>{field.name}</span>
        </div>
        <div style={styles.fieldItemActions}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="form-fields-action-button"
            style={styles.actionButton}
            title="Edit properties"
          >
            <i className="fas fa-edit" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="form-fields-delete-button"
            style={styles.actionButtonDelete}
            title="Delete field"
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      </div>
      <div style={styles.fieldItemMeta}>
        <span style={styles.fieldItemMetaItem}>
          <i className="far fa-file" />
          Page {field.pageNumber}
        </span>
        {field.required && (
          <span style={styles.fieldItemMetaRequired}>
            <i className="fas fa-asterisk" />
            Required
          </span>
        )}
        {field.readOnly && (
          <span style={styles.fieldItemMetaReadOnly}>
            <i className="fas fa-lock" />
            Read-only
          </span>
        )}
      </div>
    </div>
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
  panel: {
    width: '300px',
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
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
  },
  headerIcon: {
    color: '#0078d4',
    fontSize: '16px',
  },
  fieldCount: {
    padding: '2px 8px',
    background: '#0078d4',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '10px',
  },
  searchBox: {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  searchIcon: {
    color: '#aaa',
    fontSize: '14px',
  },
  searchInput: {
    flex: 1,
    padding: '6px 8px',
    background: '#f5f5f5',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    color: '#333',
    fontSize: '13px',
    outline: 'none',
  },
  filterTabs: {
    display: 'flex',
    padding: '8px',
    gap: '4px',
    borderBottom: '1px solid #e0e0e0',
    overflowX: 'auto',
  },
  filterTab: {
    padding: '6px 10px',
    background: 'transparent',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    color: '#666',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  filterTabActive: {
    background: '#0078d4',
    borderColor: '#0078d4',
    color: '#ffffff',
  },
  filterTabIcon: {
    fontSize: '12px',
  },
  filterTabLabel: {
    fontWeight: 500,
  },
  filterTabCount: {
    fontSize: '10px',
    opacity: 0.8,
  },
  fieldList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    color: '#aaa',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.4,
  },
  emptyText: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#888',
  },
  emptyHint: {
    margin: 0,
    fontSize: '12px',
    color: '#aaa',
  },
  fieldItem: {
    padding: '12px',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  fieldItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  fieldItemTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  fieldItemIcon: {
    color: '#0078d4',
    fontSize: '14px',
  },
  fieldItemName: {
    color: '#333',
    fontSize: '13px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fieldItemActions: {
    display: 'flex',
    gap: '4px',
  },
  actionButton: {
    padding: '4px 8px',
    background: 'transparent',
    border: '1px solid #d0d0d0',
    borderRadius: '3px',
    color: '#0078d4',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  actionButtonDelete: {
    padding: '4px 8px',
    background: 'transparent',
    border: '1px solid #f5c6cb',
    borderRadius: '3px',
    color: '#d32f2f',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  fieldItemMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: '#999',
  },
  fieldItemMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  fieldItemMetaRequired: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#e68a00',
  },
  fieldItemMetaReadOnly: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#999',
  },
}
