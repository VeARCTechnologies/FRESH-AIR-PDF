/**
 * PDF Merge Utilities
 *
 * Helpers for combining PDF documents using pdf-lib. Used by the template
 * editor's "Add Page -> Upload PDF" flow to append pages instead of
 * replacing the current document.
 */

import { PDFDocument } from 'pdf-lib'
import type { DocumentSource } from '@/types'

// US Letter dimensions in PDF units — matches BlankPageCanvas in the editor.
const BLANK_PAGE_WIDTH = 612
const BLANK_PAGE_HEIGHT = 792

/**
 * Convert a DocumentSource to Uint8Array for pdf-lib consumption.
 */
export async function sourceToBytes(source: DocumentSource): Promise<Uint8Array> {
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

/**
 * Append the pages of one PDF onto another, returning combined PDF bytes.
 *
 * The base document's pages are preserved first, followed by `blankPageCount`
 * materialized blank pages (so previously-added blank pages keep their exact
 * page numbers and any fields placed on them stay aligned), followed by every
 * page of the uploaded PDF.
 *
 * @param base            The current document (URL, Blob, ArrayBuffer, or Uint8Array)
 * @param addition        The uploaded PDF to append
 * @param blankPageCount  Number of virtual blank pages to bake in before the addition
 * @returns               Uint8Array of the combined PDF
 */
export async function appendPdfPages(
  base: DocumentSource,
  addition: DocumentSource,
  blankPageCount = 0,
): Promise<Uint8Array> {
  const baseBytes = await sourceToBytes(base)
  const mergedDoc = await PDFDocument.load(baseBytes, { ignoreEncryption: true })

  // Materialize any virtual blank pages so they persist and keep page numbers.
  for (let i = 0; i < blankPageCount; i++) {
    mergedDoc.addPage([BLANK_PAGE_WIDTH, BLANK_PAGE_HEIGHT])
  }

  const additionBytes = await sourceToBytes(addition)
  const additionDoc = await PDFDocument.load(additionBytes, { ignoreEncryption: true })
  const copiedPages = await mergedDoc.copyPages(additionDoc, additionDoc.getPageIndices())
  copiedPages.forEach(page => mergedDoc.addPage(page))

  return mergedDoc.save()
}

/**
 * Return the document as PDF bytes with `blankPageCount` blank pages appended.
 *
 * Used when saving: virtual blank pages (added via "Add Page -> Blank page")
 * are not baked into the live document source, so they must be materialized so
 * the full, current document is handed back to the consumer.
 *
 * @param source          The current document (URL, Blob, ArrayBuffer, or Uint8Array)
 * @param blankPageCount  Number of blank pages to append
 * @returns               Uint8Array of the document including the blank pages
 */
export async function materializeBlankPages(
  source: DocumentSource,
  blankPageCount: number,
): Promise<Uint8Array> {
  const bytes = await sourceToBytes(source)
  if (blankPageCount <= 0) return bytes
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  for (let i = 0; i < blankPageCount; i++) {
    doc.addPage([BLANK_PAGE_WIDTH, BLANK_PAGE_HEIGHT])
  }
  return doc.save()
}

/**
 * Remove a single page from a document, returning the new PDF bytes.
 *
 * The base document's pages plus `blankPageCount` materialized blank pages form
 * the effective page set; the page at `pageNumber` (1-based) is then removed.
 * The result always has at least one page — callers must guard against deleting
 * the final remaining page.
 *
 * @param source          The current document (URL, Blob, ArrayBuffer, or Uint8Array)
 * @param pageNumber      1-based page number to remove
 * @param blankPageCount  Number of virtual blank pages to bake in before removal
 * @returns               Uint8Array of the document without the removed page
 */
export async function deletePageFromDocument(
  source: DocumentSource,
  pageNumber: number,
  blankPageCount = 0,
): Promise<Uint8Array> {
  const bytes = await sourceToBytes(source)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })

  for (let i = 0; i < blankPageCount; i++) {
    doc.addPage([BLANK_PAGE_WIDTH, BLANK_PAGE_HEIGHT])
  }

  const index = pageNumber - 1
  if (index < 0 || index >= doc.getPageCount()) {
    throw new Error(`Cannot delete page ${pageNumber}: out of range`)
  }
  if (doc.getPageCount() <= 1) {
    throw new Error('Cannot delete the last remaining page')
  }

  doc.removePage(index)
  return doc.save()
}
