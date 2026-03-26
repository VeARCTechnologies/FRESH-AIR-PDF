# Quick Test Guide - Annotation Import/Export

## Testing the Import/Export Functionality

### Step 1: Export Annotations

1. Open the PDF viewer in your browser (http://localhost:5175)
2. The sample PDF should load automatically
3. Use the annotation tools in the toolbar to add some annotations:
   - Click the "Highlight" tool and select some text
   - Click the "Rectangle" tool and draw a rectangle
   - Click the "Free Text" tool and add a text note
4. Click the **"Export Annotations"** button
5. A file named `annotations.json` will be downloaded to your Downloads folder
6. Open the file to see the JSON format

### Step 2: Import Annotations

**Option A: Use the provided sample file**
1. Click the **"Import Annotations"** button
2. Select the `sample-annotations.json` file from the project root
3. You should see annotations appear on:
   - Page 1: A yellow highlight and a red text note
   - Page 2: A green rectangle
4. Navigate between pages to see all imported annotations

**Option B: Re-import your exported annotations**
1. Click the **"Import Annotations"** button
2. Select the `annotations.json` file you exported in Step 1
3. Your annotations should reappear on the PDF
4. This confirms the export format is compatible with the import function

### Step 3: Test Backend Integration

To simulate backend integration, you can use this code pattern:

```typescript
// Simulate fetching from backend
const mockBackendAnnotations = `[
  {
    "id": "backend_annot_1",
    "type": "highlight",
    "pageNumber": 1,
    "quads": [{"x1": 100, "y1": 100, "x2": 300, "y2": 100, "x3": 100, "y3": 130, "x4": 300, "y4": 130}],
    "color": "#00FF00",
    "opacity": 0.5,
    "author": "Backend System",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "modifiedAt": "2024-01-15T10:00:00.000Z"
  }
]`

// Import from backend
if (viewerRef.current) {
  viewerRef.current.importAnnotations(mockBackendAnnotations)
}
```

## Expected Behavior

✅ **Export**: Creates a JSON file with all annotations
✅ **Import**: Loads annotations and displays them immediately
✅ **Auto Re-render**: PDF updates automatically when annotations are imported
✅ **Clear Previous**: Import clears existing annotations first
✅ **Error Handling**: Invalid JSON shows an error alert

## Troubleshooting

### Annotations don't appear after import
- Check that the page numbers in the JSON match the current document
- Verify the JSON format is correct (see ANNOTATION_IMPORT_EXPORT.md)
- Check the browser console for error messages

### Import button not working
- Make sure a PDF document is loaded first
- Check that the selected file is a valid JSON file
- Verify the file is not empty

### Export button not working
- Make sure a PDF document is loaded first
- Check that you have annotations added to the document
- Check browser console for any errors

## Console Logs

When testing, watch the browser console for these messages:
- `Annotations exported` - Export successful
- `Annotations imported successfully` - Import successful
- `Failed to import annotations: Error: Invalid annotation JSON` - JSON parse error

## Next Steps

After testing locally, you can integrate with your backend:

1. **Save to Backend**: Use `viewerRef.current.exportAnnotations()` to get JSON
2. **Load from Backend**: Fetch JSON from API and call `importAnnotations(json)`
3. **Real-time Sync**: Listen to annotation events and sync with backend
4. **User Sessions**: Save annotations per user/document combination

See `ANNOTATION_IMPORT_EXPORT.md` for complete API documentation and examples.
