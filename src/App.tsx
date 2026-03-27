/**
 * Example App - Demo Usage of FAPDFViewer & FATemplateEditor
 */

import { useRef, useState } from 'react'
import { FAPDFViewer } from './components/FAPDFViewer'
import { FATemplateEditor } from './components/template-editor/FATemplateEditor'
import type {
  ViewerAPI,
  TemplateEditorAPI,
  DocumentLoadedEvent,
  AnnotationChangedEvent,
  SystemFieldCategory,
  TemplateSavePayload,
  TemplateField,
} from './types'

// Sample system field categories for the template editor demo
// Sample system field categories — consumer only needs `name` and `fieldType` per field.
// `id` and `category` are auto-generated if omitted.
const SAMPLE_SYSTEM_FIELDS: SystemFieldCategory[] = [
  {
    name: 'Question',
    icon: 'fas fa-question-circle',
    fields: [],
  },
  {
    name: 'Account Details',
    fields: [
      { name: 'Account Name', fieldType: 'text', description: 'The primary account holder name' },
      { name: 'Account Number', fieldType: 'text', description: 'Unique account identifier' },
      { name: 'Account Status', fieldType: 'text', description: 'Current status of the account' },
      { name: 'Account Open Date', fieldType: 'date', description: 'Date the account was opened' },
    ],
  },
  {
    name: 'Account Information',
    fields: [
      { name: 'Account Type', fieldType: 'text', description: 'Type of account (savings, checking, etc.)' },
      { name: 'Account Balance', fieldType: 'number', description: 'Current balance amount' },
    ],
  },
  {
    name: 'Claims',
    fields: [
      { name: 'Claimant Name', fieldType: 'text', description: 'Full legal name of the claimant' },
      { name: 'Date of Loss', fieldType: 'date', description: 'Date the loss occurred' },
      { name: 'Claim Amount', fieldType: 'number', description: 'Total claim value in dollars' },
      { name: 'Claim Approved', fieldType: 'checkbox', description: 'Whether the claim has been approved' },
    ],
  },
  {
    name: 'Company',
    fields: [
      { name: 'Company Name', fieldType: 'text', description: 'Legal company name' },
      { name: 'Company ID', fieldType: 'text', description: 'Company identification number' },
    ],
  },
  {
    name: 'System',
    icon: 'fas fa-desktop',
    fields: [
      { name: 'Reviewed By', fieldType: 'signature', description: 'Signature of the reviewer' },
      { name: 'Review Date', fieldType: 'date', description: 'Date the review was completed' },
      { name: 'Case Reference', fieldType: 'text', description: 'Internal case reference number' },
    ],
  },
  {
    name: 'Formulas',
    icon: 'fas fa-square-root-variable',
    fields: [
      { name: 'Total Amount', fieldType: 'dropdown', description: 'Calculated total amount' },
      { name: 'Tax Amount', fieldType: 'dropdown', description: 'Calculated tax on the total' },
    ],
  },
]

type DemoMode = 'viewer' | 'template-editor' | 'template-custom'

function App() {
  const viewerRef = useRef<ViewerAPI>(null)
  const templateEditorRef = useRef<TemplateEditorAPI>(null)
  const [demoMode, setDemoMode] = useState<DemoMode>('template-editor')
  const [documentUrl, setDocumentUrl] = useState<string>(
    'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
  )

  // Load saved fields from localStorage (simulating backend)
  const STORAGE_KEY = 'fresh-air-pdf-template-fields'
  const [savedFields, setSavedFields] = useState<TemplateField[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        // Support both versioned format and plain fields array
        return data.fields || data || []
      }
    } catch { /* ignore */ }
    return []
  })

  const handleDocumentLoaded = (event: DocumentLoadedEvent) => {
    console.log(`Document loaded: ${event.document.numPages} pages`)
  }

  const handleAnnotationChanged = (event: AnnotationChangedEvent) => {
    console.log(`Annotation ${event.action}: ${event.annotation.type}`)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setDocumentUrl(URL.createObjectURL(file))
    }
  }

  const handleTemplateSave = (payload: TemplateSavePayload) => {
    // Store the exportJson in localStorage (simulating a backend save)
    localStorage.setItem(STORAGE_KEY, payload.exportJson)
    setSavedFields(payload.fields)
    console.log('Template saved:', payload)
    console.log('Export JSON (store this in your backend):', payload.exportJson)
    alert(`Template "${payload.template.name}" saved with ${payload.fields.length} fields.\n\nFields stored in localStorage — reload the page to verify they restore.`)
  }

  const handleTemplateDiscard = () => {
    if (confirm('Discard all changes?')) {
      console.log('Changes discarded')
    }
  }

  const handleExportToFile = () => {
    const api = templateEditorRef.current
    if (!api) return
    const json = api.exportTemplate({ name: 'Exported Template' })
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-fields.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFromFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const api = templateEditorRef.current
        if (!api || typeof reader.result !== 'string') return
        const imported = api.importTemplate(reader.result)
        console.log(`Imported ${imported.length} fields`)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleClearSaved = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSavedFields([])
    alert('Saved fields cleared. Reload to start fresh.')
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Fresh Air PDF</h1>
          <p style={styles.subtitle}>Open-source PDF viewer & template editor</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(demoMode === 'viewer' ? styles.tabActive : {}),
              }}
              onClick={() => setDemoMode('viewer')}
            >
              PDF Viewer
            </button>
            <button
              style={{
                ...styles.tab,
                ...(demoMode === 'template-editor' ? styles.tabActive : {}),
              }}
              onClick={() => setDemoMode('template-editor')}
            >
              Template Editor
            </button>
            <button
              style={{
                ...styles.tab,
                ...(demoMode === 'template-custom' ? styles.tabActive : {}),
              }}
              onClick={() => setDemoMode('template-custom')}
            >
              Custom Fields
            </button>
          </div>

          {demoMode !== 'viewer' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={styles.headerBtn} onClick={handleExportToFile} title="Export fields to JSON file">
                Export
              </button>
              <button style={styles.headerBtn} onClick={handleImportFromFile} title="Import fields from JSON file">
                Import
              </button>
              {savedFields.length > 0 && (
                <button style={{ ...styles.headerBtn, color: '#ff6b6b' }} onClick={handleClearSaved} title="Clear saved fields from localStorage">
                  Clear ({savedFields.length})
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.content}>
        {demoMode === 'viewer' ? (
          <>
            <div style={styles.controls}>
              <button onClick={() => setDocumentUrl('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')} style={styles.button}>
                Load Sample PDF
              </button>
              <label style={styles.fileLabel}>
                Upload PDF
                <input type="file" accept="application/pdf" onChange={handleFileUpload} style={styles.fileInput} />
              </label>
            </div>
            <div style={styles.viewerContainer}>
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
              />
            </div>
          </>
        ) : demoMode === 'template-editor' ? (
          <div style={styles.viewerContainer}>
            <FATemplateEditor
              ref={templateEditorRef}
              document={documentUrl || undefined}
              template={{ name: 'Standard Progress Report v2' }}
              systemFieldCategories={SAMPLE_SYSTEM_FIELDS}
              config={{ readOnly: false, maxFileSizeMB: 50, allowCustomFields: true }}
              initialFields={savedFields}
              onSave={handleTemplateSave}
              onDiscard={handleTemplateDiscard}
              onDocumentLoaded={handleDocumentLoaded}
              onFieldsChange={(fields) => console.log('Fields changed:', fields.length)}
            />
          </div>
        ) : (
          <div style={styles.viewerContainer}>
            <FATemplateEditor
              ref={templateEditorRef}
              document={documentUrl || undefined}
              template={{ name: 'Custom Template' }}
              config={{ readOnly: false, maxFileSizeMB: 50, allowCustomFields: true }}
              initialFields={savedFields}
              onSave={handleTemplateSave}
              onDiscard={handleTemplateDiscard}
              onDocumentLoaded={handleDocumentLoaded}
              onFieldsChange={(fields) => console.log('Fields changed:', fields.length)}
            />
          </div>
        )}
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: '#252525',
    borderBottom: '1px solid #404040',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: 12,
    color: '#999',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    background: '#333',
    borderRadius: 6,
    padding: 3,
  },
  tab: {
    padding: '6px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#999',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  tabActive: {
    background: '#0066cc',
    color: '#fff',
  },
  controls: {
    display: 'flex',
    gap: 12,
    padding: '12px 24px',
    background: '#2c2c2c',
    borderBottom: '1px solid #404040',
    alignItems: 'center',
  },
  button: {
    padding: '8px 16px',
    background: '#0066cc',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  fileLabel: {
    padding: '8px 16px',
    background: '#404040',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  fileInput: {
    display: 'none',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  headerBtn: {
    padding: '5px 10px',
    background: '#404040',
    border: '1px solid #555',
    borderRadius: 4,
    color: '#ccc',
    fontSize: 12,
    cursor: 'pointer',
  },
  viewerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
}

export default App
