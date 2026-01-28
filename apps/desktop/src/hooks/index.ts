/**
 * Hooks index file
 *
 * Export all custom hooks for easy importing
 */

export { useAuth } from './useAuth';

export { useAccountSearch } from './useAccountSearch';
export type {
  AccountSearchState,
  RecentSearch,
  UseAccountSearchResult,
} from './useAccountSearch';

export { useAccountSelection, isAccountSelected, getSelectionCountText } from './useAccountSelection';
export type {
  AccountSelectionState,
  UseAccountSelectionResult,
} from './useAccountSelection';
