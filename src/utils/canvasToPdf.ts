/**
 * Minimal PDF generator from canvas pages.
 * Builds a valid PDF with JPEG images — no external dependencies.
 */

interface PdfPage {
  /** JPEG image data as ArrayBuffer */
  jpeg: ArrayBuffer
  /** Page width in PDF points (1 pt = 1/72 inch) */
  width: number
  /** Page height in PDF points */
  height: number
}

/**
 * Build a PDF blob from an array of page images.
 */
export function buildPdfFromPages(pages: PdfPage[]): Blob {
  const encoder = new TextEncoder()
  const chunks: (Uint8Array | ArrayBuffer)[] = []
  const offsets: number[] = []
  let pos = 0

  const write = (str: string) => {
    const buf = encoder.encode(str)
    chunks.push(buf)
    pos += buf.byteLength
  }

  const writeBinary = (buf: ArrayBuffer) => {
    chunks.push(buf)
    pos += buf.byteLength
  }

  const markObj = () => { offsets.push(pos) }

  // Header
  write('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')

  // Object numbering:
  // 1 = Catalog, 2 = Pages
  // For each page i (0-based): 3 + i*3 = Page, 4 + i*3 = Image XObject, 5 + i*3 = Content stream
  const numPages = pages.length
  const totalObjects = 2 + numPages * 3

  // Object 1: Catalog
  markObj()
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

  // Object 2: Pages
  markObj()
  const pageRefs = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  write(`2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${numPages} >>\nendobj\n`)

  // Each page
  pages.forEach((page, i) => {
    const pageObjNum = 3 + i * 3
    const imgObjNum = 4 + i * 3
    const contentObjNum = 5 + i * 3

    // Content stream: draw image scaled to page
    const contentStr = `q\n${page.width} 0 0 ${page.height} 0 0 cm\n/Img Do\nQ\n`
    const contentBytes = encoder.encode(contentStr)

    // Page object
    markObj()
    write(`${pageObjNum} 0 obj\n`)
    write(`<< /Type /Page /Parent 2 0 R `)
    write(`/MediaBox [0 0 ${page.width} ${page.height}] `)
    write(`/Contents ${contentObjNum} 0 R `)
    write(`/Resources << /XObject << /Img ${imgObjNum} 0 R >> >> `)
    write(`>>\nendobj\n`)

    // Image XObject (JPEG)
    markObj()
    const jpegSize = page.jpeg.byteLength
    // Parse JPEG to get pixel dimensions
    const jpegDims = getJpegDimensions(page.jpeg)
    write(`${imgObjNum} 0 obj\n`)
    write(`<< /Type /XObject /Subtype /Image `)
    write(`/Width ${jpegDims.width} /Height ${jpegDims.height} `)
    write(`/ColorSpace /DeviceRGB /BitsPerComponent 8 `)
    write(`/Filter /DCTDecode /Length ${jpegSize} `)
    write(`>>\nstream\n`)
    writeBinary(page.jpeg)
    write(`\nendstream\nendobj\n`)

    // Content stream
    markObj()
    write(`${contentObjNum} 0 obj\n`)
    write(`<< /Length ${contentBytes.byteLength} >>\nstream\n`)
    writeBinary(contentBytes.buffer)
    write(`\nendstream\nendobj\n`)
  })

  // Cross-reference table
  const xrefPos = pos
  write('xref\n')
  write(`0 ${totalObjects + 1}\n`)
  write('0000000000 65535 f \n')
  for (const offset of offsets) {
    write(`${String(offset).padStart(10, '0')} 00000 n \n`)
  }

  // Trailer
  write('trailer\n')
  write(`<< /Size ${totalObjects + 1} /Root 1 0 R >>\n`)
  write('startxref\n')
  write(`${xrefPos}\n`)
  write('%%EOF\n')

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' })
}

/** Extract width/height from JPEG data by scanning for SOF markers. */
function getJpegDimensions(data: ArrayBuffer): { width: number; height: number } {
  const view = new DataView(data)
  let offset = 2 // Skip SOI marker
  while (offset < view.byteLength - 1) {
    if (view.getUint8(offset) !== 0xFF) break
    const marker = view.getUint8(offset + 1)
    // SOF0–SOF3 markers contain dimensions
    if (marker >= 0xC0 && marker <= 0xC3) {
      const height = view.getUint16(offset + 5)
      const width = view.getUint16(offset + 7)
      return { width, height }
    }
    const segLen = view.getUint16(offset + 2)
    offset += 2 + segLen
  }
  // Fallback
  return { width: 612, height: 792 }
}

/**
 * Render field overlays onto a canvas (flat rendering, no editing UI).
 */
export function drawFieldsOnCanvas(
  ctx: CanvasRenderingContext2D,
  fields: { name: string; bounds: { x: number; y: number; width: number; height: number }; fieldType: string; defaultValue?: string; dateFormat?: string; borderVisible?: boolean; fontSize?: number; multiline?: boolean; labelVisible?: boolean }[],
  scale: number,
  colors: Record<string, string>,
) {
  for (const field of fields) {
    const x = field.bounds.x * scale
    const y = field.bounds.y * scale
    const w = field.bounds.width * scale
    const h = field.bounds.height * scale
    const color = colors[field.fieldType] || '#1976D2'
    const showBorder = field.borderVisible !== false

    if (showBorder) {
      // Draw border
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])

      // Light fill
      ctx.fillStyle = color + '12'
      ctx.fillRect(x, y, w, h)
    }

    // Draw label above the field (skip when labelVisible is false)
    const labelFontSize = Math.max(8, Math.min(11, h * 0.35))
    if (field.labelVisible !== false) {
      ctx.font = `600 ${labelFontSize}px "Segoe UI", -apple-system, sans-serif`
      ctx.fillStyle = color
      ctx.fillText(field.name, x + 3, y - 4, w)
    }

    // Draw default value inside (if any)
    if (field.defaultValue) {
      const valueFontSize = field.fontSize ? field.fontSize * scale : Math.max(9, h * 0.4)
      ctx.font = `400 ${valueFontSize}px "Segoe UI", -apple-system, sans-serif`
      ctx.fillStyle = '#333'
      const displayVal = field.fieldType === 'date' ? formatDateDisplay(field.defaultValue, field.dateFormat) : field.defaultValue
      ctx.fillText(displayVal, x + 4, y + h / 2 + labelFontSize * 0.3, w - 8)
    }
  }
}

/** Format ISO date (YYYY-MM-DD) according to a date format string. */
function formatDateDisplay(value: string, format?: string): string {
  const parts = value.split('-')
  if (parts.length !== 3) return value
  const [y, m, d] = parts
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  switch (format) {
    case 'DD/MM/YYYY': return `${d}/${m}/${y}`
    case 'MM-DD-YYYY': return `${m}-${d}-${y}`
    case 'Month D YYYY': return `${months[parseInt(m, 10) - 1] || m} ${parseInt(d, 10)} ${y}`
    case 'YYYY-MM-DD': return value
    default: return `${d}/${m}/${y}`
  }
}

/**
 * Trigger a file download in the browser.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
