import { useState, useCallback } from 'react'

/**
 * Custom hook to manage form state for catalog forms
 * 
 * This hook manages:
 * - Main form data (base questionnaire)
 * - Action form data (dynamically loaded form)
 * - Reset functionality when switching catalog items
 * 
 * @returns Object containing:
 * - formData: Main form data
 * - actionFormData: Action-specific form data
 * - setFormData: Update main form data
 * - setActionFormData: Update action form data
 * - handleFormChange: RJSF onChange handler for main form
 * - handleActionChange: RJSF onChange handler for action form
 * - resetFormData: Reset both forms to empty state
 * - getMergedData: Get combined data from both forms
 * 
 * @example
 * ```tsx
 * const {
 *   formData,
 *   actionFormData,
 *   handleFormChange,
 *   handleActionChange,
 *   getMergedData,
 *   resetFormData
 * } = useFormState()
 * 
 * // Use in RJSF Form
 * <Form
 *   formData={formData}
 *   onChange={handleFormChange}
 * />
 * 
 * // Get merged data for submission
 * const finalData = getMergedData()
 * ```
 */
export function useFormState() {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [actionFormData, setActionFormData] = useState<Record<string, any>>({})

  /**
   * Handler for main form changes (compatible with RJSF onChange)
   */
  const handleFormChange = useCallback(({ formData: newFormData }: any) => {
    setFormData(newFormData)
  }, [])

  /**
   * Handler for action form changes (compatible with RJSF onChange)
   */
  const handleActionChange = useCallback(({ formData: newFormData }: any) => {
    setActionFormData(newFormData)
  }, [])

  /**
   * Reset all form data to empty state
   * Useful when switching catalog items or starting fresh
   */
  const resetFormData = useCallback(() => {
    console.log('🔄 Resetting form data')
    setFormData({})
    setActionFormData({})
  }, [])

  /**
   * Get merged data from both forms
   * Main form data is the base, action form data overrides/extends it
   * 
   * @param includeActionForm - Whether to include action form data (default: true)
   * @returns Merged form data object
   */
  const getMergedData = useCallback((includeActionForm: boolean = true) => {
    if (includeActionForm && Object.keys(actionFormData).length > 0) {
      return { ...formData, ...actionFormData }
    }
    return formData
  }, [formData, actionFormData])

  return {
    formData,
    actionFormData,
    setFormData,
    setActionFormData,
    handleFormChange,
    handleActionChange,
    resetFormData,
    getMergedData,
  }
}
