# Quick Reference - Annotation & Form Field Import/Export

## UI Buttons

### Export Annotations & Form Fields
📥 **Location**: Top toolbar, next to "Upload PDF"
🎯 **Action**: Downloads all annotations AND form fields as JSON
✅ **When Enabled**: When a PDF is loaded

### Import Annotations & Form Fields
📤 **Location**: Top toolbar, after "Export Annotations"
🎯 **Action**: Opens file picker to select JSON file
✅ **When Enabled**: Always (but requires PDF to be loaded)

## Quick Test

```bash
# 1. Server is running at:
http://localhost:5175

# 2. Test import with updated sample file:
Click "Import Annotations" → Select "sample-annotations.json"

# 3. Verify on PDF:
- Page 1: Highlight, text note, text field, checkbox
- Page 2: Rectangle, dropdown field
```

## Code Usage

### Export (Now includes form fields!)
```typescript
const json = viewerRef.current.exportAnnotations()
// Returns: JSON with both annotations and formFields
// Format: { annotations: [...], formFields: [...] }
```

### Import (Now restores form fields!)
```typescript
viewerRef.current.importAnnotations(jsonString)
// Loads both annotations and form fields
// Re-renders immediately with all data
```

### Backend Integration
```typescript
// Fetch from API
const response = await fetch('/api/annotations')
const json = await response.text()
viewerRef.current.importAnnotations(json)

// Save to API
const json = viewerRef.current.exportAnnotations()
await fetch('/api/annotations', {
  method: 'POST',
  body: json
})
```

## Files Created

📄 **IMPLEMENTATION_SUMMARY.md** - Complete implementation details
📄 **ANNOTATION_IMPORT_EXPORT.md** - Full API documentation
📄 **TEST_GUIDE.md** - Step-by-step testing instructions
📄 **FORM_FIELDS_TODO.md** - Future enhancements plan
📄 **sample-annotations.json** - Sample data for testing

## Key Features

✅ Export all annotations AND form fields to JSON
✅ Import annotations AND form fields from JSON
✅ Automatic re-render on import (both show up instantly)
✅ Backend integration ready (single JSON file)
✅ Error handling for invalid JSON
✅ Clear existing data before import
✅ Support all annotation types (highlight, text, shapes, etc.)
✅ Support all form field types (text, checkbox, dropdown, etc.)
✅ Backward compatible (old annotation-only format still works)

## Console Messages

```
"Annotations exported" - Export successful (now includes form fields!)
"Annotations imported successfully" - Import successful (both data types)
"Failed to import annotations: ..." - Import error
```

## Data Types Supported

**Annotations:**
- highlight, underline, strikeout (text markup)
- free-text (text boxes)
- rectangle, circle (shapes)
- line, arrow (connectors)
- ink (freehand drawings)

**Form Fields:**
- text (single/multiline with placeholders)
- checkbox (with checked state)
- radio (with options)
- dropdown (with options and selected value)
- signature (for digital signatures)

## Events

```typescript
ViewerEvent.AnnotationsImported // Emitted after successful import
// data: { count: number }
```

## Notes

⚠️ **Import clears existing data first** (both annotations and form fields)
✅ **Form fields now included** (all properties preserved!)
✅ **JSON format changed** (see sample-annotations.json for new structure)
✅ **Backward compatible** (old annotation-only format still works)
✅ **Dates in ISO 8601 format** (e.g., "2024-01-15T10:00:00.000Z")
✅ **Colors in hex format** (e.g., "#FF0000")

## JSON Structure

**New Combined Format:**
```json
{
  "annotations": [ /* array */ ],
  "formFields": [ /* array */ ]
}
```

**Legacy Format (still works):**
```json
[ /* annotations only */ ]
```

## Next Steps

1. ✅ Test export/import with form fields
2. ✅ Review updated sample-annotations.json
3. ✅ Integrate with your backend API
4. ✅ See ANNOTATION_IMPORT_EXPORT.md for complete docs
5. ✅ Check UPDATE_FORM_FIELDS.md for implementation details
