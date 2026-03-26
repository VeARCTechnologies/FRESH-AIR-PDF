# Signature Field Feature

The signature field feature allows users to add their signature to PDF forms through an intuitive modal interface.

## Features

### 1. Draw Signature
- Draw signatures directly on a canvas using mouse or touch
- Smooth drawing experience with proper line rendering
- Clear button to start over
- Empty signature detection prevents saving blank signatures

### 2. Upload Signature
- Upload signature images (PNG, JPG, etc.)
- File size validation (max 5MB)
- Image type validation
- Preview uploaded image before applying

### 3. User Experience
- Click on any signature field to open the modal
- Hover effects show the field is clickable
- Tab interface to switch between draw and upload modes
- Apply or cancel signature with clear buttons

## How to Use

### Adding a Signature Field
1. Click the "Signature Field" button in the toolbar (or use `form-signature` tool)
2. Draw the signature field area on the PDF
3. The field will show "Click to sign" placeholder

### Signing a Document
1. Click on the signature field placeholder
2. Choose your method:
   - **Draw**: Use mouse or touch to draw your signature
   - **Upload**: Click to browse and upload a signature image
3. Click "Apply Signature" to save
4. The signature will appear in the field

### Removing/Changing a Signature
1. Click on a signed field to open the modal again
2. Draw or upload a new signature
3. Click "Apply Signature" to replace

## Technical Implementation

### Components
- **SignatureModal** (`src/components/modals/SignatureModal.tsx`): Main modal component
  - Canvas-based drawing with touch support
  - File upload handling with validation
  - Data URL generation for signature storage

- **FormFieldOverlay** (`src/components/overlays/FormFieldOverlay.tsx`): Integrated modal trigger
  - Click handler on signature fields
  - Signature value display
  - Modal state management

### Data Storage
Signatures are stored as base64 data URLs in the `value` property of the form field:
```typescript
{
  id: 'sig-123',
  type: 'signature',
  value: 'data:image/png;base64,iVBORw0KG...'  // Base64 image data
  // ... other properties
}
```

### Export/Import
Signatures are included in the form fields export:
```json
{
  "annotations": [...],
  "formFields": [
    {
      "id": "sig-123",
      "type": "signature",
      "value": "data:image/png;base64,iVBORw0KG...",
      "pageNumber": 1,
      "rect": { "x": 100, "y": 200, "width": 200, "height": 60 }
    }
  ]
}
```

## Styling and Interactions

### Hover Effects
- Signature field highlights on hover with blue border
- All modal buttons have hover states
- Upload area changes color on hover

### Visual Feedback
- Cursor changes to pointer over signature fields
- Active tab highlighted in blue
- Drawing canvas has crosshair cursor
- Clear button shows eraser icon

### Touch Support
- Full touch support for drawing signatures on mobile/tablet
- Touch events properly handled with `preventDefault()`
- Smooth drawing experience across devices

## Accessibility
- Proper ARIA labels (can be enhanced)
- Keyboard navigation support for buttons
- Clear visual indicators for interactive elements
- Alt text for signature images

## Future Enhancements
- Save frequently used signatures
- Type signature option (text-based signatures)
- Multiple signature styles
- Signature templates
- Signature authentication/verification
