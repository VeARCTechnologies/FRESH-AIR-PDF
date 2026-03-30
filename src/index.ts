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

// Template Editor
export { FATemplateEditor } from '@/components/template-editor/FATemplateEditor'

// React hooks
export { useViewer } from '@/hooks/useViewer'
export { useTemplateEditor } from '@/hooks/useTemplateEditor'

// Utilities
export { convertAzureToFields } from '@/core/utils/azureImport'
export { transformOverlayFields, mapBackendFieldType } from '@/types'

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
  // Template Editor types
  TemplateField,
  TemplateFieldType,
  SystemField,
  SystemFieldCategory,
  TemplateInfo,
  TemplateEditorConfig,
  FATemplateEditorProps,
  TemplateEditorAPI,
  TemplateSavePayload,
  TemplateExportData,
  AzureAnalyzeResponse,
  AzurePageInfo,
  AzureFieldObject,
  AzureImportOptions,
  DragFieldData,
  OverlayFieldsResponse,
  OverlayFieldsResponseItem,
  OverlayFieldGroup,
  OverlayFieldDefinition,
} from '@/types'

// Enums and constants
export {
  PageRotation,
  ZoomMode,
  ToolMode,
  AnnotationType,
  ViewerEvent,
  WorkerMessageType,
  TEMPLATE_FIELD_COLORS,
  TEMPLATE_FIELD_ICONS,
} from '@/types'
