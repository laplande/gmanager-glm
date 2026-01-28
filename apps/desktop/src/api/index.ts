/**
 * API client module for GManager Desktop
 *
 * Exports all API client functions for interacting with the Rust backend.
 *
 * @module api
 */

export {
  getAccounts,
  getAccount,
  getAccountsCount,
  createAccount,
  updateAccount,
  deleteAccount,
  searchAccounts,
  batchDeleteAccounts,
  batchUpdateAccounts,
  getAccountStats,
  apiAccountToAccount,
  accountToUpdatePayload,
  createPaginatedResult,
  isNotLoggedInError,
  type AccountApiError,
  type ApiAccount,
  type CreateAccountPayload,
  type UpdateAccountPayload,
  type AccountSearchParams,
  type AccountStats,
  type BatchDeleteRequest,
  type BatchUpdateRequest,
  type PaginatedResult,
  type MutationResult,
  type QueryResult,
} from './accounts';

export {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupAccountsCount,
  apiGroupToGroup,
  getDefaultGroupColor,
  DEFAULT_GROUP_COLORS,
  type GroupApiError,
  type ApiGroup,
  type CreateGroupPayload,
  type UpdateGroupPayload,
} from './groups';

export {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  addTagToAccount,
  removeTagFromAccount,
  getAccountTags,
  setAccountTags,
  getTagAccountsCount,
  apiTagToTag,
  getDefaultTagColor,
  getSuggestedTagName,
  DEFAULT_TAG_COLORS,
  SUGGESTED_TAG_NAMES,
  type TagApiError,
  type ApiTag,
  type CreateTagPayload,
  type UpdateTagPayload,
} from './tags';

// Re-export ApiTag from accounts as ApiTagInAccount to avoid naming conflict
export type { ApiTag as ApiTagInAccount } from './accounts';
