/**
 * TemplateSidebar Component
 *
 * Left sidebar with Field Types grid and (optionally) a searchable Overlay Fields list.
 * When systemFieldCategories are provided, shows the categorized list.
 * When not provided, shows only the field type buttons for custom field creation.
 */

import { useState } from 'react'
import type { SystemFieldCategory, TemplateField } from '@/types'
import { FieldTypeButton } from './FieldTypeButton'
import { SystemFieldItem } from './SystemFieldItem'

interface TemplateSidebarProps {
  systemFieldCategories?: SystemFieldCategory[]
  placedFields: TemplateField[]
  disabled?: boolean
}

export function TemplateSidebar({
  systemFieldCategories = [],
  placedFields,
  disabled = false,
}: TemplateSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const catKey = (cat: { id?: string; name: string }) => cat.id || cat.name

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const set = new Set<string>()
    if (systemFieldCategories.length > 0) {
      set.add(catKey(systemFieldCategories[0]))
    }
    return set
  })

  const placedFieldIds = new Set(placedFields.map(f => f.systemFieldId).filter(Boolean))

  const hasSystemFields = systemFieldCategories.length > 0 &&
    systemFieldCategories.some(cat => cat.fields.length > 0)

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredCategories = systemFieldCategories.map(cat => ({
    ...cat,
    fields: cat.fields.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat => cat.fields.length > 0 || !searchQuery)

  return (
    <div style={styles.sidebar}>
      {/* Field Types Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>FIELD TYPES</div>
        <div style={styles.sectionSubtext}>Drag a field type onto the canvas</div>
        <div style={styles.fieldTypeGrid}>
          <FieldTypeButton fieldType="text" label="Text" icon="fas fa-font" disabled={disabled} />
          <FieldTypeButton fieldType="date" label="Date" icon="fas fa-calendar-alt" disabled={disabled} />
          <FieldTypeButton fieldType="number" label="Number" icon="fas fa-hashtag" disabled={disabled} />
          <FieldTypeButton fieldType="checkbox" label="Checkbox" icon="fas fa-check-square" disabled={disabled} />
          <FieldTypeButton fieldType="signature" label="Signature" icon="fas fa-signature" disabled={disabled} />
          <FieldTypeButton fieldType="dropdown" label="Dropdown" icon="fas fa-list" disabled={disabled} />
        </div>
      </div>

      {/* Overlay Fields Section — only when system fields are provided */}
      {hasSystemFields && (
        <>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>OVERLAY FIELDS</div>
            <div style={styles.sectionSubtext}>Drag a mapped field onto the canvas</div>

            <div style={styles.searchContainer}>
              <i className="fas fa-search" style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search all fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          {/* Categories */}
          <div style={styles.categoriesList}>
            {filteredCategories.map(category => {
              const key = catKey(category)
              const isExpanded = expandedCategories.has(key)
              const fieldCount = category.fields.length

              return (
                <div key={key}>
                  <button
                    style={styles.categoryHeader}
                    onClick={() => toggleCategory(key)}
                  >
                    <div style={styles.categoryLeft}>
                      {category.icon && (
                        <i className={category.icon} style={styles.categoryIcon} />
                      )}
                      <span style={styles.categoryName}>{category.name}</span>
                      <span style={styles.categoryCount}>{fieldCount}</span>
                    </div>
                    <i
                      className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}
                      style={styles.categoryChevron}
                    />
                  </button>
                  {isExpanded && (
                    <div style={styles.categoryFields}>
                      {category.fields.map(field => {
                        const fieldKey = field.id || field.name
                        return (
                          <SystemFieldItem
                            key={fieldKey}
                            field={field}
                            isPlaced={placedFieldIds.has(fieldKey)}
                            disabled={disabled}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Custom fields hint — when no system fields provided */}
      {!hasSystemFields && (
        <div style={styles.customFieldsHint}>
          <i className="fas fa-info-circle" style={{ fontSize: 14, color: '#1976D2', marginBottom: 6 }} />
          <p style={styles.hintText}>
            Drag a field type onto the canvas to create a custom field. You can set the field name in the properties panel.
          </p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    minWidth: 220,
    height: '100%',
    background: '#ffffff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  section: {
    padding: '12px 12px 0',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: '#666',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionSubtext: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  fieldTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 36px)',
    gap: 6,
    marginBottom: 4,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  searchIcon: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 11,
    color: '#999',
  },
  searchInput: {
    width: '100%',
    padding: '6px 8px 6px 28px',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    fontSize: 12,
    color: '#333',
    background: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  categoriesList: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    fontSize: 13,
    textAlign: 'left' as const,
  },
  categoryLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  categoryIcon: {
    fontSize: 12,
    color: '#888',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
  },
  categoryCount: {
    fontSize: 11,
    color: '#999',
    background: '#f0f0f0',
    padding: '1px 6px',
    borderRadius: 8,
  },
  categoryChevron: {
    fontSize: 10,
    color: '#999',
  },
  categoryFields: {
    background: '#fafafa',
  },
  customFieldsHint: {
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  hintText: {
    margin: 0,
    fontSize: 12,
    color: '#888',
    lineHeight: 1.5,
  },
}
