/**
 * Example App - Demo Usage of FAPDFViewer
 */

import { useRef, useState } from 'react'
import { FAPDFViewer } from './components/FAPDFViewer'
import type { ViewerAPI, DocumentLoadedEvent, AnnotationChangedEvent } from './types'

function App() {
  const viewerRef = useRef<ViewerAPI>(null)
  const [documentUrl, setDocumentUrl] = useState<string>('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')

  console.log('App rendering, documentUrl:', documentUrl)

  const handleDocumentLoaded = (event: DocumentLoadedEvent) => {
    console.log(`Document loaded: ${event.document.numPages} pages`)
    if (event.document.title) {
      console.log(`Title: ${event.document.title}`)
    }
  }

  const handleAnnotationChanged = (event: AnnotationChangedEvent) => {
    console.log(`Annotation ${event.action}: ${event.annotation.type} (${event.annotation.id})`)
  }

  const handleLoadSample = () => {
    // Load a sample PDF (you can use any public PDF URL)
    const samplePdf = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
    setDocumentUrl(samplePdf)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setDocumentUrl(URL.createObjectURL(file))
      console.log(`Loading file: ${file.name}`)
    }
  }

  const handleExportAnnotations = () => {
    if (viewerRef.current) {
      const json = viewerRef.current.exportAnnotations()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'annotations.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImportAnnotations = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && viewerRef.current) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string
          viewerRef.current?.importAnnotations(json)
          console.log('Annotations imported successfully')
        } catch (error) {
          console.error('Failed to import annotations:', error)
          alert('Failed to import annotations. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
    // Reset input so the same file can be imported again
    e.target.value = ''
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Fresh Air PDF</h1>
        <p style={styles.subtitle}>
          Open-source PDF viewer powered by PDF.js
        </p>
      </header>

      {/* Controls */}
      <div style={styles.controls}>
        <button onClick={handleLoadSample} style={styles.button}>
          Load Sample PDF
        </button>
        
        <label style={styles.fileLabel}>
          Upload PDF
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            style={styles.fileInput}
          />
        </label>

        <button
          onClick={handleExportAnnotations}
          style={styles.button}
          disabled={!documentUrl}
        >
          Export Annotations
        </button>

        <label style={styles.fileLabel}>
          Import Annotations
          <input
            type="file"
            accept="application/json"
            onChange={handleImportAnnotations}
            style={styles.fileInput}
          />
        </label>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        <FAPDFViewer
          ref={viewerRef}
          document={documentUrl || undefined}
          config={{
            enableAnnotations: true,
            readOnly: false,
            theme: 'dark',
            showToolbar: true,
            showThumbnails: false,
            initialZoom: 1.0,
          }}
          onDocumentLoaded={handleDocumentLoaded}
          onAnnotationChanged={handleAnnotationChanged}
          onPageChanged={(page) => console.log(`Page changed to ${page}`)}
        />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a1a',
    color: '#fff',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    background: '#252525',
    borderBottom: '1px solid #404040',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#999',
  },
  controls: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    background: '#2c2c2c',
    borderBottom: '1px solid #404040',
    alignItems: 'center',
  },
  button: {
    padding: '8px 16px',
    background: '#0066cc',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  fileLabel: {
    padding: '8px 16px',
    background: '#404040',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  fileInput: {
    display: 'none',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
}

export default App
