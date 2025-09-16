import {drizzle} from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const dbIconSymbol = '🗄️';
const getTimeStamp = (): string => chalk.gray(`[${new Date().toLocaleTimeString()}]`);
const formatMessage = (level: string, colorFn: chalk.Chalk, message: string): string => {
    return `${getTimeStamp()} ${colorFn(`[${level.toUpperCase()}]`)} ${chalk.hex('#1e3a8a')(`[${dbIconSymbol}]`)} ${message}`;
};
const logger = {
    info: (msg: string): void => {
        console.log(formatMessage('info', chalk.cyan, msg));
    },
    warn: (msg: string): void => {
        console.warn(formatMessage('warn', chalk.yellow, msg));
    },
    error: (msg: string, err?: unknown): void => {
        console.error(formatMessage('error', chalk.redBright, msg));
        if (err) console.error(err);
    },
    success: (msg: string): void => {
        console.log(formatMessage('success', chalk.greenBright, msg));
    },
    debug: (msg: string): void => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatMessage('debug', chalk.magenta, msg));
        }
    }
};

const dataDir = process.env.DATA_DIR || './db/data';
const dbDir = path.resolve(dataDir);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, {recursive: true});
}

const dbPath = path.join(dataDir, 'db.sqlite');
const sqlite = new Database(dbPath);

sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users
    (
        id
        TEXT
        PRIMARY
        KEY,
        username
        TEXT
        NOT
        NULL,
        password_hash
        TEXT
        NOT
        NULL,
        is_admin
        INTEGER
        NOT
        NULL
        DEFAULT
        0,

        is_oidc
        INTEGER
        NOT
        NULL
        DEFAULT
        0,
        client_id
        TEXT
        NOT
        NULL,
        client_secret
        TEXT
        NOT
        NULL,
        issuer_url
        TEXT
        NOT
        NULL,
        authorization_url
        TEXT
        NOT
        NULL,
        token_url
        TEXT
        NOT
        NULL,
        redirect_uri
        TEXT,
        identifier_path
        TEXT
        NOT
        NULL,
        name_path
        TEXT
        NOT
        NULL,
        scopes
        TEXT
        NOT
        NULL
    );

    CREATE TABLE IF NOT EXISTS settings
    (
        key
        TEXT
        PRIMARY
        KEY,
        value
        TEXT
        NOT
        NULL
    );

    CREATE TABLE IF NOT EXISTS ssh_data
    (
        id
        INTEGER
        PRIMARY
        KEY
        AUTOINCREMENT,
        user_id
        TEXT
        NOT
        NULL,
        name
        TEXT,
        ip
        TEXT
        NOT
        NULL,
        port
        INTEGER
        NOT
        NULL,
        username
        TEXT
        NOT
        NULL,
        folder
        TEXT,
        tags
        TEXT,
        pin
        INTEGER
        NOT
        NULL
        DEFAULT
        0,
        auth_type
        TEXT
        NOT
        NULL,
        password
        TEXT,
        key
        TEXT,
        key_password
        TEXT,
        key_type
        TEXT,
        enable_terminal
        INTEGER
        NOT
        NULL
        DEFAULT
        1,
        enable_tunnel
        INTEGER
        NOT
        NULL
        DEFAULT
        1,
        tunnel_connections
        TEXT,
        enable_file_manager
        INTEGER
        NOT
        NULL
        DEFAULT
        1,
        default_path
        TEXT,
        created_at
        TEXT
        NOT
        NULL
        DEFAULT
        CURRENT_TIMESTAMP,
        updated_at
        TEXT
        NOT
        NULL
        DEFAULT
        CURRENT_TIMESTAMP,
        FOREIGN
        KEY
    (
        user_id
    ) REFERENCES users
    (
        id
    )
        );

    CREATE TABLE IF NOT EXISTS file_manager_recent
    (
        id
        INTEGER
        PRIMARY
        KEY
        AUTOINCREMENT,
        user_id
        TEXT
        NOT
        NULL,
        host_id
        INTEGER
        NOT
        NULL,
        name
        TEXT
        NOT
        NULL,
        path
        TEXT
        NOT
        NULL,
        last_opened
        TEXT
        NOT
        NULL
        DEFAULT
        CURRENT_TIMESTAMP,
        FOREIGN
        KEY
    (
        user_id
    ) REFERENCES users
    (
        id
    ),
        FOREIGN KEY
    (
        host_id
    ) REFERENCES ssh_data
    (
        id
    )
        );

    CREATE TABLE IF NOT EXISTS file_manager_pinned
    (
        id
        INTEGER
        PRIMARY
        KEY
        AUTOINCREMENT,
        user_id
        TEXT
        NOT
        NULL,
        host_id
        INTEGER
        NOT
        NULL,
        name
        TEXT
        NOT
        NULL,
        path
        TEXT
        NOT
        NULL,
        pinned_at
        TEXT
        NOT
        NULL
        DEFAULT
        CURRENT_TIMESTAMP,
        FOREIGN
        KEY
    (
        user_id
    ) REFERENCES users
    (
        id
    ),
        FOREIGN KEY
    (
        host_id
    ) REFERENCES ssh_data
    (
        id
    )
        );

    CREATE TABLE IF NOT EXISTS file_manager_shortcuts
    (
        id
        INTEGER
        PRIMARY
        KEY
        AUTOINCREMENT,
        user_id
        TEXT
        NOT
        NULL,
        host_id
        INTEGER
        NOT
        NULL,
        name
        TEXT
        NOT
        NULL,
        path
        TEXT
        NOT
        NULL,
        created_at
        TEXT
        NOT
        NULL
        DEFAULT
        CURRENT_TIMESTAMP,
        FOREIGN
        KEY
    (
        user_id
    ) REFERENCES users
    (
        id
    ),
        FOREIGN KEY
    (
        host_id
    ) REFERENCES ssh_data
    (
        id
    )
        );

    CREATE TABLE IF NOT EXISTS dismissed_alerts
    (
        id
        INTEGER
        PRIMARY
        KEY
        AUTOINCREMENT,
        user_id
        TEXT
        NOT
        NULL,
        alert_id
        TEXT
        NOT
        NULL,
        dismissed_at
        TEXT
        NOT
        NULL
        DEFAULT
        CURRENT_TIMESTAMP,
        FOREIGN
        KEY
    (
        user_id
    ) REFERENCES users
    (
        id
    )
        );

    CREATE TABLE IF NOT EXISTS log_bookmarks
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        host_id INTEGER NOT NULL,
        file TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(host_id) REFERENCES ssh_data(id)
    );
`);

const addColumnIfNotExists = (table: string, column: string, definition: string) => {
    try {
        sqlite.prepare(`SELECT ${column}
                        FROM ${table} LIMIT 1`).get();
    } catch (e) {
        try {
            sqlite.exec(`ALTER TABLE ${table}
                ADD COLUMN ${column} ${definition};`);
        } catch (alterError) {
            logger.warn(`Failed to add column ${column} to ${table}: ${alterError}`);
        }
    }
};

const migrateSchema = () => {
    logger.info('Checking for schema updates...');

    addColumnIfNotExists('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');

    addColumnIfNotExists('users', 'is_oidc', 'INTEGER NOT NULL DEFAULT 0');
    addColumnIfNotExists('users', 'oidc_identifier', 'TEXT');
    addColumnIfNotExists('users', 'client_id', 'TEXT');
    addColumnIfNotExists('users', 'client_secret', 'TEXT');
    addColumnIfNotExists('users', 'issuer_url', 'TEXT');
    addColumnIfNotExists('users', 'authorization_url', 'TEXT');
    addColumnIfNotExists('users', 'token_url', 'TEXT');
    try {
        sqlite.prepare(`ALTER TABLE users DROP COLUMN redirect_uri`).run();
    } catch (e) {
    }

    addColumnIfNotExists('users', 'identifier_path', 'TEXT');
    addColumnIfNotExists('users', 'name_path', 'TEXT');
    addColumnIfNotExists('users', 'scopes', 'TEXT');

    addColumnIfNotExists('users', 'totp_secret', 'TEXT');
    addColumnIfNotExists('users', 'totp_enabled', 'INTEGER NOT NULL DEFAULT 0');
    addColumnIfNotExists('users', 'totp_backup_codes', 'TEXT');

    addColumnIfNotExists('ssh_data', 'name', 'TEXT');
    addColumnIfNotExists('ssh_data', 'folder', 'TEXT');
    addColumnIfNotExists('ssh_data', 'tags', 'TEXT');
    addColumnIfNotExists('ssh_data', 'pin', 'INTEGER NOT NULL DEFAULT 0');
    addColumnIfNotExists('ssh_data', 'auth_type', 'TEXT NOT NULL DEFAULT "password"');
    addColumnIfNotExists('ssh_data', 'password', 'TEXT');
    addColumnIfNotExists('ssh_data', 'key', 'TEXT');
    addColumnIfNotExists('ssh_data', 'key_password', 'TEXT');
    addColumnIfNotExists('ssh_data', 'key_type', 'TEXT');
    addColumnIfNotExists('ssh_data', 'enable_terminal', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfNotExists('ssh_data', 'enable_tunnel', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfNotExists('ssh_data', 'tunnel_connections', 'TEXT');
    addColumnIfNotExists('ssh_data', 'enable_file_manager', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfNotExists('ssh_data', 'default_path', 'TEXT');
    addColumnIfNotExists('ssh_data', 'created_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
    addColumnIfNotExists('ssh_data', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');

    addColumnIfNotExists('file_manager_recent', 'host_id', 'INTEGER NOT NULL');
    addColumnIfNotExists('file_manager_pinned', 'host_id', 'INTEGER NOT NULL');
    addColumnIfNotExists('file_manager_shortcuts', 'host_id', 'INTEGER NOT NULL');

    // log_bookmarks table migration - update schema
    try {
        sqlite.prepare('SELECT 1 FROM log_bookmarks LIMIT 1').get();
        // Update existing log_bookmarks table with new columns
        addColumnIfNotExists('log_bookmarks', 'log_file', 'TEXT');
        addColumnIfNotExists('log_bookmarks', 'line_number', 'INTEGER');
        addColumnIfNotExists('log_bookmarks', 'timestamp', 'TEXT');
        addColumnIfNotExists('log_bookmarks', 'tags', 'TEXT');
        addColumnIfNotExists('log_bookmarks', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');

        // Migrate old 'file' column to 'log_file' if needed
        try {
            const hasFileColumn = sqlite.prepare("PRAGMA table_info(log_bookmarks)").all()
                .some((col: any) => col.name === 'file');
            const hasLogFileColumn = sqlite.prepare("PRAGMA table_info(log_bookmarks)").all()
                .some((col: any) => col.name === 'log_file');

            if (hasFileColumn && hasLogFileColumn) {
                // Copy data from 'file' to 'log_file' if log_file is empty
                sqlite.exec(`UPDATE log_bookmarks SET log_file = file WHERE log_file IS NULL OR log_file = ''`);
            }
        } catch (migrationError) {
            logger.warn('Could not migrate file column to log_file');
        }
    } catch (e) {
        try {
            sqlite.exec(`CREATE TABLE log_bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                host_id INTEGER NOT NULL,
                log_file TEXT NOT NULL,
                line_number INTEGER,
                timestamp TEXT,
                note TEXT,
                tags TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(host_id) REFERENCES ssh_data(id)
            );`);
        } catch (e2) {
            logger.warn('Failed to create log_bookmarks table');
        }
    }

    // log_search_history table migration
    try {
        sqlite.prepare('SELECT 1 FROM log_search_history LIMIT 1').get();
    } catch (e) {
        try {
            sqlite.exec(`CREATE TABLE log_search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                host_id INTEGER NOT NULL,
                search_query TEXT NOT NULL,
                search_type TEXT NOT NULL DEFAULT 'content',
                log_file TEXT,
                result_count INTEGER DEFAULT 0,
                last_used TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(host_id) REFERENCES ssh_data(id)
            );`);
        } catch (e2) {
            logger.warn('Failed to create log_search_history table');
        }
    }

    // Create indexes for log tables if they don't exist
    try {
        // Log bookmarks indexes
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_bookmarks_user_host ON log_bookmarks(user_id, host_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_bookmarks_log_file ON log_bookmarks(log_file)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_bookmarks_tags ON log_bookmarks(tags)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_bookmarks_created_at ON log_bookmarks(created_at DESC)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_bookmarks_line_number ON log_bookmarks(log_file, line_number)`);

        // Log search history indexes
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_search_history_user_host ON log_search_history(user_id, host_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_search_history_query ON log_search_history(search_query)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_search_history_last_used ON log_search_history(last_used DESC)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_search_history_log_file ON log_search_history(log_file)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_log_search_history_search_type ON log_search_history(search_type)`);
    } catch (indexError) {
        logger.warn('Failed to create some log table indexes');
    }

    // Script repository system tables migration
    try {
        sqlite.prepare('SELECT 1 FROM script_categories LIMIT 1').get();
    } catch (e) {
        try {
            sqlite.exec(`CREATE TABLE script_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                parent_id INTEGER,
                color TEXT DEFAULT '#6B7280',
                icon TEXT DEFAULT 'folder',
                sort_order INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(parent_id) REFERENCES script_categories(id)
            );`);
        } catch (e2) {
            logger.warn('Failed to create script_categories table');
        }
    }

    try {
        sqlite.prepare('SELECT 1 FROM script_library LIMIT 1').get();
    } catch (e) {
        try {
            sqlite.exec(`CREATE TABLE script_library (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                content TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'bash',
                category_id INTEGER,
                tags TEXT,
                is_public INTEGER NOT NULL DEFAULT 0,
                is_template INTEGER NOT NULL DEFAULT 0,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                version TEXT DEFAULT '1.0.0',
                parameters TEXT,
                environment TEXT,
                timeout INTEGER DEFAULT 300,
                retry_count INTEGER DEFAULT 0,
                last_executed TEXT,
                execution_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(category_id) REFERENCES script_categories(id)
            );`);
        } catch (e2) {
            logger.warn('Failed to create script_library table');
        }
    }

    try {
        sqlite.prepare('SELECT 1 FROM script_versions LIMIT 1').get();
    } catch (e) {
        try {
            sqlite.exec(`CREATE TABLE script_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                script_id INTEGER NOT NULL,
                version TEXT NOT NULL,
                content TEXT NOT NULL,
                change_log TEXT,
                created_by TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(script_id) REFERENCES script_library(id),
                FOREIGN KEY(created_by) REFERENCES users(id)
            );`);
        } catch (e2) {
            logger.warn('Failed to create script_versions table');
        }
    }

    try {
        sqlite.prepare('SELECT 1 FROM script_permissions LIMIT 1').get();
    } catch (e) {
        try {
            sqlite.exec(`CREATE TABLE script_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                script_id INTEGER NOT NULL,
                user_id TEXT,
                user_group TEXT,
                permission_type TEXT NOT NULL,
                granted_by TEXT NOT NULL,
                granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT,
                FOREIGN KEY(script_id) REFERENCES script_library(id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(granted_by) REFERENCES users(id)
            );`);
        } catch (e2) {
            logger.warn('Failed to create script_permissions table');
        }
    }

    try {
        sqlite.prepare('SELECT 1 FROM script_execution_history LIMIT 1').get();
    } catch (e) {
        try {
            sqlite.exec(`CREATE TABLE script_execution_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                script_id INTEGER NOT NULL,
                version_id INTEGER,
                user_id TEXT NOT NULL,
                host_id INTEGER,
                parameters TEXT,
                status TEXT NOT NULL,
                exit_code INTEGER,
                output TEXT,
                error_output TEXT,
                start_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                end_time TEXT,
                duration INTEGER,
                FOREIGN KEY(script_id) REFERENCES script_library(id),
                FOREIGN KEY(version_id) REFERENCES script_versions(id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(host_id) REFERENCES ssh_data(id)
            );`);
        } catch (e2) {
            logger.warn('Failed to create script_execution_history table');
        }
    }

    // Create indexes for script repository tables
    try {
        // Script categories indexes
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_categories_parent_id ON script_categories(parent_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_categories_name ON script_categories(name)`);

        // Script library indexes
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_library_user_id ON script_library(user_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_library_category_id ON script_library(category_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_library_language ON script_library(language)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_library_is_public ON script_library(is_public)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_library_is_template ON script_library(is_template)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_library_name ON script_library(name)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_library_created_at ON script_library(created_at DESC)`);

        // Script versions indexes
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_versions_script_id ON script_versions(script_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_versions_is_active ON script_versions(script_id, is_active)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_versions_version ON script_versions(script_id, version)`);

        // Script permissions indexes
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_permissions_script_id ON script_permissions(script_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_permissions_user_id ON script_permissions(user_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_permissions_user_group ON script_permissions(user_group)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_permissions_type ON script_permissions(permission_type)`);

        // Script execution history indexes
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_execution_script_id ON script_execution_history(script_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_execution_user_id ON script_execution_history(user_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_execution_host_id ON script_execution_history(host_id)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_execution_status ON script_execution_history(status)`);
        sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_script_execution_start_time ON script_execution_history(start_time DESC)`);
    } catch (indexError) {
        logger.warn('Failed to create some script repository table indexes');
    }

    logger.success('Schema migration completed');
};

migrateSchema();

try {
    const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'allow_registration'").get();
    if (!row) {
        sqlite.prepare("INSERT INTO settings (key, value) VALUES ('allow_registration', 'true')").run();
    }
} catch (e) {
    logger.warn('Could not initialize default settings');
}

export const db = drizzle(sqlite, {schema});
