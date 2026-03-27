/**
 * TemplateTopBar Component
 *
 * Top toolbar for the template editor with breadcrumb, field count,
 * save/discard actions, zoom controls, and cursor/pan toggle.
 */

import { useState, useRef } from 'react'

interface TemplateTopBarProps {
  templateName: string
  fieldCount: number
  unmappedFieldCount: number
  zoom: number
  isDirty: boolean
  readOnly?: boolean
  isFullscreen?: boolean
  onSave?: () => void
  onDownload?: () => void
  hasDocument?: boolean
  onDiscard?: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomSet: (zoom: number) => void
  onToggleFullscreen?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onUploadPdf?: (file: File) => void
}

export function TemplateTopBar({
  templateName,
  fieldCount,
  unmappedFieldCount: _unmappedFieldCount,
  zoom,
  isDirty,
  readOnly = false,
  isFullscreen = false,
  onSave: _onSave,
  onDownload,
  hasDocument = false,
  onDiscard,
  onZoomIn,
  onZoomOut,
  onZoomSet,
  onToggleFullscreen,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onUploadPdf,
}: TemplateTopBarProps) {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const zoomPresets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

  return (
    <div style={styles.container}>
      {/* Left: Breadcrumb + field count */}
      <div style={styles.leftSection}>
        <span style={styles.breadcrumbName}>{templateName}</span>

        <span style={styles.fieldCountBadge}>
          {fieldCount} {fieldCount === 1 ? 'FIELD' : 'FIELDS'}
        </span>

        {onUploadPdf && (
          <>
            <button
              style={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
              title="Upload or replace PDF"
            >
              <i className="fas fa-file-upload" style={{ marginRight: 5 }} />
              Upload PDF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUploadPdf(file)
                e.target.value = ''
              }}
            />
          </>
        )}
      </div>

      {/* Center: Actions */}
      <div style={styles.centerSection}>
        {!readOnly && (
          <>
            <button
              style={styles.discardButton}
              onClick={onDiscard}
              disabled={!isDirty}
              title="Discard Changes"
            >
              Discard Changes
            </button>
            <button
              style={{
                ...styles.downloadButton,
                ...(!hasDocument ? styles.downloadButtonDisabled : {}),
              }}
              onClick={onDownload}
              disabled={!hasDocument}
              title={hasDocument ? 'Download preview PDF with fields' : 'Upload a PDF first'}
            >
              <i className="fas fa-download" style={{ marginRight: 6 }} />
              Download Template
            </button>
          </>
        )}
      </div>

      {/* Right: Undo/Redo + Zoom + Fullscreen + Mode */}
      <div style={styles.rightSection}>
        {!readOnly && (
          <>
            <button
              style={{ ...styles.iconButton, opacity: canUndo ? 1 : 0.35 }}
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <i className="fas fa-undo" />
            </button>
            <button
              style={{ ...styles.iconButton, opacity: canRedo ? 1 : 0.35 }}
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <i className="fas fa-redo" />
            </button>
            <div style={styles.divider} />
          </>
        )}

        <button style={styles.iconButton} onClick={onZoomOut} title="Zoom Out">
          <i className="fas fa-minus" />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            style={styles.zoomLabel}
            onClick={() => setShowZoomDropdown(!showZoomDropdown)}
            title="Zoom level"
          >
            {Math.round(zoom * 100)}%
          </button>
          {showZoomDropdown && (
            <>
              <div
                style={styles.dropdownBackdrop}
                onClick={() => setShowZoomDropdown(false)}
              />
              <div style={styles.zoomDropdown}>
                {zoomPresets.map(preset => (
                  <button
                    key={preset}
                    style={{
                      ...styles.zoomDropdownItem,
                      ...(Math.abs(zoom - preset) < 0.01 ? styles.zoomDropdownItemActive : {}),
                    }}
                    onClick={() => {
                      onZoomSet(preset)
                      setShowZoomDropdown(false)
                    }}
                  >
                    {Math.round(preset * 100)}%
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button style={styles.iconButton} onClick={onZoomIn} title="Zoom In">
          <i className="fas fa-plus" />
        </button>

        <button
          style={{ ...styles.iconButton, fontSize: 11 }}
          onClick={() => onZoomSet(1.0)}
          title="Fit to page (100%)"
        >
          <i className="fas fa-expand-arrows-alt" />
        </button>

        <div style={styles.divider} />

        <button
          style={styles.iconButton}
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
        >
          <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`} />
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    padding: '0 16px',
    background: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
    gap: 12,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  breadcrumbName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fieldCountBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 10px',
    background: '#43A047',
    color: '#ffffff',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    letterSpacing: 0.5,
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid #d0d0d0',
    borderRadius: 4,
    color: '#555',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    marginLeft: 4,
  },
  centerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  discardButton: {
    padding: '6px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#666',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  saveButton: {
    padding: '6px 16px',
    background: '#43A047',
    border: 'none',
    borderRadius: 4,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s ease',
  },
  saveButtonDisabled: {
    background: '#a5d6a7',
    cursor: 'not-allowed',
  },
  downloadButton: {
    padding: '6px 16px',
    background: '#1976D2',
    border: 'none',
    borderRadius: 4,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s ease',
  },
  downloadButtonDisabled: {
    background: '#90caf9',
    cursor: 'not-allowed',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#555',
    fontSize: 13,
    cursor: 'pointer',
  },
  zoomLabel: {
    padding: '4px 8px',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#333',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    minWidth: 50,
    textAlign: 'center' as const,
  },
  divider: {
    width: 1,
    height: 20,
    background: '#e0e0e0',
    margin: '0 4px',
  },
  dropdownBackdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  zoomDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: 4,
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 100,
    minWidth: 80,
    padding: 4,
  },
  zoomDropdownItem: {
    display: 'block',
    width: '100%',
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#333',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  zoomDropdownItemActive: {
    background: '#e3f2fd',
    color: '#1565C0',
    fontWeight: 600,
  },
}
