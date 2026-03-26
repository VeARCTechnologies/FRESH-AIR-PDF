/**
 * Signature Modal Component
 * 
 * Provides signature creation interface with:
 * - Draw signature on canvas
 * - Upload signature image
 * - Clear and save functionality
 */

import { useState, useRef, useEffect } from 'react'

// Add global hover styles for modal
const modalStyleSheet = document.createElement('style')
modalStyleSheet.textContent = `
  .signature-modal-close-btn:hover {
    background: #f0f0f0 !important;
  }
  .signature-modal-tab:hover {
    background: #f5f5f5 !important;
  }
  .signature-modal-clear-btn:hover {
    background: #f5f5f5 !important;
    border-color: #0078d4 !important;
    color: #0078d4 !important;
  }
  .signature-modal-upload-btn:hover {
    border-color: #0078d4 !important;
    background: #f5f9ff !important;
  }
  .signature-modal-change-btn:hover {
    background: #0078d4 !important;
    color: #fff !important;
  }
  .signature-modal-cancel-btn:hover {
    background: #f5f5f5 !important;
  }
  .signature-modal-save-btn:hover {
    background: #005a9e !important;
  }
`
if (!document.head.querySelector('#signature-modal-styles')) {
  modalStyleSheet.id = 'signature-modal-styles'
  document.head.appendChild(modalStyleSheet)
}

interface SignatureModalProps {
  onClose: () => void
  onSave: (signatureDataUrl: string) => void
  existingSignature?: string | null
}

type SignatureMode = 'draw' | 'upload'

export function SignatureModal({ onClose, onSave, existingSignature }: SignatureModalProps) {
  const [mode, setMode] = useState<SignatureMode>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(existingSignature || null)
  const [hasExistingSignature] = useState(!!existingSignature)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // If there's an existing signature, load it onto the canvas
    if (existingSignature && mode === 'draw' && existingSignature.startsWith('data:image/')) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = existingSignature
    }

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Handle ESC key to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, mode, existingSignature])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }
  }

  const startDrawing = (pos: { x: number; y: number }) => {
    setIsDrawing(true)
    lastPosRef.current = pos

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (pos: { x: number; y: number }) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    startDrawing(pos)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    draw(pos)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pos = getTouchPos(e)
    startDrawing(pos)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pos = getTouchPos(e)
    draw(pos)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setUploadedImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (mode === 'draw') {
      const canvas = canvasRef.current
      if (!canvas) return

      // Check if canvas is empty (all white)
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      let isEmpty = true

      for (let i = 0; i < data.length; i += 4) {
        // Check if any pixel is not white (RGB: 255, 255, 255)
        if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
          isEmpty = false
          break
        }
      }

      if (isEmpty) {
        alert('Please draw your signature first')
        return
      }

      const dataUrl = canvas.toDataURL('image/png')
      onSave(dataUrl)
    } else {
      if (!uploadedImage) {
        alert('Please upload a signature image')
        return
      }
      onSave(uploadedImage)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>{hasExistingSignature ? 'Edit Signature' : 'Add Signature'}</h2>
          <button className="signature-modal-close-btn" style={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div style={styles.tabs}>
          <button
            className="signature-modal-tab"
            style={{
              ...styles.tab,
              ...(mode === 'draw' ? styles.activeTab : {}),
            }}
            onClick={() => setMode('draw')}
          >
            <i className="fas fa-pen" style={{ marginRight: '8px' }} />
            Draw
          </button>
          <button
            className="signature-modal-tab"
            style={{
              ...styles.tab,
              ...(mode === 'upload' ? styles.activeTab : {}),
            }}
            onClick={() => setMode('upload')}
          >
            <i className="fas fa-upload" style={{ marginRight: '8px' }} />
            Upload
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {mode === 'draw' ? (
            <div style={styles.drawSection}>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                style={styles.canvas}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={stopDrawing}
              />
              <button className="signature-modal-clear-btn" style={styles.clearButton} onClick={handleClear}>
                <i className="fas fa-eraser" style={{ marginRight: '6px' }} />
                Clear
              </button>
            </div>
          ) : (
            <div style={styles.uploadSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              {uploadedImage ? (
                <div style={styles.previewContainer}>
                  <img src={uploadedImage} alt="Signature" style={styles.previewImage} />
                  <button
                    className="signature-modal-change-btn"
                    style={styles.changeButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="fas fa-image" style={{ marginRight: '6px' }} />
                    Change Image
                  </button>
                </div>
              ) : (
                <button
                  className="signature-modal-upload-btn"
                  style={styles.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <span style={{ fontSize: '16px', fontWeight: 500 }}>Click to upload signature</span>
                  <span style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    PNG, JPG up to 5MB
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button className="signature-modal-cancel-btn" style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className="signature-modal-save-btn" style={styles.saveButton} onClick={handleSave}>
            <i className="fas fa-check" style={{ marginRight: '6px' }} />
            Apply Signature
          </button>
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    width: '700px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    zIndex: 10001,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#666',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
    padding: '0 24px',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#0078d4',
    borderBottomColor: '#0078d4',
  },
  content: {
    flex: 1,
    padding: '24px',
    overflow: 'auto',
  },
  drawSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  canvas: {
    border: '2px solid #e0e0e0',
    borderRadius: '4px',
    cursor: 'crosshair',
    touchAction: 'none',
  },
  clearButton: {
    padding: '8px 16px',
    border: '1px solid #e0e0e0',
    background: '#fff',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  uploadSection: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '250px',
  },
  uploadButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '48px',
    border: '2px dashed #ccc',
    background: '#fafafa',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#666',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    border: '2px solid #e0e0e0',
    borderRadius: '4px',
    objectFit: 'contain',
  },
  changeButton: {
    padding: '8px 16px',
    border: '1px solid #0078d4',
    background: '#fff',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#0078d4',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e0e0e0',
  },
  cancelButton: {
    padding: '10px 20px',
    border: '1px solid #e0e0e0',
    background: '#fff',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  saveButton: {
    padding: '10px 20px',
    border: 'none',
    background: '#0078d4',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
