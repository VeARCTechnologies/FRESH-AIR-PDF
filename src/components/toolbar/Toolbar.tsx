/**
 * Toolbar Component
 *
 * Clean, modern light toolbar with grouped sections, responsive wrapping,
 * and container-aware breakpoints.
 */

import { useRef, useState, type RefObject } from 'react'
import type { ToolMode } from '@/types'
import { useResponsive } from '@/hooks/useResponsive'

interface ToolbarProps {
  currentPage: number
  totalPages: number
  zoom: number
  tool: ToolMode
  containerRef?: RefObject<HTMLElement | null>
  onPageChange: (page: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: (mode: string) => void
  onToolChange: (tool: ToolMode) => void
  onToggleThumbnails?: () => void
  onToggleSidebar?: () => void
  onToggleFieldsPanel?: () => void
  onSearch?: () => void
  onOpenFile?: () => void
  onSave?: () => void
  onPrint?: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export function Toolbar({
  currentPage,
  totalPages,
  zoom,
  tool,
  containerRef,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onToolChange,
  onToggleThumbnails,
  onToggleSidebar,
  onToggleFieldsPanel,
  onSearch,
  onOpenFile,
  onSave,
  onPrint,
  isFullscreen,
  onToggleFullscreen,
}: ToolbarProps) {
  const { isMobile, width } = useResponsive(containerRef)
  const isCompact = width < 500

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  const btnSize = isCompact ? 28 : isMobile ? 30 : 34
  const btnHeight = isCompact ? 26 : isMobile ? 28 : 30
  const iconSize = isCompact ? '12px' : '13px'

  const ToolButton = ({
    active,
    onClick,
    title,
    icon,
    disabled,
  }: {
    active?: boolean
    onClick: () => void
    title: string
    icon: string
    disabled?: boolean
  }) => {
    const [hovered, setHovered] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)
    const btnRef = useRef<HTMLButtonElement>(null)
    const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null)

    const handleMouseEnter = () => {
      setHovered(true)
      setShowTooltip(true)
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect()
        let left = rect.left + rect.width / 2
        left = Math.max(left, 4)
        left = Math.min(left, window.innerWidth - 4)
        setTooltipPos({ top: rect.bottom + 6, left })
      }
    }

    const handleMouseLeave = () => {
      setHovered(false)
      setShowTooltip(false)
    }

    return (
      <div style={{ position: 'relative' }}>
        <button
          ref={btnRef}
          onClick={onClick}
          disabled={disabled}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: btnSize,
            height: btnHeight,
            padding: 0,
            background: active
              ? '#0078d4'
              : hovered && !disabled
                ? 'rgba(0, 0, 0, 0.06)'
                : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: active ? '#fff' : disabled ? '#bbb' : '#555',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: iconSize,
            transition: 'background 0.15s, color 0.15s',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          <i className={icon} style={{ pointerEvents: 'none' }} />
        </button>
        {showTooltip && !isMobile && !disabled && tooltipPos && (
          <div style={{
            ...styles.tooltip,
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateX(-50%)',
          }}>{title}</div>
        )}
      </div>
    )
  }

  const sectionGap = isCompact ? '2px' : '4px'
  const sectionPad = isCompact ? '2px 4px' : '3px 6px'

  return (
    <div
      style={{
        ...styles.toolbar,
        padding: isCompact ? '2px 4px' : '4px 8px',
      }}
    >
      {/* Sidebar Toggle */}
      <div style={{ ...styles.section, padding: sectionPad, gap: sectionGap }}>
        <ToolButton onClick={() => onToggleSidebar?.()} title="Toggle Sidebar" icon="fas fa-bars" />
      </div>

      <div style={styles.divider} />

      {/* File Operations */}
      <div style={{ ...styles.section, padding: sectionPad, gap: sectionGap }}>
        <ToolButton onClick={() => onOpenFile?.()} title="Open File" icon="fas fa-folder-open" />
        <ToolButton onClick={() => onSave?.()} title="Save" icon="fas fa-save" />
        <ToolButton onClick={() => onPrint?.()} title="Print" icon="fas fa-print" />
      </div>

      {(onToggleThumbnails || onSearch) && (
        <>
          <div style={styles.divider} />
          <div style={{ ...styles.section, padding: sectionPad, gap: sectionGap }}>
            {onToggleThumbnails && (
              <ToolButton onClick={onToggleThumbnails} title="Thumbnails" icon="fas fa-th" />
            )}
            {onSearch && (
              <ToolButton onClick={onSearch} title="Search" icon="fas fa-search" />
            )}
          </div>
        </>
      )}

      {onToggleFullscreen && (
        <>
          <div style={styles.divider} />
          <div style={{ ...styles.section, padding: sectionPad, gap: sectionGap }}>
            <ToolButton
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              icon={isFullscreen ? "fas fa-compress" : "fas fa-expand"}
            />
          </div>
        </>
      )}

      <div style={styles.divider} />

      {/* Navigation */}
      <div style={{ ...styles.section, padding: sectionPad, gap: sectionGap }}>
        <ToolButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous Page"
          icon="fas fa-chevron-left"
        />

        <input
          type="number"
          value={currentPage}
          onChange={handlePageInput}
          min={1}
          max={totalPages}
          style={{
            ...styles.pageInput,
            width: isCompact ? '34px' : '44px',
            height: isCompact ? '22px' : '26px',
            fontSize: isCompact ? '11px' : '12px',
          }}
          title="Current Page Number"
          aria-label="Page Number"
        />

        {!isCompact && (
          <span style={styles.pageCount}>/ {totalPages}</span>
        )}

        <ToolButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Next Page"
          icon="fas fa-chevron-right"
        />
      </div>

      <div style={styles.divider} />

      {/* Zoom Controls */}
      <div style={{ ...styles.section, padding: sectionPad, gap: sectionGap }}>
        <ToolButton onClick={onZoomOut} title="Zoom Out" icon="fas fa-minus" />

        {!isCompact ? (
          <select
            value={Math.round(zoom * 100)}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              if (value === -1) {
                onZoomFit('fit-width')
              } else if (value === -2) {
                onZoomFit('fit-page')
              } else {
                onZoomFit(value / 100 + '')
              }
            }}
            style={styles.zoomSelect}
            title="Zoom Level"
            aria-label="Zoom Level"
          >
            <option value={-1}>Fit Width</option>
            <option value={-2}>Fit Page</option>
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
          </select>
        ) : (
          <span style={styles.zoomLabel}>
            {Math.round(zoom * 100)}%
          </span>
        )}

        <ToolButton onClick={onZoomIn} title="Zoom In" icon="fas fa-plus" />
      </div>

      <div style={styles.divider} />

      {/* Form Fields */}
      <div style={{ ...styles.section, padding: sectionPad, gap: sectionGap }}>
        <ToolButton
          active={tool === 'form-text-field'}
          onClick={() => onToolChange('form-text-field' as ToolMode)}
          title="Text Field"
          icon="fas fa-font"
        />
        <ToolButton
          active={tool === 'form-checkbox'}
          onClick={() => onToolChange('form-checkbox' as ToolMode)}
          title="Checkbox"
          icon="far fa-check-square"
        />
        <ToolButton
          active={tool === 'form-radio'}
          onClick={() => onToolChange('form-radio' as ToolMode)}
          title="Radio Button"
          icon="far fa-dot-circle"
        />
        <ToolButton
          active={tool === 'form-dropdown'}
          onClick={() => onToolChange('form-dropdown' as ToolMode)}
          title="Dropdown"
          icon="fas fa-caret-down"
        />
        <ToolButton
          active={tool === 'form-signature'}
          onClick={() => onToolChange('form-signature' as ToolMode)}
          title="Signature Field"
          icon="fas fa-signature"
        />
        <ToolButton
          onClick={() => onToggleFieldsPanel?.()}
          title="Fields Panel"
          icon="fas fa-table-list"
        />
      </div>

    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    background: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    minHeight: '40px',
    userSelect: 'none',
    fontSize: '13px',
    gap: '0px',
  },
  section: {
    display: 'flex',
    alignItems: 'center',
  },
  divider: {
    width: '1px',
    height: '20px',
    background: '#e0e0e0',
    margin: '0 2px',
    flexShrink: 0,
  },
  pageInput: {
    width: '44px',
    height: '26px',
    padding: '0 4px',
    background: '#f5f5f5',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    color: '#333',
    textAlign: 'center' as const,
    fontSize: '12px',
    outline: 'none',
  },
  pageCount: {
    color: '#888',
    fontSize: '12px',
    padding: '0 3px',
    whiteSpace: 'nowrap' as const,
  },
  zoomSelect: {
    height: '26px',
    padding: '0 22px 0 8px',
    background: '#f5f5f5',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    color: '#333',
    fontSize: '12px',
    cursor: 'pointer',
    appearance: 'none' as const,
    outline: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 3.5l3 3 3-3' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 6px center',
  },
  zoomLabel: {
    color: '#666',
    fontSize: '11px',
    padding: '0 4px',
    whiteSpace: 'nowrap' as const,
    minWidth: '32px',
    textAlign: 'center' as const,
  },
  tooltip: {
    padding: '5px 10px',
    background: '#333',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '6px',
    whiteSpace: 'nowrap' as const,
    zIndex: 10000,
    pointerEvents: 'none' as const,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    letterSpacing: '0.2px',
  },
}
