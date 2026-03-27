/**
 * useTemplateEditor Hook
 *
 * Central hook for the template editor. Manages document state, template fields,
 * selection, dirty tracking, and exposes the TemplateEditorAPI.
 */

import { useRef, useState, useCallback, useMemo, useEffect, type MutableRefObject } from 'react'
import type {
  TemplateEditorAPI,
  DocumentInfo,
  DocumentSource,
  TemplateField,
  TemplateInfo,
  TemplateExportData,
  AzureAnalyzeResponse,
  AzureImportOptions,
} from '@/types'
import { convertAzureToFields } from '@/core/utils/azureImport'
import { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'
import { eventBus } from '@/core/events/EventBus'
import { ViewerEvent } from '@/types'

export function useTemplateEditor(
  initialFields: TemplateField[] = [],
) {
  const engineRef = useRef<PDFDocumentEngine>(new PDFDocumentEngine())

  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoomValue] = useState(1.0)
  const [fields, setFieldsState] = useState<TemplateField[]>(initialFields)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)
  const [error, setError] = useState<Error | null>(null)
  const [interactionMode, setInteractionMode] = useState<'cursor' | 'pan'>('cursor')
  const [numExtraPages, setNumExtraPages] = useState(0)
  const documentSourceRef = useRef<DocumentSource | null>(null)

  // Refs for stable getters
  const stateRef = useRef({ documentInfo, currentPage, zoom })
  stateRef.current = { documentInfo, currentPage, zoom }
  const fieldsRef = useRef<TemplateField[]>(initialFields)
  fieldsRef.current = fields

  // Sync initialFields when they change after mount (e.g. async API data)
  useEffect(() => {
    if (initialFields.length > 0) {
      setFieldsState(initialFields)
      initialFieldsJson.current = JSON.stringify(initialFields)
      // Clear undo/redo since we're resetting to new initial state
      undoStackRef.current = []
      redoStackRef.current = []
    }
  }, [initialFields])

  // Dirty tracking
  const initialFieldsJson = useRef(JSON.stringify(initialFields))
  const isDirty = useMemo(() => {
    return JSON.stringify(fields) !== initialFieldsJson.current
  }, [fields])

  // Undo/redo history (two-stack model)
  const MAX_HISTORY = 50
  const undoStackRef: MutableRefObject<TemplateField[][]> = useRef([])
  const redoStackRef: MutableRefObject<TemplateField[][]> = useRef([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncUndoRedoState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
  }, [])

  const pushHistory = useCallback(() => {
    const snapshot = fieldsRef.current.map(f => ({ ...f }))
    undoStackRef.current.push(snapshot)
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current = undoStackRef.current.slice(undoStackRef.current.length - MAX_HISTORY)
    }
    // Any new mutation clears the redo stack
    redoStackRef.current = []
    syncUndoRedoState()
  }, [syncUndoRedoState])

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    // Save current state to redo stack
    redoStackRef.current.push(fieldsRef.current.map(f => ({ ...f })))
    // Restore previous state
    const snapshot = undoStackRef.current.pop()!
    setFieldsState(snapshot)
    syncUndoRedoState()
  }, [syncUndoRedoState])

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    // Save current state to undo stack
    undoStackRef.current.push(fieldsRef.current.map(f => ({ ...f })))
    // Restore next state
    const snapshot = redoStackRef.current.pop()!
    setFieldsState(snapshot)
    syncUndoRedoState()
  }, [syncUndoRedoState])

  // Computed values
  const unmappedFieldCount = useMemo(() => {
    return fields.filter(f => !f.systemFieldId).length
  }, [fields])

  const fieldCount = fields.length

  const fieldsByPage = useMemo(() => {
    const map = new Map<number, TemplateField[]>()
    for (const field of fields) {
      const pageFields = map.get(field.pageNumber) || []
      pageFields.push(field)
      map.set(field.pageNumber, pageFields)
    }
    return map
  }, [fields])

  // Document operations
  const loadPromiseRef = useRef<Promise<void> | null>(null)

  const loadDocument = useCallback(async (source: DocumentSource) => {
    // If already loading, return the existing promise to avoid race conditions
    // (React StrictMode fires effects twice)
    if (isLoadingRef.current && loadPromiseRef.current) {
      return loadPromiseRef.current
    }

    setIsLoading(true)
    isLoadingRef.current = true
    setError(null)
    documentSourceRef.current = source

    const promise = (async () => {
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
        isLoadingRef.current = false
        loadPromiseRef.current = null
      }
    })()

    loadPromiseRef.current = promise
    return promise
  }, [])

  const totalPages = (documentInfo?.numPages ?? 0) + numExtraPages

  const goToPage = useCallback((pageNumber: number) => {
    const tp = (stateRef.current.documentInfo?.numPages ?? 0) + numExtraPages
    if (tp === 0) return
    const page = Math.max(1, Math.min(pageNumber, tp))
    setCurrentPage(page)
    eventBus.emit(ViewerEvent.PageChanged, {
      pageNumber: page,
      totalPages: tp,
    })
  }, [numExtraPages])

  // Zoom
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(zoom * 1.25, 5.0)
    setZoomValue(newZoom)
  }, [zoom])

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(zoom / 1.25, 0.25)
    setZoomValue(newZoom)
  }, [zoom])

  const setZoom = useCallback((value: number) => {
    setZoomValue(Math.max(0.25, Math.min(value, 5.0)))
  }, [])

  // Page management
  const addBlankPage = useCallback(() => {
    setNumExtraPages(prev => prev + 1)
    const newPageNum = (stateRef.current.documentInfo?.numPages ?? 0) + numExtraPages + 1
    setCurrentPage(newPageNum)
  }, [numExtraPages])

  // Field CRUD
  const addField = useCallback((field: Omit<TemplateField, 'id'>) => {
    pushHistory()
    const id = `tfield-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newField: TemplateField = { ...field, id }
    setFieldsState(prev => [...prev, newField])
    setSelectedFieldId(id)
    return id
  }, [pushHistory])

  const updateField = useCallback((id: string, updates: Partial<TemplateField>) => {
    pushHistory()
    setFieldsState(prev =>
      prev.map(f => (f.id === id ? { ...f, ...updates } : f))
    )
  }, [pushHistory])

  const deleteField = useCallback((id: string) => {
    pushHistory()
    setFieldsState(prev => prev.filter(f => f.id !== id))
    setSelectedFieldId(prev => (prev === id ? null : prev))
  }, [pushHistory])

  const selectField = useCallback((id: string | null) => {
    setSelectedFieldId(id)
  }, [])

  // Selected field derived
  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null
    return fields.find(f => f.id === selectedFieldId) || null
  }, [fields, selectedFieldId])

  // Export / Import
  const exportTemplate = useCallback((template?: TemplateInfo): string => {
    const exportData: TemplateExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      template,
      fields: fieldsRef.current,
    }
    return JSON.stringify(exportData, null, 2)
  }, [])

  const importTemplate = useCallback((input: string | TemplateExportData): TemplateField[] => {
    let data: TemplateExportData
    try {
      data = typeof input === 'string' ? JSON.parse(input) : input
    } catch {
      console.error('Failed to parse template JSON')
      return []
    }

    // Support both versioned format and legacy { fields: [...] }
    const rawFields = data.fields
    if (!Array.isArray(rawFields)) {
      console.error('Invalid template data: missing fields array')
      return []
    }

    // Validate each field has required properties
    const validFields = rawFields.filter(f =>
      f && typeof f.id === 'string' &&
      typeof f.fieldType === 'string' &&
      typeof f.name === 'string' &&
      typeof f.pageNumber === 'number' &&
      f.bounds && typeof f.bounds.x === 'number'
    )

    if (validFields.length !== rawFields.length) {
      console.warn(`Imported ${validFields.length} of ${rawFields.length} fields (${rawFields.length - validFields.length} invalid)`)
    }

    pushHistory()
    setFieldsState(validFields)
    return validFields
  }, [pushHistory])

  const importFromAzure = useCallback((
    response: AzureAnalyzeResponse,
    options?: AzureImportOptions,
  ): TemplateField[] => {
    const fields = convertAzureToFields(response, options)
    if (fields.length > 0) {
      pushHistory()
      setFieldsState(prev => [...prev, ...fields])
    }
    return fields
  }, [pushHistory])

  // API
  const templateAPI: TemplateEditorAPI = useMemo(() => ({
    loadDocument,
    getDocumentSource: () => documentSourceRef.current,
    getFields: () => fieldsRef.current,
    setFields: (f: TemplateField[]) => { pushHistory(); setFieldsState(f) },
    getUnmappedFields: () => fieldsRef.current.filter(f => !f.systemFieldId),
    goToPage,
    setZoom,
    getZoom: () => stateRef.current.zoom,
    exportTemplate: (template?: TemplateInfo) => exportTemplate(template),
    importTemplate: (input: string | TemplateExportData) => importTemplate(input),
    importFromAzure: (response: AzureAnalyzeResponse, options?: AzureImportOptions) => importFromAzure(response, options),
  }), [loadDocument, goToPage, setZoom, exportTemplate, importTemplate, importFromAzure, pushHistory])

  return {
    templateAPI,
    engine: engineRef.current,
    state: {
      documentInfo,
      currentPage,
      zoom,
      fields,
      selectedFieldId,
      selectedField,
      isDirty,
      unmappedFieldCount,
      fieldCount,
      fieldsByPage,
      totalPages,
      isLoading,
      error,
      interactionMode,
      canUndo,
      canRedo,
      documentSource: documentSourceRef.current,
    },
    actions: {
      loadDocument,
      goToPage,
      zoomIn,
      zoomOut,
      setZoom,
      addField,
      updateField,
      deleteField,
      selectField,
      addBlankPage,
      setInteractionMode,
      undo,
      redo,
    },
  }
}
