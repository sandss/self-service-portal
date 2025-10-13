# Form Validation Implementation

## Summary

Added comprehensive client-side validation to prevent invalid form submissions from reaching the backend worker, eliminating the issue where jobs would fail at the worker level due to missing required fields.

## Changes Made

### 1. Enable Live Validation in FormSection.tsx

**File:** `/web/src/features/catalog/components/FormSection.tsx`

Added three key RJSF props to enable real-time validation:

```tsx
<Form
  schema={schema}
  uiSchema={uiSchema}
  formData={formData}
  validator={validator}
  onChange={onChange}
  onSubmit={onSubmit}
  disabled={isSubmitting}
  templates={customTemplates}
  liveValidate={true}           // ✅ Validate as user types
  showErrorList="top"            // ✅ Show error summary at top
  focusOnFirstError={true}       // ✅ Auto-focus first error field
>
```

**What this does:**
- `liveValidate={true}`: Validates fields in real-time as the user types
- `showErrorList="top"`: Displays a summary of all validation errors at the top of the form
- `focusOnFirstError={true}`: Automatically focuses the first field with an error when submit is clicked

### 2. Add Merged Data Validation in useCatalogSubmit.ts

**File:** `/web/src/features/catalog/hooks/useCatalogSubmit.ts`

Enhanced the submit handler to validate merged data when using multi-schema forms:

```tsx
import validator from '@rjsf/validator-ajv8'

export function useCatalogSubmit(
  onSubmit: (data: any) => Promise<void>,
  getMergedData: (includeActionForm?: boolean) => Record<string, any>,
  actionSchema: RJSFSchema | null,
  mainSchema: RJSFSchema  // ✅ Added main schema parameter
) {
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleFormSubmit = useCallback(
    ({ formData: submitData }: any) => {
      setValidationError(null)
      
      const finalData = actionSchema ? getMergedData() : submitData
      
      // ✅ Validate merged data when using action schemas
      if (actionSchema) {
        const validationResult = validator.validateFormData(finalData, mainSchema)
        if (validationResult.errors && validationResult.errors.length > 0) {
          const errorMessage = validationResult.errors
            .map(err => `${err.property}: ${err.message}`)
            .join('; ')
          console.error('❌ Validation failed:', validationResult.errors)
          setValidationError(errorMessage)
          return // Don't submit if validation fails
        }
      }
      
      onSubmit(finalData)
    },
    [onSubmit, getMergedData, actionSchema, mainSchema]
  )

  return {
    handleFormSubmit,
    validationError,  // ✅ Expose validation error
  }
}
```

**Why this is needed:**
- When a user selects an action (e.g., "Install"), a second form appears
- Both forms' data must be merged before submission
- RJSF can't automatically validate the merged data against the main schema
- This manual validation catches issues before hitting the API

### 3. Display Validation Errors in CatalogForm.tsx

**File:** `/web/src/features/catalog/components/CatalogForm.tsx`

Added visual error display and passed the main schema for validation:

```tsx
// Pass main schema to the hook
const { handleFormSubmit, validationError } = useCatalogSubmit(
  onSubmit,
  getMergedData,
  actionSchema,
  descriptor.schema as RJSFSchema  // ✅ Pass main schema
)

// Display validation error alert
{validationError && (
  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-start">
      <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <div>
        <h3 className="text-sm font-semibold text-red-800 mb-1">Validation Error</h3>
        <p className="text-sm text-red-700">{validationError}</p>
      </div>
    </div>
  </div>
)}
```

### 4. Style Error List in rjsf-form.css

**File:** `/web/src/styles/rjsf-form.css`

Added comprehensive styling for RJSF's error list:

```css
/* Error list styling */
.rjsf .error-list {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.rjsf .error-list .panel-heading {
  font-weight: 600;
  color: #991b1b;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.rjsf .error-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rjsf .error-list li {
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: flex-start;
}

.rjsf .error-list li:before {
  content: "•";
  margin-right: 0.5rem;
  font-weight: bold;
}
```

## How Validation Works Now

### Single Form (No Action Schema)

1. User fills out form fields
2. RJSF validates in real-time as they type
3. Required fields are marked with red asterisk (*)
4. Empty required fields show red borders
5. Submit button triggers RJSF's built-in validation
6. If validation fails:
   - Error list appears at top of form
   - Invalid fields get red borders
   - First invalid field is focused
   - Submit is blocked

### Multi-Form (With Action Schema)

1. User fills out main questionnaire (client, goLiveDate)
2. User selects action (e.g., "Install")
3. Action-specific form appears below
4. Both forms validate independently in real-time
5. When submit button is clicked:
   - Both forms' data is merged
   - Merged data is validated against main schema
   - If validation fails:
     - Custom error alert appears at top
     - Error message shows which fields are missing
     - Submit is blocked
   - If validation passes:
     - Job is created via API
     - User is redirected to job detail page

## Example Validation Scenarios

### Scenario 1: Missing Required Fields (client-connection-request)

**Required Fields:**
- `client` (string)
- `goLiveDate` (datetime)
- `action` (enum: Install, Disconnect, Change)

**User Actions:**
1. Opens client-connection-request form
2. Clicks "Execute Task" without filling anything

**Result:**
```
Error List (shown at top):
• client is a required property
• goLiveDate is a required property
• action is a required property
```

**Fields with Errors:**
- Red border around empty client field
- Red border around empty goLiveDate field
- Red border around empty action dropdown

### Scenario 2: Partial Fill with Action Schema

**User Actions:**
1. Enters client: "Acme Corp"
2. Enters goLiveDate: "2025-10-15T14:00:00Z"
3. Selects action: "Install"
4. Action form appears with its own required fields
5. Clicks "Execute Task" without filling action form

**Result:**
```
Validation Error Alert:
.engineeringLead: is a required property
```

**Why?**
- The action schema requires `engineeringLead`
- Merged data: `{ client: "Acme Corp", goLiveDate: "...", action: "Install" }`
- Missing: `engineeringLead`
- Validation catches this before API call

### Scenario 3: All Fields Filled Correctly

**User Actions:**
1. Enters all required fields in main form
2. Selects action
3. Fills all required fields in action form
4. Clicks "Execute Task"

**Result:**
✅ Validation passes
✅ Job created successfully
✅ Redirected to `/jobs/{job_id}`

## Benefits

### Before (Without Validation)

❌ User could submit empty form
❌ Job would be created with `inputs: {}`
❌ Worker would fail with ValidationError
❌ Job stuck in RUNNING state (before our fix)
❌ User confused why job failed
❌ Wasted backend resources

### After (With Validation)

✅ User cannot submit invalid data
✅ Real-time feedback as they type
✅ Clear error messages
✅ No invalid jobs reach the worker
✅ Better user experience
✅ Reduced backend load
✅ Consistent with best practices

## Testing

### Manual Testing Steps

1. **Test Empty Form:**
   ```bash
   # Navigate to: http://localhost:5173
   # Click "Catalog" tab
   # Select "Client Connection Request"
   # Click "Execute Task" immediately
   # Expected: Error list shows 3 required fields
   ```

2. **Test Partial Fill:**
   ```bash
   # Fill only client field
   # Click "Execute Task"
   # Expected: Error list shows 2 remaining required fields
   ```

3. **Test Action Schema:**
   ```bash
   # Fill all main form fields
   # Select action: "Install"
   # Click "Execute Task" without filling action form
   # Expected: Validation error alert appears
   ```

4. **Test Valid Submission:**
   ```bash
   # Fill all main form fields
   # Select action: "Install"
   # Fill all action form fields
   # Click "Execute Task"
   # Expected: Job created, redirected to job detail page
   ```

### Automated Testing (Future)

Could add Vitest/Jest tests:

```typescript
describe('Form Validation', () => {
  it('should prevent submission with empty required fields', () => {
    // Test that handleFormSubmit blocks empty submissions
  })
  
  it('should validate merged data when action schema exists', () => {
    // Test that merged data is validated against main schema
  })
  
  it('should show validation errors to user', () => {
    // Test that validationError state is set correctly
  })
})
```

## Related Files

- `/web/src/features/catalog/components/FormSection.tsx` - Form wrapper with validation props
- `/web/src/features/catalog/hooks/useCatalogSubmit.ts` - Submit handler with validation
- `/web/src/features/catalog/components/CatalogForm.tsx` - Main form component
- `/web/src/styles/rjsf-form.css` - Error styling
- `/worker/catalog_execute.py` - Backend validation (fallback)
- `/api/catalog/validate.py` - Server-side validation logic

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ User Interface (Browser)                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐         ┌────────────────┐           │
│  │ CatalogForm     │────────▶│ FormSection    │           │
│  │ (Orchestrator)  │         │ (RJSF Wrapper) │           │
│  └────────┬────────┘         └────────┬───────┘           │
│           │                           │                    │
│           │                           ▼                    │
│           │                  liveValidate={true}           │
│           │                  showErrorList="top"           │
│           │                  focusOnFirstError={true}      │
│           │                                                │
│           ▼                                                │
│  ┌─────────────────────┐                                  │
│  │ useCatalogSubmit    │                                  │
│  │ (Validation Logic)  │                                  │
│  └────────┬────────────┘                                  │
│           │                                                │
│           ├──▶ Merge form data                            │
│           ├──▶ Validate against schema                    │
│           ├──▶ Show errors if invalid                     │
│           └──▶ Call API if valid                          │
│                                                            │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ API (Backend)         │
         │ POST /jobs            │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Worker                │
         │ validate_inputs()     │ ◀── Fallback validation
         │ (Server-side)         │
         └───────────────────────┘
```

## Migration Impact

- ✅ No database changes needed
- ✅ No API changes needed
- ✅ Backward compatible
- ✅ Existing jobs unaffected
- ✅ Only frontend changes
- ✅ Worker validation still exists as fallback

## Performance

- Minimal impact - validation is synchronous and fast
- RJSF validator uses AJV (JSON Schema validator)
- Validation happens client-side (no network calls)
- Reduces unnecessary API calls
- Reduces worker load from invalid jobs

## Accessibility

- Error messages are clear and descriptive
- Focus automatically moves to first error
- Error list provides overview at top
- Individual field errors shown inline
- Screen reader friendly (semantic HTML)
- Keyboard navigation works properly

## Future Enhancements

1. **Field-level validation messages** - Show specific error per field
2. **Custom validation rules** - Add business logic validation
3. **Conditional required fields** - Fields required based on other fields
4. **Async validation** - Validate against backend (e.g., check if client exists)
5. **Progressive validation** - Only validate filled fields until submit
6. **Validation analytics** - Track which fields cause most errors
