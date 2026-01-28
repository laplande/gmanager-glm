# GManager API Documentation / API 文档

<div align="center">

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Documentation

### Table of Contents

1. [Overview](#overview-1)
2. [Authentication API](#authentication-api)
3. [Account Management API](#account-management-api)
4. [Group Management API](#group-management-api)
5. [Tag Management API](#tag-management-api)
6. [TypeScript Interfaces](#typescript-interfaces)
7. [Error Handling](#error-handling)
8. [Web REST API](#web-rest-api)

---

### Overview

GManager provides two API interfaces:

1. **Desktop (Tauri Commands)**: Direct function calls from React to Rust backend
2. **Web (REST API)**: HTTP endpoints served by Express.js

Both APIs provide the same functionality with platform-specific implementations.

---

### Authentication API

#### Desktop (Tauri Commands)

##### `check_has_vault_command`

Check if a master password vault exists.

```typescript
const hasVault = await invoke<boolean>('check_has_vault_command');
```

**Returns**: `boolean` - `true` if vault exists, `false` for first-time users

---

##### `create_vault_command`

Create a new vault with master password.

```typescript
const sessionKey = await invoke<string>('create_vault_command', {
  password: string  // Master password (plaintext)
});
```

**Parameters**:
- `password`: string - Master password (will be hashed with Argon2id)

**Returns**: `string` - Session key for current session

**Error**: Throws if vault already exists

---

##### `unlock_vault_command`

Unlock existing vault with master password.

```typescript
const sessionKey = await invoke<string>('unlock_vault_command', {
  password: string  // Master password
});
```

**Parameters**:
- `password`: string - Master password

**Returns**: `string` - Session key for current session

**Error**: Throws if:
- Vault doesn't exist
- Password is incorrect
- Database error

---

##### `logout_command`

Log out and clear session.

```typescript
await invoke('logout_command');
```

**Effect**: Clears session from Rust backend

---

##### `change_password_command`

Change master password.

```typescript
await invoke('change_password_command', {
  oldPassword: string,
  newPassword: string
});
```

**Parameters**:
- `oldPassword`: string - Current master password
- `newPassword`: string - New master password

**Effect**: Re-encrypts all data with new key

**Error**: Throws if old password is incorrect

---

#### Web (REST API)

##### `POST /api/auth/check`

Check if vault exists.

```http
POST /api/auth/check
Content-Type: application/json
```

**Response**:
```json
{
  "hasVault": true
}
```

---

##### `POST /api/auth/create`

Create new vault.

```http
POST /api/auth/create
Content-Type: application/json

{
  "password": "master-password-123"
}
```

**Response**:
```json
{
  "sessionId": "uuid-session-id",
  "expiresAt": "2025-01-27T20:00:00Z"
}
```

---

##### `POST /api/auth/unlock`

Unlock vault.

```http
POST /api/auth/unlock
Content-Type: application/json

{
  "password": "master-password-123"
}
```

**Response**:
```json
{
  "sessionId": "uuid-session-id",
  "expiresAt": "2025-01-27T20:00:00Z"
}
```

**Headers**:
- `Authorization: Bearer <session-token>` (for subsequent requests)

---

### Account Management API

#### Desktop (Tauri Commands)

##### `get_accounts_command`

Get all accounts with pagination.

```typescript
const accounts = await invoke<ApiAccount[]>('get_accounts_command', {
  offset: number,  // Default: 0
  limit: number    // Default: 100
});
```

**Returns**: `ApiAccount[]` - Array of decrypted accounts

---

##### `get_account_command`

Get single account by ID.

```typescript
const account = await invoke<ApiAccount>('get_account_command', {
  id: string  // Account ID
});
```

**Returns**: `ApiAccount` - Decrypted account with tags and group

**Error**: Throws if account not found

---

##### `get_accounts_count_command`

Get total account count.

```typescript
const count = await invoke<number>('get_accounts_count_command');
```

**Returns**: `number` - Total number of accounts

---

##### `create_account_command`

Create new account.

```typescript
const accountId = await invoke<string>('create_account_command', {
  account: {
    raw_import_id?: string,
    email: string,
    password?: string,
    recovery_email?: string,
    totp_secret?: string,
    year?: string,
    notes?: string,
    group_id?: string,
    field_order?: string[]
  }
});
```

**Returns**: `string` - New account ID

**Note**: All sensitive fields encrypted before storage

---

##### `update_account_command`

Update existing account.

```typescript
await invoke('update_account_command', {
  account: {
    id: string,
    email?: string,
    password?: string,
    recovery_email?: string,
    totp_secret?: string,
    year?: string,
    notes?: string,
    group_id?: string,
    field_order?: string[]
  }
});
```

**Note**: Only include fields to update

---

##### `delete_account_command`

Delete account by ID.

```typescript
await invoke('delete_account_command', {
  id: string
});
```

**Effect**: Permanently deletes account and associated tags

---

##### `search_accounts_command`

Search accounts with filters.

```typescript
const accounts = await invoke<ApiAccount[]>('search_accounts_command', {
  params: {
    query?: string,      // Text search
    group_id?: string,   // Filter by group
    tag_id?: string,     // Filter by tag
    year?: string,       // Filter by year
    offset?: number,     // Pagination
    limit?: number
  }
});
```

**Returns**: `ApiAccount[]` - Matching decrypted accounts

---

##### `batch_delete_accounts_command`

Delete multiple accounts.

```typescript
const deleted = await invoke<number>('batch_delete_accounts_command', {
  request: {
    ids: string[]  // Account IDs to delete
  }
});
```

**Returns**: `number` - Count of deleted accounts

---

##### `batch_update_accounts_command`

Update multiple accounts.

```typescript
const updated = await invoke<number>('batch_update_accounts_command', {
  request: {
    ids: string[],  // Account IDs
    updates: {
      id: string,   // Ignored for batch
      group_id?: string,
      notes?: string,
      // ... other fields
    }
  }
});
```

**Returns**: `number` - Count of updated accounts

---

##### `get_account_stats_command`

Get account statistics.

```typescript
const stats = await invoke<AccountStats>('get_account_stats_command');
```

**Returns**: `AccountStats`
```typescript
interface AccountStats {
  total_accounts: number;
  total_groups: number;
  total_tags: number;
  accounts_by_year: [string, number][];  // [year, count][]
  accounts_per_group: [string, string, number][];  // [id, name, count][]
}
```

---

#### Web (REST API)

##### `GET /api/accounts`

List accounts with pagination.

```http
GET /api/accounts?offset=0&limit=20
Authorization: Bearer <session-token>
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "password": "secret123",
      "recovery_email": "backup@example.com",
      "totp_secret": "JBSWY3DPEHPK3PXP",
      "year": "2024",
      "notes": "Work account",
      "group_id": "group-uuid",
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z",
      "tags": [...],
      "group": {...}
    }
  ],
  "total": 100,
  "offset": 0,
  "limit": 20
}
```

---

##### `GET /api/accounts/:id`

Get single account.

```http
GET /api/accounts/uuid
Authorization: Bearer <session-token>
```

---

##### `POST /api/accounts`

Create account.

```http
POST /api/accounts
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123",
  "totp_secret": "JBSWY3DPEHPK3PXP",
  "year": "2024"
}
```

**Response**: `201 Created`
```json
{
  "id": "new-uuid"
}
```

---

##### `PUT /api/accounts/:id`

Update account.

```http
PUT /api/accounts/uuid
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "notes": "Updated notes"
}
```

**Response**: `200 OK`

---

##### `DELETE /api/accounts/:id`

Delete account.

```http
DELETE /api/accounts/uuid
Authorization: Bearer <session-token>
```

**Response**: `204 No Content`

---

##### `POST /api/accounts/search`

Search accounts.

```http
POST /api/accounts/search
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "query": "work",
  "group_id": "group-uuid",
  "year": "2024",
  "offset": 0,
  "limit": 20
}
```

---

##### `DELETE /api/accounts/batch`

Batch delete.

```http
DELETE /api/accounts/batch
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**:
```json
{
  "deleted": 3
}
```

---

##### `GET /api/accounts/stats`

Get statistics.

```http
GET /api/accounts/stats
Authorization: Bearer <session-token>
```

**Response**:
```json
{
  "total_accounts": 150,
  "total_groups": 5,
  "total_tags": 12,
  "accounts_by_year": [
    ["2023", 50],
    ["2024", 100]
  ],
  "accounts_per_group": [
    ["uuid", "Work", 75],
    ["uuid", "Personal", 75]
  ]
}
```

---

### Group Management API

#### Desktop (Tauri Commands)

##### `get_groups_command`

Get all groups.

```typescript
const groups = await invoke<ApiGroup[]>('get_groups_command');
```

**Returns**: `ApiGroup[]`

---

##### `get_group_command`

Get single group.

```typescript
const group = await invoke<ApiGroup>('get_group_command', {
  id: string
});
```

---

##### `create_group_command`

Create group.

```typescript
const groupId = await invoke<string>('create_group_command', {
  group: {
    name: string,
    color?: string,
    sort_order?: number
  }
});
```

**Returns**: `string` - New group ID

---

##### `update_group_command`

Update group.

```typescript
await invoke('update_group_command', {
  group: {
    id: string,
    name?: string,
    color?: string,
    sort_order?: number
  }
});
```

---

##### `delete_group_command`

Delete group.

```typescript
await invoke('delete_group_command', {
  id: string
});
```

**Note**: Accounts in group become ungrouped (not deleted)

---

##### `get_group_accounts_count_command`

Get count of accounts in group.

```typescript
const count = await invoke<number>('get_group_accounts_count_command', {
  id: string
});
```

---

#### Web (REST API)

##### `GET /api/groups`

List all groups.

```http
GET /api/groups
Authorization: Bearer <session-token>
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Work",
    "color": "#FF5733",
    "sort_order": 0,
    "created_at": "2025-01-27T10:00:00Z"
  }
]
```

---

##### `POST /api/groups`

Create group.

```http
POST /api/groups
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "name": "Personal",
  "color": "#33FF57"
}
```

---

##### `PUT /api/groups/:id`

Update group.

```http
PUT /api/groups/uuid
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "color": "#3357FF"
}
```

---

##### `DELETE /api/groups/:id`

Delete group.

```http
DELETE /api/groups/uuid
Authorization: Bearer <session-token>
```

---

### Tag Management API

#### Desktop (Tauri Commands)

##### `get_tags_command`

Get all tags.

```typescript
const tags = await invoke<ApiTag[]>('get_tags_command');
```

---

##### `get_tag_command`

Get single tag.

```typescript
const tag = await invoke<ApiTag>('get_tag_command', {
  id: string
});
```

---

##### `create_tag_command`

Create tag.

```typescript
const tagId = await invoke<string>('create_tag_command', {
  tag: {
    name: string,
    color?: string
  }
});
```

---

##### `update_tag_command`

Update tag.

```typescript
await invoke('update_tag_command', {
  tag: {
    id: string,
    name?: string,
    color?: string
  }
});
```

---

##### `delete_tag_command`

Delete tag.

```typescript
await invoke('delete_tag_command', {
  id: string
});
```

**Note**: Tag removed from all accounts

---

##### `add_tag_to_account_command`

Add tag to account.

```typescript
await invoke('add_tag_to_account_command', {
  accountId: string,
  tagId: string
});
```

---

##### `remove_tag_from_account_command`

Remove tag from account.

```typescript
await invoke('remove_tag_from_account_command', {
  accountId: string,
  tagId: string
});
```

---

##### `get_account_tags_command`

Get tags for account.

```typescript
const tags = await invoke<ApiTag[]>('get_account_tags_command', {
  accountId: string
});
```

---

##### `set_account_tags_command`

Set all tags for account (replace).

```typescript
await invoke('set_account_tags_command', {
  accountId: string,
  tagIds: string[]
});
```

---

##### `get_tag_accounts_count_command`

Get count of accounts with tag.

```typescript
const count = await invoke<number>('get_tag_accounts_count_command', {
  id: string
});
```

---

#### Web (REST API)

##### `GET /api/tags`

List all tags.

```http
GET /api/tags
Authorization: Bearer <session-token>
```

---

##### `POST /api/tags`

Create tag.

```http
POST /api/tags
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "name": "Important",
  "color": "#FF5733"
}
```

---

##### `PUT /api/tags/:id`

Update tag.

```http
PUT /api/tags/uuid
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "name": "Updated Tag"
}
```

---

##### `DELETE /api/tags/:id`

Delete tag.

```http
DELETE /api/tags/uuid
Authorization: Bearer <session-token>
```

---

##### `POST /api/accounts/:accountId/tags/:tagId`

Add tag to account.

```http
POST /api/accounts/uuid/tags/tag-uuid
Authorization: Bearer <session-token>
```

---

##### `DELETE /api/accounts/:accountId/tags/:tagId`

Remove tag from account.

```http
DELETE /api/accounts/uuid/tags/tag-uuid
Authorization: Bearer <session-token>
```

---

##### `GET /api/accounts/:accountId/tags`

Get account tags.

```http
GET /api/accounts/uuid/tags
Authorization: Bearer <session-token>
```

---

##### `PUT /api/accounts/:accountId/tags`

Set account tags.

```http
PUT /api/accounts/uuid/tags
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "tagIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

### TypeScript Interfaces

#### Account Types

```typescript
interface ApiAccount {
  id: string;
  raw_import_id?: string;
  email: string;
  password: string;
  recovery_email?: string;
  totp_secret?: string;
  year?: string;
  notes?: string;
  group_id?: string;
  created_at: string;
  updated_at: string;
  tags: ApiTag[];
}

interface CreateAccountPayload {
  raw_import_id?: string;
  email: string;
  password?: string;
  recovery_email?: string;
  totp_secret?: string;
  year?: string;
  notes?: string;
  group_id?: string;
  field_order?: string[];
}

interface UpdateAccountPayload {
  id: string;
  email?: string;
  password?: string;
  recovery_email?: string;
  totp_secret?: string;
  year?: string;
  notes?: string;
  group_id?: string;
  field_order?: string[];
}
```

#### Group Types

```typescript
interface ApiGroup {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

interface CreateGroupPayload {
  name: string;
  color?: string;
  sort_order?: number;
}

interface UpdateGroupPayload {
  id: string;
  name?: string;
  color?: string;
  sort_order?: number;
}
```

#### Tag Types

```typescript
interface ApiTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface CreateTagPayload {
  name: string;
  color?: string;
}

interface UpdateTagPayload {
  id: string;
  name?: string;
  color?: string;
}
```

---

### Error Handling

#### Desktop (Tauri)

All Tauri commands throw errors on failure:

```typescript
try {
  const account = await invoke<ApiAccount>('get_account_command', { id });
} catch (error) {
  // Error object from Rust backend
  console.error(error);

  // Check for specific errors
  if (error instanceof Error) {
    if (error.message.includes('session')) {
      // Not logged in
    } else if (error.message.includes('not found')) {
      // Account doesn't exist
    }
  }
}
```

#### Web (REST)

HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success (no body)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Invalid/expired session
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

<a name="中文"></a>

## 中文文档

### API 概览 (中文)

GManager 提供两种 API 接口：

1. **桌面版（Tauri 命令）**：从 React 直接调用 Rust 后端
2. **Web 版（REST API）**：由 Express.js 提供的 HTTP 端点

两种 API 提供相同功能，但实现方式不同。

---

### 认证 API (中文)

[详见上方英文文档]

主要端点：
- `check_has_vault_command` - 检查保险库是否存在
- `create_vault_command` - 创建新保险库
- `unlock_vault_command` - 解锁保险库
- `logout_command` - 登出
- `change_password_command` - 修改主密码

---

### 账户管理 API (中文)

[详见上方英文文档]

主要端点：
- `get_accounts_command` - 获取账户列表
- `get_account_command` - 获取单个账户
- `create_account_command` - 创建账户
- `update_account_command` - 更新账户
- `delete_account_command` - 删除账户
- `search_accounts_command` - 搜索账户
- `batch_delete_accounts_command` - 批量删除
- `batch_update_accounts_command` - 批量更新
- `get_account_stats_command` - 获取统计信息

---

### 分组管理 API (中文)

[详见上方英文文档]

主要端点：
- `get_groups_command` - 获取分组列表
- `create_group_command` - 创建分组
- `update_group_command` - 更新分组
- `delete_group_command` - 删除分组
- `get_group_accounts_count_command` - 获取分组账户数

---

### 标签管理 API (中文)

[详见上方英文文档]

主要端点：
- `get_tags_command` - 获取标签列表
- `create_tag_command` - 创建标签
- `update_tag_command` - 更新标签
- `delete_tag_command` - 删除标签
- `add_tag_to_account_command` - 添加标签到账户
- `remove_tag_from_account_command` - 从账户移除标签
- `get_account_tags_command` - 获取账户标签
- `set_account_tags_command` - 设置账户标签

---

<div align="center">

**For implementation details, see the source code:**

- Desktop API: `apps/desktop/src/api/`
- Web API: `apps/web/server/routes/`
- Shared Types: `packages/shared/src/types/`

</div>
