# Fresh Air PDF

An open-source, enterprise-grade PDF viewer React component library powered by Mozilla's PDF.js.

[![npm version](https://img.shields.io/npm/v/fresh-air-pdf.svg)](https://www.npmjs.com/package/fresh-air-pdf)
[![license](https://img.shields.io/npm/l/fresh-air-pdf.svg)](https://github.com/VeARCTechnologies/PDF-VIEWER/blob/main/LICENSE)

**[Live Demo](https://vearctechnologies.github.io/FRESH-AIR-PDF/)**

## Features

- **High-fidelity rendering** — Canvas-based PDF rendering via Mozilla's PDF.js
- **Annotations** — Highlight, underline, strikeout, free text, shapes (rectangle, circle, arrow, line), ink/freehand drawing
- **Form fields** — Text, checkbox, radio, dropdown, and signature fields with persistent values
- **Navigation** — Page thumbnails, document outline/bookmarks, page number input
- **Search** — Full-text search with highlighted results
- **Zoom & rotation** — Fit width, fit page, custom zoom, 90/180/270 degree rotation
- **Undo/redo** — Full annotation history (up to 50 entries)
- **Import/export** — JSON-based persistence for annotations and form fields
- **Performance** — Virtualized rendering, Web Workers, handles 1000+ page documents
- **TypeScript** — Fully typed API with exported types
- **No data leaves the browser** — Self-hosted, your documents stay on your infrastructure

## Installation

```bash
npm install fresh-air-pdf
```

**Peer dependencies:** React 18+ or 19+

```bash
npm install react react-dom
```

## Quick Start

```tsx
import { FAPDFViewer } from 'fresh-air-pdf';
import 'fresh-air-pdf/style.css';

function App() {
  return (
    <FAPDFViewer
      document="/path/to/document.pdf"
      onDocumentLoaded={(doc) => console.log('Loaded:', doc)}
      config={{
        enableAnnotations: true,
        readOnly: false,
      }}
    />
  );
}
```

## Using the Viewer API

Access the viewer programmatically via the `useViewer` hook:

```tsx
import { FAPDFViewer, useViewer } from 'fresh-air-pdf';
import 'fresh-air-pdf/style.css';

function App() {
  const { viewerRef, api } = useViewer();

  const handleExport = () => {
    const json = api.exportAnnotations();
    console.log(json);
  };

  return (
    <div>
      <button onClick={handleExport}>Export Annotations</button>
      <FAPDFViewer ref={viewerRef} document="/document.pdf" />
    </div>
  );
}
```

## API Reference

### `<FAPDFViewer />` Props

| Prop | Type | Description |
|------|------|-------------|
| `document` | `string \| ArrayBuffer \| Uint8Array` | PDF source — URL, base64, or binary |
| `config` | `ViewerConfig` | Viewer configuration options |
| `onDocumentLoaded` | `(doc: DocumentInfo) => void` | Callback when document loads |
| `onAnnotationChanged` | `(annotations: Annotation[]) => void` | Callback on annotation changes |

### `ViewerAPI` Methods

| Method | Description |
|--------|-------------|
| `exportAnnotations()` | Returns JSON string of all annotations and form fields |
| `importAnnotations(json)` | Imports annotations and form fields from JSON |
| `getAnnotations(pageNumber?)` | Get annotations, optionally filtered by page |
| `addAnnotation(annotation)` | Add a new annotation |
| `updateAnnotation(id, changes)` | Update an existing annotation |
| `deleteAnnotation(id)` | Delete an annotation |
| `getFormFields()` | Get all form fields |
| `setFormFields(fields)` | Set form fields |

### Annotation Types

`highlight` | `underline` | `strikeout` | `freetext` | `rectangle` | `circle` | `arrow` | `line` | `ink`

### Form Field Types

`text` | `checkbox` | `radio` | `dropdown` | `signature`

## Advanced Usage

### Core Engines

For advanced use cases, you can use the core engines directly:

```tsx
import {
  PDFDocumentEngine,
  AnnotationManager,
  AnnotationRenderer,
  eventBus,
} from 'fresh-air-pdf';
```

### Import/Export Format

```json
{
  "annotations": [
    {
      "type": "highlight",
      "pageNumber": 1,
      "color": "#FFEB3B",
      "opacity": 0.4,
      "quads": [[x1, y1, x2, y2, x3, y3, x4, y4]],
      "text": "selected text"
    }
  ],
  "formFields": [
    {
      "name": "email",
      "type": "text",
      "pageNumber": 1,
      "bounds": { "x": 100, "y": 200, "width": 200, "height": 30 },
      "value": "user@example.com"
    }
  ]
}
```

## Architecture

```
src/
├── core/                    # Framework-agnostic engine
│   ├── engine/             # PDF rendering & parsing
│   ├── annotations/        # Annotation CRUD + undo/redo
│   └── events/             # Pub/sub event bus
├── components/             # React UI layer
│   ├── viewer/            # Page rendering & virtualization
│   ├── toolbar/           # Toolbar
│   ├── panels/            # Sidebar panels
│   └── overlays/          # Annotation & form field overlays
├── hooks/                  # React hooks (useViewer)
└── types/                  # TypeScript definitions
```

## Tech Stack

- **React 18/19** — UI framework
- **TypeScript** — Full type safety
- **Vite** — Build tooling (dual ESM/CJS output)
- **PDF.js** — PDF parsing & rendering (Mozilla)
- **Canvas API** — Annotation rendering

## Development

```bash
git clone https://github.com/VeARCTechnologies/PDF-VIEWER.git
cd PDF-VIEWER
npm install
npm run dev          # Dev server at http://localhost:5173
npm run build:lib    # Build library (ESM + CJS + types)
npm run lint         # ESLint
npm run type-check   # TypeScript checking
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](LICENSE)
