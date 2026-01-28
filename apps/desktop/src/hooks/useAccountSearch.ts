/**
 * React hook for account search functionality
 *
 * Provides debounced search, filter state management, and API integration
 * for searching and filtering accounts by query, group, and tag.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Group, Tag } from '@gmanager/shared';
import { searchAccounts, type AccountSearchParams, type ApiAccount } from '../api/accounts';

/**
 * Search state for accounts
 */
export interface AccountSearchState {
  /** Current search query text */
  query: string;
  /** Selected group ID filter */
  groupId: string | undefined;
  /** Selected tag ID filter */
  tagId: string | undefined;
  /** Selected year filter */
  year: string | undefined;
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Error from last search */
  error: Error | null;
}

/**
 * Recent search item
 */
export interface RecentSearch {
  /** The search query */
  query: string;
  /** ISO timestamp when search was performed */
  timestamp: string;
}

/**
 * Result from useAccountSearch hook
 */
export interface UseAccountSearchResult {
  /** Current search state */
  searchState: AccountSearchState;
  /** Filtered accounts from search */
  accounts: ApiAccount[];
  /** Update search query (triggers debounced search) */
  setQuery: (query: string) => void;
  /** Set group filter */
  setGroupId: (groupId: string | undefined) => void;
  /** Set tag filter */
  setTagId: (tagId: string | undefined) => void;
  /** Set year filter */
  setYear: (year: string | undefined) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Clear search query only */
  clearQuery: () => void;
  /** Manually trigger search with current state */
  search: () => Promise<void>;
  /** Available groups for filtering */
  groups: Group[];
  /** Available tags for filtering */
  tags: Tag[];
  /** Set available groups */
  setGroups: (groups: Group[]) => void;
  /** Set available tags */
  setTags: (tags: Tag[]) => void;
  /** Recent searches */
  recentSearches: RecentSearch[];
  /** Add a query to recent searches */
  addToRecent: (query: string) => void;
  /** Clear recent searches */
  clearRecent: () => void;
}

/**
 * Local storage key for recent searches
 */
const RECENT_SEARCHES_KEY = 'gmanager_recent_searches';

/**
 * Maximum number of recent searches to store
 */
const MAX_RECENT_SEARCHES = 10;

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_MS = 300;

/**
 * Load recent searches from localStorage
 */
function loadRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

/**
 * Save recent searches to localStorage
 */
function saveRecentSearches(searches: RecentSearch[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Custom hook for account search with debouncing and filter management
 *
 * Features:
 * - Debounced search input (300ms)
 * - Filter by group, tag, and year
 * - Recent searches tracking
 * - Loading and error states
 *
 * @example
 * ```tsx
 * const {
 *   searchState,
 *   accounts,
 *   setQuery,
 *   setGroupId,
 *   setTagId,
 *   clearFilters,
 *   groups,
 *   tags,
 *   setGroups,
 *   setTags
 * } = useAccountSearch();
 *
 * // Load available filters
 * useEffect(() => {
 *   const loadFilters = async () => {
 *     const [groupsData, tagsData] = await Promise.all([
 *       getGroups(),
 *       getTags()
 *     ]);
 *     setGroups(groupsData);
 *     setTags(tagsData);
 *   };
 *   loadFilters();
 * }, []);
 * ```
 */
export function useAccountSearch(): UseAccountSearchResult {
  // Search state
  const [query, setQueryState] = useState<string>('');
  const [groupId, setGroupIdState] = useState<string | undefined>();
  const [tagId, setTagIdState] = useState<string | undefined>();
  const [year, setYearState] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Results
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);

  // Available filters
  const [groups, setGroups] = useState<Group[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(loadRecentSearches);

  // Ref for debounced search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Perform the actual search API call
   */
  const performSearch = useCallback(async (params: AccountSearchParams) => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchAccounts(params);
      if (isMountedRef.current) {
        setAccounts(results);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Search failed'));
        setAccounts([]);
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Debounced search trigger
   */
  const debouncedSearchRef = useRef(((params: AccountSearchParams) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(params);
    }, DEBOUNCE_MS);
  }));

  /**
   * Set query and trigger debounced search
   */
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    debouncedSearchRef.current({
      query: newQuery || undefined,
      group_id: groupId,
      tag_id: tagId,
      year,
      limit: 100,
    });
  }, [groupId, tagId, year]);

  /**
   * Set group filter and trigger search
   */
  const setGroupId = useCallback((newGroupId: string | undefined) => {
    setGroupIdState(newGroupId);
    performSearch({
      query: query || undefined,
      group_id: newGroupId,
      tag_id: tagId,
      year,
      limit: 100,
    });
  }, [query, tagId, year, performSearch]);

  /**
   * Set tag filter and trigger search
   */
  const setTagId = useCallback((newTagId: string | undefined) => {
    setTagIdState(newTagId);
    performSearch({
      query: query || undefined,
      group_id: groupId,
      tag_id: newTagId,
      year,
      limit: 100,
    });
  }, [query, groupId, year, performSearch]);

  /**
   * Set year filter and trigger search
   */
  const setYear = useCallback((newYear: string | undefined) => {
    setYearState(newYear);
    performSearch({
      query: query || undefined,
      group_id: groupId,
      tag_id: tagId,
      year: newYear,
      limit: 100,
    });
  }, [query, groupId, tagId, performSearch]);

  /**
   * Clear all filters and reset results
   */
  const clearFilters = useCallback(() => {
    setQueryState('');
    setGroupIdState(undefined);
    setTagIdState(undefined);
    setYearState(undefined);
    setAccounts([]);
    setError(null);
  }, []);

  /**
   * Clear search query only
   */
  const clearQuery = useCallback(() => {
    setQuery('');
  }, [setQuery]);

  /**
   * Manually trigger search with current state
   */
  const search = useCallback(async () => {
    await performSearch({
      query: query || undefined,
      group_id: groupId,
      tag_id: tagId,
      year,
      limit: 100,
    });
  }, [query, groupId, tagId, year, performSearch]);

  /**
   * Add a query to recent searches
   */
  const addToRecent = useCallback((queryToAdd: string) => {
    const trimmed = queryToAdd.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      // Remove if already exists
      const filtered = prev.filter((s) => s.query !== trimmed);
      // Add new search at the beginning
      const updated = [
        { query: trimmed, timestamp: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_RECENT_SEARCHES);

      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  /**
   * Clear recent searches
   */
  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Construct search state object
  const searchState: AccountSearchState = {
    query,
    groupId,
    tagId,
    year,
    isLoading,
    error,
  };

  return {
    searchState,
    accounts,
    setQuery,
    setGroupId,
    setTagId,
    setYear,
    clearFilters,
    clearQuery,
    search,
    groups,
    tags,
    setGroups,
    setTags,
    recentSearches,
    addToRecent,
    clearRecent,
  };
}
