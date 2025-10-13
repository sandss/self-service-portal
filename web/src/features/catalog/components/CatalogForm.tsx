import { useEffect } from 'react'
import type { RJSFSchema } from '@rjsf/utils'
import { CatalogDescriptor } from '../../../types/catalog'
import { BUTTON_CLASSES } from '../../../constants/catalog'
import { useSchemaLoader } from '../hooks/useSchemaLoader'
import { useFormState } from '../hooks/useFormState'
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

  // Reset all state when descriptor changes
  useEffect(() => {
    console.log('📋 Descriptor updated, resetting all state')
    resetSchemas()
    resetFormData()
  }, [descriptor, resetSchemas, resetFormData])

  // Handle form submission with data merging
  const { handleFormSubmit, validationError } = useCatalogSubmit(
    onSubmit,
    getMergedData,
    actionSchema,
    descriptor.schema as RJSFSchema
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
        
        {/* Main questionnaire form */}
        <FormSection
          schema={currentSchema as RJSFSchema}
          uiSchema={descriptor.ui}
          formData={formData}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          isSubmitting={isCreatingJob}
          showSubmit={!actionSchema}
        />

        {/* Action-specific form - Shows below when action is selected */}
        {actionSchema && (
          <FormSection
            schema={actionSchema as RJSFSchema}
            formData={actionFormData}
            onChange={handleActionChange}
            onSubmit={handleFormSubmit}
            isSubmitting={isCreatingJob}
            showSubmit={true}
            animated={true}
            className="mt-6"
          />
        )}
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