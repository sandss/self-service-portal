import { useCallback } from 'react'
import type { RJSFSchema } from '@rjsf/utils'

/**
 * Custom hook to handle catalog form submission
 * 
 * This hook manages:
 * - Merging form data when there's an action schema
 * - Calling the submission handler
 * - Logging submission data for debugging
 * 
 * @param onSubmit - Async function to handle the actual submission
 * @param getMergedData - Function to get merged data from useFormState
 * @param actionSchema - Current action schema (if any)
 * 
 * @returns Object containing:
 * - handleFormSubmit: RJSF onSubmit handler that merges data and submits
 * 
 * @example
 * ```tsx
 * const { handleFormSubmit } = useCatalogSubmit(
 *   onSubmit,
 *   getMergedData,
 *   actionSchema
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
  actionSchema: RJSFSchema | null
) {
  /**
   * Handle form submission
   * If there's an action schema, merge both forms' data
   * Otherwise, use the submitted data as-is
   */
  const handleFormSubmit = useCallback(
    ({ formData: submitData }: any) => {
      // Get merged data if we have an action schema, otherwise use submitted data
      const finalData = actionSchema ? getMergedData() : submitData
      console.log('📝 Form submitted:', finalData)
      
      // Call the parent's submit handler
      onSubmit(finalData)
    },
    [onSubmit, getMergedData, actionSchema]
  )

  return {
    handleFormSubmit,
  }
}
