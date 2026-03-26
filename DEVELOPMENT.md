# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

## Project Structure

```
fresh-air-pdf/
├── src/
│   ├── core/                    # Framework-agnostic core
│   │   ├── engine/             # PDF rendering engine
│   │   │   └── PDFDocumentEngine.ts
│   │   ├── annotations/        # Annotation system
│   │   │   ├── AnnotationManager.ts
│   │   │   └── AnnotationRenderer.ts
│   │   ├── events/             # Event bus
│   │   │   └── EventBus.ts
│   │   └── utils/              # Utilities
│   │       └── performance.ts
│   ├── components/             # React components
│   │   ├── viewer/            # Viewer components
│   │   │   ├── PageCanvas.tsx
│   │   │   └── PageVirtualizer.tsx
│   │   ├── toolbar/           # Toolbar
│   │   │   └── Toolbar.tsx
│   │   ├── panels/            # Side panels
│   │   │   ├── SearchPanel.tsx
│   │   │   └── ThumbnailsPanel.tsx
│   │   └── FAPDFViewer.tsx  # Main viewer component
│   ├── hooks/                  # React hooks
│   │   └── useViewer.ts
│   ├── types/                  # TypeScript types
│   │   └── index.ts
│   ├── examples/              # Usage examples
│   │   └── AdvancedExamples.tsx
│   ├── App.tsx                # Demo app
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── README.md                  # Project overview
└── package.json

```

## Key Features

### 1. PDF Rendering
- High-fidelity rendering via Canvas API
- Page caching for performance
- Progressive loading

### 2. Annotations
- Text markup (highlight, underline, strikeout)
- Shapes (rectangle, circle)
- Lines and arrows
- Free text
- Ink/freehand drawing
- Full CRUD operations
- Undo/redo support
- JSON persistence

### 3. Navigation
- Page thumbnails (lazy loaded)
- Search functionality
- Bookmarks/outline
- Zoom controls
- Page navigation

### 4. Performance
- Virtual scrolling for large documents
- Canvas pooling
- LRU caching
- RequestIdleCallback for non-critical tasks
- Performance monitoring utilities

## API Usage

### Basic Usage

```tsx
import { FAPDFViewer } from './components/FAPDFViewer'

function App() {
  return (
    <FAPDFViewer
      document="/path/to/document.pdf"
      config={{
        enableAnnotations: true,
        readOnly: false,
        theme: 'dark',
      }}
      onDocumentLoaded={(e) => console.log('Loaded:', e.document)}
    />
  )
}
```

### Imperative API

```tsx
import { useRef } from 'react'
import { FAPDFViewer } from './components/FAPDFViewer'
import type { ViewerAPI } from './types'

function App() {
  const viewerRef = useRef<ViewerAPI>(null)
  
  const handleZoomIn = () => {
    viewerRef.current?.zoomIn()
  }
  
  const handleAddHighlight = () => {
    viewerRef.current?.addAnnotation({
      type: 'highlight',
      pageNumber: 1,
      quads: [/* ... */],
      color: '#FFFF00',
    })
  }
  
  return (
    <>
      <button onClick={handleZoomIn}>Zoom In</button>
      <button onClick={handleAddHighlight}>Add Highlight</button>
      <FAPDFViewer ref={viewerRef} document="/document.pdf" />
    </>
  )
}
```

### Event Handling

```tsx
import { useEffect } from 'react'
import { eventBus, ViewerEvent } from './core/events/EventBus'

function MyComponent() {
  useEffect(() => {
    const unsubscribe = eventBus.on(ViewerEvent.DocumentLoaded, (event) => {
      console.log('Document loaded:', event)
    })
    
    return unsubscribe
  }, [])
  
  return <FAPDFViewer document="/document.pdf" />
}
```

## Testing

### Unit Tests (TODO)

```bash
npm test
```

### E2E Tests (TODO)

```bash
npm run test:e2e
```

## Performance Optimization

### 1. Enable Virtualization

```tsx
<FAPDFViewer
  config={{
    virtualizePages: true,  // Only render visible pages
  }}
/>
```

### 2. Limit Canvas Size

```tsx
<FAPDFViewer
  config={{
    maxCanvasSize: 4096,  // Max canvas dimensions
  }}
/>
```

### 3. Monitor Performance

```typescript
import { performanceMonitor } from './core/utils/performance'

performanceMonitor.start('renderPage')
// ... render page
performanceMonitor.end('renderPage')

// Get stats
performanceMonitor.report()
```

## Troubleshooting

### PDF.js Worker Not Loading

If you see warnings about PDF.js worker:

```typescript
// In PDFDocumentEngine.ts, update worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = '/path/to/pdf.worker.min.js'
```

### Canvas Performance Issues

For large PDFs, reduce the render scale:

```tsx
<FAPDFViewer
  config={{
    initialZoom: 0.8,  // Lower scale = better performance
  }}
/>
```

### Memory Leaks

Ensure proper cleanup:

```typescript
useEffect(() => {
  const viewer = viewerRef.current
  
  return () => {
    viewer?.closeDocument()  // Clean up on unmount
  }
}, [])
```

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Write descriptive comments
- Add JSDoc for public APIs

### Adding Features

1. Design in `src/core/` (framework-agnostic)
2. Create React wrapper in `src/components/`
3. Add types to `src/types/`
4. Update documentation
5. Add example to `src/examples/`

### Testing Checklist

- [ ] Unit tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Manual testing on Chrome, Firefox, Safari
- [ ] Test with large PDF (100+ pages)
- [ ] Test with complex annotations
- [ ] Memory profiling

## Deployment

### Production Build

```bash
npm run build
```

Output goes to `dist/` directory.

### Environment Variables

```bash
VITE_PDF_WORKER_URL=/path/to/worker.js
```

## Roadmap

### Short Term
- [x] MVP: Basic PDF rendering
- [x] Core annotations
- [x] Toolbar and navigation
- [ ] Full text search with highlights
- [ ] Complete thumbnail panel
- [ ] Touch gesture support

### Medium Term
- [ ] Web Worker rendering
- [ ] OffscreenCanvas support
- [ ] Form filling
- [ ] Export annotations to PDF

### Long Term
- [ ] Digital signatures
- [ ] DOCX/XLSX support
- [ ] Collaboration features
- [ ] Mobile optimization

## License

Proprietary - Internal use only

## Support

For questions or issues:
- Internal Slack: #pdf-viewer
- Email: dev-team@company.com
- GitHub Issues: [link]
