import { useEffect, useRef } from 'react'
import type { RJSFSchema } from '@rjsf/utils'
import { CatalogDescriptor } from '../../../types/catalog'
import { BUTTON_CLASSES } from '../../../constants/catalog'
import { useSchemaLoader } from '../hooks/useSchemaLoader'
import { useFormState } from '../hooks/useFormState'
import { useFormValidation } from '../hooks/useFormValidation'
import { useCatalogSubmit } from '../hooks/useCatalogSubmit'
import { FormSection } from './FormSection'

interface CatalogFormProps {
  selected: string
  version: string
  descriptor: CatalogDescriptor
  isCreatingJob: boolean
  onSubmit: (data: any) => Promise<void>
  onBack: () => void
}

export function CatalogForm({ 
  selected, 
  version, 
  descriptor, 
  isCreatingJob, 
  onSubmit, 
  onBack 
}: CatalogFormProps) {
  const mainFormRef = useRef<any>(null)
  const actionFormRef = useRef<any>(null)

  // Manage form state
  const {
    formData,
    actionFormData,
    handleFormChange,
    handleActionChange,
    resetFormData,
    getMergedData,
  } = useFormState()

  // Handle automatic schema loading based on form data
  const { 
    currentSchema, 
    actionSchema, 
    resetSchemas 
  } = useSchemaLoader(
    selected,
    version,
    descriptor.schema,
    formData
  )

  // Handle form validation
  const {
    mainFormErrors,
    actionFormErrors,
    validationErrors,
    validateForms,
    setErrors,
    clearErrors,
  } = useFormValidation(
    descriptor.schema as RJSFSchema,
    actionSchema
  )

  // Reset all state when descriptor changes
  useEffect(() => {
    console.log('📋 Descriptor updated, resetting all state')
    resetSchemas()
    resetFormData()
    clearErrors()
  }, [descriptor, resetSchemas, resetFormData, clearErrors])

  // Handle validation and submission of both forms
  const handleExecute = async () => {
    console.log('🚀 Execute button clicked - validating all forms...')
    
    const mergedData = getMergedData()
    
    // Validate both forms using the validation hook
    const errors = validateForms(mergedData, actionFormData)
    
    // If there are validation errors, set them and stop submission
    if (errors.errorMessages.length > 0) {
      setErrors(errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    
    console.log('✅ All validation passed, submitting...')
    await onSubmit(mergedData)
  }

  // Handle form submission with data merging
  const { handleFormSubmit } = useCatalogSubmit(
    onSubmit,
    getMergedData,
    actionSchema
  )

  return (
    <div>
      <button
        onClick={onBack}
        className={BUTTON_CLASSES.secondary}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Catalog
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {descriptor.manifest?.name || selected}
          </h2>
          {descriptor.manifest?.description && (
            <p className="text-gray-600">{descriptor.manifest.description}</p>
          )}
          <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
              Version {version}
            </span>
          </div>
        </div>
        
        {/* Validation Error Alert */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Please complete all required fields</h3>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Main questionnaire form */}
        <FormSection
          ref={mainFormRef}
          schema={currentSchema as RJSFSchema}
          uiSchema={descriptor.ui}
          formData={formData}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          isSubmitting={isCreatingJob}
          showSubmit={false}
          extraErrors={mainFormErrors}
        />

        {/* Action-specific form - Shows below when action is selected */}
        {actionSchema && (
          <FormSection
            ref={actionFormRef}
            schema={actionSchema as RJSFSchema}
            formData={actionFormData}
            onChange={handleActionChange}
            onSubmit={handleFormSubmit}
            isSubmitting={isCreatingJob}
            showSubmit={false}
            animated={true}
            className="mt-6"
            extraErrors={actionFormErrors}
          />
        )}

        {/* Custom Execute Button - validates and submits all forms */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleExecute}
            disabled={isCreatingJob}
            className={BUTTON_CLASSES.primary}
          >
            {isCreatingJob ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Job...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Execute
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}