/**
 * Thumbnail Component
 *
 * Renders a single page thumbnail with actual PDF content.
 * Light theme with hover effects and active state.
 */

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'

interface ThumbnailProps {
  engine: PDFDocumentEngine
  pageNumber: number
  isActive: boolean
  onClick: () => void
}

export function Thumbnail({ engine, pageNumber, isActive, onClick }: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let cancelled = false

    const renderThumbnail = async () => {
      if (!canvasRef.current || cancelled) return

      if (!engine.getNumPages()) {
        if (!cancelled) {
          setError(true)
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setError(false)

      try {
        if (cancelled) return

        const pageInfo = await engine.getPageInfo(pageNumber)

        if (cancelled) return

        const scale = 0.2
        const viewport = {
          width: pageInfo.width * scale,
          height: pageInfo.height * scale,
          scale,
          rotation: 0,
          offsetX: 0,
          offsetY: 0,
        }

        if (cancelled || !canvasRef.current) return

        await engine.renderPage(pageNumber, canvasRef.current, viewport)

        if (!cancelled) {
          setIsLoading(false)
        }
      } catch (err) {
        if (cancelled) return
        if (err instanceof Error && (err.message.includes('Transport destroyed') || err.message.includes('No document loaded'))) {
          return
        }
        console.error(`Failed to render thumbnail for page ${pageNumber}:`, err)
        if (!cancelled) {
          setError(true)
          setIsLoading(false)
        }
      }
    }

    renderThumbnail()

    return () => {
      cancelled = true
    }
  }, [engine, pageNumber, engine.getNumPages()])

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.container,
        ...(isActive ? styles.activeContainer : {}),
        ...(hovered && !isActive ? styles.hoveredContainer : {}),
      }}
    >
      <div style={{
        ...styles.thumbnailWrapper,
        ...(isActive ? styles.activeThumbnailWrapper : {}),
      }}>
        {isLoading && !error && (
          <div style={styles.placeholder}>
            <div style={styles.spinner} />
          </div>
        )}
        {error && (
          <div style={styles.placeholder}>
            <i className="far fa-file" style={{ fontSize: '20px', color: '#bbb' }} />
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{
            ...styles.canvas,
            display: error ? 'none' : 'block',
          }}
        />
      </div>
      <div style={{
        ...styles.label,
        ...(isActive ? styles.activeLabel : {}),
      }}>
        {pageNumber}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '8px',
    background: 'transparent',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  hoveredContainer: {
    background: '#f5f5f5',
    border: '2px solid #e0e0e0',
  },
  activeContainer: {
    border: '2px solid #0078d4',
    background: 'rgba(0, 120, 212, 0.05)',
  },
  thumbnailWrapper: {
    width: '100%',
    aspectRatio: '8.5 / 11',
    background: '#f0f0f0',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6px',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
  },
  activeThumbnailWrapper: {
    boxShadow: '0 2px 8px rgba(0, 120, 212, 0.15)',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid #e0e0e0',
    borderTop: '2px solid #0078d4',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  canvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  label: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#888',
    fontWeight: 500,
  },
  activeLabel: {
    color: '#0078d4',
    fontWeight: 600,
  },
}
