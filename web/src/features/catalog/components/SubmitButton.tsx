import { BUTTON_CLASSES } from '../../../constants/catalog'

interface SubmitButtonProps {
  isSubmitting: boolean
  label?: string
  loadingLabel?: string
  disabled?: boolean
}

/**
 * Reusable submit button with loading spinner
 * 
 * @param isSubmitting - Whether the form is currently submitting
 * @param label - Button text when not submitting (default: "Execute Task")
 * @param loadingLabel - Button text when submitting (default: "Creating Job...")
 * @param disabled - Additional disabled state
 * 
 * @example
 * ```tsx
 * <SubmitButton 
 *   isSubmitting={isCreatingJob}
 *   label="Submit Form"
 *   loadingLabel="Submitting..."
 * />
 * ```
 */
export function SubmitButton({
  isSubmitting,
  label = 'Execute Task',
  loadingLabel = 'Creating Job...',
  disabled = false,
}: SubmitButtonProps) {
  return (
    <button
      className={BUTTON_CLASSES.submit}
      type="submit"
      disabled={isSubmitting || disabled}
    >
      {isSubmitting ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {loadingLabel}
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-7 4h8a2 2 0 002-2V8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}
