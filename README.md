# Fresh Air PDF

A fully-featured, open-source PDF viewer React component with built-in annotations, form fields, signatures, search, and more — powered by Mozilla's PDF.js. No commercial SDK required. No data leaves the browser.

[![npm version](https://img.shields.io/npm/v/fresh-air-pdf.svg)](https://www.npmjs.com/package/fresh-air-pdf)
[![license](https://img.shields.io/npm/l/fresh-air-pdf.svg)](https://github.com/VeARCTechnologies/FRESH-AIR-PDF/blob/main/LICENSE)

**[Live Demo](https://vearctechnologies.github.io/FRESH-AIR-PDF/)** | **[GitHub](https://github.com/VeARCTechnologies/FRESH-AIR-PDF)**

---

## See It in Action

### PDF Viewer — Annotations, Search, Form Fields & More

https://github.com/user-attachments/assets/pdf-viewer-demo.mp4

https://github.com/VeARCTechnologies/FRESH-AIR-PDF/raw/main/docs/pdf-viewer-demo.mp4

### Template Editor — Create & Manage Document Templates

https://github.com/VeARCTechnologies/FRESH-AIR-PDF/raw/main/docs/template-editor-demo.mp4

---

## Why Fresh Air PDF?

Most React PDF viewers only render pages. If you need annotations, form fields, signatures, or overlays, you're stuck paying for a commercial SDK or stitching together multiple libraries.

**Fresh Air PDF gives you all of that in one package — for free.**

- Drop-in React component with zero config
- Full annotation toolbar out of the box
- Form fields with persistent values
- Signature capture with canvas drawing
- JSON import/export for all data
- Works with React 18 and 19
- Fully typed with TypeScript
- Self-hosted — your documents never leave your infrastructure

---

## Features

### PDF Rendering
- High-fidelity canvas-based rendering via Mozilla's PDF.js
- Virtualized page rendering — handles 1000+ page documents without lag
- Web Worker-based parsing — no UI blocking
- Supports URL, Base64, ArrayBuffer, and Uint8Array sources

### Annotations
Create, edit, move, resize, and delete annotations directly on the PDF:

| Type | Description |
|------|-------------|
| **Highlight** | Highlight selected text with customizable color and opacity |
| **Underline** | Underline selected text |
| **Strikeout** | Strikethrough selected text |
| **Free Text** | Add text boxes anywhere on the page with font, size, and alignment options |
| **Rectangle** | Draw rectangles with fill color, border color, and border width |
| **Circle** | Draw circles/ellipses with fill and border |
| **Arrow** | Draw arrows between two points |
| **Line** | Draw lines between two points |
| **Ink / Freehand** | Draw freehand with customizable pen width and color |

All annotations support:
- Color and opacity customization
- Move and resize via drag handles
- Undo/redo (up to 50 history entries)
- JSON export and import
- Per-page storage

### Form Fields
Add interactive form fields on top of any PDF page:

| Type | Description |
|------|-------------|
| **Text Input** | Single-line or multi-line text fields with placeholder support |
| **Checkbox** | Boolean toggle fields |
| **Radio Button** | Single-select from multiple options |
| **Dropdown** | Select from a list of options |
| **Signature** | Capture handwritten signatures via canvas drawing pad |

All form fields support:
- Persistent values that survive page navigation
- Required/read-only configuration
- Custom positioning and sizing
- JSON export and import alongside annotations

### Navigation
- **Page thumbnails** — Visual sidebar with clickable page previews
- **Document outline** — Navigate via PDF bookmarks/table of contents
- **Page number input** — Jump directly to any page
- **Keyboard navigation** — Arrow keys, Page Up/Down

### Search
- Full-text search across the entire document
- Highlighted search results on the page
- Jump between matches (previous/next)
- Match count display

### Zoom & Rotation
- Fit to width / Fit to page
- Custom zoom levels
- Zoom in/out controls
- Page rotation (90, 180, 270 degrees)

### Import / Export
- Export all annotations and form fields as a single JSON file
- Import previously saved annotations and form fields
- Supports legacy annotation-only format for backward compatibility
- Coordinates in PDF units, colors in hex, dates in ISO 8601

---

## Installation

```bash
npm install fresh-air-pdf
```

**Peer dependencies:** React 18+ or 19+

```bash
npm install react react-dom
```

---

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

That's it. You get a full PDF viewer with toolbar, sidebar, annotations, form fields, and search — all in one component.

---

## Programmatic Control with ViewerAPI

Access the viewer programmatically via the `useViewer` hook:

```tsx
import { FAPDFViewer, useViewer } from 'fresh-air-pdf';
import 'fresh-air-pdf/style.css';

function App() {
  const { viewerRef, api } = useViewer();

  const handleExport = () => {
    const json = api.exportAnnotations();
    // Save to server, download as file, etc.
    console.log(json);
  };

  const handleImport = (json: string) => {
    api.importAnnotations(json);
  };

  return (
    <div>
      <button onClick={handleExport}>Export</button>
      <FAPDFViewer ref={viewerRef} document="/document.pdf" />
    </div>
  );
}
```

---

## API Reference

### `<FAPDFViewer />` Props

| Prop | Type | Description |
|------|------|-------------|
| `document` | `string \| ArrayBuffer \| Uint8Array` | PDF source — URL, base64, or binary data |
| `config` | `ViewerConfig` | Viewer configuration (annotations, read-only, theme, etc.) |
| `onDocumentLoaded` | `(doc: DocumentInfo) => void` | Fires when the PDF document has loaded |
| `onAnnotationChanged` | `(annotations: Annotation[]) => void` | Fires when annotations are added, updated, or deleted |

### `ViewerAPI` Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `exportAnnotations()` | `string` | JSON string containing all annotations and form fields |
| `importAnnotations(json)` | `void` | Load annotations and form fields from JSON (clears existing) |
| `getAnnotations(pageNumber?)` | `Annotation[]` | Get all annotations, or filter by page number |
| `addAnnotation(annotation)` | `string` | Add a new annotation, returns its ID |
| `updateAnnotation(id, changes)` | `void` | Partially update an existing annotation |
| `deleteAnnotation(id)` | `void` | Remove an annotation by ID |
| `getFormFields()` | `FormField[]` | Get all form fields with current values |
| `setFormFields(fields)` | `void` | Set form fields programmatically |

---

## Use Cases

- **Document review** — Annotate PDFs with highlights, comments, and markups
- **Contract signing** — Add signature fields and capture handwritten signatures
- **Form filling** — Create fillable PDF overlays with text, checkbox, radio, and dropdown fields
- **Education** — Students and teachers can annotate study materials
- **Legal** — Highlight and mark up legal documents for review
- **Healthcare** — Annotate medical documents and forms
- **Internal tools** — Self-hosted document viewer for enterprise dashboards
- **SaaS products** — Embed a full PDF viewer in your web application

---

## Comparison with Alternatives

| Feature | Fresh Air PDF | react-pdf | @react-pdf-viewer | Commercial SDKs |
|---------|:---:|:---:|:---:|:---:|
| PDF rendering | Yes | Yes | Yes | Yes |
| Annotations (highlight, shapes, ink) | Yes | No | No | Yes |
| Form fields (text, checkbox, signature) | Yes | No | No | Yes |
| Signature capture | Yes | No | No | Yes |
| Search with highlights | Yes | No | Yes | Yes |
| Thumbnails & outline | Yes | No | Yes | Yes |
| Undo/redo | Yes | No | No | Yes |
| JSON import/export | Yes | No | No | Varies |
| TypeScript | Yes | Yes | Yes | Varies |
| Free & open source | Yes | Yes | Yes | No |
| No data leaves browser | Yes | Yes | Yes | Varies |

---

## Advanced Usage

### Core Engines

For headless or custom UI use cases, import the core engines directly:

```tsx
import {
  PDFDocumentEngine,    // Load and render PDFs
  AnnotationManager,    // CRUD + undo/redo for annotations
  AnnotationRenderer,   // Canvas-based annotation drawing
  eventBus,             // Pub/sub event system
} from 'fresh-air-pdf';
```

### Import/Export JSON Format

```json
{
  "annotations": [
    {
      "type": "highlight",
      "pageNumber": 1,
      "color": "#FFEB3B",
      "opacity": 0.4,
      "quads": [[100, 200, 300, 200, 300, 220, 100, 220]],
      "text": "selected text"
    },
    {
      "type": "freetext",
      "pageNumber": 1,
      "rect": { "x": 50, "y": 400, "width": 200, "height": 50 },
      "content": "This is a comment",
      "fontSize": 14,
      "fontFamily": "Helvetica"
    }
  ],
  "formFields": [
    {
      "name": "full_name",
      "type": "text",
      "pageNumber": 1,
      "bounds": { "x": 100, "y": 200, "width": 200, "height": 30 },
      "value": "John Doe",
      "required": true
    },
    {
      "name": "signature",
      "type": "signature",
      "pageNumber": 2,
      "bounds": { "x": 100, "y": 500, "width": 250, "height": 80 },
      "value": "data:image/png;base64,..."
    }
  ]
}
```

---

## Architecture

```
src/
├── core/                    # Framework-agnostic engine (use without React)
│   ├── engine/             # PDF loading, rendering, page management
│   ├── annotations/        # Annotation CRUD, undo/redo, canvas rendering
│   └── events/             # Pub/sub event bus for decoupled communication
├── components/             # React UI layer
│   ├── viewer/            # Page rendering with virtualization
│   ├── toolbar/           # Annotation tools, zoom, navigation controls
│   ├── panels/            # Sidebar: thumbnails, search, outline, properties
│   ├── overlays/          # Annotation & form field creation/editing overlays
│   └── modals/            # Signature capture modal
├── hooks/                  # React hooks (useViewer, useResponsive)
└── types/                  # Full TypeScript definitions for all APIs
```

## Tech Stack

- **React 18/19** — UI framework
- **TypeScript** — Full type safety with exported types
- **Vite** — Build tooling with dual ESM/CJS output
- **PDF.js (Mozilla)** — Battle-tested PDF parsing and rendering
- **Canvas API** — High-performance annotation rendering

---

## Development

```bash
git clone https://github.com/VeARCTechnologies/FRESH-AIR-PDF.git
cd FRESH-AIR-PDF
npm install
npm run dev          # Dev server at http://localhost:5173
npm run build:lib    # Build library (ESM + CJS + types)
npm run lint         # ESLint
npm run type-check   # TypeScript checking
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/VeARCTechnologies/FRESH-AIR-PDF).

## License

[MIT](LICENSE) — free for personal and commercial use.
