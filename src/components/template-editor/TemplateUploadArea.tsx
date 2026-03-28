/**
 * TemplateUploadArea Component
 *
 * Empty state with drag-and-drop PDF upload functionality.
 */

import { useState, useRef, useCallback } from 'react'

interface TemplateUploadAreaProps {
  maxFileSizeMB?: number
  onUpload: (file: File) => void
}

export function TemplateUploadArea({
  maxFileSizeMB = 50,
  onUpload,
}: TemplateUploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndUpload = useCallback((file: File) => {
    setError(null)
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxFileSizeMB}MB limit.`)
      return
    }
    onUpload(file)
  }, [maxFileSizeMB, onUpload])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndUpload(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndUpload(file)
  }

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.dropZone,
          ...(isDragOver ? styles.dropZoneActive : {}),
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div style={styles.icon}>
          <i className="fas fa-cloud-upload-alt" />
        </div>
        <p style={styles.title}>Upload a PDF template</p>
        <p style={styles.subtitle}>
          Drag and drop or click to browse — max {maxFileSizeMB}MB
        </p>
        {error && (
          <p style={styles.error}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }} />
            {error}
          </p>
        )}

        {/* Placeholder bars simulating a document layout */}
        <div style={styles.placeholderBars}>
          <div style={{ ...styles.bar, width: '70%' }} />
          <div style={{ ...styles.bar, width: '100%' }} />
          <div style={{ ...styles.bar, width: '90%' }} />
          <div style={{ ...styles.bar, width: '100%' }} />
          <div style={{ ...styles.bar, width: '60%' }} />
          <div style={{ ...styles.bar, width: '85%' }} />
          <div style={{ ...styles.bar, width: '100%' }} />
          <div style={{ ...styles.bar, width: '45%' }} />
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: 16,
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    minHeight: 240,
    padding: '24px 20px',
    border: '2px dashed #d0d0d0',
    borderRadius: 12,
    background: '#fafafa',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dropZoneActive: {
    borderColor: '#1976D2',
    background: '#e3f2fd',
  },
  icon: {
    fontSize: 40,
    color: '#bbb',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#444',
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 13,
    color: '#999',
  },
  error: {
    margin: '12px 0 0',
    fontSize: 13,
    color: '#d32f2f',
    fontWeight: 500,
  },
  placeholderBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    maxWidth: 280,
    marginTop: 24,
    opacity: 0.3,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    background: '#ccc',
  },
}
