/**
 * useViewer Hook
 * 
 * Main React hook that provides the complete viewer API.
 * Manages document state, rendering, annotations, and all viewer operations.
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import type {
  ViewerAPI,
  ViewerConfig,
  DocumentInfo,
  DocumentSource,
  ZoomMode,
  Annotation,
  SearchResult,
  SearchOptions,
  FormField,
} from '@/types'
import { ToolMode } from '@/types'
import { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'
import { AnnotationManager } from '@/core/annotations/AnnotationManager'
import { eventBus } from '@/core/events/EventBus'
import { ViewerEvent } from '@/types'

export function useViewer(config: ViewerConfig = {}) {
  // Core engines
  const engineRef = useRef<PDFDocumentEngine>(new PDFDocumentEngine())
  const annotationManagerRef = useRef<AnnotationManager>(new AnnotationManager(eventBus))

  // State
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoomValue] = useState(config.initialZoom === 'fit-width' ? 1.0 : 1.0)
  const [zoomMode, setZoomMode] = useState<ZoomMode | null>(
    typeof config.initialZoom === 'string' ? config.initialZoom as ZoomMode : null
  )
  const [tool, setTool] = useState<ToolMode>(config.defaultTool || ToolMode.TextSelect)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [annotationsVersion, setAnnotationsVersion] = useState(0) // Force re-render on import
  const [formFields, setFormFieldsState] = useState<FormField[]>([])

  // Use refs for state that's read by getter functions - prevents useMemo invalidation
  const stateRef = useRef({ documentInfo, currentPage, zoom, tool })
  stateRef.current = { documentInfo, currentPage, zoom, tool }
  
  // Use ref for form fields to avoid stale closure
  const formFieldsRef = useRef<FormField[]>([])
  formFieldsRef.current = formFields

  // Listen for annotations imported event to force re-render
  useEffect(() => {
    const unsubscribe = eventBus.on(ViewerEvent.AnnotationsImported, () => {
      setAnnotationsVersion((v) => v + 1)
    })
    return unsubscribe
  }, [])

  // Load document
  const loadDocument = useCallback(async (source: DocumentSource) => {
    setIsLoading(true)
    setError(null)

    try {
      const info = await engineRef.current.loadDocument(source)
      setDocumentInfo(info)
      setCurrentPage(1)
      
      eventBus.emit(ViewerEvent.DocumentLoaded, { document: info })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load document')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Close document
  const closeDocument = useCallback(async () => {
    await engineRef.current.closeDocument()
    setDocumentInfo(null)
    setCurrentPage(1)
    setSearchResults([])
    annotationManagerRef.current.clearAnnotations()
    
    eventBus.emit(ViewerEvent.DocumentClosed, {})
  }, [])

  // Navigation
  const goToPage = useCallback((pageNumber: number) => {
    if (!documentInfo) return
    
    const page = Math.max(1, Math.min(pageNumber, documentInfo.numPages))
    setCurrentPage(page)
    
    eventBus.emit(ViewerEvent.PageChanged, {
      pageNumber: page,
      totalPages: documentInfo.numPages,
    })
  }, [documentInfo])

  const nextPage = useCallback(() => {
    if (!documentInfo) return
    goToPage(currentPage + 1)
  }, [currentPage, documentInfo, goToPage])

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  // Zoom control
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(zoom * 1.25, 5.0)
    setZoomValue(newZoom)
    setZoomMode(null)
    
    eventBus.emit(ViewerEvent.ZoomChanged, { zoom: newZoom })
  }, [zoom])

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(zoom / 1.25, 0.1)
    setZoomValue(newZoom)
    setZoomMode(null)
    
    eventBus.emit(ViewerEvent.ZoomChanged, { zoom: newZoom })
  }, [zoom])

  const setZoom = useCallback((value: number | ZoomMode) => {
    if (typeof value === 'number') {
      setZoomValue(Math.max(0.1, Math.min(value, 5.0)))
      setZoomMode(null)
      eventBus.emit(ViewerEvent.ZoomChanged, { zoom: value })
    } else {
      setZoomMode(value)
      eventBus.emit(ViewerEvent.ZoomChanged, { zoom: 0, mode: value })
    }
  }, [])

  // Annotation operations
  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'>) => {
    return annotationManagerRef.current.addAnnotation(annotation)
  }, [])

  const updateAnnotation = useCallback((id: string, changes: Partial<Annotation>) => {
    annotationManagerRef.current.updateAnnotation(id, changes)
  }, [])

  const deleteAnnotation = useCallback((id: string) => {
    annotationManagerRef.current.deleteAnnotation(id)
  }, [])

  const getAnnotations = useCallback((pageNumber?: number) => {
    return annotationManagerRef.current.getAnnotations(pageNumber)
  }, [])

  const exportAnnotations = useCallback(() => {
    try {
      const annotations = JSON.parse(annotationManagerRef.current.exportAnnotations())
      const combined = {
        annotations,
        formFields: formFieldsRef.current
      }
      return JSON.stringify(combined, null, 2)
    } catch {
      const combined = {
        annotations: [],
        formFields: formFieldsRef.current
      }
      return JSON.stringify(combined, null, 2)
    }
  }, [])

  const importAnnotations = useCallback((json: string) => {
    try {
      const data = JSON.parse(json)
      
      // Check if it's the new combined format
      if (data.annotations && data.formFields) {
        // Combined format
        annotationManagerRef.current.importAnnotations(JSON.stringify(data.annotations))
        setFormFieldsState(data.formFields)
      } else if (Array.isArray(data)) {
        // Legacy format - just annotations
        annotationManagerRef.current.importAnnotations(json)
      } else {
        throw new Error('Invalid format')
      }
    } catch (error) {
      // Fallback to old format
      annotationManagerRef.current.importAnnotations(json)
    }
  }, [])

  // Search
  const search = useCallback(async (query: string, options?: SearchOptions): Promise<SearchResult[]> => {
    if (!documentInfo) return []

    const results = await engineRef.current.searchText(query, options)
    const searchResults: SearchResult[] = results.map((result, index) => ({
      pageNumber: result.pageNumber,
      text: result.text,
      rect: { x: 0, y: 0, width: 0, height: 0 }, // Would need text positions from PDF.js
      index,
    }))

    setSearchResults(searchResults)
    eventBus.emit(ViewerEvent.SearchCompleted, { results: searchResults })
    
    return searchResults
  }, [documentInfo])

  const clearSearch = useCallback(() => {
    setSearchResults([])
  }, [])

  // Tool management
  const setToolMode = useCallback((newTool: ToolMode) => {
    setTool(newTool)
    eventBus.emit(ViewerEvent.ToolChanged, { tool: newTool })
  }, [])

  // Undo/Redo
  const undo = useCallback(() => {
    annotationManagerRef.current.undo()
  }, [])

  const redo = useCallback(() => {
    annotationManagerRef.current.redo()
  }, [])

  const canUndo = useCallback(() => {
    return annotationManagerRef.current.canUndo()
  }, [])

  const canRedo = useCallback(() => {
    return annotationManagerRef.current.canRedo()
  }, [])
  
  // Form field operations
  const getFormFields = useCallback(() => {
    return formFieldsRef.current
  }, [])
  
  const setFormFields = useCallback((fields: FormField[]) => {
    setFormFieldsState(fields)
  }, [])

  // Build viewer API with useMemo to prevent infinite loops
  const viewerAPI: ViewerAPI = useMemo(() => ({
    loadDocument,
    closeDocument,
    getDocumentInfo: () => stateRef.current.documentInfo,
    goToPage,
    nextPage,
    previousPage,
    getCurrentPage: () => stateRef.current.currentPage,
    zoomIn,
    zoomOut,
    setZoom,
    getZoom: () => stateRef.current.zoom,
    rotatePage: () => {}, // TODO: Implement
    rotateAllPages: () => {}, // TODO: Implement
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotations,
    exportAnnotations,
    importAnnotations,
    search,
    clearSearch,
    setTool: setToolMode,
    getTool: () => stateRef.current.tool,
    undo,
    redo,
    canUndo,
    canRedo,
    getFormFields,
    setFormFields,
  }), [
    loadDocument,
    closeDocument,
    goToPage,
    nextPage,
    previousPage,
    zoomIn,
    zoomOut,
    setZoom,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotations,
    exportAnnotations,
    importAnnotations,
    search,
    clearSearch,
    setToolMode,
    undo,
    redo,
    canUndo,
    canRedo,
    getFormFields,
    setFormFields,
  ])

  return {
    viewerAPI,
    engine: engineRef.current,
    annotationManager: annotationManagerRef.current,
    state: {
      documentInfo,
      currentPage,
      zoom,
      zoomMode,
      tool,
      isLoading,
      error,
      searchResults,
      annotationsVersion,
      formFields,
    },
  }
}
