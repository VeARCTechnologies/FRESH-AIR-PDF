/**
 * Thumbnails Panel Component
 * 
 * Displays page thumbnails for quick navigation.
 */

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'
import { PageRotation } from '@/types'

interface ThumbnailsPanelProps {
  engine: PDFDocumentEngine
  numPages: number
  currentPage: number
  onPageClick: (page: number) => void
}

export function ThumbnailsPanel({
  engine,
  numPages,
  currentPage,
  onPageClick,
}: ThumbnailsPanelProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Pages</h3>
      </div>

      <div style={styles.thumbnailList}>
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
          <ThumbnailItem
            key={pageNumber}
            engine={engine}
            pageNumber={pageNumber}
            isActive={pageNumber === currentPage}
            onClick={() => onPageClick(pageNumber)}
          />
        ))}
      </div>
    </div>
  )
}

interface ThumbnailItemProps {
  engine: PDFDocumentEngine
  pageNumber: number
  isActive: boolean
  onClick: () => void
}

function ThumbnailItem({ engine, pageNumber, isActive, onClick }: ThumbnailItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    const renderThumbnail = async () => {
      if (!canvasRef.current || isRendered) return

      try {
        await engine.renderPage(pageNumber, canvasRef.current, {
          width: 150,
          height: 200,
          scale: 0.3,
          rotation: PageRotation.Rotate0,
          offsetX: 0,
          offsetY: 0,
        })
        setIsRendered(true)
      } catch (error) {
        console.error(`Failed to render thumbnail for page ${pageNumber}:`, error)
      }
    }

    // Lazy load thumbnails when they come into view
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          renderThumbnail()
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (canvasRef.current) {
      observer.observe(canvasRef.current.parentElement!)
    }

    return () => observer.disconnect()
  }, [engine, pageNumber, isRendered])

  return (
    <div
      style={{
        ...styles.thumbnailItem,
        ...(isActive ? styles.activeThumbnail : {}),
      }}
      onClick={onClick}
    >
      <div style={styles.thumbnailCanvas}>
        <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
      </div>
      <div style={styles.pageNumber}>{pageNumber}</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#1e1e1e',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #404040',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
  },
  thumbnailList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  thumbnailItem: {
    marginBottom: '16px',
    padding: '8px',
    background: '#2c2c2c',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  activeThumbnail: {
    border: '2px solid #0066cc',
    background: '#333',
  },
  thumbnailCanvas: {
    width: '100%',
    background: '#fff',
    borderRadius: '2px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '150px',
  },
  pageNumber: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
  },
}
