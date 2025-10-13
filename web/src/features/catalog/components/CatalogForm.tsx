import { useState, useEffect } from 'react'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema } from '@rjsf/utils'
import { CatalogDescriptor } from '../../../types/catalog'
import { BUTTON_CLASSES } from '../../../constants/catalog'

interface SchemaWithMap extends RJSFSchema {
  'x-schema-map'?: Record<string, string>
  'x-schema-trigger-field'?: string
}

interface CatalogFormProps {
  selected: string
  version: string
  descriptor: CatalogDescriptor
  isCreatingJob: boolean
  onSubmit: (data: any) => Promise<void>
  onBack: () => void
}

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Helper function to fetch schema from local or remote source
 * @param itemId - The catalog item ID
 * @param version - The version of the item
 * @param schemaName - The schema filename to load (from x-schema-map)
 * @returns Promise resolving to the schema object
 */
const fetchSchema = async (itemId: string, version: string, schemaName: string): Promise<SchemaWithMap> => {
  console.log(`🔄 fetchSchema called for: ${itemId}@${version}/${schemaName}`)
  
  try {
    // Fetch schema from the API endpoint
    // The schema file should be part of the catalog item's version
    const response = await fetch(`${API}/catalog/${itemId}/${version}/schema/${schemaName}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch schema ${schemaName}`)
    }
    
    const schema = await response.json()
    console.log(`✅ Schema loaded: ${schema.title || schemaName}`)
    return schema as SchemaWithMap
  } catch (err) {
    console.error(`❌ Error loading schema ${schemaName}:`, err)
    throw err
  }
}

export function CatalogForm({ 
  selected, 
  version, 
  descriptor, 
  isCreatingJob, 
  onSubmit, 
  onBack 
}: CatalogFormProps) {
  const [currentSchema, setCurrentSchema] = useState<SchemaWithMap>(descriptor.schema as SchemaWithMap)
  const [actionSchema, setActionSchema] = useState<SchemaWithMap | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [actionFormData, setActionFormData] = useState<Record<string, any>>({})
  const [loadedAction, setLoadedAction] = useState<string | null>(null)

  // Reset state when descriptor changes
  useEffect(() => {
    console.log('📋 Descriptor updated, resetting form state')
    setCurrentSchema(descriptor.schema as SchemaWithMap)
    setActionSchema(null)
    setFormData({})
    setActionFormData({})
    setLoadedAction(null)
  }, [descriptor])

  // Watch for trigger field changes (defaults to 'action' if not specified)
  useEffect(() => {
    if (!currentSchema) return

    const schemaMap = currentSchema['x-schema-map']
    const triggerField = currentSchema['x-schema-trigger-field'] || 'action'
    const selectedAction = formData[triggerField]

    // If action is selected and different from loaded action
    if (schemaMap && selectedAction && selectedAction !== loadedAction) {
      const nextSchemaName = schemaMap[selectedAction]
      
      if (nextSchemaName) {
        console.log(`🔄 ${triggerField} selected: "${selectedAction}" → Loading schema: ${nextSchemaName}`)
        
        // Fetch the new schema file
        fetchSchema(selected, version, nextSchemaName)
          .then(schema => {
            console.log(`✅ Schema loaded: ${schema.title}`)
            
            // Swap schema state dynamically
            setActionSchema(schema)
            setLoadedAction(selectedAction)
            setActionFormData({}) // Reset action form data
          })
          .catch(err => {
            console.error(`❌ Failed to load schema for action "${selectedAction}":`, err)
            // Keep the form usable even if schema loading fails
          })
      }
    }
    
    // If action was deselected, clear the action schema
    if (!selectedAction && loadedAction) {
      console.log('⬅️ Action deselected, clearing action form')
      setActionSchema(null)
      setLoadedAction(null)
      setActionFormData({})
    }
  }, [formData, currentSchema, loadedAction, selected, version])

  const handleFormChange = ({ formData: newFormData }: any) => {
    setFormData(newFormData)
  }

  const handleActionChange = ({ formData: newFormData }: any) => {
    setActionFormData(newFormData)
  }

  const handleFormSubmit = ({ formData: submitData }: any) => {
    // If we have an action schema, merge both forms' data
    const finalData = actionSchema ? { ...formData, ...actionFormData } : submitData
    console.log('📝 Form submitted:', finalData)
    onSubmit(finalData)
  }

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
        
        {/* Main questionnaire form */}
        <div className="rjsf" style={{ 
          transition: 'all 0.3s ease'
        }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium" style={{ 
              color: actionSchema ? '#4CAF50' : '#333'
            }}>
              {actionSchema && '✓ '}{currentSchema.title || 'Configuration Form'}
            </h3>
            {actionSchema && (
              <button
                onClick={() => {
                  console.log('🔄 Clearing action schema to allow editing main form')
                  setActionSchema(null)
                  setLoadedAction(null)
                  setActionFormData({})
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center gap-1"
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>
          <Form
            schema={currentSchema as RJSFSchema}
            uiSchema={descriptor.ui}
            formData={formData}
            validator={validator}
            onChange={handleFormChange}
            onSubmit={handleFormSubmit}
            disabled={isCreatingJob}
          >
            {/* Only show submit button if no action schema is loaded */}
            {!actionSchema && (
              <button 
                className={BUTTON_CLASSES.submit}
                type="submit"
                disabled={isCreatingJob}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-7 4h8a2 2 0 002-2V8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Execute Task
                  </>
                )}
              </button>
            )}
          </Form>
        </div>

        {/* Tip text - show only if schema has x-schema-map and no action selected */}
        {!actionSchema && currentSchema['x-schema-map'] && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>💡 Tip:</strong> Select an action above to automatically load the corresponding workflow form below
          </div>
        )}

        {/* Action-specific form - Shows below when action is selected */}
        {actionSchema && (
          <div className="mt-6 rjsf" style={{
            animation: 'slideIn 0.3s ease-out'
          }}>
            <Form
              schema={actionSchema as RJSFSchema}
              formData={actionFormData}
              validator={validator}
              onChange={handleActionChange}
              onSubmit={handleFormSubmit}
              disabled={isCreatingJob}
            >
              <button 
                className={BUTTON_CLASSES.submit}
                type="submit"
                disabled={isCreatingJob}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-7 4h8a2 2 0 002-2V8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Execute Task
                    </>
                  )}
                </button>
              </Form>
          </div>
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