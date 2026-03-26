# Fresh Air PDF

An open-source, enterprise-grade PDF viewer built in React, powered by Mozilla's PDF.js.

## 🎯 Philosophy

- **No commercial SDKs** - Built entirely on open standards
- **Self-hosted** - Your documents never leave your infrastructure
- **Framework agnostic core** - React UI layer over portable engine
- **Extensible** - Plugin architecture for custom features
- **Enterprise ready** - Handles 1000+ page documents efficiently

## 🚀 Features

### Document Support
- ✅ PDF (primary)
- 🔜 DOCX, XLSX, PPTX (architecture ready)

### Rendering
- High-fidelity PDF rendering via Canvas
- Zoom (fit width, fit page, custom zoom levels)
- Page rotation (90°, 180°, 270°)
- Smooth scrolling (vertical + horizontal)
- Virtualized rendering for large documents

### Navigation
- Page thumbnails panel
- Page number navigation
- Document outline/bookmarks
- Full-text search with highlights
- Jump to search results

### Annotations
- Text highlight, underline, strikethrough
- Free text annotations
- Shapes (rectangle, circle, arrow, line)
- Ink/freehand drawing
- Selection, move, resize, delete
- Undo/redo support
- JSON persistence and rehydration
- Export annotations to PDF

### Performance
- Web Worker-based PDF parsing
- Progressive page rendering
- Memory-efficient virtualization
- OffscreenCanvas for rendering (when available)
- No UI blocking

## 📦 Installation

```bash
npm install
npm run dev
```

## 🎨 Usage

```tsx
import { FAPDFViewer } from './components/FAPDFViewer'

function App() {
  return (
    <FAPDFViewer
      document="/path/to/document.pdf"
      onDocumentLoaded={(doc) => console.log('Loaded:', doc)}
      onAnnotationChanged={(annots) => console.log('Annotations:', annots)}
      config={{
        enableAnnotations: true,
        readOnly: false,
        theme: 'dark',
      }}
    />
  )
}
```

## 🏗️ Architecture

```
src/
├── core/                    # Framework-agnostic engine
│   ├── engine/             # PDF rendering & parsing
│   ├── annotations/        # Annotation engine
│   ├── events/             # Event bus
│   └── plugins/            # Plugin system
├── components/             # React UI layer
│   ├── viewer/            # Main viewer component
│   ├── toolbar/           # Toolbar components
│   ├── panels/            # Side panels (thumbnails, outline)
│   └── annotations/       # Annotation UI
├── hooks/                  # React hooks
├── types/                  # TypeScript definitions
└── workers/               # Web Workers
```

## 🔧 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **PDF.js** - PDF parsing (Mozilla's open-source library)
- **Canvas API** - Rendering
- **Web Workers** - Background processing

## 📈 Performance

- Handles documents with 1000+ pages
- Memory-efficient virtualization
- Progressive rendering
- Web Worker offloading
- Optimized for mobile and desktop

## 🔒 Security

- No data leaves the browser
- Supports URL, Blob, ArrayBuffer sources
- Permission system (read-only vs annotate)
- CSP compliant

## 🛣️ Roadmap

- [ ] MVP: PDF rendering + basic navigation
- [ ] Annotation system
- [ ] Search functionality
- [ ] Thumbnail panel
- [ ] Touch gestures
- [ ] Export annotations to PDF
- [ ] DOCX/XLSX support
- [ ] Form filling
- [ ] Digital signatures

## 📄 License

MIT
