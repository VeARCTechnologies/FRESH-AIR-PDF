# Annotation Import/Export - Implementation Summary

## What Was Done

### ✅ Core Functionality

1. **Import Annotations UI**
   - Added "Import Annotations" button to the toolbar in [App.tsx](App.tsx)
   - File picker accepts `.json` files
   - Automatic validation and error handling
   - User-friendly error messages for invalid JSON

2. **Import Handler Implementation**
   - Added `handleImportAnnotations()` function in [App.tsx](App.tsx)
   - Uses FileReader API to read JSON files
   - Calls `viewerRef.current.importAnnotations(json)`
   - Resets file input for repeated imports
   - Console logging for debugging

3. **Auto Re-render Support**
   - Added `annotationsVersion` state to [useViewer.ts](src/hooks/useViewer.ts)
   - Listens for `ViewerEvent.AnnotationsImported` event
   - Increments version to force component re-render
   - Annotations appear immediately after import

4. **Event System Integration**
   - Added `AnnotationsImported` to [ViewerEvent enum](src/types/index.ts)
   - Updated [AnnotationManager.ts](src/core/annotations/AnnotationManager.ts) to emit correct event
   - Fixed import in [AdvancedExamples.tsx](src/examples/AdvancedExamples.tsx)

5. **Type Safety Fixes**
   - Fixed `search()` return type in ViewerAPI interface (Promise<SearchResult[]>)
   - All TypeScript errors resolved in core files

### 📁 Files Modified

1. **src/App.tsx**
   - Added `handleImportAnnotations()` function
   - Added "Import Annotations" file input button
   - Error handling with try/catch and alert

2. **src/hooks/useViewer.ts**
   - Added `annotationsVersion` state
   - Added useEffect to listen for import events
   - Returns `annotationsVersion` in state object

3. **src/types/index.ts**
   - Added `AnnotationsImported` to ViewerEvent enum
   - Fixed `search()` method signature in ViewerAPI

4. **src/core/annotations/AnnotationManager.ts**
   - Updated `importAnnotations()` to emit correct event
   - Uses `ViewerEvent.AnnotationsImported` instead of string

5. **src/examples/AdvancedExamples.tsx**
   - Fixed ViewerEvent import (from types instead of EventBus)

### 📄 Documentation Created

1. **ANNOTATION_IMPORT_EXPORT.md**
   - Complete API documentation
   - Usage examples for export and import
   - Backend integration patterns
   - JSON format specification
   - All annotation type schemas
   - Error handling guide
   - Event system documentation

2. **TEST_GUIDE.md**
   - Step-by-step testing instructions
   - Export workflow
   - Import workflow
   - Backend integration simulation
   - Troubleshooting guide
   - Console logging reference

3. **sample-annotations.json**
   - Ready-to-use sample file
   - Contains 3 different annotation types
   - Spans multiple pages
   - Includes all required fields

4. **FORM_FIELDS_TODO.md**
   - Future enhancement plan
   - Current workarounds
   - API design proposal
   - Implementation roadmap

## How It Works

### Export Flow

```
User clicks "Export Annotations"
    ↓
handleExportAnnotations() called
    ↓
viewerRef.current.exportAnnotations()
    ↓
AnnotationManager.exportAnnotations()
    ↓
Returns JSON.stringify(annotations)
    ↓
Creates Blob and downloads file
```

### Import Flow

```
User selects JSON file
    ↓
handleImportAnnotations() called
    ↓
FileReader reads file content
    ↓
viewerRef.current.importAnnotations(json)
    ↓
AnnotationManager.importAnnotations(json)
    ↓
Parses JSON, clears existing, imports new
    ↓
Emits ViewerEvent.AnnotationsImported
    ↓
useViewer increments annotationsVersion
    ↓
Component re-renders with new annotations
```

## Testing

### How to Test

1. **Start the dev server** (already running on port 5175)
   ```bash
   npm run dev
   ```

2. **Open the app**: http://localhost:5175

3. **Test Export**:
   - Add annotations using toolbar tools
   - Click "Export Annotations"
   - Check downloaded `annotations.json` file

4. **Test Import**:
   - Click "Import Annotations"
   - Select `sample-annotations.json`
   - Verify annotations appear on PDF

5. **Test Re-import**:
   - Export your annotations
   - Clear the page (reload)
   - Import the exported file
   - Verify annotations match original

### Expected Results

✅ Export downloads valid JSON file
✅ Import loads annotations immediately
✅ Annotations visible on correct pages
✅ Error handling for invalid JSON
✅ Console logs show success messages

## Backend Integration

### Example: Fetch from Backend

```typescript
const loadAnnotationsFromBackend = async () => {
  try {
    const response = await fetch('/api/documents/123/annotations')
    const json = await response.text()
    
    if (viewerRef.current) {
      viewerRef.current.importAnnotations(json)
      console.log('Loaded annotations from backend')
    }
  } catch (error) {
    console.error('Failed to load annotations:', error)
  }
}
```

### Example: Save to Backend

```typescript
const saveAnnotationsToBackend = async () => {
  try {
    const json = viewerRef.current?.exportAnnotations()
    
    await fetch('/api/documents/123/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    })
    
    console.log('Saved annotations to backend')
  } catch (error) {
    console.error('Failed to save annotations:', error)
  }
}
```

### Example: Auto-save on Change

```typescript
const handleAnnotationChanged = async (event: AnnotationChangedEvent) => {
  console.log(`Annotation ${event.action}`)
  
  // Auto-save to backend
  const json = viewerRef.current?.exportAnnotations()
  await fetch('/api/documents/123/annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json
  })
}
```

## JSON Format

### Example Annotation

```json
{
  "id": "annot_1705319400000_abc123",
  "type": "highlight",
  "pageNumber": 1,
  "quads": [
    {
      "x1": 100, "y1": 100,
      "x2": 300, "y2": 100,
      "x3": 100, "y3": 130,
      "x4": 300, "y4": 130
    }
  ],
  "color": "#FFFF00",
  "opacity": 0.5,
  "author": "User Name",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "modifiedAt": "2024-01-15T10:00:00.000Z"
}
```

### Supported Annotation Types

- ✅ **highlight** - Text highlights with quads
- ✅ **underline** - Text underline with quads
- ✅ **strikeout** - Text strikethrough with quads
- ✅ **free-text** - Text boxes with content
- ✅ **rectangle** - Rectangular shapes
- ✅ **circle** - Circular/elliptical shapes
- ✅ **line** - Straight lines
- ✅ **arrow** - Lines with arrows
- ✅ **ink** - Freehand drawings with paths

## Error Handling

### Invalid JSON Format

```typescript
try {
  viewerRef.current?.importAnnotations(invalidJson)
} catch (error) {
  // Error: "Invalid annotation JSON"
  alert('Failed to import annotations. Please check the file format.')
}
```

### Missing Required Fields

If annotations are missing required fields (id, type, pageNumber), they will be skipped during import. Check console for warnings.

### Network Errors

```typescript
try {
  const response = await fetch('/api/annotations')
  if (!response.ok) throw new Error('Network error')
  const json = await response.text()
  viewerRef.current?.importAnnotations(json)
} catch (error) {
  console.error('Failed to load from backend:', error)
  alert('Failed to load annotations from server')
}
```

## Limitations & Future Work

### Current Limitations

❌ **Form Fields**: Not included in export/import (see FORM_FIELDS_TODO.md)
❌ **Incremental Import**: Import clears all existing annotations first
❌ **Selective Import**: Can't import specific annotation types or pages
❌ **Merge Import**: Can't merge with existing annotations

### Planned Enhancements

- [ ] Form fields import/export
- [ ] Incremental import option
- [ ] Filter by annotation type during import
- [ ] Filter by page number during import
- [ ] Merge mode (keep existing annotations)
- [ ] Import validation with detailed error messages
- [ ] Import preview before applying
- [ ] Undo import action
- [ ] Import progress indicator for large files

## API Reference

### ViewerAPI Methods

```typescript
interface ViewerAPI {
  /**
   * Export all annotations as JSON string
   * @returns JSON string containing all annotations
   */
  exportAnnotations(): string

  /**
   * Import annotations from JSON string
   * Clears existing annotations before importing
   * @param json - JSON string containing annotations array
   * @throws Error if JSON is invalid
   */
  importAnnotations(json: string): void

  /**
   * Get annotations for a page or all pages
   * @param pageNumber - Optional page number filter
   * @returns Array of annotations
   */
  getAnnotations(pageNumber?: number): Annotation[]

  /**
   * Add a new annotation
   * @param annotation - Annotation data without id and timestamps
   * @returns The generated annotation ID
   */
  addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'>): string

  /**
   * Update an existing annotation
   * @param id - Annotation ID
   * @param changes - Partial annotation data to update
   */
  updateAnnotation(id: string, changes: Partial<Annotation>): void

  /**
   * Delete an annotation
   * @param id - Annotation ID
   */
  deleteAnnotation(id: string): void
}
```

### Events

```typescript
enum ViewerEvent {
  AnnotationsImported = 'annotationsImported',
  AnnotationAdded = 'annotationAdded',
  AnnotationModified = 'annotationModified',
  AnnotationDeleted = 'annotationDeleted',
  // ... other events
}

// Listen for import event
eventBus.on(ViewerEvent.AnnotationsImported, (data) => {
  console.log(`Imported ${data.count} annotations`)
})
```

## Summary

✅ **Import/Export Working**: Full functionality implemented and tested
✅ **Backend Ready**: Easy integration with REST APIs
✅ **Auto Re-render**: Annotations appear immediately
✅ **Error Handling**: Robust validation and user feedback
✅ **Type Safe**: Full TypeScript support
✅ **Well Documented**: Complete guides and examples
✅ **Sample Data**: Ready-to-use test file provided

The annotation import/export feature is now fully functional and ready for backend integration!
