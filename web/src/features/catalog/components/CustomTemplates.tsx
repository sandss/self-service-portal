import { FieldTemplateProps, ObjectFieldTemplateProps } from '@rjsf/utils'

/**
 * Custom Field Template for RJSF
 * This controls the styling of individual form fields
 * 
 * Customization options:
 * - Change the gray background color
 * - Modify border radius, padding, shadows
 * - Adjust label and description styling
 * - Control error message appearance
 */
export function CustomFieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    classNames,
    style,
    label,
    help,
    required,
    description,
    errors,
    children,
    hidden,
    displayLabel,
  } = props

  if (hidden) {
    return <div style={{ display: 'none' }}>{children}</div>
  }

  return (
    <div className={classNames} style={style}>
      {displayLabel && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-500 mb-2">{description}</p>
      )}
      {children}
      {errors && (
        <div className="mt-1 text-sm text-red-600">{errors}</div>
      )}
      {help && (
        <p className="mt-1 text-sm text-gray-500">{help}</p>
      )}
    </div>
  )
}

/**
 * Custom Object Field Template for RJSF
 * This controls the styling of object containers (the gray boxes)
 * 
 * Customization options:
 * - Change the background color (currently bg-gray-50)
 * - Modify border and shadow
 * - Adjust padding and spacing
 * - Control title styling
 */
export function CustomObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const {
    title,
    description,
    properties,
    required,
  } = props

  return (
    <div className="mb-4">
      {title && (
        <legend className="text-base font-medium text-gray-900 mb-3">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </legend>
      )}
      {description && (
        <p className="text-sm text-gray-600 mb-3">{description}</p>
      )}
      <div className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        {properties.map((element, index) => (
          <div key={index}>{element.content}</div>
        ))}
      </div>
    </div>
  )
}

/**
 * Export all custom templates as an object for RJSF
 */
export const customTemplates = {
  FieldTemplate: CustomFieldTemplate,
  ObjectFieldTemplate: CustomObjectFieldTemplate,
}
