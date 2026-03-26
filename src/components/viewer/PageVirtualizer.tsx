/**
 * PageVirtualizer Component
 * 
 * Efficient virtualized page rendering for large documents.
 * Only renders pages that are visible in the viewport.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { PageCanvas } from './PageCanvas'
import type { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'
import type { Annotation } from '@/types'
import { PageRotation } from '@/types'

interface PageVirtualizerProps {
  engine: PDFDocumentEngine
  numPages: number
  scale: number
  currentPage: number
  annotations: Map<number, Annotation[]>
  onPageChange: (page: number) => void
}

interface PageLayout {
  pageNumber: number
  top: number
  height: number
}

export function PageVirtualizer({
  engine,
  numPages,
  scale,
  currentPage,
  annotations,
  onPageChange,
}: PageVirtualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]))
  const [pageLayouts, setPageLayouts] = useState<PageLayout[]>([])
  const [containerHeight, setContainerHeight] = useState(0)

  // Calculate page layouts
  useEffect(() => {
    const calculateLayouts = async () => {
      const layouts: PageLayout[] = []
      let currentTop = 0
      const PAGE_GAP = 16

      for (let i = 1; i <= numPages; i++) {
        try {
          const pageInfo = await engine.getPageInfo(i)
          const height = pageInfo.height * scale + PAGE_GAP

          layouts.push({
            pageNumber: i,
            top: currentTop,
            height,
          })

          currentTop += height
        } catch (error) {
          console.error(`Failed to get info for page ${i}:`, error)
        }
      }

      setPageLayouts(layouts)
      setContainerHeight(currentTop)
    }

    if (numPages > 0) {
      calculateLayouts()
    }
  }, [engine, numPages, scale])

  // Calculate visible pages based on scroll position
  const updateVisiblePages = useCallback(() => {
    if (!containerRef.current || pageLayouts.length === 0) return

    const scrollTop = containerRef.current.scrollTop
    const viewportHeight = containerRef.current.clientHeight

    // Buffer: render pages slightly outside viewport for smooth scrolling
    const BUFFER = viewportHeight * 0.5

    const visible = new Set<number>()
    const scrollBottom = scrollTop + viewportHeight

    for (const layout of pageLayouts) {
      const pageTop = layout.top
      const pageBottom = layout.top + layout.height

      // Check if page is in visible range (with buffer)
      if (pageBottom >= scrollTop - BUFFER && pageTop <= scrollBottom + BUFFER) {
        visible.add(layout.pageNumber)
      }

      // Update current page based on what's most visible
      if (pageTop <= scrollTop + viewportHeight / 2 && pageBottom >= scrollTop + viewportHeight / 2) {
        if (layout.pageNumber !== currentPage) {
          onPageChange(layout.pageNumber)
        }
      }
    }

    setVisiblePages(visible)
  }, [pageLayouts, currentPage, onPageChange])

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Initial calculation
    updateVisiblePages()

    // Throttled scroll handler
    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        updateVisiblePages()
        rafId = null
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [updateVisiblePages])

  // Scroll to page programmatically
  useEffect(() => {
    const layout = pageLayouts.find(l => l.pageNumber === currentPage)
    if (!layout || !containerRef.current) return

    const container = containerRef.current
    const targetScrollTop = layout.top

    // Only scroll if the page is not already visible
    const currentScrollTop = container.scrollTop
    const viewportHeight = container.clientHeight

    if (
      targetScrollTop < currentScrollTop ||
      targetScrollTop > currentScrollTop + viewportHeight - layout.height
    ) {
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      })
    }
  }, [currentPage, pageLayouts])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: `${containerHeight}px`, position: 'relative' }}>
        {/* Render only visible pages */}
        {pageLayouts.map((layout) => {
          if (!visiblePages.has(layout.pageNumber)) {
            // Render placeholder for non-visible pages
            return (
              <div
                key={layout.pageNumber}
                style={{
                  position: 'absolute',
                  top: `${layout.top}px`,
                  width: '100%',
                  height: `${layout.height}px`,
                  background: '#2c2c2c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                }}
              >
                Page {layout.pageNumber}
              </div>
            )
          }

          return (
            <div
              key={layout.pageNumber}
              style={{
                position: 'absolute',
                top: `${layout.top}px`,
                width: '100%',
              }}
            >
              <PageCanvas
                pageNumber={layout.pageNumber}
                scale={scale}
                rotation={PageRotation.Rotate0}
                engine={engine}
                annotations={annotations.get(layout.pageNumber) || []}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
