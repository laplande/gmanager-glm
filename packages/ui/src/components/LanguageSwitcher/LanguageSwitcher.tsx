/**
 * LanguageSwitcher Component
 *
 * A dropdown component for switching between supported languages.
 * Persists the user's language preference to localStorage.
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { SUPPORTED_LANGUAGES, changeLanguage, type SupportedLanguage } from '../../i18n/config';

export interface LanguageSwitcherProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the language icon */
  showIcon?: boolean;
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Globe/Language icon
 */
const LanguageIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM4.072 10.069a6.012 6.012 0 0 1 2.124-4.236 6.012 6.012 0 0 1 2.124 4.236H4.072Zm3.627 2a7.957 7.957 0 0 0 2.301-4.236 7.957 7.957 0 0 0 2.301 4.236H7.699Zm4.692 0H18.28a6.012 6.012 0 0 1-2.124 4.236 6.012 6.012 0 0 1-2.124-4.236h.358Zm-4.692-2h9.28a6.012 6.012 0 0 0-2.124-4.236 6.012 6.012 0 0 0-2.124 4.236h-5.032ZM10 17.5a8.001 8.001 0 0 1-6.93-4h2.149a7.957 7.957 0 0 0 4.781 4 7.957 7.957 0 0 0 4.781-4h2.149A8.001 8.001 0 0 1 10 17.5Z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Chevron down icon
 */
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M5 7.5 10 12.5 15 7.5"
    />
  </svg>
);

/**
 * Check icon for selected language
 */
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4.5 10 8 13.5 15.5 6"
    />
  </svg>
);

/**
 * LanguageSwitcher Component
 *
 * Displays a dropdown button showing the current language.
 * Clicking opens a menu with all available languages.
 *
 * @example
 * ```tsx
 * <LanguageSwitcher />
 * <LanguageSwitcher variant="ghost" size="sm" />
 * ```
 */
export const LanguageSwitcher = React.forwardRef<HTMLButtonElement, LanguageSwitcherProps>(
  ({ className, showIcon = true, variant = 'default', size = 'md' }, ref) => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Get current language info
    const currentLang = SUPPORTED_LANGUAGES.find((lang) => lang.code === i18n.language) || SUPPORTED_LANGUAGES[0];

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          !buttonRef.current?.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Handle language change
    const handleLanguageChange = async (languageCode: SupportedLanguage) => {
      await changeLanguage(languageCode);
      setIsOpen(false);
    };

    // Get button styles based on variant
    const getButtonStyles = () => {
      const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

      const sizeStyles = {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-4 text-base',
      };

      const variantStyles = {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      };

      return cn(baseStyles, sizeStyles[size], variantStyles[variant]);
    };

    return (
      <div className={cn('relative', className)}>
        <button
          ref={(node) => {
            // Handle both refs
            if (node) {
              buttonRef.current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }
          }}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={getButtonStyles()}
          aria-label="Change language"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {showIcon && <LanguageIcon className="w-4 h-4" />}
          <span>{currentLang.nativeName}</span>
          <ChevronDownIcon
            className={cn(
              'w-4 h-4 transition-transform',
              isOpen && 'transform rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={cn(
              'absolute right-0 z-50 min-w-[160px] py-1 mt-1',
              'bg-popover border border-border rounded-md shadow-lg',
              'max-h-[300px] overflow-auto'
            )}
            role="listbox"
            aria-label="Select language"
          >
            {SUPPORTED_LANGUAGES.map((language) => {
              const isSelected = language.code === i18n.language;

              return (
                <button
                  key={language.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleLanguageChange(language.code as SupportedLanguage)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                    isSelected && 'bg-accent/50 font-medium'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {showIcon && <LanguageIcon className="w-4 h-4 text-muted-foreground" />}
                    <span>{language.nativeName}</span>
                  </span>
                  {isSelected && <span className="text-muted-foreground">{language.name}</span>}
                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-primary ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

LanguageSwitcher.displayName = 'LanguageSwitcher';
