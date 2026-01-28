import { useState, forwardRef, useCallback } from 'react';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Optional label for the input */
  label?: string;
  /** Show strength indicator for password */
  showStrength?: boolean;
  /** Error message to display */
  error?: string;
  /** Container class name for custom styling */
  containerClassName?: string;
}

/**
 * Password strength levels
 */
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | null;

/**
 * Calculate password strength based on various criteria
 */
function calculateStrength(password: string): PasswordStrength {
  if (!password) return null;

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score === 3) return 'fair';
  if (score === 4) return 'good';
  return 'strong';
}

/**
 * Get color and label for strength level
 */
function getStrengthInfo(strength: PasswordStrength) {
  switch (strength) {
    case 'weak':
      return { color: 'bg-red-500', label: 'Weak', textColor: 'text-red-500' };
    case 'fair':
      return { color: 'bg-orange-500', label: 'Fair', textColor: 'text-orange-500' };
    case 'good':
      return { color: 'bg-yellow-500', label: 'Good', textColor: 'text-yellow-500' };
    case 'strong':
      return { color: 'bg-green-500', label: 'Strong', textColor: 'text-green-500' };
    default:
      return { color: '', label: '', textColor: '' };
  }
}

/**
 * Reusable password input component with show/hide toggle and strength indicator
 *
 * Features:
 * - Show/hide password toggle
 * - Password strength indicator (optional)
 * - Error display
 * - Fully accessible
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      showStrength = false,
      error,
      containerClassName = '',
      className = '',
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);

    const strength = showStrength && typeof value === 'string'
      ? calculateStrength(value)
      : null;
    const strengthInfo = strength ? getStrengthInfo(strength) : null;

    const toggleVisibility = useCallback(() => {
      setIsVisible((prev) => !prev);
    }, []);

    const inputId = props.id || `password-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`password-input ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isVisible ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            className={`
              w-full px-4 py-3 pr-12
              rounded-lg border-2
              ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}
              bg-white
              text-gray-900 placeholder-gray-400
              outline-none
              transition-colors duration-200
              ${className}
            `}
            {...props}
          />

          {/* Show/Hide toggle button */}
          <button
            type="button"
            onClick={toggleVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2
              text-gray-400 hover:text-gray-600
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              rounded-md p-1"
            aria-label={isVisible ? 'Hide password' : 'Show password'}
          >
            {isVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-9.228-9.228L5.636 5.636m12.728 12.728L16.364 16.364" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        {/* Password strength indicator */}
        {showStrength && strengthInfo && value && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Password strength</span>
              <span className={`text-xs font-medium ${strengthInfo.textColor}`}>
                {strengthInfo.label}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${strengthInfo.color} transition-all duration-300 ease-out`}
                style={{
                  width: strength === 'weak' ? '25%'
                    : strength === 'fair' ? '50%'
                    : strength === 'good' ? '75%'
                    : '100%'
                }}
              />
            </div>
            <div className="flex gap-4 mt-1">
              <span className="text-xs text-gray-400">
                {typeof value === 'string' && value.length >= 8 ? (
                  <span className="text-green-500">8+ characters</span>
                ) : '8+ characters'}
              </span>
              <span className="text-xs text-gray-400">
                {typeof value === 'string' && /[A-Z]/.test(value) && /[a-z]/.test(value) ? (
                  <span className="text-green-500">Upper & lower case</span>
                ) : 'Upper & lower case'}
              </span>
              <span className="text-xs text-gray-400">
                {typeof value === 'string' && /[0-9]/.test(value) ? (
                  <span className="text-green-500">Number</span>
                ) : 'Number'}
              </span>
              <span className="text-xs text-gray-400">
                {typeof value === 'string' && /[^a-zA-Z0-9]/.test(value) ? (
                  <span className="text-green-500">Special character</span>
                ) : 'Special character'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
