/**
 * Azure Form Recognizer Import Utility
 *
 * Converts Azure AI bounding box responses into TemplateField[] for the template editor.
 * Handles coordinate scaling from pixel/inch space to PDF point space.
 */

import type {
  AzureAnalyzeResponse,
  AzureImportOptions,
  AzurePageInfo,
  TemplateField,
  TemplateFieldType,
} from '@/types'

/** Standard PDF page size (US Letter) in points */
const DEFAULT_PDF_WIDTH = 612
const DEFAULT_PDF_HEIGHT = 792

/**
 * Convert Azure Form Recognizer response to TemplateField[].
 *
 * Usage:
 * ```ts
 * const fields = convertAzureToFields(azureResponse, {
 *   minConfidence: 0.8,
 *   fieldTypeMap: { TotalAmount: 'number', InvoiceDate: 'date' },
 *   excludeLabels: ['Table', 'Image'],
 * })
 * ```
 */
export function convertAzureToFields(
  response: AzureAnalyzeResponse,
  options: AzureImportOptions = {},
): TemplateField[] {
  const {
    minConfidence = 0,
    defaultFieldType = 'text',
    pdfPageDimensions,
    fieldTypeMap = {},
    excludeLabels = [],
  } = options

  const { pages, objects } = response.analyzeResult
  const excludeSet = new Set(excludeLabels.map(l => l.toLowerCase()))

  // Build page dimension lookup for coordinate scaling
  const pageDims = new Map<number, { scaleX: number; scaleY: number }>()
  for (const page of pages) {
    const targetW = pdfPageDimensions?.width ?? DEFAULT_PDF_WIDTH
    const targetH = pdfPageDimensions?.height ?? DEFAULT_PDF_HEIGHT
    const { scaleX, scaleY } = getScaleFactors(page, targetW, targetH)
    pageDims.set(page.pageNumber, { scaleX, scaleY })
  }

  const fields: TemplateField[] = []

  for (const obj of objects) {
    // Filter by confidence
    if (obj.confidence !== undefined && obj.confidence < minConfidence) continue

    // Filter by excluded labels
    if (excludeSet.has(obj.label.toLowerCase())) continue

    const scale = pageDims.get(obj.page) || { scaleX: 1, scaleY: 1 }
    const fieldType = fieldTypeMap[obj.label] || inferFieldType(obj.label, obj.text) || defaultFieldType

    const id = `azure-${obj.page}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    fields.push({
      id,
      fieldType,
      name: formatLabel(obj.label),
      pageNumber: obj.page,
      bounds: {
        x: obj.boundingBox.x * scale.scaleX,
        y: obj.boundingBox.y * scale.scaleY,
        width: obj.boundingBox.width * scale.scaleX,
        height: obj.boundingBox.height * scale.scaleY,
      },
      defaultValue: obj.text || undefined,
      fontSize: 12,
      borderVisible: true,
      requiredAtGeneration: false,
      multiline: false,
    })
  }

  return fields
}

/** Calculate scale factors from Azure page dimensions to PDF point space */
function getScaleFactors(
  page: AzurePageInfo,
  targetWidth: number,
  targetHeight: number,
): { scaleX: number; scaleY: number } {
  if (page.unit === 'point') {
    // Already in PDF points — scale to target dimensions
    return { scaleX: targetWidth / page.width, scaleY: targetHeight / page.height }
  }
  if (page.unit === 'inch') {
    // Convert inches to points (1 inch = 72 points), then scale
    const pageWidthPt = page.width * 72
    const pageHeightPt = page.height * 72
    return { scaleX: targetWidth / pageWidthPt, scaleY: targetHeight / pageHeightPt }
  }
  // Pixel — scale proportionally
  return { scaleX: targetWidth / page.width, scaleY: targetHeight / page.height }
}

/** Try to infer field type from label name or text content */
function inferFieldType(label: string, text?: string): TemplateFieldType | null {
  const l = label.toLowerCase()

  // Date patterns
  if (l.includes('date') || l.includes('datetime') || l.includes('dob') || l.includes('birth')) return 'date'

  // Number/amount patterns
  if (l.includes('amount') || l.includes('total') || l.includes('price') || l.includes('quantity') ||
      l.includes('tax') || l.includes('subtotal') || l.includes('balance') || l.includes('cost')) return 'number'

  // Checkbox patterns
  if (l.includes('checkbox') || l.includes('checked') || l.includes('approved') ||
      l.includes('agree') || l.includes('confirm')) return 'checkbox'

  // Signature patterns
  if (l.includes('signature') || l.includes('signed') || l.includes('signatory')) return 'signature'

  // Check text content for number/currency
  if (text) {
    if (/^[\$\€\£\¥]?\s*[\d,]+\.?\d*$/.test(text.trim())) return 'number'
    if (/^\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,4}$/.test(text.trim())) return 'date'
  }

  return null
}

/** Convert "CamelCase" or "snake_case" label to readable name */
function formatLabel(label: string): string {
  return label
    // Insert space before uppercase letters (CamelCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace underscores/hyphens with spaces
    .replace(/[_-]+/g, ' ')
    // Capitalize first letter
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}
