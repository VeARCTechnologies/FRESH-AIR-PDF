/**
 * Example: Advanced Usage Patterns
 */

import { useRef, useState, useEffect } from 'react'
import { FAPDFViewer } from '../components/FAPDFViewer'
import type { ViewerAPI, Annotation } from '../types'
import { ViewerEvent } from '../types'
import { eventBus } from '../core/events/EventBus'

/**
 * Example 1: Read-only Viewer with Custom Toolbar
 */
export function ReadOnlyViewerExample() {
  const viewerRef = useRef<ViewerAPI>(null)
  
  const handleDownload = () => {
    // Implement download logic
    window.open(documentUrl, '_blank')
  }
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Custom toolbar */}
      <div style={{ padding: '12px', background: '#333' }}>
        <button onClick={handleDownload}>Download PDF</button>
      </div>
      
      {/* Viewer */}
      <div style={{ flex: 1 }}>
        <FAPDFViewer
          ref={viewerRef}
          document="/document.pdf"
          config={{
            readOnly: true,
            showToolbar: true,
            enableAnnotations: false,
          }}
        />
      </div>
    </div>
  )
}

/**
 * Example 2: Annotation Workflow
 */
export function AnnotationWorkflowExample() {
  const viewerRef = useRef<ViewerAPI>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  
  useEffect(() => {
    // Listen for annotation selection
    const unsubscribe = eventBus.on(ViewerEvent.AnnotationSelected, ({ annotation }) => {
      setSelectedAnnotation(annotation.id)
    })
    
    return unsubscribe
  }, [])
  
  const handleSaveAnnotations = async () => {
    const json = viewerRef.current?.exportAnnotations()
    if (json) {
      // Save to backend
      await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      })
    }
  }
  
  const handleLoadAnnotations = async () => {
    const response = await fetch('/api/annotations')
    const json = await response.text()
    viewerRef.current?.importAnnotations(json)
  }
  
  const handleDeleteSelected = () => {
    if (selectedAnnotation) {
      viewerRef.current?.deleteAnnotation(selectedAnnotation)
    }
  }
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Actions */}
      <div style={{ padding: '12px', background: '#333', display: 'flex', gap: '8px' }}>
        <button onClick={handleSaveAnnotations}>Save Annotations</button>
        <button onClick={handleLoadAnnotations}>Load Annotations</button>
        <button onClick={handleDeleteSelected} disabled={!selectedAnnotation}>
          Delete Selected
        </button>
      </div>
      
      {/* Viewer */}
      <div style={{ flex: 1 }}>
        <FAPDFViewer
          ref={viewerRef}
          document="/document.pdf"
          config={{
            enableAnnotations: true,
            readOnly: false,
          }}
          onAnnotationChanged={(event) => {
            setAnnotations(viewerRef.current?.getAnnotations() || [])
          }}
        />
      </div>
      
      {/* Annotation list */}
      <div style={{ width: '250px', background: '#222', padding: '16px' }}>
        <h3>Annotations ({annotations.length})</h3>
        <ul>
          {annotations.map(annot => (
            <li
              key={annot.id}
              style={{
                cursor: 'pointer',
                padding: '8px',
                background: annot.id === selectedAnnotation ? '#444' : 'transparent',
              }}
              onClick={() => setSelectedAnnotation(annot.id)}
            >
              {annot.type} - Page {annot.pageNumber}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Example 3: Multi-Document Comparison
 */
export function DocumentComparisonExample() {
  const viewer1Ref = useRef<ViewerAPI>(null)
  const viewer2Ref = useRef<ViewerAPI>(null)
  const [syncScroll, setSyncScroll] = useState(true)
  
  useEffect(() => {
    if (!syncScroll) return
    
    const handlePage1Change = ({ pageNumber }: any) => {
      viewer2Ref.current?.goToPage(pageNumber)
    }
    
    const handlePage2Change = ({ pageNumber }: any) => {
      viewer1Ref.current?.goToPage(pageNumber)
    }
    
    const unsub1 = eventBus.on(ViewerEvent.PageChanged, handlePage1Change)
    const unsub2 = eventBus.on(ViewerEvent.PageChanged, handlePage2Change)
    
    return () => {
      unsub1()
      unsub2()
    }
  }, [syncScroll])
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px', background: '#333' }}>
        <label>
          <input
            type="checkbox"
            checked={syncScroll}
            onChange={(e) => setSyncScroll(e.target.checked)}
          />
          Sync Scrolling
        </label>
      </div>
      
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1, borderRight: '1px solid #444' }}>
          <FAPDFViewer
            ref={viewer1Ref}
            document="/document1.pdf"
            config={{ showToolbar: false }}
          />
        </div>
        
        <div style={{ flex: 1 }}>
          <FAPDFViewer
            ref={viewer2Ref}
            document="/document2.pdf"
            config={{ showToolbar: false }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Example 4: Form Review Workflow
 */
export function FormReviewExample() {
  const viewerRef = useRef<ViewerAPI>(null)
  const [currentField, setCurrentField] = useState(0)
  const [fields] = useState([
    { page: 1, name: 'Name', status: 'pending' },
    { page: 1, name: 'Address', status: 'pending' },
    { page: 2, name: 'Signature', status: 'pending' },
  ])
  
  const goToField = (index: number) => {
    setCurrentField(index)
    viewerRef.current?.goToPage(fields[index].page)
  }
  
  const approveField = () => {
    fields[currentField].status = 'approved'
    if (currentField < fields.length - 1) {
      goToField(currentField + 1)
    }
  }
  
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', background: '#222', padding: '16px' }}>
        <h2>Form Review</h2>
        <p>Field {currentField + 1} of {fields.length}</p>
        
        <div style={{ marginTop: '16px' }}>
          {fields.map((field, index) => (
            <div
              key={index}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: index === currentField ? '#444' : '#333',
                cursor: 'pointer',
              }}
              onClick={() => goToField(index)}
            >
              <div>{field.name}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                Page {field.page} - {field.status}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={approveField}
          style={{
            marginTop: '16px',
            padding: '12px',
            width: '100%',
            background: '#0066cc',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Approve & Next
        </button>
      </div>
      
      {/* Viewer */}
      <div style={{ flex: 1 }}>
        <FAPDFViewer
          ref={viewerRef}
          document="/form.pdf"
          config={{
            enableAnnotations: true,
            showToolbar: true,
          }}
        />
      </div>
    </div>
  )
}

/**
 * Example 5: Custom Annotation Tool
 */
export function CustomAnnotationToolExample() {
  const viewerRef = useRef<ViewerAPI>(null)
  const [stampMode, setStampMode] = useState(false)
  
  const handleCanvasClick = (event: MouseEvent, pageNumber: number) => {
    if (!stampMode) return
    
    // Get click coordinates relative to page
    const canvas = event.target as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    
    // Add custom stamp annotation
    viewerRef.current?.addAnnotation({
      type: 'free-text',
      pageNumber,
      rect: { x, y, width: 0.1, height: 0.05 },
      content: '✓ APPROVED',
      fontSize: 16,
      fontFamily: 'Arial',
      textAlign: 'center',
      color: '#00AA00',
      borderWidth: 2,
      borderColor: '#00AA00',
    } as any)
    
    setStampMode(false)
  }
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px', background: '#333' }}>
        <button
          onClick={() => setStampMode(!stampMode)}
          style={{
            background: stampMode ? '#00AA00' : '#666',
            padding: '8px 16px',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {stampMode ? 'Click to place stamp' : 'Activate Stamp Tool'}
        </button>
      </div>
      
      <div style={{ flex: 1 }}>
        <FAPDFViewer
          ref={viewerRef}
          document="/document.pdf"
          config={{
            enableAnnotations: true,
            showToolbar: true,
          }}
        />
      </div>
    </div>
  )
}
