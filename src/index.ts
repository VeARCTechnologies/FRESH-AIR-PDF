/**
 * Fresh Air PDF - Library Entry Point
 *
 * Open-source PDF viewer React component powered by PDF.js.
 */

// FontAwesome icons used by the toolbar & panels
import '@fortawesome/fontawesome-free/css/all.min.css'

// Main component
export { FAPDFViewer } from '@/components/FAPDFViewer'
export type { FAPDFViewerProps } from '@/components/FAPDFViewer'

// React hook
export { useViewer } from '@/hooks/useViewer'

// Core engines (for advanced usage)
export { PDFDocumentEngine } from '@/core/engine/PDFDocumentEngine'
export { AnnotationManager } from '@/core/annotations/AnnotationManager'
export { AnnotationRenderer } from '@/core/annotations/AnnotationRenderer'
export { eventBus } from '@/core/events/EventBus'

// All types
export type {
  DocumentInfo,
  PageInfo,
  DocumentSource,
  ViewerConfig,
  BaseAnnotation,
  TextMarkupAnnotation,
  FreeTextAnnotation,
  ShapeAnnotation,
  LineAnnotation,
  InkAnnotation,
  Annotation,
  SimpleAnnotation,
  FormField,
  Point,
  Rect,
  Quad,
  RenderContext,
  Viewport,
  RenderTask,
  SearchResult,
  SearchOptions,
  DocumentLoadedEvent,
  PageChangedEvent,
  ZoomChangedEvent,
  AnnotationChangedEvent,
  TextSelectedEvent,
  ViewerAPI,
  Plugin,
  PluginContext,
  EventCallback,
  EventBus,
  ViewerState,
  WorkerMessage,
  WorkerResponse,
} from '@/types'

// Enums
export {
  PageRotation,
  ZoomMode,
  ToolMode,
  AnnotationType,
  ViewerEvent,
  WorkerMessageType,
} from '@/types'
