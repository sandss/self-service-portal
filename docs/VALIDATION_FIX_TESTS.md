# Form Validation Fix - Test Scenarios

## Issue Fixed

**Problem 1:** Forms showed validation errors immediately on page load (before user interaction)
**Problem 2:** When action schema was loaded, only the action form was validated, not the main form's required fields

## Solution

1. **Removed `liveValidate={true}`** - No longer shows errors on initial load
2. **Added proper merged data validation** - Validates ALL required fields from both schemas before submission

## Test Scenarios

### ✅ Test 1: No Errors on Initial Load

**Steps:**
1. Navigate to http://localhost:5173
2. Click "Catalog" tab
3. Select "Client Connection Request"

**Expected Result:**
- ✅ Form loads cleanly
- ✅ No red borders on fields
- ✅ No error messages visible
- ✅ Fields are empty and ready for input

**Previously (Bug):**
- ❌ Red borders on all required fields immediately
- ❌ Error list showing "field is required" messages
- ❌ Poor UX - looks broken before user even starts

---

### ✅ Test 2: Single Form Validation (No Action Selected)

**Steps:**
1. Open "Client Connection Request"
2. Click "Execute Task" without filling any fields

**Expected Result:**
- ✅ RJSF shows error list at top
- ✅ Errors: "client is required", "goLiveDate is required", "action is required"
- ✅ Red borders on empty required fields
- ✅ Submit blocked
- ✅ No job created

**Previously (Working):**
- ✅ This scenario worked correctly

---

### ✅ Test 3: Main Form Incomplete + Action Selected

**Steps:**
1. Open "Client Connection Request"
2. **DON'T fill client or goLiveDate**
3. Select action: "Install"
4. Action form appears below
5. Fill action form: engineeringLead = "John Doe"
6. Click "Execute Task"

**Expected Result:**
- ✅ Red validation error alert appears at top
- ✅ Error messages: "client: is a required property; goLiveDate: is a required property"
- ✅ Submit blocked
- ✅ No job created
- ✅ Console shows: "❌ Validation failed: ..."

**Previously (Bug):**
- ❌ Only validated action form
- ❌ Allowed submission with missing client/goLiveDate
- ❌ Job created with incomplete data
- ❌ Worker failed with ValidationError

---

### ✅ Test 4: Main Form Complete + Action Form Incomplete

**Steps:**
1. Open "Client Connection Request"
2. Fill client: "Acme Corp"
3. Fill goLiveDate: "2025-10-15T14:00:00Z"
4. Select action: "Install"
5. Action form appears
6. **DON'T fill engineeringLead**
7. Click "Execute Task"

**Expected Result:**
- ✅ RJSF error list shows: "engineeringLead is required"
- ✅ Red border on engineeringLead field
- ✅ Submit blocked
- ✅ No job created

**Previously (Working):**
- ✅ This scenario worked - action form validated by RJSF

---

### ✅ Test 5: Both Forms Complete - Success Case

**Steps:**
1. Open "Client Connection Request"
2. Fill client: "Acme Corp"
3. Fill goLiveDate: "2025-10-15T14:00:00Z"
4. Select action: "Install"
5. Fill engineeringLead: "John Doe"
6. Click "Execute Task"

**Expected Result:**
- ✅ No validation errors
- ✅ Console shows: "✅ Validation passed!"
- ✅ Job created successfully
- ✅ Redirected to `/jobs/{job_id}`
- ✅ Job shows in dashboard with QUEUED/RUNNING state

**Previously (Working):**
- ✅ This scenario worked when all fields filled

---

## Console Logging

The validation now includes helpful console messages:

```javascript
// When action is selected and submit clicked:
📝 Form submitted: { client: "Acme", goLiveDate: "...", action: "Install", engineeringLead: "John" }
🔍 Validating merged data against main schema: ["client", "goLiveDate", "action"]

// If validation fails:
❌ Validation failed: [
  { property: ".client", message: "is a required property" },
  { property: ".goLiveDate", message: "is a required property" }
]

// If validation passes:
✅ Validation passed!
```

---

## Edge Cases

### Test 6: Switching Actions

**Steps:**
1. Fill main form completely
2. Select action: "Install"
3. Fill Install form
4. Change action to "Disconnect"
5. New Disconnect form appears
6. Click "Execute Task" without filling Disconnect form

**Expected Result:**
- ✅ Validation catches missing Disconnect form fields
- ✅ Submit blocked

---

### Test 7: Form Reset

**Steps:**
1. Fill all fields
2. Navigate back to catalog
3. Select same item again

**Expected Result:**
- ✅ Form resets to empty state
- ✅ No validation errors shown initially
- ✅ Can start fresh

---

## Technical Details

### Validation Flow

```
User clicks "Execute Task" on action form
    ↓
handleFormSubmit() called
    ↓
Get merged data: { ...mainFormData, ...actionFormData }
    ↓
If actionSchema exists:
    ↓
    Validate merged data against MAIN schema
    ↓
    Check ALL required fields: ["client", "goLiveDate", "action"]
    ↓
    If errors found:
        → Show error alert
        → Log to console
        → Block submission
        → return early
    ↓
    If no errors:
        → Log "✅ Validation passed!"
        → Continue to onSubmit()
    ↓
Call parent onSubmit() with merged data
    ↓
Create job via API
    ↓
Redirect to job detail page
```

### Key Code Changes

**1. FormSection.tsx:**
```tsx
// REMOVED: liveValidate={true}
// ADDED: noHtml5Validate={true}
```

**2. useCatalogSubmit.ts:**
```tsx
// Enhanced validation logic
if (actionSchema) {
  console.log('🔍 Validating merged data against main schema:', mainSchema.required)
  const validationResult = validator.validateFormData(finalData, mainSchema)
  
  if (validationResult.errors && validationResult.errors.length > 0) {
    // Extract clean error messages
    const errorMessages = validationResult.errors.map(err => {
      const field = err.property?.replace(/^\./, '') || 'field'
      return `${field}: ${err.message}`
    })
    
    setValidationError(errorMessages.join('; '))
    return // Block submission
  }
}
```

**3. CatalogForm.tsx:**
```tsx
// Improved error display with helpful text
{validationError && (
  <div className="...">
    <h3>Please complete all required fields</h3>
    <p>{validationError}</p>
    <p className="italic">
      Make sure both the main form and action form are fully filled out.
    </p>
  </div>
)}
```

---

## Files Modified

- `/web/src/features/catalog/components/FormSection.tsx` - Removed liveValidate
- `/web/src/features/catalog/hooks/useCatalogSubmit.ts` - Fixed validation logic
- `/web/src/features/catalog/components/CatalogForm.tsx` - Improved error display

---

## Validation Requirements by Schema

### Main Schema (client-connection-request)
Required fields:
- `client` (string)
- `goLiveDate` (datetime)
- `action` (enum)

### Install Workflow Schema
Required fields:
- `engineeringLead` (string)

### Disconnect Workflow Schema
Required fields:
- `disconnectReason` (string)

### Change Workflow Schema
Required fields:
- `changeDescription` (string)

---

## Success Criteria

✅ No validation errors on initial form load
✅ Clean user experience - errors only show on submit
✅ All required fields validated (main + action schemas)
✅ Clear error messages showing which fields are missing
✅ Submit blocked until all required fields filled
✅ Console logging helps with debugging
✅ Successful submission when all fields complete

---

## Next Steps

1. Test all scenarios above manually
2. Verify console logging shows expected messages
3. Ensure no regressions in single-schema forms
4. Consider adding automated tests for validation logic
