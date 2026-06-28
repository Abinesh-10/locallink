import { InputHTMLAttributes, forwardRef } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const fieldId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={`rounded border px-3 py-2.5 text-ink-900 placeholder:text-ink-300 focus:border-brand-500 ${
            error ? 'border-sos-500' : 'border-ink-100'
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${fieldId}-error`} className="text-sm text-sos-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);
TextField.displayName = 'TextField';
