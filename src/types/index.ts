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
