/**
 * Translation keys for SearchBar component
 */
export interface SearchBarTranslations {
  placeholder?: string;
  clear?: string;
  recentSearches?: string;
  loadingResults?: string;
  allGroups?: string;
  allTags?: string;
  group?: string;
  tag?: string;
}

/**
 * Default English translations
 */
const DEFAULT_TRANSLATIONS: SearchBarTranslations = {
  placeholder: "Search accounts...",
  clear: "Clear search",
  recentSearches: "Recent Searches",
  loadingResults: "Loading search results",
  allGroups: "All Groups",
  allTags: "All Tags",
  group: "Group",
  tag: "Tag",
};

/**
 * SearchBar component for account search and filtering
 *
 * Features:
 * - Text input with debounced search (300ms)
 * - Filter dropdowns for group and tag
 * - Clear search button
 * - Recent searches dropdown
 */

import * as React from 'react';
import { cn } from '@gmanager/ui';
import type { Group, Tag } from '@gmanager/shared';

/**
 * Props for SearchBar component
 */
export interface SearchBarProps {
  /** Current search query value */
  query: string;
  /** Update search query */
  onQueryChange: (query: string) => void;
  /** Clear search query */
  onClearQuery: () => void;
  /** Selected group ID */
  selectedGroupId?: string;
  /** Set group filter */
  onGroupChange: (groupId: string | undefined) => void;
  /** Selected tag ID */
  selectedTagId?: string;
  /** Set tag filter */
  onTagChange: (tagId: string | undefined) => void;
  /** Available groups for filtering */
  groups: Group[];
  /** Available tags for filtering */
  tags: Tag[];
  /** Recent search items */
  recentSearches?: Array<{ query: string; timestamp: string }>;
  /** Apply a recent search */
  onRecentSearchClick?: (query: string) => void;
  /** Whether search is loading */
  isLoading?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the recent searches dropdown */
  showRecentSearches?: boolean;
  /** Custom translations for i18n */
  translations?: SearchBarTranslations;
}

/**
 * Search icon SVG
 */
const SearchIcon = ({ className }: { className?: string }) => (
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
      d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM16.5 16.5 13 13"
    />
  </svg>
);

/**
 * X/close icon
 */
const XIcon = ({ className }: { className?: string }) => (
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
      d="M4.5 4.5 15.5 15.5M15.5 4.5 4.5 15.5"
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
 * Clock icon for recent searches
 */
const ClockIcon = ({ className }: { className?: string }) => (
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
      d="M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM10 6.5v3.5l2.5 1.5"
    />
  </svg>
);

/**
 * Filter dropdown button component
 */
interface FilterDropdownProps {
  label: string;
  value: string | undefined;
  options: Array<{ id: string; name: string; color?: string }>;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'All',
  disabled = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

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

  // Get display name for selected value
  const selectedOption = options.find((opt) => opt.id === value);
  const displayValue = selectedOption?.name || placeholder;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 h-9 px-3 pr-8 rounded-md text-sm',
          'border border-input bg-background',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          value && 'font-medium'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        <span className="truncate max-w-[120px]">{displayValue}</span>
        <ChevronDownIcon
          className={cn(
            'absolute right-2 w-4 h-4 text-muted-foreground transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 mt-1 min-w-[160px] max-w-[240px] py-1',
            'bg-popover border border-border rounded-md shadow-lg',
            'max-h-[240px] overflow-auto'
          )}
          role="listbox"
          aria-label={`${label} options`}
        >
          {/* "All" option */}
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => {
              onChange(undefined);
              setIsOpen(false);
            }}
            className={cn(
              'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:bg-accent focus:text-accent-foreground focus:outline-none',
              !value && 'bg-accent/50'
            )}
          >
            <span className="text-muted-foreground">All {label.toLowerCase()}</span>
          </button>

          {/* Options */}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={value === option.id}
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                value === option.id && 'bg-accent/50 font-medium'
              )}
            >
              {/* Color indicator if available */}
              {option.color && (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: option.color }}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{option.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main SearchBar component
 *
 * Provides a comprehensive search interface with text input,
 * filter dropdowns, and recent searches.
 *
 * @example
 * ```tsx
 * <SearchBar
 *   query={query}
 *   onQueryChange={setQuery}
 *   onClearQuery={clearQuery}
 *   selectedGroupId={groupId}
 *   onGroupChange={setGroupId}
 *   selectedTagId={tagId}
 *   onTagChange={setTagId}
 *   groups={groups}
 *   tags={tags}
 *   recentSearches={recentSearches}
 *   onRecentSearchClick={(q) => setQuery(q)}
 *   isLoading={isLoading}
 * />
 * ```
 */
export const SearchBar = React.forwardRef<HTMLDivElement, SearchBarProps>(
  (
    {
      query,
      onQueryChange,
      onClearQuery,
      selectedGroupId,
      onGroupChange,
      selectedTagId,
      onTagChange,
      groups,
      tags,
      recentSearches = [],
      onRecentSearchClick,
      isLoading = false,
      placeholder,
      className,
      showRecentSearches = true,
      translations: externalTranslations,
    },
    ref
  ) => {
    // Merge translations with defaults
    const t: SearchBarTranslations = {
      ...DEFAULT_TRANSLATIONS,
      ...externalTranslations,
    };

    // Use provided placeholder or translation
    const placeholderText = placeholder || t.placeholder || DEFAULT_TRANSLATIONS.placeholder!;

    const inputRef = React.useRef<HTMLInputElement>(null);
    const [showRecentDropdown, setShowRecentDropdown] = React.useState(false);
    const recentDropdownRef = React.useRef<HTMLDivElement>(null);

    // Focus input on mount
    React.useEffect(() => {
      // Only auto-focus if not on mobile (optional UX choice)
      // inputRef.current?.focus();
    }, []);

    // Close recent searches dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          recentDropdownRef.current &&
          !recentDropdownRef.current.contains(event.target as Node) &&
          !inputRef.current?.contains(event.target as Node)
        ) {
          setShowRecentDropdown(false);
        }
      };

      if (showRecentDropdown) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showRecentDropdown]);

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(e.target.value);
    };

    // Handle clear button click
    const handleClear = () => {
      onClearQuery();
      inputRef.current?.focus();
    };

    // Handle key down in input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onClearQuery();
        setShowRecentDropdown(false);
      } else if (e.key === 'ArrowDown' && showRecentSearches && recentSearches.length > 0) {
        e.preventDefault();
        setShowRecentDropdown(true);
      }
    };

    // Handle focus on input
    const handleInputFocus = () => {
      if (showRecentSearches && recentSearches.length > 0 && !query) {
        setShowRecentDropdown(true);
      }
    };

    // Handle recent search click
    const handleRecentSearchClick = (recentQuery: string) => {
      onRecentSearchClick?.(recentQuery);
      setShowRecentDropdown(false);
    };

    const showClearButton = query.length > 0;

    return (
      <div ref={ref} className={cn('relative', className)}>
        <div
          className={cn(
            'flex items-stretch gap-2 p-1.5',
            'bg-card border border-border rounded-lg',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
          )}
        >
          {/* Search icon */}
          <div className="flex items-center justify-center pl-2 pr-1 text-muted-foreground">
            <SearchIcon className="w-5 h-5" />
            {isLoading && (
              <span className="sr-only">Loading search results</span>
            )}
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder={placeholderText}
              className={cn(
                'w-full h-9 px-2 py-1.5 bg-transparent',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              aria-label="Search accounts"
              aria-autocomplete="list"
              aria-controls={showRecentDropdown ? 'recent-searches-list' : undefined}
              aria-expanded={showRecentDropdown}
              autoComplete="off"
            />

            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Clear button */}
          {showClearButton && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'flex items-center justify-center px-2 text-muted-foreground',
                'hover:text-foreground hover:bg-accent rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'transition-colors'
              )}
              aria-label="Clear search"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}

          {/* Divider */}
          <div className="w-px bg-border self-center mx-1" />

          {/* Group filter dropdown */}
          <FilterDropdown
            label={t.group || DEFAULT_TRANSLATIONS.group!}
            value={selectedGroupId}
            options={groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
            onChange={onGroupChange}
            placeholder={t.allGroups || DEFAULT_TRANSLATIONS.allGroups!}
          />

          {/* Tag filter dropdown */}
          <FilterDropdown
            label={t.tag || DEFAULT_TRANSLATIONS.tag!}
            value={selectedTagId}
            options={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
            onChange={onTagChange}
            placeholder={t.allTags || DEFAULT_TRANSLATIONS.allTags!}
          />
        </div>

        {/* Recent searches dropdown */}
        {showRecentDropdown && showRecentSearches && recentSearches.length > 0 && (
          <div
            ref={recentDropdownRef}
            className={cn(
              'absolute z-50 mt-1 w-full py-1',
              'bg-popover border border-border rounded-md shadow-lg',
              'max-h-[280px] overflow-auto'
            )}
            id="recent-searches-list"
            role="listbox"
            aria-label="Recent searches"
          >
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ClockIcon className="w-3.5 h-3.5" />
              {t.recentSearches}
            </div>
            {recentSearches.slice(0, 8).map((search, index) => (
              <button
                key={`${search.query}-${index}`}
                type="button"
                role="option"
                onClick={() => handleRecentSearchClick(search.query)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-3',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus:bg-accent focus:text-accent-foreground focus:outline-none'
                )}
              >
                <SearchIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate">{search.query}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
