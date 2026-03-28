/**
 * Core Type Definitions for Fresh Air PDF
 * 
 * This file contains all the fundamental types used throughout the application.
 * Core type definitions for the PDF viewer API.
 */

// ============================================================================
// Document Types
// ============================================================================

export interface DocumentInfo {
  numPages: number
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
  fileSize?: number
}

export interface PageInfo {
  pageNumber: number
  width: number
  height: number
  rotation: PageRotation
}

export enum PageRotation {
  Rotate0 = 0,
  Rotate90 = 90,
  Rotate180 = 180,
  Rotate270 = 270,
}

export type DocumentSource = string | Blob | ArrayBuffer | Uint8Array

// ============================================================================
// Viewer Configuration
// ============================================================================

export interface ViewerConfig {
  enableAnnotations?: boolean
  readOnly?: boolean
  theme?: 'light' | 'dark'
  initialZoom?: ZoomMode | number
  defaultTool?: ToolMode
  showToolbar?: boolean
  showThumbnails?: boolean
  showOutline?: boolean
  showSearch?: boolean
  enableTextSelection?: boolean
  enablePanning?: boolean
  virtualizePages?: boolean
  maxCanvasSize?: number
  workerUrl?: string
  locale?: string
}

export enum ZoomMode {
  FitWidth = 'fit-width',
  FitPage = 'fit-page',
  Auto = 'auto',
}

export enum ToolMode {
  TextSelect = 'text-select',
  Underline = 'underline',
  Strikeout = 'strikeout',
  FreeText = 'free-text',
  Rectangle = 'rectangle',
  Circle = 'circle',
  Ellipse = 'ellipse',
  Arrow = 'arrow',
  Line = 'line',
  Ink = 'ink',
  Note = 'note',
  Signature = 'signature',
  Stamp = 'stamp',
  // Form Field Tools
  FormTextField = 'form-text-field',
  FormCheckbox = 'form-checkbox',
  FormRadio = 'form-radio',
  FormDropdown = 'form-dropdown',
  FormSignature = 'form-signature',
}

// ============================================================================
// Annotation Types
// ============================================================================

export interface BaseAnnotation {
  id: string
  type: AnnotationType
  pageNumber: number
  author?: string
  createdAt: Date
  modifiedAt: Date
  color?: string
  opacity?: number
  selected?: boolean
}

export enum AnnotationType {
  Underline = 'underline',
  Strikeout = 'strikeout',
  FreeText = 'free-text',
  Rectangle = 'rectangle',
  Circle = 'circle',
  Arrow = 'arrow',
  Line = 'line',
  Ink = 'ink',
}

export interface TextMarkupAnnotation extends BaseAnnotation {
  type: AnnotationType.Underline | AnnotationType.Strikeout
  quads: Quad[]
  text?: string
}

export interface FreeTextAnnotation extends BaseAnnotation {
  type: AnnotationType.FreeText
  rect: Rect
  content: string
  fontSize: number
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  borderWidth?: number
  borderColor?: string
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: AnnotationType.Rectangle | AnnotationType.Circle
  rect: Rect
  fillColor?: string
  borderWidth: number
  borderColor: string
}

export interface LineAnnotation extends BaseAnnotation {
  type: AnnotationType.Line | AnnotationType.Arrow
  start: Point
  end: Point
  width: number
  lineColor: string
}

export interface InkAnnotation extends BaseAnnotation {
  type: AnnotationType.Ink
  paths: Point[][]
  width: number
  inkColor: string
}

export type Annotation =
  | TextMarkupAnnotation
  | FreeTextAnnotation
  | ShapeAnnotation
  | LineAnnotation
  | InkAnnotation

// Simple annotation interface for overlay components (compatible format)
export interface SimpleAnnotation {
  id: string
  type: 'underline' | 'strikeout' | 'free-text' | 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'ink' | 'note' | 'signature' | 'stamp'
  pageNumber: number
  bounds: Rect
  color: string
  opacity?: number
  author?: string
  content?: string
  createdAt: Date
  modifiedAt: Date
  path?: Point[]
  selected?: boolean
}

// ============================================================================
// Form Field Types
// ============================================================================

export interface FormField {
  id: string
  name: string
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature'
  pageNumber: number
  bounds: Rect
  value?: any
  options?: string[]
  required?: boolean
  readOnly?: boolean
  placeholder?: string
  defaultValue?: string
  multiline?: boolean
}

// ============================================================================
// Geometry Types
// ============================================================================

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Quad {
  topLeft: Point
  topRight: Point
  bottomLeft: Point
  bottomRight: Point
}

// ============================================================================
// Rendering Types
// ============================================================================

export interface RenderContext {
  canvas: HTMLCanvasElement | OffscreenCanvas
  viewport: Viewport
  background?: string
}

export interface Viewport {
  width: number
  height: number
  scale: number
  rotation: PageRotation
  offsetX: number
  offsetY: number
}

export interface RenderTask {
  pageNumber: number
  scale: number
  rotation: PageRotation
  canvas?: HTMLCanvasElement
  priority?: number
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  pageNumber: number
  text: string
  rect: Rect
  index: number
}

export interface SearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  highlightAll?: boolean
}

// ============================================================================
// Event Types
// ============================================================================

export interface DocumentLoadedEvent {
  document: DocumentInfo
}

export interface PageChangedEvent {
  pageNumber: number
  totalPages: number
}

export interface ZoomChangedEvent {
  zoom: number
  mode?: ZoomMode
}

export interface AnnotationChangedEvent {
  annotation: Annotation
  action: 'added' | 'modified' | 'deleted'
}

export interface TextSelectedEvent {
  text: string
  pageNumber: number
  quads: Quad[]
}

// ============================================================================
// Viewer API (Imperative)
// ============================================================================

export interface ViewerAPI {
  // Document control
  loadDocument: (source: DocumentSource) => Promise<void>
  closeDocument: () => void
  getDocumentInfo: () => DocumentInfo | null
  
  // Navigation
  goToPage: (pageNumber: number) => void
  nextPage: () => void
  previousPage: () => void
  getCurrentPage: () => number
  
  // Zoom control
  zoomIn: () => void
  zoomOut: () => void
  setZoom: (zoom: number | ZoomMode) => void
  getZoom: () => number
  
  // Rotation
  rotatePage: (pageNumber: number, rotation: PageRotation) => void
  rotateAllPages: (rotation: PageRotation) => void
  
  // Annotations
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'>) => string
  updateAnnotation: (id: string, changes: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  getAnnotations: (pageNumber?: number) => Annotation[]
  exportAnnotations: () => string
  importAnnotations: (json: string) => void
  
  // Form Fields
  getFormFields: () => FormField[]
  setFormFields: (fields: FormField[]) => void
  
  // Search
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>
  clearSearch: () => void
  
  // Tools
  setTool: (tool: ToolMode) => void
  getTool: () => ToolMode
  
  // Undo/Redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

// ============================================================================
// Plugin System
// ============================================================================

export interface Plugin {
  name: string
  version: string
  initialize: (viewer: ViewerAPI) => void | Promise<void>
  destroy?: () => void
}

export interface PluginContext {
  viewer: ViewerAPI
  eventBus: EventBus
}

// ============================================================================
// Event Bus
// ============================================================================

export type EventCallback<T = any> = (data: T) => void

export interface EventBus {
  on: <T = any>(event: string, callback: EventCallback<T>) => () => void
  off: <T = any>(event: string, callback: EventCallback<T>) => void
  emit: <T = any>(event: string, data: T) => void
  once: <T = any>(event: string, callback: EventCallback<T>) => void
}

export enum ViewerEvent {
  DocumentLoaded = 'documentLoaded',
  DocumentClosed = 'documentClosed',
  PageChanged = 'pageChanged',
  ZoomChanged = 'zoomChanged',
  RotationChanged = 'rotationChanged',
  AnnotationAdded = 'annotationAdded',
  AnnotationModified = 'annotationModified',
  AnnotationDeleted = 'annotationDeleted',
  AnnotationSelected = 'annotationSelected',
  AnnotationsImported = 'annotationsImported',
  TextSelected = 'textSelected',
  ToolChanged = 'toolChanged',
  SearchCompleted = 'searchCompleted',
}

// ============================================================================
// State Management
// ============================================================================

export interface ViewerState {
  document: DocumentInfo | null
  currentPage: number
  zoom: number
  zoomMode: ZoomMode | null
  rotation: Map<number, PageRotation>
  tool: ToolMode
  annotations: Map<number, Annotation[]>
  searchResults: SearchResult[]
  currentSearchIndex: number
  selectedAnnotationId: string | null
  isLoading: boolean
  error: Error | null
}

// ============================================================================
// Worker Communication
// ============================================================================

export interface WorkerMessage {
  type: WorkerMessageType
  id: string
  payload: any
}

export enum WorkerMessageType {
  LoadDocument = 'loadDocument',
  RenderPage = 'renderPage',
  GetPageText = 'getPageText',
  SearchText = 'searchText',
  GetOutline = 'getOutline',
}

export interface WorkerResponse {
  id: string
  success: boolean
  data?: any
  error?: string
}

// ============================================================================
// Template Editor Types
// ============================================================================

export type TemplateFieldType = 'text' | 'date' | 'number' | 'checkbox' | 'signature' | 'dropdown'

export const TEMPLATE_FIELD_COLORS: Record<TemplateFieldType, string> = {
  text: '#1565C0',
  date: '#2E7D32',
  number: '#00838F',
  checkbox: '#E65100',
  signature: '#6A1B9A',
  dropdown: '#C2185B',
}

export const TEMPLATE_FIELD_ICONS: Record<TemplateFieldType, string> = {
  text: 'fas fa-font',
  date: 'fas fa-calendar-alt',
  number: 'fas fa-hashtag',
  checkbox: 'fas fa-check-square',
  signature: 'fas fa-signature',
  dropdown: 'fas fa-list',
}

export interface SystemField {
  id?: string
  name: string
  fieldType: TemplateFieldType
  category?: string
  description?: string
}

export interface SystemFieldCategory {
  id?: string
  name: string
  icon?: string
  fields: SystemField[]
}

export interface TemplateField {
  id: string
  fieldType: TemplateFieldType
  name: string
  description?: string
  pageNumber: number
  bounds: Rect
  systemFieldId?: string
  systemFieldName?: string
  defaultValue?: string
  fontSize?: number
  borderVisible?: boolean
  labelVisible?: boolean
  requiredAtGeneration?: boolean
  multiline?: boolean
  /** Dropdown field: list of selectable options */
  options?: string[]
  /** Date field: display format */
  dateFormat?: 'DD/MM/YYYY' | 'MM-DD-YYYY' | 'Month D YYYY' | 'YYYY-MM-DD'
  /** Checkbox field: tick visual style */
  tickStyle?: 'check' | 'cross' | 'filled'
  /** Checkbox field: box size in px */
  boxSize?: number
  /** Signature field: border style */
  signatureBorderStyle?: 'solid' | 'dashed' | 'none'
  /** Signature field: label text above the area */
  signatureLabel?: string
}

export interface TemplateInfo {
  id?: string
  name: string
  description?: string
  createdAt?: Date
  modifiedAt?: Date
}

export interface TemplateEditorConfig {
  readOnly?: boolean
  maxFileSizeMB?: number
  workerUrl?: string
  locale?: string
  /** When true, users can create fields with custom names (not just from systemFieldCategories). Defaults to false. */
  allowCustomFields?: boolean
}

export interface TemplateSavePayload {
  template: TemplateInfo
  fields: TemplateField[]
  /** Ready-to-store JSON string (call JSON.parse to inspect, or store as-is) */
  exportJson: string
  /** The original document source (Blob/ArrayBuffer/Uint8Array/URL) that was loaded into the editor */
  documentSource?: DocumentSource
}

/**
 * Versioned export format for template fields.
 * Store this in your backend; pass it back via `importTemplate()` or `initialFields`.
 */
export interface TemplateExportData {
  version: 1
  exportedAt: string
  template?: TemplateInfo
  fields: TemplateField[]
}

export interface FATemplateEditorProps {
  document?: DocumentSource
  template?: TemplateInfo
  systemFieldCategories?: SystemFieldCategory[]
  config?: TemplateEditorConfig
  initialFields?: TemplateField[]
  onSave?: (payload: TemplateSavePayload) => void | Promise<void>
  onDiscard?: () => void
  onDocumentLoaded?: (event: DocumentLoadedEvent) => void
  onFieldsChange?: (fields: TemplateField[]) => void
  className?: string
  style?: React.CSSProperties
}

export interface TemplateEditorAPI {
  loadDocument: (source: DocumentSource) => Promise<void>
  /** Returns the currently loaded document source (Blob, ArrayBuffer, URL, etc.), or null if nothing loaded */
  getDocumentSource: () => DocumentSource | null
  getFields: () => TemplateField[]
  setFields: (fields: TemplateField[]) => void
  getUnmappedFields: () => TemplateField[]
  goToPage: (pageNumber: number) => void
  setZoom: (zoom: number) => void
  getZoom: () => number
  /** Export fields as a versioned JSON string (store in your backend) */
  exportTemplate: (template?: TemplateInfo) => string
  /** Import fields from a previously exported JSON string or TemplateExportData object */
  importTemplate: (json: string | TemplateExportData) => TemplateField[]
  /** Import fields from Azure Form Recognizer / AI bounding box response */
  importFromAzure: (response: AzureAnalyzeResponse, options?: AzureImportOptions) => TemplateField[]
}

// ============================================================================
// Azure Form Recognizer / AI Bounding Box Types
// ============================================================================

export interface AzureAnalyzeResponse {
  status?: string
  modelId?: string
  createdDateTime?: string
  analyzeResult: {
    pages: AzurePageInfo[]
    objects: AzureFieldObject[]
  }
}

export interface AzurePageInfo {
  pageNumber: number
  width: number
  height: number
  unit: 'pixel' | 'inch' | 'point'
}

export interface AzureFieldObject {
  label: string
  text?: string
  confidence?: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  polygon?: Array<{ x: number; y: number }>
  page: number
}

export interface AzureImportOptions {
  /** Minimum confidence to include a field (0-1). Defaults to 0. */
  minConfidence?: number
  /** Default field type for imported fields. Defaults to 'text'. */
  defaultFieldType?: TemplateFieldType
  /** PDF page dimensions (width, height in PDF points) for coordinate scaling. If omitted, uses Azure page dimensions as-is. */
  pdfPageDimensions?: { width: number; height: number }
  /** Label-to-field-type mapping, e.g. { "TotalAmount": "number", "Date": "date" } */
  fieldTypeMap?: Record<string, TemplateFieldType>
  /** Labels to exclude from import (e.g. "Table", "Image") */
  excludeLabels?: string[]
}

export interface DragFieldData {
  fieldType: TemplateFieldType
  systemFieldId?: string
  systemFieldName?: string
  systemFieldDescription?: string
}
