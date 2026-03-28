/**
 * FATemplateEditor Component
 *
 * Purpose-built PDF template editor for overlay field management.
 * Top-level component that composes all template editor UI.
 */

import {
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react'
import type {
  FATemplateEditorProps,
  TemplateEditorAPI,
  TemplateField,
  DragFieldData,
  Rect,
  SystemFieldCategory,
} from '@/types'
import { PageRotation } from '@/types'
import { useTemplateEditor } from '@/hooks/useTemplateEditor'
import { useResponsive } from '@/hooks/useResponsive'
import { useDragToCanvas } from '@/hooks/useDragToCanvas'
import { eventBus } from '@/core/events/EventBus'
import { ViewerEvent } from '@/types'
import { TemplateTopBar } from './TemplateTopBar'
import { PageTabsBar } from './PageTabsBar'
import { TemplateSidebar } from './TemplateSidebar'
import { TemplateFieldOverlay } from './TemplateFieldOverlay'
import { TemplateFieldPropertiesPanel } from './TemplateFieldPropertiesPanel'
import { TemplateUploadArea } from './TemplateUploadArea'
import { ValidationBanner } from './ValidationBanner'
import { ReadOnlyBanner } from './ReadOnlyBanner'
import { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'
import { TEMPLATE_FIELD_COLORS } from '@/types'
import { buildPdfFromPages, drawFieldsOnCanvas, downloadBlob } from '@/utils/canvasToPdf'

interface PageViewport {
  width: number
  height: number
  scale: number
}

/**
 * Normalize user-provided categories: auto-generate `id` and `category` fields
 * so internal code can rely on them without requiring the consumer to provide them.
 */
function normalizeCategories(categories: SystemFieldCategory[]): SystemFieldCategory[] {
  return categories.map(cat => {
    const catId = cat.id || cat.name.toLowerCase().replace(/\s+/g, '-')
    return {
      ...cat,
      id: catId,
      fields: cat.fields.map(f => ({
        ...f,
        id: f.id || `${catId}--${f.name.toLowerCase().replace(/\s+/g, '-')}`,
        category: f.category || cat.name,
      })),
    }
  })
}

export const FATemplateEditor = forwardRef<TemplateEditorAPI, FATemplateEditorProps>(
  (
    {
      document: documentSource,
      template,
      systemFieldCategories = [],
      config = {},
      initialFields = [],
      onSave,
      onDiscard,
      onDocumentLoaded,
      onFieldsChange,
      className = '',
      style = {},
    },
    ref,
  ) => {
    const normalizedCategories = useMemo(
      () => normalizeCategories(systemFieldCategories),
      [systemFieldCategories],
    )

    const editor = useTemplateEditor(initialFields)
    const { templateAPI, engine, state, actions } = editor
    const templateAPIRef = useRef(templateAPI)
    templateAPIRef.current = templateAPI

    const containerRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const pagesWrapperRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
    const pageViewports = useRef<Map<number, PageViewport>>(new Map())
    const isScrollingToPage = useRef(false)

    const [isFullscreen, setIsFullscreen] = useState(false)
    const [dismissedValidation, setDismissedValidation] = useState(false)
    const [showMobileSidebar, setShowMobileSidebar] = useState(false)

    const { isMobile } = useResponsive(containerRef)
    const readOnly = config.readOnly || false
    const allowCustomFields = config.allowCustomFields || false

    // Drag to canvas
    const handleFieldDrop = useCallback((pageNumber: number, bounds: Rect, data: DragFieldData) => {
      actions.addField({
        fieldType: data.fieldType,
        name: data.systemFieldName || `${data.fieldType}Field`,
        pageNumber,
        bounds,
        systemFieldId: data.systemFieldId,
        systemFieldName: data.systemFieldName,
        fontSize: 12,
        borderVisible: true,
        requiredAtGeneration: false,
        multiline: false,
      })
      setShowMobileSidebar(false)
    }, [actions])

    // Compute PDF page dimensions (unscaled) for accurate drop coordinate conversion
    const pageDimensionsRef = useRef<Map<number, { width: number; height: number }>>(new Map())
    // Keep in sync with pageViewports
    const pageDimensions = pageDimensionsRef.current

    const { isDragOver } = useDragToCanvas({
      containerRef: scrollContainerRef,
      pageRefs: pageRefs.current,
      scale: state.zoom,
      pageDimensions,
      enabled: !readOnly && !!state.documentInfo,
      onFieldDrop: handleFieldDrop,
    })

    // Expose API
    useImperativeHandle(ref, () => templateAPI, [templateAPI])

    // Load document when source changes
    useEffect(() => {
      let cancelled = false
      if (documentSource) {
        templateAPIRef.current.loadDocument(documentSource).catch(err => {
          if (!cancelled && err.message !== 'Load already in progress') {
            console.error('Failed to load document:', err)
          }
        })
      }
      return () => { cancelled = true }
    }, [documentSource])

    // Subscribe to document loaded
    useEffect(() => {
      if (!onDocumentLoaded) return
      const unsub = eventBus.on(ViewerEvent.DocumentLoaded, onDocumentLoaded)
      return unsub
    }, [onDocumentLoaded])

    // Notify field changes
    useEffect(() => {
      onFieldsChange?.(state.fields)
    }, [state.fields, onFieldsChange])

    // Navigate to page and scroll — wraps actions.goToPage with scroll lock
    const navigateToPage = useCallback((pageNumber: number) => {
      isScrollingToPage.current = true
      actions.goToPage(pageNumber)
    }, [actions])

    // Track current page via scroll
    const handleScroll = useCallback(() => {
      if (isScrollingToPage.current || !scrollContainerRef.current) return
      const container = scrollContainerRef.current
      const containerRect = container.getBoundingClientRect()
      const scrollCenterY = containerRect.top + containerRect.height / 2

      let closestPage = 1
      let closestDist = Infinity
      pageRefs.current.forEach((el, pageNum) => {
        const rect = el.getBoundingClientRect()
        const center = rect.top + rect.height / 2
        const dist = Math.abs(center - scrollCenterY)
        if (dist < closestDist) {
          closestDist = dist
          closestPage = pageNum
        }
      })

      if (closestPage !== state.currentPage) {
        actions.goToPage(closestPage)
      }
    }, [state.currentPage, actions])

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

    // Scroll to page when tab clicked
    const lastScrolledPage = useRef(state.currentPage)
    useEffect(() => {
      if (lastScrolledPage.current === state.currentPage) return
      lastScrolledPage.current = state.currentPage
      const el = pageRefs.current.get(state.currentPage)
      if (!el) return
      isScrollingToPage.current = true
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // Detect scroll end: poll until scroll position stabilises
      const container = scrollContainerRef.current
      let lastScrollTop = container?.scrollTop ?? 0
      let stableCount = 0
      const checkInterval = setInterval(() => {
        const currentScrollTop = container?.scrollTop ?? 0
        if (Math.abs(currentScrollTop - lastScrollTop) < 1) {
          stableCount++
          if (stableCount >= 3) {
            isScrollingToPage.current = false
            clearInterval(checkInterval)
          }
        } else {
          stableCount = 0
        }
        lastScrollTop = currentScrollTop
      }, 100)

      // Safety fallback
      const maxTimer = setTimeout(() => {
        isScrollingToPage.current = false
        clearInterval(checkInterval)
      }, 2000)

      return () => { clearInterval(checkInterval); clearTimeout(maxTimer) }
    }, [state.currentPage])

    // Fullscreen
    const toggleFullscreen = useCallback(() => {
      const el = containerRef.current
      if (!el) return
      if (!document.fullscreenElement) el.requestFullscreen().catch(() => {})
      else document.exitFullscreen().catch(() => {})
    }, [])

    useEffect(() => {
      const onChange = () => setIsFullscreen(!!document.fullscreenElement)
      document.addEventListener('fullscreenchange', onChange)
      return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    // File upload
    const handleUpload = useCallback((file: File) => {
      templateAPI.loadDocument(file)
    }, [templateAPI])

    // Save handler — also calls onSave callback for parent integration
    const handleSave = useCallback(() => {
      if (!onSave || !template) return
      onSave({
        template,
        fields: state.fields,
        exportJson: templateAPI.exportTemplate(template),
        documentSource: templateAPI.getDocumentSource() ?? undefined,
      })
    }, [onSave, template, state.fields, templateAPI])

    // Download handler — renders preview PDF with fields baked onto pages
    const handleDownload = useCallback(async () => {
      const numPages = state.documentInfo?.numPages ?? 0
      if (numPages === 0) return

      const pdfPages: { jpeg: ArrayBuffer; width: number; height: number }[] = []

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        // Get page info for dimensions
        const pageInfo = await engine.getPageInfo(pageNum)
        const renderScale = 2 // render at 2x for quality
        const pxWidth = pageInfo.width * renderScale
        const pxHeight = pageInfo.height * renderScale

        // Create offscreen canvas and render PDF page
        const offscreen = document.createElement('canvas')
        offscreen.width = pxWidth
        offscreen.height = pxHeight
        const fullViewport = {
          width: pxWidth,
          height: pxHeight,
          scale: renderScale,
          rotation: PageRotation.Rotate0,
          offsetX: 0,
          offsetY: 0,
        }
        await engine.renderPage(pageNum, offscreen, fullViewport)

        // Draw field overlays onto the canvas
        const ctx = offscreen.getContext('2d')
        if (ctx) {
          const pageFields = state.fields
            .filter(f => f.pageNumber === pageNum)
            .map(f => ({
              name: f.systemFieldName || f.name,
              bounds: f.bounds,
              fieldType: f.fieldType,
              defaultValue: f.defaultValue,
              dateFormat: f.dateFormat,
              borderVisible: f.borderVisible,
              fontSize: f.fontSize,
              multiline: f.multiline,
              labelVisible: f.labelVisible,
            }))
          drawFieldsOnCanvas(ctx, pageFields, renderScale, TEMPLATE_FIELD_COLORS)
        }

        // Convert to JPEG
        const blob = await new Promise<Blob>((resolve) => {
          offscreen.toBlob((b) => resolve(b!), 'image/jpeg', 0.92)
        })
        const arrayBuf = await blob.arrayBuffer()

        pdfPages.push({
          jpeg: arrayBuf,
          width: pageInfo.width, // PDF points (unscaled)
          height: pageInfo.height,
        })
      }

      const pdfBlob = buildPdfFromPages(pdfPages)
      const filename = (template?.name || 'template').replace(/[^a-zA-Z0-9_-]/g, '_') + '_preview.pdf'
      downloadBlob(pdfBlob, filename)
    }, [state.documentInfo, state.fields, engine, template])

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        const tagName = target.tagName.toLowerCase()
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return

        const mod = e.metaKey || e.ctrlKey
        const key = e.key.toLowerCase()

        if (mod && key === 'z' && !e.shiftKey) {
          e.preventDefault()
          actions.undo()
          return
        }
        if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
          e.preventDefault()
          actions.redo()
          return
        }
        if (mod && key === 's') {
          e.preventDefault()
          handleSave()
          return
        }
        if (e.key === 'Escape') {
          actions.selectField(null)
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [actions, handleSave])

    // Deselect field on canvas background click
    const handleCanvasBackgroundClick = useCallback(() => {
      actions.selectField(null)
    }, [actions])

    // Handle "Upload PDF" from Add Page menu — loads a new PDF document
    const handleAddPdfPage = useCallback((file: File) => {
      templateAPI.loadDocument(file)
    }, [templateAPI])

    // Render pages
    const pdfPageCount = state.documentInfo?.numPages ?? 0
    const renderPages = () => {
      if (!state.documentInfo) return null

      const pages = []
      for (let pageNum = 1; pageNum <= state.totalPages; pageNum++) {
        const isPdfPage = pageNum <= pdfPageCount
        pages.push(
          <div
            key={pageNum}
            ref={(el) => {
              if (el) pageRefs.current.set(pageNum, el)
              else pageRefs.current.delete(pageNum)
            }}
          >
            {isPdfPage ? (
              <TemplatePageCanvas
                pageNumber={pageNum}
                scale={state.zoom}
                engine={engine}
                fields={state.fields}
                selectedFieldId={state.selectedFieldId}
                readOnly={readOnly}
                requireSystemMapping={requireSystemMapping}
                onFieldSelect={actions.selectField}
                onFieldUpdate={actions.updateField}
                onFieldDelete={actions.deleteField}
                onCanvasReady={(pn, canvas, viewport) => {
                  pageCanvasRefs.current.set(pn, canvas)
                  pageViewports.current.set(pn, viewport)
                  pageDimensionsRef.current.set(pn, {
                    width: viewport.width / viewport.scale,
                    height: viewport.height / viewport.scale,
                  })
                }}
                isMobile={isMobile}
              />
            ) : (
              <BlankPageCanvas
                pageNumber={pageNum}
                scale={state.zoom}
                fields={state.fields}
                selectedFieldId={state.selectedFieldId}
                readOnly={readOnly}
                requireSystemMapping={requireSystemMapping}
                onFieldSelect={actions.selectField}
                onFieldUpdate={actions.updateField}
                onFieldDelete={actions.deleteField}
                isMobile={isMobile}
              />
            )}
          </div>
        )
      }
      return pages
    }

    // Error state
    if (state.error) {
      return (
        <div style={editorStyles.errorContainer}>
          <div style={editorStyles.errorBox}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#d32f2f', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#333' }}>
              Error Loading Document
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{state.error.message}</p>
          </div>
        </div>
      )
    }

    const hasSystemFields = normalizedCategories.length > 0 &&
      normalizedCategories.some(cat => cat.fields.length > 0)
    const requireSystemMapping = hasSystemFields && !allowCustomFields
    const showValidation = requireSystemMapping && !dismissedValidation && state.unmappedFieldCount > 0 && !readOnly

    return (
      <div
        ref={containerRef}
        className={`fa-template-editor ${className}`}
        style={{ ...editorStyles.container, ...style }}
      >
        {/* Banners */}
        {readOnly && <ReadOnlyBanner />}
        {showValidation && (
          <ValidationBanner
            unmappedCount={state.unmappedFieldCount}
            onDismiss={() => setDismissedValidation(true)}
          />
        )}

        {/* Top Bar */}
        <TemplateTopBar
          templateName={template?.name || 'New Template'}
          fieldCount={state.fieldCount}
          unmappedFieldCount={requireSystemMapping ? state.unmappedFieldCount : 0}
          zoom={state.zoom}
          isDirty={state.isDirty}
          readOnly={readOnly}
          isFullscreen={isFullscreen}
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          onUndo={actions.undo}
          onRedo={actions.redo}
          onSave={handleSave}
          onDownload={handleDownload}
          hasDocument={!!state.documentInfo}
          onDiscard={onDiscard}
          onZoomIn={actions.zoomIn}
          onZoomOut={actions.zoomOut}
          onZoomSet={actions.setZoom}
          onToggleFullscreen={toggleFullscreen}
          onUploadPdf={readOnly ? undefined : handleUpload}
          isMobile={isMobile}
        />

        {/* Page Tabs */}
        {state.documentInfo && (
          <PageTabsBar
            numPages={state.totalPages}
            currentPage={state.currentPage}
            onPageChange={navigateToPage}
            onAddBlankPage={actions.addBlankPage}
            onAddPdfPage={handleAddPdfPage}
            readOnly={readOnly}
            isMobile={isMobile}
          />
        )}

        {/* Main Content */}
        <div style={editorStyles.content}>
          {/* Left Sidebar — inline on desktop, slide-over on mobile */}
          {!readOnly && !isMobile && (
            <TemplateSidebar
              systemFieldCategories={normalizedCategories}
              placedFields={state.fields}
              disabled={!state.documentInfo}
            />
          )}

          {/* Mobile sidebar toggle button */}
          {!readOnly && isMobile && (
            <button
              style={editorStyles.mobileSidebarToggle}
              onClick={() => setShowMobileSidebar(true)}
              title="Open field panel"
            >
              <i className="fas fa-th-large" style={{ fontSize: 14 }} />
            </button>
          )}

          {/* Mobile sidebar overlay */}
          {!readOnly && isMobile && showMobileSidebar && (
            <div style={editorStyles.mobileOverlayBackdrop} onClick={() => setShowMobileSidebar(false)}>
              <div
                style={editorStyles.mobileSidebarPanel}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={editorStyles.mobileSidebarHeader}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>Fields</span>
                  <button
                    style={editorStyles.mobileSidebarClose}
                    onClick={() => setShowMobileSidebar(false)}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <TemplateSidebar
                    systemFieldCategories={normalizedCategories}
                    placedFields={state.fields}
                    disabled={!state.documentInfo}
                    isMobile
                  />
                </div>
              </div>
            </div>
          )}

          {/* Document Area */}
          <div
            ref={scrollContainerRef}
            style={{
              ...editorStyles.documentArea,
              ...(isDragOver ? editorStyles.documentAreaDragOver : {}),
              ...(isMobile ? { padding: 0 } : {}),
            }}
            onClick={handleCanvasBackgroundClick}
          >
            {state.isLoading ? (
              <div style={editorStyles.loadingContainer}>
                <div style={editorStyles.spinner} />
                <p style={editorStyles.loadingText}>Loading document...</p>
              </div>
            ) : state.documentInfo ? (
              <div ref={pagesWrapperRef} style={{
                ...editorStyles.pagesContainer,
                ...(isMobile ? { padding: 8 } : {}),
              }}>
                {renderPages()}
              </div>
            ) : (
              <TemplateUploadArea
                maxFileSizeMB={config.maxFileSizeMB || 50}
                onUpload={handleUpload}
              />
            )}
          </div>

          {/* Right Panel: Properties — inline on desktop, overlay on mobile */}
          {!isMobile && (
            <TemplateFieldPropertiesPanel
              field={state.selectedField}
              allFields={state.fields}
              systemFieldCategories={normalizedCategories}
              allowCustomFields={allowCustomFields}
              onUpdate={actions.updateField}
              onDelete={(id) => {
                actions.deleteField(id)
                actions.selectField(null)
              }}
              onFieldSelect={actions.selectField}
              onGoToPage={navigateToPage}
              onClose={() => actions.selectField(null)}
            />
          )}

          {/* Mobile properties overlay */}
          {isMobile && state.selectedField && (
            <div style={editorStyles.mobileOverlayBackdrop} onClick={() => actions.selectField(null)}>
              <div
                style={editorStyles.mobilePropertiesPanel}
                onClick={(e) => e.stopPropagation()}
              >
                <TemplateFieldPropertiesPanel
                  field={state.selectedField}
                  allFields={state.fields}
                  systemFieldCategories={normalizedCategories}
                  allowCustomFields={allowCustomFields}
                  onUpdate={actions.updateField}
                  onDelete={(id) => {
                    actions.deleteField(id)
                    actions.selectField(null)
                  }}
                  onFieldSelect={actions.selectField}
                  onGoToPage={navigateToPage}
                  onClose={() => actions.selectField(null)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Page indicator with Jump to Page */}
        {state.documentInfo && (
          <PageIndicator
            currentPage={state.currentPage}
            numPages={state.totalPages}
            onGoToPage={navigateToPage}
          />
        )}
      </div>
    )
  }
)

FATemplateEditor.displayName = 'FATemplateEditor'

// ============================================================================
// PageIndicator — Clickable page counter with Jump to Page popover
// ============================================================================

function PageIndicator({ currentPage, numPages, onGoToPage }: {
  currentPage: number
  numPages: number
  onGoToPage: (page: number) => void
}) {
  const [showPopover, setShowPopover] = useState(false)
  const [jumpValue, setJumpValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showPopover) {
      setJumpValue('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showPopover])

  const handleGo = () => {
    const page = parseInt(jumpValue)
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      onGoToPage(page)
      setShowPopover(false)
    }
  }

  return (
    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
      <div
        style={editorStyles.pageIndicator}
        onClick={() => setShowPopover(!showPopover)}
      >
        Page {currentPage} of {numPages}
      </div>
      {showPopover && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 49 }} onClick={() => setShowPopover(false)} />
          <div style={editorStyles.jumpPopover}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Jump to Page</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                type="number"
                min={1}
                max={numPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGo() }}
                placeholder={`1–${numPages}`}
                style={editorStyles.jumpInput}
              />
              <button style={editorStyles.jumpButton} onClick={handleGo}>Go</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// TemplatePageCanvas — Renders a single PDF page with template field overlay
// ============================================================================

interface TemplatePageCanvasProps {
  pageNumber: number
  scale: number
  engine: PDFDocumentEngine
  fields: TemplateField[]
  selectedFieldId: string | null
  readOnly: boolean
  requireSystemMapping?: boolean
  onFieldSelect: (id: string) => void
  onFieldUpdate: (id: string, updates: Partial<TemplateField>) => void
  onFieldDelete: (id: string) => void
  onCanvasReady?: (pageNumber: number, canvas: HTMLCanvasElement, viewport: PageViewport) => void
  isMobile?: boolean
}

function TemplatePageCanvas({
  pageNumber,
  scale,
  engine,
  fields,
  selectedFieldId,
  readOnly,
  requireSystemMapping = false,
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  onCanvasReady,
  isMobile = false,
}: TemplatePageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const [isRendering, setIsRendering] = useState(false)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      if (!canvasRef.current || !engine.getNumPages()) return
      setIsRendering(true)
      try {
        const pageInfo = await engine.getPageInfo(pageNumber)
        if (cancelled) return
        const vp: PageViewport = {
          width: pageInfo.width * scale,
          height: pageInfo.height * scale,
          scale,
        }
        setViewport(vp)

        const fullViewport = {
          width: vp.width,
          height: vp.height,
          scale,
          rotation: PageRotation.Rotate0,
          offsetX: 0,
          offsetY: 0,
        }

        if (!cancelled && canvasRef.current) {
          await engine.renderPage(pageNumber, canvasRef.current, fullViewport)
          onCanvasReady?.(pageNumber, canvasRef.current, vp)
        }
      } catch (err) {
        if (cancelled) return
        if (err instanceof Error && (err.message.includes('Transport destroyed') || err.message.includes('No document loaded'))) return
        console.error(`Failed to render page ${pageNumber}:`, err)
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    }
    render()
    return () => { cancelled = true }
  }, [pageNumber, scale, engine, onCanvasReady])

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: isMobile ? 12 : 32,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        background: '#fff',
        borderRadius: 2,
        overflow: 'hidden',
        // Explicit dimensions so canvas display size = pixel size (no CSS scaling)
        width: viewport ? viewport.width : undefined,
        height: viewport ? viewport.height : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block' }}
      />

      {viewport && (
        <TemplateFieldOverlay
          pageNumber={pageNumber}
          fields={fields}
          scale={scale}
          pageWidth={viewport.width / viewport.scale}
          pageHeight={viewport.height / viewport.scale}
          selectedFieldId={selectedFieldId}
          readOnly={readOnly}
          requireSystemMapping={requireSystemMapping}
          onFieldSelect={onFieldSelect}
          onFieldUpdate={onFieldUpdate}
          onFieldDelete={onFieldDelete}
        />
      )}

      {isRendering && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.8)',
        }}>
          <div>Rendering page {pageNumber}...</div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// BlankPageCanvas — Renders an empty page for extra (non-PDF) pages
// ============================================================================

const BLANK_PAGE_WIDTH = 612  // US Letter width in PDF units
const BLANK_PAGE_HEIGHT = 792 // US Letter height in PDF units

interface BlankPageCanvasProps {
  pageNumber: number
  scale: number
  fields: TemplateField[]
  selectedFieldId: string | null
  readOnly: boolean
  requireSystemMapping?: boolean
  onFieldSelect: (id: string) => void
  onFieldUpdate: (id: string, updates: Partial<TemplateField>) => void
  onFieldDelete: (id: string) => void
  isMobile?: boolean
}

function BlankPageCanvas({
  pageNumber,
  scale,
  fields,
  selectedFieldId,
  readOnly,
  requireSystemMapping = false,
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  isMobile = false,
}: BlankPageCanvasProps) {
  const width = BLANK_PAGE_WIDTH * scale
  const height = BLANK_PAGE_HEIGHT * scale

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        marginBottom: isMobile ? 12 : 32,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        background: '#fff',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Blank page label */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#ccc',
        fontSize: 14,
        fontWeight: 500,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        Blank Page {pageNumber}
      </div>

      <TemplateFieldOverlay
        pageNumber={pageNumber}
        fields={fields}
        scale={scale}
        pageWidth={BLANK_PAGE_WIDTH}
        pageHeight={BLANK_PAGE_HEIGHT}
        selectedFieldId={selectedFieldId}
        readOnly={readOnly}
        requireSystemMapping={requireSystemMapping}
        onFieldSelect={onFieldSelect}
        onFieldUpdate={onFieldUpdate}
        onFieldDelete={onFieldDelete}
      />
    </div>
  )
}

// ============================================================================
// Styles
// ============================================================================

const editorStyles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f5',
    color: '#333',
    overflow: 'hidden',
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    position: 'relative',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  documentArea: {
    flex: 1,
    overflow: 'auto',
    background: '#e8e8e8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    transition: 'background 0.2s ease',
  },
  documentAreaDragOver: {
    background: '#dceefb',
  },
  pagesContainer: {
    padding: 32,
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
    gap: 16,
    color: '#888',
  },
  loadingText: {
    margin: 0,
    fontSize: 13,
    fontWeight: 500,
    color: '#888',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #ddd',
    borderTop: '3px solid #1976D2',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
  },
  errorBox: {
    padding: 32,
    background: '#ffffff',
    border: '1px solid #f5c6cb',
    borderRadius: 12,
    textAlign: 'center' as const,
    maxWidth: 460,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  },
  pageIndicator: {
    padding: '4px 12px',
    background: 'rgba(0,0,0,0.6)',
    color: '#ffffff',
    borderRadius: 12,
    fontSize: 12,
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  jumpPopover: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 8,
    padding: '10px 12px',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    minWidth: 140,
  },
  jumpInput: {
    flex: 1,
    padding: '6px 8px',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    fontSize: 13,
    outline: 'none',
    width: 70,
  },
  jumpButton: {
    padding: '6px 12px',
    background: '#1976D2',
    border: 'none',
    borderRadius: 4,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  mobileSidebarToggle: {
    position: 'absolute' as const,
    top: 10,
    left: 10,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 8,
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#555',
  },
  mobileOverlayBackdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 1000,
    display: 'flex',
  },
  mobileSidebarPanel: {
    width: '85%',
    maxWidth: 320,
    height: '100%',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
  },
  mobileSidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
  },
  mobileSidebarClose: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: '#666',
    fontSize: 16,
    cursor: 'pointer',
  },
  mobilePropertiesPanel: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: '90%',
    maxWidth: 340,
    background: '#ffffff',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
    overflow: 'auto',
  },
}
