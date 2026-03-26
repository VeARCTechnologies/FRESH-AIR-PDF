# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fresh Air PDF is an open-source PDF viewer React component library backed by Mozilla's PDF.js for rendering, published as an npm package with dual ESM/CJS output.

## Commands

```bash
npm run dev          # Start dev server (Vite, http://localhost:5173)
npm run build        # Type-check (tsc) + build for web
npm run build:lib    # Build as library (dual ES/CJS + .d.ts), triggered by BUILD_MODE=lib
npm run preview      # Preview production build
npm run lint         # ESLint with zero warnings enforced (--max-warnings 0)
npm run type-check   # TypeScript type checking only (tsc --noEmit)
```

No test framework is configured yet.

## Architecture

### Three-Layer Design

1. **Core Engine (`src/core/`)** — Framework-agnostic. PDF rendering (`PDFDocumentEngine`), annotation CRUD + undo/redo (`AnnotationManager`), canvas annotation rendering (`AnnotationRenderer`), and a pub/sub event system (`EventBus`).

2. **React Integration (`src/hooks/`)** — `useViewer` hook owns all viewer state (current page, zoom, tool mode, annotations, form fields, search results) and exposes the `ViewerAPI` for imperative control. No external state management library; state lives in React hooks + refs for closure stability.

3. **UI Components (`src/components/`)** — Toolbar, sidebar panels (thumbnails, search, outline, annotation/form-field properties), page rendering (`PageCanvas`, `PageVirtualizer`), overlays for annotation/form-field creation, and modals. `FAPDFViewer` is the main public component.

### Data Flow

User interaction → React component → `useViewer` / `ViewerAPI` → Core engines → `EventBus` → React components re-render.

### Key Patterns

- **Path aliases**: `@/` → `src/`, `@core/` → `src/core/`, `@components/` → `src/components/`, `@hooks/` → `src/hooks/`, `@types/` → `src/types/` (configured in both tsconfig.json and vite.config.ts)
- **Library entry point**: `src/index.ts` — exports `FAPDFViewer`, `useViewer`, core engines, all types/enums
- **Demo app entry point**: `src/main.tsx` → `src/App.tsx` (excluded from library build)
- **PDF.js worker**: Copied as a static asset via `vite-plugin-static-copy`; `pdfjs-dist` is excluded from Vite's dep optimization
- **TypeScript**: Strict mode with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **ESLint**: `@typescript-eslint/no-explicit-any` and `no-unused-vars` are warnings (not errors)
- **React/React DOM are peer dependencies**: externalized in library builds

## Annotation System

Annotations are stored in a `Map<pageNumber, Annotation[]>` inside `AnnotationManager`. Supported types: highlight, underline, strikeout, free text, rectangle, circle, arrow, line, ink/freehand. Undo/redo is capped at 50 history entries.

### Annotation JSON Format

Each annotation has: `id`, `type`, `pageNumber`, `author`, `createdAt`, `modifiedAt`, `color`, `opacity`, plus type-specific fields:

- **Highlight/Underline/Strikeout**: `quads` (array of quad coordinates), `text`
- **Free Text**: `rect` (x, y, width, height), `content`, `fontSize`, `fontFamily`, `textAlign`
- **Rectangle/Circle**: `rect`, `fillColor`, `borderWidth`, `borderColor`
- **Line/Arrow**: `start` (x, y), `end` (x, y), `width`, `lineColor`
- **Ink**: `paths` (array of point arrays), `width`, `inkColor`

## Form Fields

Form fields (text, checkbox, radio, dropdown, signature) are managed in `useViewer` hook state, separately from annotations. All field types are fully functional with persistent values that survive page navigation.

### Value Storage Types

- **Text**: string
- **Checkbox**: boolean
- **Radio**: string (selected option)
- **Dropdown**: string (selected option)
- **Signature**: base64 data URL (image/png)

### Form Field JSON Format

Each field has: `id`, `name`, `type`, `pageNumber`, `bounds` (x, y, width, height), `value`, `required`, `readOnly`. Additional properties: `placeholder` and `multiline` (text), `options` (dropdown/radio), `defaultValue`.

## Import/Export

Export and import use a combined JSON format with both annotations and form fields:

```json
{
  "annotations": [ /* annotation objects */ ],
  "formFields": [ /* form field objects */ ]
}
```

### ViewerAPI Methods

```typescript
exportAnnotations(): string        // Returns JSON with annotations + form fields
importAnnotations(json: string): void  // Clears existing, loads new (supports legacy array format)
getAnnotations(pageNumber?: number): Annotation[]
addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'>): string
updateAnnotation(id: string, changes: Partial<Annotation>): void
deleteAnnotation(id: string): void
getFormFields(): FormField[]
setFormFields(fields: FormField[]): void
```

Import supports the legacy format (plain annotation array) for backward compatibility. Importing clears all existing annotations and form fields first. The viewer emits an `annotationsImported` event on successful import. Coordinates are in PDF units; colors in hex format; dates in ISO 8601.

### Sample Data

`sample-annotations.json` contains example annotations and form fields for testing import.
