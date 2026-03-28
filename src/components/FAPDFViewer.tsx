/**
 * FAPDFViewer Component
 * 
 * Main viewer component providing the public API for the PDF viewer.
 */

import { useEffect, useImperativeHandle, forwardRef, useRef, useState, useCallback } from 'react'
import type {
  ViewerConfig,
  ViewerAPI,
  DocumentSource,
  DocumentLoadedEvent,
  AnnotationChangedEvent,
  Annotation,
  FormField,
} from '@/types'
import { useViewer } from '@/hooks/useViewer'
import { useResponsive } from '@/hooks/useResponsive'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { Sidebar } from '@/components/panels/Sidebar'
import { FormFieldsPanel } from '@/components/panels/FormFieldsPanel'
import { FormFieldPropertiesPanel } from '@/components/panels/FormFieldPropertiesPanel'
import { PageCanvas } from '@/components/viewer/PageCanvas'
import { PageRotation } from '@/types'
import { eventBus } from '@/core/events/EventBus'
import { ViewerEvent } from '@/types'
import { buildPdfFromPages, downloadBlob } from '@/utils/canvasToPdf'

export interface FAPDFViewerProps {
  document?: DocumentSource
  config?: ViewerConfig
  onDocumentLoaded?: (event: DocumentLoadedEvent) => void
  onAnnotationChanged?: (event: AnnotationChangedEvent) => void
  onPageChanged?: (pageNumber: number) => void
  className?: string
  style?: React.CSSProperties
}

export const FAPDFViewer = forwardRef<ViewerAPI, FAPDFViewerProps>(
  (
    {
      document: documentSource,
      config = {},
      onDocumentLoaded,
      onAnnotationChanged,
      onPageChanged,
      className = '',
      style = {},
    },
    ref
  ) => {
    const viewer = useViewer(config)
    const { viewerAPI, engine, annotationManager, state } = viewer
    const viewerAPIRef = useRef(viewerAPI)
    viewerAPIRef.current = viewerAPI

    const containerRef = useRef<HTMLDivElement>(null)
    const { isMobile, width: containerWidth } = useResponsive(containerRef)
    const isCompact = containerWidth < 500

    const fileInputRef = useRef<HTMLInputElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const isScrollingToPage = useRef(false)
    const [showSidebar, setShowSidebar] = useState(true)
    const [showFieldsPanel, setShowFieldsPanel] = useState(true)
    const [selectedFieldForEdit, setSelectedFieldForEdit] = useState<FormField | null>(null)
    const [propsDrawerField, setPropsDrawerField] = useState<FormField | null>(null)
    const [propsDrawerOpen, setPropsDrawerOpen] = useState(false)
    const propsDrawerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Animated open
    const openPropsDrawer = useCallback((field: FormField) => {
      if (propsDrawerTimer.current) clearTimeout(propsDrawerTimer.current)
      setSelectedFieldForEdit(field)
      setPropsDrawerField(field)
      // Trigger open on next frame so the mount renders at translateX(100%) first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPropsDrawerOpen(true))
      })
    }, [])

    // Animated close
    const closePropsDrawer = useCallback(() => {
      setPropsDrawerOpen(false)
      setSelectedFieldForEdit(null)
      propsDrawerTimer.current = setTimeout(() => {
        setPropsDrawerField(null)
      }, 300) // match transition duration
    }, [])

    const [isFullscreen, setIsFullscreen] = useState(false)
    const formFieldIdCounter = useRef(0)

    // Close sidebar & panels when container becomes narrow
    useEffect(() => {
      if (isMobile) {
        setShowSidebar(false)
        setShowFieldsPanel(false)
      }
    }, [isMobile])

    // Track current page based on scroll position
    const handleScroll = useCallback(() => {
      if (isScrollingToPage.current || !scrollContainerRef.current) return
      const container = scrollContainerRef.current
      const scrollCenter = container.scrollTop + container.clientHeight / 2

      let closestPage = 1
      let closestDist = Infinity
      pageRefs.current.forEach((el, pageNum) => {
        const top = el.offsetTop
        const center = top + el.offsetHeight / 2
        const dist = Math.abs(center - scrollCenter)
        if (dist < closestDist) {
          closestDist = dist
          closestPage = pageNum
        }
      })

      if (closestPage !== state.currentPage) {
        viewerAPI.goToPage(closestPage)
      }
    }, [state.currentPage, viewerAPI])

    // Attach scroll listener
    useEffect(() => {
      const container = scrollContainerRef.current
      if (!container) return

      let rafId: number | null = null
      const onScroll = () => {
        if (rafId) return
        rafId = requestAnimationFrame(() => {
          handleScroll()
          rafId = null
        })
      }

      container.addEventListener('scroll', onScroll, { passive: true })
      return () => {
        container.removeEventListener('scroll', onScroll)
        if (rafId) cancelAnimationFrame(rafId)
      }
    }, [handleScroll])

    // Scroll to page when currentPage changes via toolbar navigation
    const lastScrolledPage = useRef(state.currentPage)
    useEffect(() => {
      if (lastScrolledPage.current === state.currentPage) return
      lastScrolledPage.current = state.currentPage

      const el = pageRefs.current.get(state.currentPage)
      if (!el || !scrollContainerRef.current) return

      isScrollingToPage.current = true
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // Reset flag after scroll animation finishes
      const timer = setTimeout(() => {
        isScrollingToPage.current = false
      }, 600)
      return () => clearTimeout(timer)
    }, [state.currentPage])

    // Pinch-to-zoom (trackpad) and Ctrl+scroll (mouse wheel)
    // Uses CSS transform for instant visual feedback, debounces the actual re-render
    const pagesWrapperRef = useRef<HTMLDivElement>(null)
    const pendingZoomRef = useRef<number | null>(null)
    const baseZoomRef = useRef(state.zoom)
    const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Keep baseZoom in sync when state.zoom changes from non-pinch sources (toolbar, etc.)
    useEffect(() => {
      if (pendingZoomRef.current === null) {
        baseZoomRef.current = state.zoom
      }
    }, [state.zoom])

    useEffect(() => {
      const container = scrollContainerRef.current
      if (!container) return

      const handleWheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()

        const wrapper = pagesWrapperRef.current
        if (!wrapper) return

        // Calculate new zoom from the committed base zoom
        const currentPending = pendingZoomRef.current ?? baseZoomRef.current
        const zoomFactor = 1 - e.deltaY * 0.005
        const newZoom = Math.max(0.1, Math.min(currentPending * zoomFactor, 5.0))
        pendingZoomRef.current = newZoom

        // Apply CSS transform for instant visual feedback (no re-render)
        const ratio = newZoom / baseZoomRef.current
        wrapper.style.transform = `scale(${ratio})`
        wrapper.style.transformOrigin = 'top center'

        // Debounce the actual commit — only re-render when gesture settles
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
        commitTimerRef.current = setTimeout(() => {
          const finalZoom = pendingZoomRef.current
          if (finalZoom !== null) {
            // Reset CSS transform before committing so there's no visual jump
            wrapper.style.transform = ''
            wrapper.style.transformOrigin = ''
            pendingZoomRef.current = null
            baseZoomRef.current = finalZoom
            viewerAPI.setZoom(finalZoom)
          }
        }, 150)
      }

      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        container.removeEventListener('wheel', handleWheel)
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
      }
    }, [viewerAPI])

    // Fullscreen toggle
    const toggleFullscreen = useCallback(() => {
      const el = containerRef.current
      if (!el) return

      if (!document.fullscreenElement) {
        el.requestFullscreen().catch(() => {})
      } else {
        document.exitFullscreen().catch(() => {})
      }
    }, [])

    // Sync state with browser fullscreen changes (Escape key, etc.)
    useEffect(() => {
      const onChange = () => {
        setIsFullscreen(!!document.fullscreenElement)
      }
      document.addEventListener('fullscreenchange', onChange)
      return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    const handleOpenFile = () => {
      fileInputRef.current?.click()
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && file.type === 'application/pdf') {
        viewerAPI.loadDocument(file)
      }
    }

    const handlePrint = async () => {
      if (!state.documentInfo) return

      const numPages = state.documentInfo.numPages
      const printScale = 2 // high-res for print
      const renderer = new (await import('@/core/annotations/AnnotationRenderer')).AnnotationRenderer()

      // Create a hidden iframe for isolated printing
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.left = '-9999px'
      iframe.style.top = '-9999px'
      iframe.style.width = '0'
      iframe.style.height = '0'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) { document.body.removeChild(iframe); return }

      iframeDoc.open()
      iframeDoc.write(`<!DOCTYPE html><html><head><style>
        * { margin: 0; padding: 0; }
        @page { margin: 0; }
        body { margin: 0; }
        .page { page-break-after: always; display: flex; justify-content: center; }
        .page:last-child { page-break-after: auto; }
        canvas { width: 100%; height: auto; display: block; }
      </style></head><body></body></html>`)
      iframeDoc.close()

      // Render each page with annotations
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const pageInfo = await engine.getPageInfo(pageNum)
          const viewport = {
            width: pageInfo.width * printScale,
            height: pageInfo.height * printScale,
            scale: printScale,
            rotation: 0 as const,
            offsetX: 0,
            offsetY: 0,
          }

          // Render PDF page
          const pageCanvas = document.createElement('canvas')
          await engine.renderPage(pageNum, pageCanvas, viewport)

          // Render annotations on top
          const pageAnnotations = annotationManager.getAnnotations(pageNum)
          if (pageAnnotations.length > 0) {
            const annotCanvas = document.createElement('canvas')
            renderer.renderAnnotations(pageAnnotations, annotCanvas, viewport)

            const ctx = pageCanvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(annotCanvas, 0, 0)
            }
          }

          // Render form fields on top
          const pageFields = state.formFields.filter(f => f.pageNumber === pageNum)
          if (pageFields.length > 0) {
            const ctx = pageCanvas.getContext('2d')
            if (ctx) {
              for (const field of pageFields) {
                const x = field.bounds.x * printScale
                const y = field.bounds.y * printScale
                const w = field.bounds.width * printScale
                const h = field.bounds.height * printScale

                // Draw field background
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
                ctx.fillRect(x, y, w, h)

                // Draw field border
                ctx.strokeStyle = '#d0d0d0'
                ctx.lineWidth = 1
                ctx.strokeRect(x, y, w, h)

                ctx.save()
                ctx.beginPath()
                ctx.rect(x, y, w, h)
                ctx.clip()

                if (field.type === 'text' && field.value) {
                  ctx.fillStyle = '#333'
                  ctx.font = `${14 * printScale}px "Segoe UI", -apple-system, sans-serif`
                  ctx.textBaseline = 'middle'
                  ctx.fillText(String(field.value), x + 8 * printScale, y + h / 2, w - 16 * printScale)
                } else if (field.type === 'checkbox') {
                  const boxSize = 16 * printScale
                  const bx = x + (w - boxSize) / 2
                  const by = y + (h - boxSize) / 2
                  ctx.strokeStyle = '#666'
                  ctx.lineWidth = 1.5 * printScale
                  ctx.strokeRect(bx, by, boxSize, boxSize)
                  if (field.value) {
                    // Draw checkmark
                    ctx.strokeStyle = '#0078d4'
                    ctx.lineWidth = 2 * printScale
                    ctx.beginPath()
                    ctx.moveTo(bx + boxSize * 0.2, by + boxSize * 0.5)
                    ctx.lineTo(bx + boxSize * 0.4, by + boxSize * 0.75)
                    ctx.lineTo(bx + boxSize * 0.8, by + boxSize * 0.25)
                    ctx.stroke()
                  }
                } else if (field.type === 'radio') {
                  if (field.options && field.options.length > 0) {
                    const optionH = h / field.options.length
                    ctx.fillStyle = '#333'
                    ctx.font = `${13 * printScale}px "Segoe UI", -apple-system, sans-serif`
                    ctx.textBaseline = 'middle'
                    field.options.forEach((option, i) => {
                      const oy = y + i * optionH + optionH / 2
                      const radius = 6 * printScale
                      const cx = x + 12 * printScale
                      // Outer circle
                      ctx.beginPath()
                      ctx.arc(cx, oy, radius, 0, Math.PI * 2)
                      ctx.strokeStyle = '#666'
                      ctx.lineWidth = 1.5 * printScale
                      ctx.stroke()
                      // Filled if selected
                      if (field.value === option) {
                        ctx.beginPath()
                        ctx.arc(cx, oy, radius * 0.5, 0, Math.PI * 2)
                        ctx.fillStyle = '#0078d4'
                        ctx.fill()
                      }
                      // Label
                      ctx.fillStyle = '#333'
                      ctx.fillText(option, x + 24 * printScale, oy)
                    })
                  } else {
                    // Single radio with no options
                    const radius = 8 * printScale
                    const cx = x + w / 2
                    const cy = y + h / 2
                    ctx.beginPath()
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
                    ctx.strokeStyle = '#666'
                    ctx.lineWidth = 1.5 * printScale
                    ctx.stroke()
                    if (field.value) {
                      ctx.beginPath()
                      ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2)
                      ctx.fillStyle = '#0078d4'
                      ctx.fill()
                    }
                  }
                } else if (field.type === 'dropdown' && field.value) {
                  ctx.fillStyle = '#333'
                  ctx.font = `${14 * printScale}px "Segoe UI", -apple-system, sans-serif`
                  ctx.textBaseline = 'middle'
                  ctx.fillText(String(field.value), x + 8 * printScale, y + h / 2, w - 16 * printScale)
                } else if (field.type === 'signature' && typeof field.value === 'string' && (field.value as string).startsWith('data:image/')) {
                  // Signature is a data URL image — draw it
                  await new Promise<void>((resolve) => {
                    const img = new Image()
                    img.onload = () => {
                      const padding = 4 * printScale
                      const drawW = w - padding * 2
                      const drawH = h - padding * 2
                      const imgAspect = img.width / img.height
                      const boxAspect = drawW / drawH
                      let dw: number, dh: number
                      if (imgAspect > boxAspect) {
                        dw = drawW
                        dh = drawW / imgAspect
                      } else {
                        dh = drawH
                        dw = drawH * imgAspect
                      }
                      ctx.drawImage(img, x + padding + (drawW - dw) / 2, y + padding + (drawH - dh) / 2, dw, dh)
                      resolve()
                    }
                    img.onerror = () => resolve()
                    img.src = field.value
                  })
                }

                ctx.restore()
              }
            }
          }

          // Add to print document
          const wrapper = iframeDoc.createElement('div')
          wrapper.className = 'page'
          wrapper.appendChild(pageCanvas)
          iframeDoc.body.appendChild(wrapper)
        } catch (err) {
          console.error(`Failed to render page ${pageNum} for print:`, err)
        }
      }

      // Wait for canvases to settle, then print
      setTimeout(() => {
        iframe.contentWindow?.print()
        // Clean up after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }, 300)
    }

    const handleDownload = async () => {
      if (!state.documentInfo) return

      const numPages = state.documentInfo.numPages
      const dlScale = 2
      const renderer = new (await import('@/core/annotations/AnnotationRenderer')).AnnotationRenderer()
      const pdfPages: { jpeg: ArrayBuffer; width: number; height: number }[] = []

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const pageInfo = await engine.getPageInfo(pageNum)
          const viewport = {
            width: pageInfo.width * dlScale,
            height: pageInfo.height * dlScale,
            scale: dlScale,
            rotation: 0 as const,
            offsetX: 0,
            offsetY: 0,
          }

          const pageCanvas = document.createElement('canvas')
          await engine.renderPage(pageNum, pageCanvas, viewport)

          // Render annotations on top
          const pageAnnotations = annotationManager.getAnnotations(pageNum)
          if (pageAnnotations.length > 0) {
            const annotCanvas = document.createElement('canvas')
            renderer.renderAnnotations(pageAnnotations, annotCanvas, viewport)
            const ctx = pageCanvas.getContext('2d')
            if (ctx) ctx.drawImage(annotCanvas, 0, 0)
          }

          // Render form fields on top
          const pageFields = state.formFields.filter(f => f.pageNumber === pageNum)
          if (pageFields.length > 0) {
            const ctx = pageCanvas.getContext('2d')
            if (ctx) {
              for (const field of pageFields) {
                const x = field.bounds.x * dlScale
                const y = field.bounds.y * dlScale
                const w = field.bounds.width * dlScale
                const h = field.bounds.height * dlScale

                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
                ctx.fillRect(x, y, w, h)
                ctx.strokeStyle = '#d0d0d0'
                ctx.lineWidth = 1
                ctx.strokeRect(x, y, w, h)

                ctx.save()
                ctx.beginPath()
                ctx.rect(x, y, w, h)
                ctx.clip()

                if (field.type === 'text' && field.value) {
                  ctx.fillStyle = '#333'
                  ctx.font = `${14 * dlScale}px "Segoe UI", -apple-system, sans-serif`
                  ctx.textBaseline = 'middle'
                  ctx.fillText(String(field.value), x + 8 * dlScale, y + h / 2, w - 16 * dlScale)
                } else if (field.type === 'checkbox') {
                  const boxSize = 16 * dlScale
                  const bx = x + (w - boxSize) / 2
                  const by = y + (h - boxSize) / 2
                  ctx.strokeStyle = '#666'
                  ctx.lineWidth = 1.5 * dlScale
                  ctx.strokeRect(bx, by, boxSize, boxSize)
                  if (field.value) {
                    ctx.strokeStyle = '#0078d4'
                    ctx.lineWidth = 2 * dlScale
                    ctx.beginPath()
                    ctx.moveTo(bx + boxSize * 0.2, by + boxSize * 0.5)
                    ctx.lineTo(bx + boxSize * 0.4, by + boxSize * 0.75)
                    ctx.lineTo(bx + boxSize * 0.8, by + boxSize * 0.25)
                    ctx.stroke()
                  }
                } else if (field.type === 'dropdown' && field.value) {
                  ctx.fillStyle = '#333'
                  ctx.font = `${14 * dlScale}px "Segoe UI", -apple-system, sans-serif`
                  ctx.textBaseline = 'middle'
                  ctx.fillText(String(field.value), x + 8 * dlScale, y + h / 2, w - 16 * dlScale)
                } else if (field.type === 'signature' && typeof field.value === 'string' && (field.value as string).startsWith('data:image/')) {
                  await new Promise<void>((resolve) => {
                    const img = new Image()
                    img.onload = () => {
                      const padding = 4 * dlScale
                      const drawW = w - padding * 2
                      const drawH = h - padding * 2
                      const imgAspect = img.width / img.height
                      const boxAspect = drawW / drawH
                      let dw: number, dh: number
                      if (imgAspect > boxAspect) { dw = drawW; dh = drawW / imgAspect }
                      else { dh = drawH; dw = drawH * imgAspect }
                      ctx.drawImage(img, x + padding + (drawW - dw) / 2, y + padding + (drawH - dh) / 2, dw, dh)
                      resolve()
                    }
                    img.onerror = () => resolve()
                    img.src = field.value
                  })
                }

                ctx.restore()
              }
            }
          }

          // Convert to JPEG
          const blob = await new Promise<Blob>((resolve) => {
            pageCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92)
          })
          pdfPages.push({
            jpeg: await blob.arrayBuffer(),
            width: pageInfo.width,
            height: pageInfo.height,
          })
        } catch (err) {
          console.error(`Failed to render page ${pageNum} for download:`, err)
        }
      }

      const pdfBlob = buildPdfFromPages(pdfPages)
      const title = state.documentInfo.title || 'document'
      const filename = title.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf'
      downloadBlob(pdfBlob, filename)
    }

    // Expose API via ref (imperative handle)
    useImperativeHandle(ref, () => viewerAPIRef.current, [])

    // Load document when source changes
    useEffect(() => {
      let cancelled = false

      if (documentSource) {
        viewerAPIRef.current.loadDocument(documentSource).catch(err => {
          // Ignore errors if component unmounted or load already in progress
          if (!cancelled && err.message !== 'Load already in progress') {
            console.error('Failed to load document:', err)
          }
        })
      }

      return () => {
        cancelled = true
      }
    }, [documentSource])

    // Subscribe to events
    useEffect(() => {
      const unsubscribers: Array<() => void> = []

      if (onDocumentLoaded) {
        unsubscribers.push(
          eventBus.on(ViewerEvent.DocumentLoaded, onDocumentLoaded)
        )
      }

      if (onAnnotationChanged) {
        unsubscribers.push(
          eventBus.on(ViewerEvent.AnnotationAdded, onAnnotationChanged),
          eventBus.on(ViewerEvent.AnnotationModified, onAnnotationChanged),
          eventBus.on(ViewerEvent.AnnotationDeleted, onAnnotationChanged)
        )
      }

      if (onPageChanged) {
        unsubscribers.push(
          eventBus.on(ViewerEvent.PageChanged, (e: any) => onPageChanged(e.pageNumber))
        )
      }

      return () => {
        unsubscribers.forEach(unsub => unsub())
      }
    }, [onDocumentLoaded, onAnnotationChanged, onPageChanged])

    // Get annotations for current page and all annotations
    const allAnnotations = state.documentInfo
      ? annotationManager.getAllAnnotations()
      : []

    const handleAnnotationClick = (annotation: Annotation) => {
      viewerAPI.goToPage(annotation.pageNumber)
      // TODO: Select annotation
    }

    // Form field handlers
    const handleFormFieldCreate = (field: Omit<FormField, 'id'>) => {
      const newField: FormField = {
        ...field,
        id: `field-${++formFieldIdCounter.current}`,
      }
      const currentFields = viewerAPI.getFormFields()
      viewerAPI.setFormFields([...currentFields, newField])
    }

    const handleFormFieldUpdate = (id: string, updates: Partial<FormField>) => {
      const currentFields = viewerAPI.getFormFields()
      const updatedFields = currentFields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
      viewerAPI.setFormFields(updatedFields)
      
      // Also update drawer field if it's the same field
      if (selectedFieldForEdit?.id === id) {
        setSelectedFieldForEdit((prev) => prev ? { ...prev, ...updates } : null)
      }
      if (propsDrawerField?.id === id) {
        setPropsDrawerField((prev) => prev ? { ...prev, ...updates } : null)
      }
    }

    const handleFormFieldDelete = (id: string) => {
      const currentFields = viewerAPI.getFormFields()
      viewerAPI.setFormFields(currentFields.filter((field) => field.id !== id))

      if (propsDrawerField?.id === id) {
        closePropsDrawer()
      }
    }

    const handleFieldClick = (field: FormField) => {
      viewerAPI.goToPage(field.pageNumber)
    }
    
    const handleFieldEdit = (field: FormField) => {
      openPropsDrawer(field)
    }

    // Render all pages in continuous scroll
    const renderPages = () => {
      if (!state.documentInfo) return null

      const pages = []
      for (let pageNum = 1; pageNum <= state.documentInfo.numPages; pageNum++) {
        const pageAnnotations = annotationManager.getAnnotations(pageNum)
        const pageFields = state.formFields.filter((f) => f.pageNumber === pageNum)

        pages.push(
          <div
            key={pageNum}
            ref={(el) => {
              if (el) pageRefs.current.set(pageNum, el)
              else pageRefs.current.delete(pageNum)
            }}
          >
            <PageCanvas
              pageNumber={pageNum}
              scale={state.zoom}
              rotation={PageRotation.Rotate0}
              engine={engine}
              annotations={pageAnnotations}
              formFields={pageFields}
              activeTool={state.tool}
              onPageClick={viewerAPI.goToPage}
              onAnnotationCreate={(annotation) => {
                viewerAPIRef.current.addAnnotation(annotation)
              }}
              onAnnotationUpdate={(id, updates) => {
                viewerAPIRef.current.updateAnnotation(id, updates)
              }}
              onAnnotationDelete={(id) => {
                viewerAPIRef.current.deleteAnnotation(id)
              }}
              onFormFieldCreate={handleFormFieldCreate}
              onFormFieldUpdate={handleFormFieldUpdate}
              onFormFieldDelete={handleFormFieldDelete}
              onFormFieldEdit={handleFieldEdit}
              isMobile={isMobile}
            />
          </div>
        )
      }
      return pages
    }

    if (state.error) {
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorMessage}>
            <div style={styles.errorIcon}>
              <i className="fas fa-exclamation-triangle" />
            </div>
            <h3 style={styles.errorTitle}>Error Loading Document</h3>
            <p style={styles.errorText}>{state.error.message}</p>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className={`inhouse-viewer ${className}`}
        style={{ ...styles.container, ...style }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Toolbar */}
        {config.showToolbar !== false && state.documentInfo && (
          <Toolbar
            currentPage={state.currentPage}
            totalPages={state.documentInfo.numPages}
            zoom={state.zoom}
            tool={state.tool}
            containerRef={containerRef}
            onPageChange={viewerAPI.goToPage}
            onZoomFit={(mode: string) => viewerAPI.setZoom(mode as any)}
            onZoomIn={viewerAPI.zoomIn}
            onZoomOut={viewerAPI.zoomOut}
            onToolChange={viewerAPI.setTool}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            onToggleFieldsPanel={() => setShowFieldsPanel(!showFieldsPanel)}
            onOpenFile={handleOpenFile}
            onDownload={handleDownload}
            onPrint={handlePrint}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        )}

        {/* Main Content */}
        <div style={styles.content}>
          {/* Left Sidebar — inline on desktop, overlay on mobile */}
          {showSidebar && state.documentInfo && (
            isMobile ? (
              <div style={styles.sidebarOverlay}>
                <div
                  style={styles.sidebarOverlayBackdrop}
                  onClick={() => setShowSidebar(false)}
                />
                <div style={{
                  ...styles.sidebarOverlayContent,
                  width: isCompact ? '90%' : '80%',
                }}>
                  <Sidebar
                    engine={engine}
                    numPages={state.documentInfo.numPages}
                    currentPage={state.currentPage}
                    annotations={allAnnotations}
                    onPageClick={(page) => {
                      viewerAPI.goToPage(page)
                      setShowSidebar(false)
                    }}
                    onAnnotationClick={(annotation) => {
                      handleAnnotationClick(annotation)
                      setShowSidebar(false)
                    }}
                    onClose={() => setShowSidebar(false)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : (
              <Sidebar
                engine={engine}
                numPages={state.documentInfo.numPages}
                currentPage={state.currentPage}
                annotations={allAnnotations}
                onPageClick={viewerAPI.goToPage}
                onAnnotationClick={handleAnnotationClick}
              />
            )
          )}

          {/* Document Area */}
          <div ref={scrollContainerRef} style={styles.documentArea}>
            {state.isLoading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
                <p style={styles.loadingText}>Loading document...</p>
              </div>
            ) : state.documentInfo ? (
              <div ref={pagesWrapperRef} style={{
                ...styles.pagesContainer,
                padding: isCompact ? '8px' : isMobile ? '16px' : '32px',
                willChange: 'transform',
              }}>{renderPages()}</div>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIconContainer}>
                  <i className="far fa-file-pdf" style={styles.emptyIcon} />
                </div>
                <p style={styles.emptyTitle}>No document loaded</p>
                <p style={styles.emptyStateSubtext}>
                  Open a PDF file to get started
                </p>
              </div>
            )}
          </div>

          {/* Form Fields Panel — inline on desktop, overlay on mobile */}
          {showFieldsPanel && state.formFields.length > 0 && !propsDrawerField && (
            isMobile ? (
              <div style={styles.panelOverlay}>
                <div
                  style={styles.panelOverlayBackdrop}
                  onClick={() => setShowFieldsPanel(false)}
                />
                <div style={styles.panelOverlayContent}>
                  <FormFieldsPanel
                    fields={state.formFields}
                    onFieldClick={(field) => {
                      handleFieldClick(field)
                      setShowFieldsPanel(false)
                    }}
                    onFieldEdit={handleFieldEdit}
                    onFieldDelete={handleFormFieldDelete}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : (
              <FormFieldsPanel
                fields={state.formFields}
                onFieldClick={handleFieldClick}
                onFieldEdit={handleFieldEdit}
                onFieldDelete={handleFormFieldDelete}
              />
            )
          )}

          {/* Form Field Properties Panel — animated slide-in drawer */}
          {propsDrawerField && (
            isMobile ? (
              <div style={{
                ...styles.panelOverlay,
                opacity: propsDrawerOpen ? 1 : 0,
                pointerEvents: propsDrawerOpen ? 'auto' : 'none',
                transition: 'opacity 0.3s ease',
              }}>
                <div
                  style={styles.panelOverlayBackdrop}
                  onClick={closePropsDrawer}
                />
                <div style={{
                  ...styles.panelOverlayContent,
                  transform: propsDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                  <FormFieldPropertiesPanel
                    field={propsDrawerField}
                    onUpdate={(updates) => {
                      handleFormFieldUpdate(propsDrawerField.id, updates)
                    }}
                    onDelete={() => {
                      handleFormFieldDelete(propsDrawerField.id)
                      closePropsDrawer()
                    }}
                    onClose={closePropsDrawer}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                transform: propsDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
              }}>
                <FormFieldPropertiesPanel
                  field={propsDrawerField}
                  onUpdate={(updates) => {
                    handleFormFieldUpdate(propsDrawerField.id, updates)
                  }}
                  onDelete={() => {
                    handleFormFieldDelete(propsDrawerField.id)
                    closePropsDrawer()
                  }}
                  onClose={closePropsDrawer}
                />
              </div>
            )
          )}
        </div>
      </div>
    )
  }
)

FAPDFViewer.displayName = 'FAPDFViewer'

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f5',
    color: '#333',
    overflow: 'hidden',
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },
  documentArea: {
    flex: 1,
    overflow: 'auto',
    background: '#e8e8e8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  pagesContainer: {
    padding: '32px',
    maxWidth: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    color: '#888',
  },
  loadingText: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 500,
    color: '#888',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #ddd',
    borderTop: '3px solid #0078d4',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888',
    fontSize: '14px',
    gap: '8px',
  },
  emptyIconContainer: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  emptyIcon: {
    fontSize: '28px',
    color: '#bbb',
  },
  emptyTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: '#666',
  },
  emptyStateSubtext: {
    fontSize: '13px',
    margin: 0,
    color: '#999',
  },
  errorContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
  },
  errorMessage: {
    padding: '32px',
    background: '#ffffff',
    border: '1px solid #f5c6cb',
    borderRadius: '12px',
    color: '#333',
    maxWidth: '460px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  },
  errorIcon: {
    fontSize: '32px',
    color: '#d32f2f',
    marginBottom: '12px',
  },
  errorTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
  },
  errorText: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.5',
  },
  // Mobile sidebar overlay
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    display: 'flex',
  },
  sidebarOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)',
  },
  sidebarOverlayContent: {
    position: 'relative',
    zIndex: 1,
    width: '80%',
    maxWidth: '300px',
    height: '100%',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
  },
  // Mobile panel overlay (right side)
  panelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  panelOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)',
  },
  panelOverlayContent: {
    position: 'relative',
    zIndex: 1,
    width: '85%',
    maxWidth: '350px',
    height: '100%',
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
  },
}
