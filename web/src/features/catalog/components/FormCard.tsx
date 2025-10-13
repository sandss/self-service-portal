import { CSSProperties, ReactNode } from 'react'

interface FormCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * FormCard - Reusable card wrapper for form sections
 * 
 * Provides consistent styling for all forms in the catalog:
 * - White background with rounded corners
 * - Shadow and border for depth
 * - Consistent padding
 * 
 * @example
 * ```tsx
 * <FormCard>
 *   <h2>My Form</h2>
 *   <Form schema={schema} />
 * </FormCard>
 * ```
 * 
 * @example With animation
 * ```tsx
 * <FormCard style={{ animation: 'slideIn 0.3s ease-out' }}>
 *   <Form schema={actionSchema} />
 * </FormCard>
 * ```
 */
export function FormCard({ children, className = '', style }: FormCardProps) {
  const baseClasses = 'bg-white rounded-xl shadow-sm border border-gray-200 p-8'
  const combinedClasses = `${baseClasses} ${className}`.trim()
  
  return (
    <div className={combinedClasses} style={style}>
      {children}
    </div>
  )
}
