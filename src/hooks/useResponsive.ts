import { useState, useEffect, type RefObject } from 'react'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

/**
 * Detects responsive breakpoints based on the container's width (if a ref is
 * provided) or the window width as a fallback.  Using container width ensures
 * the viewer behaves correctly when embedded inside a narrow panel / sidebar.
 */
export function useResponsive(containerRef?: RefObject<HTMLElement | null>) {
  const getWidth = () => {
    if (containerRef?.current) {
      return containerRef.current.offsetWidth
    }
    return typeof window !== 'undefined' ? window.innerWidth : 1200
  }

  const [width, setWidth] = useState(getWidth)

  useEffect(() => {
    // If a container ref is provided, observe its size with ResizeObserver
    if (containerRef?.current) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setWidth(entry.contentRect.width)
        }
      })
      ro.observe(containerRef.current)
      return () => ro.disconnect()
    }

    // Fallback: listen to window resize
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [containerRef])

  return {
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
    width,
  }
}
