// Input and TextArea components
import { cn } from '../../utils';

interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  id?: string;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (e: Event) => void;
  onInput?: (e: Event) => void;
  onBlur?: (e: Event) => void;
  onFocus?: (e: Event) => void;
}

export function Input({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substring(7)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'placeholder:text-gray-400',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

interface TextAreaProps {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  rows?: number;
  value?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (e: Event) => void;
  onInput?: (e: Event) => void;
  onBlur?: (e: Event) => void;
  onFocus?: (e: Event) => void;
}

export function TextArea({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: TextAreaProps) {
  const inputId = id || `textarea-${Math.random().toString(36).substring(7)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-sm resize-none',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'placeholder:text-gray-400',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
