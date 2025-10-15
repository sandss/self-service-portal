import { forwardRef } from 'react'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema, UiSchema } from '@rjsf/utils'
import { customTemplates } from './CustomTemplates'
import { SubmitButton } from './SubmitButton'

interface FormSectionProps {
  schema: RJSFSchema
  uiSchema?: UiSchema
  formData: Record<string, any>
  onChange: (e: any) => void
  onSubmit: (e: any) => void
  isSubmitting: boolean
  showSubmit?: boolean
  submitLabel?: string
  submitLoadingLabel?: string
  animated?: boolean
  className?: string
  extraErrors?: any
}

/**
 * Reusable form section that wraps RJSF Form with consistent styling
 * 
 * This component provides:
 * - RJSF Form wrapper with all common props
 * - Custom templates
 * - Submit button (optional)
 * - Animation support
 * 
 * @param schema - JSON Schema for the form
 * @param uiSchema - UI Schema for form customization
 * @param formData - Current form data
 * @param onChange - Form change handler
 * @param onSubmit - Form submit handler
 * @param isSubmitting - Whether form is currently submitting
 * @param showSubmit - Whether to show submit button (default: true)
 * @param submitLabel - Custom submit button label
 * @param submitLoadingLabel - Custom loading label
 * @param animated - Whether to animate form entry (default: false)
 * @param className - Additional CSS classes
 * 
 * @example
 * ```tsx
 * <FormSection
 *   schema={schema}
 *   formData={formData}
 *   onChange={handleChange}
 *   onSubmit={handleSubmit}
 *   isSubmitting={isCreating}
 *   showSubmit={true}
 * />
 * ```
 */
export const FormSection = forwardRef<any, FormSectionProps>(({
  schema,
  uiSchema,
  formData,
  onChange,
  onSubmit,
  isSubmitting,
  showSubmit = true,
  submitLabel,
  submitLoadingLabel,
  animated = false,
  className = '',
  extraErrors = {},
}, ref) => {
  const baseClasses = 'rjsf'
  const classes = className ? `${baseClasses} ${className}` : baseClasses
  
  const style = animated
    ? { animation: 'slideIn 0.3s ease-out' }
    : { transition: 'all 0.3s ease' }

  return (
    <div className={classes} style={style}>
      <Form
        ref={ref}
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        onChange={onChange}
        onSubmit={onSubmit}
        templates={customTemplates}
        extraErrors={extraErrors}
        showErrorList={false}
      >
        {showSubmit && (
          <SubmitButton
            isSubmitting={isSubmitting}
            label={submitLabel}
            loadingLabel={submitLoadingLabel}
          />
        )}
      </Form>
    </div>
  )
})

FormSection.displayName = 'FormSection'
