/**
 * PDF Document Engine
 * 
 * Core rendering engine that wraps PDF.js for document loading,
 * parsing, and page rendering. Framework-agnostic.
 */

import * as pdfjsLib from 'pdfjs-dist'
import type {
  DocumentInfo,
  DocumentSource,
  PageInfo,
  PageRotation,
  Viewport,
} from '@/types'

// Configure PDF.js worker
// Use a reliable CDN for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

export class PDFDocumentEngine {
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null
  private pageCache: Map<number, pdfjsLib.PDFPageProxy> = new Map()
  private renderTasks: Map<number, pdfjsLib.RenderTask> = new Map()
  private loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null
  private isLoading: boolean = false

  /**
   * Load a PDF document from various sources
   */
  async loadDocument(source: DocumentSource): Promise<DocumentInfo> {
    // If already loading, wait for it to complete
    if (this.isLoading) {
      // Wait for the current load to finish
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      // Return current document info if available
      if (this.pdfDocument) {
        return this.getDocumentInfo()
      }
      // If still no document, something went wrong, but don't throw
      return {
        numPages: 0,
        title: undefined,
        author: undefined,
        subject: undefined,
        keywords: undefined,
        creator: undefined,
        producer: undefined,
        creationDate: undefined,
        modificationDate: undefined,
      }
    }

    this.isLoading = true

    // Cancel any existing render tasks and clear state
    if (this.loadingTask) {
      this.loadingTask.destroy()
      this.loadingTask = null
    }
    this.cancelAllRenderTasks()
    
    // Clear caches
    this.pageCache.clear()
    if (this.pdfDocument) {
      await this.pdfDocument.destroy()
      this.pdfDocument = null
    }

    let documentSource: any

    if (typeof source === 'string') {
      documentSource = { 
        url: source,
        withCredentials: false,
        // Enable CORS for remote PDFs
        httpHeaders: {
          'Accept': 'application/pdf',
        },
      }
    } else if (source instanceof Blob) {
      const arrayBuffer = await source.arrayBuffer()
      documentSource = { data: new Uint8Array(arrayBuffer) }
    } else if (source instanceof ArrayBuffer) {
      documentSource = { data: new Uint8Array(source) }
    } else {
      documentSource = { data: source }
    }

    try {
      this.loadingTask = pdfjsLib.getDocument(documentSource)
      this.pdfDocument = await this.loadingTask.promise
      this.loadingTask = null
      this.isLoading = false
      return await this.getDocumentInfo()
    } catch (error) {
      this.isLoading = false
      this.loadingTask = null
      this.pdfDocument = null
      throw new Error(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get document metadata
   */
  async getDocumentInfo(): Promise<DocumentInfo> {
    if (!this.pdfDocument) {
      throw new Error('No document loaded')
    }

    const metadata = await this.pdfDocument.getMetadata()
    const info = metadata.info as any

    return {
      numPages: this.pdfDocument.numPages,
      title: info?.Title,
      author: info?.Author,
      subject: info?.Subject,
      keywords: info?.Keywords,
      creator: info?.Creator,
      producer: info?.Producer,
      creationDate: info?.CreationDate ? this.parseDate(info.CreationDate) : undefined,
      modificationDate: info?.ModDate ? this.parseDate(info.ModDate) : undefined,
    }
  }

  /**
   * Get information about a specific page
   */
  async getPageInfo(pageNumber: number): Promise<PageInfo> {
    const page = await this.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1.0 })

    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      rotation: viewport.rotation as PageRotation,
    }
  }

  /**
   * Render a page to a canvas
   */
  async renderPage(
    pageNumber: number,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    viewport: Viewport
  ): Promise<void> {
    const page = await this.getPage(pageNumber)
    
    // Cancel existing render task for this page
    this.cancelRenderTask(pageNumber)

    const pdfjsViewport = page.getViewport({
      scale: viewport.scale,
      rotation: viewport.rotation,
    })

    // Set canvas dimensions
    canvas.width = Math.floor(pdfjsViewport.width)
    canvas.height = Math.floor(pdfjsViewport.height)

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not get canvas context')
    }

    const renderContext = {
      canvasContext: context as any,
      viewport: pdfjsViewport,
    }

    const renderTask = page.render(renderContext)
    this.renderTasks.set(pageNumber, renderTask)

    try {
      await renderTask.promise
    } finally {
      this.renderTasks.delete(pageNumber)
    }
  }

  /**
   * Get text content from a page
   */
  async getPageText(pageNumber: number): Promise<string> {
    const page = await this.getPage(pageNumber)
    const textContent = await page.getTextContent()
    return textContent.items.map((item: any) => item.str).join(' ')
  }

  /**
   * Get text content with position information
   */
  async getPageTextWithPositions(pageNumber: number, scale: number = 1): Promise<Array<{
    text: string
    x: number
    y: number
    width: number
    height: number
  }>> {
    const page = await this.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale })
    
    const positions = textContent.items
      .filter((item: any) => item.str && item.str.trim().length > 0)
      .map((item: any) => {
        const tx = item.transform
        // PDF coordinates: origin at bottom-left
        // Canvas coordinates: origin at top-left
        const x = tx[4] * scale
        const y = (viewport.height / scale - tx[5]) * scale
        const width = item.width * scale
        const height = item.height * scale
        
        return {
          text: item.str,
          x,
          y: y - height,
          width,
          height,
        }
      })
    
    return positions
  }

  /**
   * Search for text across all pages
   */
  async searchText(
    query: string,
    options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
  ): Promise<Array<{ pageNumber: number; text: string }>> {
    if (!this.pdfDocument) {
      throw new Error('No document loaded')
    }

    const results: Array<{ pageNumber: number; text: string }> = []
    const searchQuery = options.caseSensitive ? query : query.toLowerCase()

    for (let i = 1; i <= this.pdfDocument.numPages; i++) {
      const text = await this.getPageText(i)
      const searchText = options.caseSensitive ? text : text.toLowerCase()

      if (searchText.includes(searchQuery)) {
        results.push({ pageNumber: i, text })
      }
    }

    return results
  }

  /**
   * Get document outline (bookmarks)
   */
  async getOutline(): Promise<any[]> {
    if (!this.pdfDocument) {
      throw new Error('No document loaded')
    }

    return this.pdfDocument.getOutline()
  }

  /**
   * Close the current document
   */
  async closeDocument(): Promise<void> {
    // Cancel loading task if in progress
    if (this.loadingTask) {
      this.loadingTask.destroy()
      this.loadingTask = null
    }

    this.cancelAllRenderTasks()
    this.pageCache.clear()
    
    if (this.pdfDocument) {
      await this.pdfDocument.destroy()
      this.pdfDocument = null
    }

    this.isLoading = false
  }

  /**
   * Get total number of pages
   */
  getNumPages(): number {
    return this.pdfDocument?.numPages || 0
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private async getPage(pageNumber: number): Promise<pdfjsLib.PDFPageProxy> {
    if (!this.pdfDocument) {
      throw new Error('No document loaded')
    }

    if (pageNumber < 1 || pageNumber > this.pdfDocument.numPages) {
      throw new Error(`Invalid page number: ${pageNumber}`)
    }

    // Check cache first
    if (this.pageCache.has(pageNumber)) {
      return this.pageCache.get(pageNumber)!
    }

    // Load and cache the page
    const page = await this.pdfDocument.getPage(pageNumber)
    this.pageCache.set(pageNumber, page)

    return page
  }

  private cancelRenderTask(pageNumber: number): void {
    const task = this.renderTasks.get(pageNumber)
    if (task) {
      task.cancel()
      this.renderTasks.delete(pageNumber)
    }
  }

  private cancelAllRenderTasks(): void {
    this.renderTasks.forEach(task => task.cancel())
    this.renderTasks.clear()
  }

  private parseDate(dateString: string): Date | undefined {
    try {
      // PDF date format: D:YYYYMMDDHHmmSSOHH'mm
      const match = dateString.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
      if (match) {
        const [, year, month, day, hour, minute, second] = match
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        )
      }
    } catch {
      // Invalid date format
    }
    return undefined
  }
}
