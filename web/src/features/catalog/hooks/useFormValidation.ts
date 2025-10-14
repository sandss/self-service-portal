import { useState } from 'react'
import { RJSFSchema } from '@rjsf/utils'
import validator from '@rjsf/validator-ajv8'

interface ValidationErrors {
  mainFormErrors: Record<string, any>
  actionFormErrors: Record<string, any>
  errorMessages: string[]
}

/**
 * Custom hook for validating multi-schema forms
 * 
 * Handles validation of both main questionnaire and action-specific forms,
 * properly distributing errors to the correct form for field-level highlighting.
 * 
 * @param mainSchema - The main JSON Schema
 * @param actionSchema - The action-specific JSON Schema (optional)
 * 
 * @returns Validation state and methods
 */
export function useFormValidation(
  mainSchema: RJSFSchema,
  actionSchema: RJSFSchema | null
) {
  const [mainFormErrors, setMainFormErrors] = useState<Record<string, any>>({})
  const [actionFormErrors, setActionFormErrors] = useState<Record<string, any>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  /**
   * Validates both forms and returns structured errors
   * 
   * @param mergedData - Combined data from main and action forms
   * @param actionFormData - Data from action form only
   * @returns ValidationErrors object with errors split by form
   */
  const validateForms = (
    mergedData: Record<string, any>,
    actionFormData: Record<string, any>
  ): ValidationErrors => {
    console.log('🔍 Starting form validation...')
    console.log('📦 Merged data:', mergedData)
    console.log('📦 Action form data:', actionFormData)

    // Validate merged data against main schema
    const mainValidation = validator.validateFormData(mergedData, mainSchema)
    console.log('✅ Main validation complete:', mainValidation.errors?.length || 0, 'errors')

    // Also validate action form data against action schema if it exists
    let actionValidation = { errors: [] as any[] }
    if (actionSchema) {
      actionValidation = validator.validateFormData(actionFormData, actionSchema)
      console.log('✅ Action validation complete:', actionValidation.errors?.length || 0, 'errors')
    }

    // Combine errors from both validations
    const allErrors = [...(mainValidation.errors || []), ...(actionValidation.errors || [])]

    if (allErrors.length === 0) {
      console.log('✨ No validation errors found')
      return {
        mainFormErrors: {},
        actionFormErrors: {},
        errorMessages: []
      }
    }

    console.log('❌ Total validation errors:', allErrors.length)

    // Build error objects for both forms
    const mainErrs: Record<string, any> = {}
    const actionErrs: Record<string, any> = {}
    const errorList: string[] = []

    // Get property lists for debugging
    const mainSchemaProps = mainSchema.properties || {}
    console.log('🔍 Main schema properties:', Object.keys(mainSchemaProps))
    
    if (actionSchema) {
      const actionSchemaProps = actionSchema.properties || {}
      console.log('🔍 Action schema properties:', Object.keys(actionSchemaProps))
    }

    allErrors.forEach(err => {
      const fieldPath = err.property?.replace(/^\./, '') || 'field'
      const field = fieldPath.split('.')[0]
      const message = err.message || 'This field is required'

      console.log(`🔍 Processing error for field: "${field}"`)

      errorList.push(`${field}: ${message}`)

      // Check if field is NOT in main schema - then it must be in action schema
      if (!mainSchemaProps[field] && actionSchema) {
        // Field is NOT in main schema, so it's in action schema
        actionErrs[field] = { __errors: [message] }
        console.log(`✅ Added to action form: ${field}`)
      } else if (mainSchemaProps[field]) {
        // Field IS in main schema
        mainErrs[field] = { __errors: [message] }
        console.log(`✅ Added to main form: ${field}`)
      } else {
        // Unknown field - default to main form
        mainErrs[field] = { __errors: [message] }
        console.log(`⚠️ Unknown field "${field}" - defaulted to main form`)
      }
    })

    console.log('📝 Final main form errors:', mainErrs)
    console.log('📝 Final action form errors:', actionErrs)

    return {
      mainFormErrors: mainErrs,
      actionFormErrors: actionErrs,
      errorMessages: errorList
    }
  }

  /**
   * Sets validation errors in state
   */
  const setErrors = (errors: ValidationErrors) => {
    setMainFormErrors(errors.mainFormErrors)
    setActionFormErrors(errors.actionFormErrors)
    setValidationErrors(errors.errorMessages)
  }

  /**
   * Clears all validation errors
   */
  const clearErrors = () => {
    setMainFormErrors({})
    setActionFormErrors({})
    setValidationErrors([])
  }

  return {
    // State
    mainFormErrors,
    actionFormErrors,
    validationErrors,
    
    // Methods
    validateForms,
    setErrors,
    clearErrors,
  }
}
