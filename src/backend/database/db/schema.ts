import {sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    password_hash: text('password_hash').notNull(),
    is_admin: integer('is_admin', {mode: 'boolean'}).notNull().default(false),

    is_oidc: integer('is_oidc', {mode: 'boolean'}).notNull().default(false),
    oidc_identifier: text('oidc_identifier'),
    client_id: text('client_id'),
    client_secret: text('client_secret'),
    issuer_url: text('issuer_url'),
    authorization_url: text('authorization_url'),
    token_url: text('token_url'),
    identifier_path: text('identifier_path'),
    name_path: text('name_path'),
    scopes: text().default("openid email profile"),
    
    totp_secret: text('totp_secret'),
    totp_enabled: integer('totp_enabled', {mode: 'boolean'}).notNull().default(false),
    totp_backup_codes: text('totp_backup_codes'),
});

export const settings = sqliteTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
});

export const sshData = sqliteTable('ssh_data', {
    id: integer('id').primaryKey({autoIncrement: true}),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name'),
    ip: text('ip').notNull(),
    port: integer('port').notNull(),
    username: text('username').notNull(),
    folder: text('folder'),
    tags: text('tags'),
    pin: integer('pin', {mode: 'boolean'}).notNull().default(false),
    authType: text('auth_type').notNull(),
    password: text('password'),
    key: text('key', {length: 8192}),
    keyPassword: text('key_password'),
    keyType: text('key_type'),
    enableTerminal: integer('enable_terminal', {mode: 'boolean'}).notNull().default(true),
    enableTunnel: integer('enable_tunnel', {mode: 'boolean'}).notNull().default(true),
    tunnelConnections: text('tunnel_connections'),
    enableFileManager: integer('enable_file_manager', {mode: 'boolean'}).notNull().default(true),
    defaultPath: text('default_path'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const fileManagerRecent = sqliteTable('file_manager_recent', {
    id: integer('id').primaryKey({autoIncrement: true}),
    userId: text('user_id').notNull().references(() => users.id),
    hostId: integer('host_id').notNull().references(() => sshData.id),
    name: text('name').notNull(),
    path: text('path').notNull(),
    lastOpened: text('last_opened').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const fileManagerPinned = sqliteTable('file_manager_pinned', {
    id: integer('id').primaryKey({autoIncrement: true}),
    userId: text('user_id').notNull().references(() => users.id),
    hostId: integer('host_id').notNull().references(() => sshData.id),
    name: text('name').notNull(),
    path: text('path').notNull(),
    pinnedAt: text('pinned_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const fileManagerShortcuts = sqliteTable('file_manager_shortcuts', {
    id: integer('id').primaryKey({autoIncrement: true}),
    userId: text('user_id').notNull().references(() => users.id),
    hostId: integer('host_id').notNull().references(() => sshData.id),
    name: text('name').notNull(),
    path: text('path').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const dismissedAlerts = sqliteTable('dismissed_alerts', {
    id: integer('id').primaryKey({autoIncrement: true}),
    userId: text('user_id').notNull().references(() => users.id),
    alertId: text('alert_id').notNull(),
    dismissedAt: text('dismissed_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const logBookmarks = sqliteTable('log_bookmarks', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    hostId: integer('host_id').notNull().references(() => sshData.id),
    logFile: text('log_file').notNull(),
    lineNumber: integer('line_number'),
    timestamp: text('timestamp'),
    note: text('note'),
    tags: text('tags'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const logSearchHistory = sqliteTable('log_search_history', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    hostId: integer('host_id').notNull().references(() => sshData.id),
    searchQuery: text('search_query').notNull(),
    searchType: text('search_type').notNull().default('content'), // 'content', 'filename', 'regex'
    logFile: text('log_file'),
    resultCount: integer('result_count').default(0),
    lastUsed: text('last_used').notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Script Repository System Tables

export const scriptCategories = sqliteTable('script_categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    parentId: integer('parent_id').references(() => scriptCategories.id),
    color: text('color').default('#6B7280'),
    icon: text('icon').default('folder'),
    sortOrder: integer('sort_order').default(0),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scriptLibrary = sqliteTable('script_library', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    content: text('content').notNull(),
    language: text('language').notNull().default('bash'), // 'bash', 'python', 'powershell', 'sql', etc.
    categoryId: integer('category_id').references(() => scriptCategories.id),
    tags: text('tags'), // JSON array of tags
    isPublic: integer('is_public', {mode: 'boolean'}).notNull().default(false),
    isTemplate: integer('is_template', {mode: 'boolean'}).notNull().default(false),
    isFavorite: integer('is_favorite', {mode: 'boolean'}).notNull().default(false),
    version: text('version').default('1.0.0'),
    parameters: text('parameters'), // JSON schema for script parameters
    environment: text('environment'), // Required environment variables
    timeout: integer('timeout').default(300), // Execution timeout in seconds
    retryCount: integer('retry_count').default(0),
    lastExecuted: text('last_executed'),
    executionCount: integer('execution_count').default(0),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scriptVersions = sqliteTable('script_versions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    scriptId: integer('script_id').notNull().references(() => scriptLibrary.id),
    version: text('version').notNull(),
    content: text('content').notNull(),
    changeLog: text('change_log'),
    createdBy: text('created_by').notNull().references(() => users.id),
    isActive: integer('is_active', {mode: 'boolean'}).notNull().default(false),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scriptPermissions = sqliteTable('script_permissions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    scriptId: integer('script_id').notNull().references(() => scriptLibrary.id),
    userId: text('user_id').references(() => users.id),
    userGroup: text('user_group'), // For group-based permissions
    permissionType: text('permission_type').notNull(), // 'read', 'execute', 'edit', 'admin'
    grantedBy: text('granted_by').notNull().references(() => users.id),
    grantedAt: text('granted_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    expiresAt: text('expires_at'), // Optional expiration
});

export const scriptExecutionHistory = sqliteTable('script_execution_history', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    scriptId: integer('script_id').notNull().references(() => scriptLibrary.id),
    versionId: integer('version_id').references(() => scriptVersions.id),
    userId: text('user_id').notNull().references(() => users.id),
    hostId: integer('host_id').references(() => sshData.id),
    parameters: text('parameters'), // JSON of execution parameters
    status: text('status').notNull(), // 'running', 'completed', 'failed', 'cancelled'
    exitCode: integer('exit_code'),
    output: text('output'),
    errorOutput: text('error_output'),
    startTime: text('start_time').notNull().default(sql`CURRENT_TIMESTAMP`),
    endTime: text('end_time'),
    duration: integer('duration'), // Execution time in milliseconds
});

// Batch Execution System Tables

export const serverGroups = sqliteTable('server_groups', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').default('#6B7280'),
    icon: text('icon').default('server'),
    tags: text('tags'), // JSON array of tags
    isDefault: integer('is_default', {mode: 'boolean'}).notNull().default(false),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const serverGroupMembers = sqliteTable('server_group_members', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    groupId: integer('group_id').notNull().references(() => serverGroups.id),
    hostId: integer('host_id').notNull().references(() => sshData.id),
    addedAt: text('added_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const batchExecutions = sqliteTable('batch_executions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name'),
    description: text('description'),
    command: text('command').notNull(),
    serverGroupId: integer('server_group_id').references(() => serverGroups.id),
    targetHosts: text('target_hosts'), // JSON array of host IDs if not using group
    executionType: text('execution_type').notNull().default('parallel'), // 'parallel', 'sequential'
    timeout: integer('timeout').default(300), // Execution timeout in seconds
    retryCount: integer('retry_count').default(0),
    retryDelay: integer('retry_delay').default(5), // Retry delay in seconds
    stopOnFirstError: integer('stop_on_first_error', {mode: 'boolean'}).notNull().default(false),
    status: text('status').notNull().default('pending'), // 'pending', 'running', 'completed', 'failed', 'cancelled'
    totalHosts: integer('total_hosts').default(0),
    completedHosts: integer('completed_hosts').default(0),
    failedHosts: integer('failed_hosts').default(0),
    startTime: text('start_time'),
    endTime: text('end_time'),
    duration: integer('duration'), // Total execution time in milliseconds
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const batchExecutionResults = sqliteTable('batch_execution_results', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    batchId: integer('batch_id').notNull().references(() => batchExecutions.id),
    hostId: integer('host_id').notNull().references(() => sshData.id),
    status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed', 'timeout', 'cancelled'
    exitCode: integer('exit_code'),
    output: text('output'),
    errorOutput: text('error_output'),
    retryAttempt: integer('retry_attempt').default(0),
    startTime: text('start_time'),
    endTime: text('end_time'),
    duration: integer('duration'), // Execution time in milliseconds
    error: text('error'), // Connection or execution error details
});

export const batchTemplates = sqliteTable('batch_templates', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    command: text('command').notNull(),
    defaultTimeout: integer('default_timeout').default(300),
    defaultRetryCount: integer('default_retry_count').default(0),
    defaultExecutionType: text('default_execution_type').default('parallel'),
    tags: text('tags'), // JSON array of tags
    isPublic: integer('is_public', {mode: 'boolean'}).notNull().default(false),
    usageCount: integer('usage_count').default(0),
    lastUsed: text('last_used'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
