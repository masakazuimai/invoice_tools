import { type TextareaHTMLAttributes, forwardRef } from "react"

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const textareaId = id ?? label?.replace(/\s/g, "-").toLowerCase()
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={textareaId} className="block text-base font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`block w-full rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            error ? "border-red-300" : "border-gray-300"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-base text-red-600">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"
