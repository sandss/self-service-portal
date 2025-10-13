import { useState, useEffect, useCallback } from 'react'
import type { RJSFSchema } from '@rjsf/utils'

interface SchemaWithMap extends RJSFSchema {
  'x-schema-map'?: Record<string, string>
  'x-schema-trigger-field'?: string
}

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Helper function to fetch schema from the API
 * @param itemId - The catalog item ID
 * @param version - The version of the item
 * @param schemaName - The schema filename to load (from x-schema-map)
 * @returns Promise resolving to the schema object
 */
const fetchSchema = async (itemId: string, version: string, schemaName: string): Promise<SchemaWithMap> => {
  console.log(`🔄 fetchSchema called for: ${itemId}@${version}/${schemaName}`)
  
  try {
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

/**
 * Custom hook to handle automatic schema loading based on x-schema-map
 * 
 * This hook watches for changes in a trigger field (defaults to 'action')
 * and automatically loads the corresponding schema when the field value changes.
 * 
 * @param itemId - The catalog item ID
 * @param version - The version of the catalog item
 * @param baseSchema - The initial/base schema with x-schema-map configuration
 * @param formData - Current form data to watch for trigger field changes
 * 
 * @returns Object containing:
 * - currentSchema: The current base schema
 * - actionSchema: The dynamically loaded schema (null if not loaded)
 * - loadedAction: The action value that triggered the current actionSchema
 * - setActionSchema: Function to manually set the action schema
 * - setLoadedAction: Function to manually set the loaded action
 * - resetSchemas: Function to reset all schemas to initial state
 * 
 * @example
 * ```tsx
 * const { currentSchema, actionSchema, resetSchemas } = useSchemaLoader(
 *   'my-item',
 *   '1.0.0',
 *   descriptor.schema,
 *   formData
 * )
 * ```
 */
export function useSchemaLoader(
  itemId: string,
  version: string,
  baseSchema: RJSFSchema,
  formData: Record<string, any>
) {
  const [currentSchema, setCurrentSchema] = useState<SchemaWithMap>(baseSchema as SchemaWithMap)
  const [actionSchema, setActionSchema] = useState<SchemaWithMap | null>(null)
  const [loadedAction, setLoadedAction] = useState<string | null>(null)

  // Reset schemas when base schema changes (e.g., when switching catalog items)
  useEffect(() => {
    console.log('📋 Base schema updated, resetting schema state')
    setCurrentSchema(baseSchema as SchemaWithMap)
    setActionSchema(null)
    setLoadedAction(null)
  }, [baseSchema])

  // Watch for trigger field changes and load corresponding schemas
  useEffect(() => {
    if (!currentSchema) return

    const schemaMap = currentSchema['x-schema-map']
    const triggerField = currentSchema['x-schema-trigger-field'] || 'action'
    const selectedAction = formData[triggerField]

    // If trigger field value is selected and different from currently loaded action
    if (schemaMap && selectedAction && selectedAction !== loadedAction) {
      const nextSchemaName = schemaMap[selectedAction]
      
      if (nextSchemaName) {
        console.log(`🔄 ${triggerField} selected: "${selectedAction}" → Loading schema: ${nextSchemaName}`)
        
        // Fetch the new schema file
        fetchSchema(itemId, version, nextSchemaName)
          .then(schema => {
            console.log(`✅ Schema loaded: ${schema.title}`)
            setActionSchema(schema)
            setLoadedAction(selectedAction)
          })
          .catch(err => {
            console.error(`❌ Failed to load schema for action "${selectedAction}":`, err)
            // Keep the form usable even if schema loading fails
          })
      }
    }
    
    // If trigger field was cleared, clear the action schema
    if (!selectedAction && loadedAction) {
      console.log('⬅️ Trigger field deselected, clearing action schema')
      setActionSchema(null)
      setLoadedAction(null)
    }
  }, [
    formData[currentSchema?.['x-schema-trigger-field'] || 'action'], // Only watch the specific trigger field
    currentSchema, 
    loadedAction, 
    itemId, 
    version
  ])

  // Helper function to reset all schemas to initial state (memoized to prevent infinite loops)
  const resetSchemas = useCallback(() => {
    console.log('🔄 Resetting all schemas')
    setCurrentSchema(baseSchema as SchemaWithMap)
    setActionSchema(null)
    setLoadedAction(null)
  }, [baseSchema])

  return {
    currentSchema,
    actionSchema,
    loadedAction,
    setActionSchema,
    setLoadedAction,
    resetSchemas,
  }
}
