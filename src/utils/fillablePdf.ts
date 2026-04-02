/**
 * Fillable PDF Generation
 *
 * Uses pdf-lib to produce a real AcroForm PDF with interactive fields
 * that users can fill in Adobe Acrobat, Preview, or any PDF reader.
 */

import {
  PDFDocument, StandardFonts, rgb,
  PDFName, PDFHexString, PDFNumber,
} from 'pdf-lib'
import type { TemplateField, DocumentSource } from '@/types'
import { TEMPLATE_FIELD_COLORS } from '@/types'

/**
 * Convert a DocumentSource to Uint8Array for pdf-lib consumption.
 */
async function sourceToBytes(source: DocumentSource): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source
  if (source instanceof ArrayBuffer) return new Uint8Array(source)
  if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer())
  if (typeof source === 'string') {
    const response = await fetch(source)
    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  }
  throw new Error('Unsupported document source type')
}

/** Map our dateFormat to Acrobat's AFDate format string. */
function toAcrobatDateFormat(fmt?: string): string {
  switch (fmt) {
    case 'DD/MM/YYYY': return 'dd/mm/yyyy'
    case 'MM-DD-YYYY': return 'mm-dd-yyyy'
    case 'Month D YYYY': return 'mmmm d, yyyy'
    case 'YYYY-MM-DD': return 'yyyy-mm-dd'
    default: return 'dd/mm/yyyy'
  }
}

/** Parse a hex color like "#1565C0" to pdf-lib rgb values (0-1 range). */
function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  return rgb(r, g, b)
}

/**
 * Build a fillable PDF from the original document and template fields.
 *
 * The original PDF pages are preserved. Real AcroForm fields (text inputs,
 * checkboxes, dropdowns) are added at the positions defined by the template
 * fields. The resulting PDF can be filled interactively in any PDF reader.
 *
 * @param source  The original PDF document (URL, Blob, ArrayBuffer, or Uint8Array)
 * @param fields  Array of TemplateField definitions from the template editor
 * @returns       Uint8Array of the new PDF with AcroForm fields
 */
export async function buildFillablePdf(
  source: DocumentSource,
  fields: TemplateField[],
): Promise<Uint8Array> {
  const bytes = await sourceToBytes(source)
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const form = pdfDoc.getForm()
  const pages = pdfDoc.getPages()

  // Track used names for uniqueness (AcroForm names must be unique)
  const usedNames = new Map<string, number>()
  function uniqueName(base: string): string {
    // Sanitize: remove characters that cause issues in PDF field names
    const sanitized = base.replace(/[[\](){}/<>]/g, '_')
    const count = usedNames.get(sanitized) ?? 0
    usedNames.set(sanitized, count + 1)
    return count === 0 ? sanitized : `${sanitized}_${count}`
  }

  for (const field of fields) {
    const pageIndex = field.pageNumber - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { height: pageHeight } = page.getSize()
    const name = uniqueName(field.systemFieldName || field.name)
    const { x, width, height } = field.bounds
    // Flip Y coordinate: editor uses top-left origin, PDF uses bottom-left
    const pdfY = pageHeight - field.bounds.y - height

    const widgetRect = { x, y: pdfY, width, height }
    const fontSize = field.fontSize || Math.min(12, height * 0.7)
    const fieldColor = hexToRgb(TEMPLATE_FIELD_COLORS[field.fieldType] || '#1976D2')
    const borderWidth = field.borderVisible !== false ? 1 : 0

    switch (field.fieldType) {
      case 'text': {
        const tf = form.createTextField(name)
        tf.addToPage(page, { ...widgetRect, font, borderWidth, borderColor: fieldColor })
        tf.setFontSize(fontSize)
        if (field.multiline) tf.enableMultiline()
        break
      }

      case 'date': {
        const tf = form.createTextField(name)
        tf.addToPage(page, { ...widgetRect, font, borderWidth, borderColor: fieldColor })
        tf.setFontSize(fontSize)

        // Add Acrobat JavaScript actions to trigger date picker / calendar
        const acrobatFmt = toAcrobatDateFormat(field.dateFormat)
        const context = pdfDoc.context
        const jsFormat = PDFHexString.fromText(`AFDate_FormatEx("${acrobatFmt}");`)
        const jsKeystroke = PDFHexString.fromText(`AFDate_KeystrokeEx("${acrobatFmt}");`)
        const widget = tf.acroField.getWidgets()[0]
        if (widget) {
          widget.dict.set(
            PDFName.of('AA'),
            context.obj({
              F: context.obj({ S: 'JavaScript', JS: jsFormat }),
              K: context.obj({ S: 'JavaScript', JS: jsKeystroke }),
            }),
          )
        }
        break
      }

      case 'number':
      case 'currency':
      case 'decimal':
      case 'integer':
      case 'formula': {
        const tf = form.createTextField(name)
        tf.addToPage(page, { ...widgetRect, font, borderWidth, borderColor: fieldColor })
        tf.setFontSize(fontSize)
        break
      }

      case 'checkbox':
      case 'boolean': {
        const cb = form.createCheckBox(name)
        cb.addToPage(page, { ...widgetRect, borderWidth, borderColor: fieldColor })
        break
      }

      case 'dropdown': {
        const dd = form.createDropdown(name)
        dd.addToPage(page, { ...widgetRect, font, borderWidth, borderColor: fieldColor })
        dd.setFontSize(fontSize)
        if (field.options?.length) {
          dd.addOptions(field.options)
        }
        break
      }

      case 'signature': {
        // Signature as a text field — user types their name as signature
        const tf = form.createTextField(name)
        tf.addToPage(page, { ...widgetRect, font, borderWidth, borderColor: fieldColor })
        tf.setFontSize(fontSize)
        break
      }

      case 'image': {
        // Placeholder text field for image fields
        const tf = form.createTextField(name)
        tf.addToPage(page, { ...widgetRect, font, borderWidth, borderColor: fieldColor })
        tf.setFontSize(Math.min(10, fontSize))
        break
      }

      default: {
        // Fallback: create a text field for any unknown type
        const tf = form.createTextField(name)
        tf.addToPage(page, { ...widgetRect, font, borderWidth, borderColor: fieldColor })
        tf.setFontSize(fontSize)
        break
      }
    }
  }

  // Generate field appearances so they render correctly in all PDF readers
  form.updateFieldAppearances(font)

  // Lock all field widgets: users can fill values but cannot delete, move,
  // or resize fields. Annotation flag bits: Print (4) + Locked (128) = 132
  const LOCKED_PRINT_FLAG = PDFNumber.of(4 | 128)
  for (const pdfField of form.getFields()) {
    for (const widget of pdfField.acroField.getWidgets()) {
      widget.dict.set(PDFName.of('F'), LOCKED_PRINT_FLAG)
    }
  }

  return pdfDoc.save()
}
