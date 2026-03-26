/**
 * Sidebar Component
 *
 * Tabbed sidebar with thumbnails, bookmarks, and annotations.
 * Modern light theme with FontAwesome icons and smooth transitions.
 */

import { useState, useEffect } from 'react'
import type { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'
import type { Annotation } from '@/types'
import { Thumbnail } from '@/components/viewer/Thumbnail'

interface SidebarProps {
  engine: PDFDocumentEngine
  numPages: number
  currentPage: number
  annotations: Annotation[]
  onPageClick: (page: number) => void
  onAnnotationClick: (annotation: Annotation) => void
  onClose?: () => void
  style?: React.CSSProperties
}

type TabType = 'thumbnails' | 'bookmarks' | 'annotations'

export function Sidebar({
  engine,
  numPages,
  currentPage,
  annotations,
  onPageClick,
  onAnnotationClick,
  onClose,
  style: styleProp,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('thumbnails')
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null)

  const tabs: { type: TabType; icon: string; label: string }[] = [
    { type: 'thumbnails', icon: 'fas fa-file-alt', label: 'Pages' },
  ]

  return (
    <div style={{ ...styles.sidebar, ...styleProp }}>
      {/* Tab Bar */}
      <div style={styles.tabBar}>
        {tabs.map(({ type, icon, label }) => {
          const isActive = activeTab === type
          const isHovered = hoveredTab === type
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              onMouseEnter={() => setHoveredTab(type)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                ...styles.tab,
                ...(isActive ? styles.activeTab : {}),
                ...(isHovered && !isActive ? styles.hoveredTab : {}),
              }}
              title={label}
            >
              <i className={icon} style={{
                fontSize: '14px',
                transition: 'color 0.15s',
              }} />
              <span style={styles.tabLabel}>{label}</span>
            </button>
          )
        })}
        {onClose && (
          <button
            onClick={onClose}
            style={styles.closeButton}
            title="Close sidebar"
          >
            <i className="fas fa-times" style={{ fontSize: '13px' }} />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'thumbnails' && (
          <ThumbnailsTab
            engine={engine}
            numPages={numPages}
            currentPage={currentPage}
            onPageClick={onPageClick}
          />
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksTab />
        )}

        {activeTab === 'annotations' && (
          <AnnotationsTab
            annotations={annotations}
            onAnnotationClick={onAnnotationClick}
          />
        )}
      </div>
    </div>
  )
}

function ThumbnailsTab({
  engine,
  numPages,
  currentPage,
  onPageClick,
}: {
  engine: PDFDocumentEngine
  numPages: number
  currentPage: number
  onPageClick: (page: number) => void
}) {
  const [readyToRender, setReadyToRender] = useState(false)

  useEffect(() => {
    setReadyToRender(false)
    const timer = setTimeout(() => {
      if (engine.getNumPages() > 0) {
        setReadyToRender(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [engine, numPages])

  if (!readyToRender) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.spinner} />
        <p style={styles.emptyText}>Loading thumbnails...</p>
      </div>
    )
  }

  return (
    <div style={styles.thumbnailList}>
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
        <Thumbnail
          key={`${numPages}-${pageNumber}`}
          engine={engine}
          pageNumber={pageNumber}
          isActive={pageNumber === currentPage}
          onClick={() => onPageClick(pageNumber)}
        />
      ))}
    </div>
  )
}

function BookmarksTab() {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIconContainer}>
        <i className="fas fa-bookmark" style={styles.emptyIcon} />
      </div>
      <p style={styles.emptyText}>No bookmarks</p>
      <p style={styles.emptyHint}>Bookmarks from the PDF will appear here</p>
    </div>
  )
}

function AnnotationsTab({
  annotations,
  onAnnotationClick,
}: {
  annotations: Annotation[]
  onAnnotationClick: (annotation: Annotation) => void
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (annotations.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIconContainer}>
          <i className="fas fa-comment-dots" style={styles.emptyIcon} />
        </div>
        <p style={styles.emptyText}>No annotations</p>
        <p style={styles.emptyHint}>Annotations will appear here as you add them</p>
      </div>
    )
  }

  const groupedByPage = annotations.reduce((acc, annot) => {
    if (!acc[annot.pageNumber]) {
      acc[annot.pageNumber] = []
    }
    acc[annot.pageNumber].push(annot)
    return acc
  }, {} as Record<number, Annotation[]>)

  return (
    <div style={styles.annotationList}>
      {Object.entries(groupedByPage).map(([pageNum, annots]) => (
        <div key={pageNum}>
          <div style={styles.annotationPageHeader}>
            <i className="far fa-file" style={{ fontSize: '11px', opacity: 0.6 }} />
            Page {pageNum}
          </div>
          {annots.map((annot) => {
            const isHovered = hoveredId === annot.id
            return (
              <div
                key={annot.id}
                onClick={() => onAnnotationClick(annot)}
                onMouseEnter={() => setHoveredId(annot.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  ...styles.annotationItem,
                  ...(isHovered ? styles.annotationItemHover : {}),
                }}
              >
                <div style={styles.annotationIcon}>
                  <i className={getAnnotationIcon(annot.type)} />
                </div>
                <div style={styles.annotationContent}>
                  <div style={styles.annotationType}>
                    {formatAnnotationType(annot.type)}
                  </div>
                  {annot.author && (
                    <div style={styles.annotationAuthor}>
                      {annot.author}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function getAnnotationIcon(type: string): string {
  const icons: Record<string, string> = {
    highlight: 'fas fa-highlighter',
    underline: 'fas fa-underline',
    strikeout: 'fas fa-strikethrough',
    'free-text': 'fas fa-font',
    rectangle: 'far fa-square',
    circle: 'far fa-circle',
    arrow: 'fas fa-long-arrow-alt-right',
    line: 'fas fa-minus',
    ink: 'fas fa-pen',
  }
  return icons[type] || 'fas fa-map-pin'
}

function formatAnnotationType(type: string): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '220px',
    flexShrink: 0,
    height: '100%',
    background: '#ffffff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
  },
  tabBar: {
    display: 'flex',
    background: '#fafafa',
    borderBottom: '1px solid #e0e0e0',
    padding: '0',
  },
  tab: {
    flex: 1,
    padding: '10px 6px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#999',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  hoveredTab: {
    color: '#666',
    background: 'rgba(0, 0, 0, 0.02)',
  },
  activeTab: {
    borderBottom: '2px solid #0078d4',
    color: '#333',
    background: '#ffffff',
  },
  tabLabel: {
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.3px',
    textTransform: 'uppercase' as const,
  },
  tabContent: {
    flex: 1,
    overflow: 'auto',
  },
  thumbnailList: {
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '8px',
    color: '#999',
    padding: '24px',
  },
  emptyIconContainer: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  emptyIcon: {
    fontSize: '22px',
    color: '#bbb',
  },
  emptyText: {
    margin: 0,
    fontSize: '13px',
    color: '#888',
    fontWeight: 500,
  },
  emptyHint: {
    margin: 0,
    fontSize: '11px',
    color: '#aaa',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e0e0e0',
    borderTop: '3px solid #0078d4',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  annotationList: {
    padding: '8px',
  },
  annotationPageHeader: {
    padding: '8px 10px',
    fontSize: '11px',
    color: '#999',
    fontWeight: 600,
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  annotationItem: {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    background: 'transparent',
    borderRadius: '6px',
    marginBottom: '4px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  annotationItemHover: {
    background: '#f5f5f5',
  },
  annotationIcon: {
    fontSize: '14px',
    color: '#0078d4',
    width: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  annotationContent: {
    flex: 1,
    overflow: 'hidden',
  },
  annotationType: {
    fontSize: '12px',
    color: '#333',
    marginBottom: '2px',
    fontWeight: 500,
  },
  annotationAuthor: {
    fontSize: '11px',
    color: '#999',
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#999',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  },
}
