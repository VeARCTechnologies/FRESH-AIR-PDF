/**
 * PageTabsBar Component
 *
 * Horizontal page navigation tabs with prev/next arrows and Add Page dropdown.
 * Tabs auto-scroll to keep the current page visible when >5 pages.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface PageTabsBarProps {
  numPages: number
  currentPage: number
  onPageChange: (page: number) => void
  onAddBlankPage?: () => void
  onAddPdfPage?: (file: File) => void
  readOnly?: boolean
}

export function PageTabsBar({
  numPages,
  currentPage,
  onPageChange,
  onAddBlankPage,
  onAddPdfPage,
  readOnly = false,
}: PageTabsBarProps) {
  const MAX_VISIBLE = 5
  const needsScroll = numPages > MAX_VISIBLE
  const [scrollOffset, setScrollOffset] = useState(0)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clamp scrollOffset when numPages changes
  const clampedOffset = Math.max(0, Math.min(scrollOffset, numPages - MAX_VISIBLE))
  if (clampedOffset !== scrollOffset) {
    setScrollOffset(clampedOffset)
  }

  const visibleStart = clampedOffset + 1
  const visibleEnd = Math.min(clampedOffset + MAX_VISIBLE, numPages)

  // Ensure current page tab is visible
  useEffect(() => {
    if (currentPage < visibleStart) {
      setScrollOffset(currentPage - 1)
    } else if (currentPage > visibleEnd) {
      setScrollOffset(currentPage - MAX_VISIBLE)
    }
  }, [currentPage, visibleStart, visibleEnd])

  // Close add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return
    const handleClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node) &&
          addButtonRef.current && !addButtonRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [showAddMenu])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      onAddPdfPage?.(file)
    }
    e.target.value = ''
    setShowAddMenu(false)
  }, [onAddPdfPage])

  const goToPrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }
  const goToNextPage = () => {
    if (currentPage < numPages) onPageChange(currentPage + 1)
  }

  const visiblePages = needsScroll
    ? Array.from({ length: visibleEnd - visibleStart + 1 }, (_, i) => visibleStart + i)
    : Array.from({ length: numPages }, (_, i) => i + 1)

  return (
    <div style={styles.container}>
      <div style={styles.navSection}>
        <button
          style={{ ...styles.arrowButton, opacity: currentPage > 1 ? 1 : 0.3 }}
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          title="Previous page"
        >
          <i className="fas fa-chevron-left" style={{ fontSize: 10 }} />
        </button>

        {visiblePages.map(page => (
          <button
            key={page}
            style={{
              ...styles.tab,
              ...(page === currentPage ? styles.tabActive : {}),
            }}
            onClick={() => onPageChange(page)}
          >
            Page {page}
          </button>
        ))}

        <button
          style={{ ...styles.arrowButton, opacity: currentPage < numPages ? 1 : 0.3 }}
          onClick={goToNextPage}
          disabled={currentPage >= numPages}
          title="Next page"
        >
          <i className="fas fa-chevron-right" style={{ fontSize: 10 }} />
        </button>
      </div>

      {/* Add Page button */}
      {!readOnly && (
        <div style={{ position: 'relative' }}>
          <button
            ref={addButtonRef}
            style={styles.addPageButton}
            onClick={() => setShowAddMenu(!showAddMenu)}
            title="Add Page"
          >
            <i className="fas fa-plus" style={{ marginRight: 4, fontSize: 10 }} />
            Add Page
          </button>

          {showAddMenu && (
            <div ref={addMenuRef} style={styles.addMenu}>
              <button
                style={styles.addMenuItem}
                onClick={() => { onAddBlankPage?.(); setShowAddMenu(false) }}
              >
                <i className="far fa-file" style={styles.addMenuIcon} />
                Blank page
              </button>
              <button
                style={styles.addMenuItem}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fas fa-file-pdf" style={styles.addMenuIcon} />
                Upload PDF
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    padding: '0 16px',
    background: '#fafafa',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
    gap: 12,
  },
  navSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  tab: {
    padding: '4px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: '#666',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s ease',
  },
  tabActive: {
    background: '#1976D2',
    color: '#ffffff',
    fontWeight: 600,
  },
  arrowButton: {
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
  addPageButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    color: '#666',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  addMenu: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: 4,
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    zIndex: 200,
    minWidth: 160,
    overflow: 'hidden',
  },
  addMenuItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#333',
    textAlign: 'left' as const,
  },
  addMenuIcon: {
    width: 16,
    marginRight: 8,
    color: '#888',
    fontSize: 12,
  },
}
