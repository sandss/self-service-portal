import { useCallback, useState } from 'react'
import type { RJSFSchema } from '@rjsf/utils'
import validator from '@rjsf/validator-ajv8'

/**
 * Custom hook to handle catalog form submission
 * 
 * This hook manages:
 * - Merging form data when there's an action schema
 * - Validating merged data before submission
 * - Calling the submission handler
 * - Logging submission data for debugging
 * 
 * @param onSubmit - Async function to handle the actual submission
 * @param getMergedData - Function to get merged data from useFormState
 * @param actionSchema - Current action schema (if any)
 * @param mainSchema - Main questionnaire schema for validation
 * 
 * @returns Object containing:
 * - handleFormSubmit: RJSF onSubmit handler that merges data and submits
 * - validationError: Current validation error message (if any)
 * 
 * @example
 * ```tsx
 * const { handleFormSubmit, validationError } = useCatalogSubmit(
 *   onSubmit,
 *   getMergedData,
 *   actionSchema,
 *   mainSchema
 * )
 * 
 * // Use in RJSF Form
 * <Form
 *   onSubmit={handleFormSubmit}
 * />
 * ```
 */
export function useCatalogSubmit(
  onSubmit: (data: any) => Promise<void>,
  getMergedData: (includeActionForm?: boolean) => Record<string, any>,
  actionSchema: RJSFSchema | null,
  mainSchema: RJSFSchema
) {
  const [validationError, setValidationError] = useState<string | null>(null)

  /**
   * Handle form submission
   * If there's an action schema, merge both forms' data and validate against MAIN schema
   * Otherwise, use the submitted data as-is (RJSF validates automatically)
   */
  const handleFormSubmit = useCallback(
    ({ formData: submitData }: any) => {
      setValidationError(null)
      
      // Get merged data if we have an action schema, otherwise use submitted data
      const finalData = actionSchema ? getMergedData() : submitData
      console.log('📝 Form submitted:', finalData)
      
      // CRITICAL: When action schema exists, we must validate merged data against MAIN schema
      // because RJSF only validates the action form, not the main form's required fields
      if (actionSchema) {
        console.log('🔍 Validating merged data against main schema:', mainSchema.required)
        const validationResult = validator.validateFormData(finalData, mainSchema)
        
        if (validationResult.errors && validationResult.errors.length > 0) {
          const errorMessages = validationResult.errors.map(err => {
            // Extract field name from property path (e.g., ".client" -> "client")
            const field = err.property?.replace(/^\./, '') || 'field'
            return `${field}: ${err.message}`
          })
          
          const errorMessage = errorMessages.join('; ')
          console.error('❌ Validation failed:', validationResult.errors)
          setValidationError(errorMessage)
          return // Don't submit if validation fails
        }
        
        console.log('✅ Validation passed!')
      }
      
      // Call the parent's submit handler
      onSubmit(finalData)
    },
    [onSubmit, getMergedData, actionSchema, mainSchema]
  )

  return {
    handleFormSubmit,
    validationError,
  }
}
