/**
 * Scripts Routes
 * 스크립트 저장소 관리, 실행, 버전 관리 및 권한 제어 API
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { Client } from 'ssh2';
import {
  executeSSHCommand,
  sshConnectionPool,
  type SSHConnectionConfig,
  SSHCommandError,
  SSHConnectionError,
} from '../../ssh/ssh-utils.js';
import { db } from '../db/index.js';
import {
  sshData,
  scriptLibrary,
  scriptCategories,
  scriptVersions,
  scriptPermissions,
  scriptExecutionHistory,
  users
} from '../db/schema.js';
import { eq, and, or, like, desc, asc, isNull, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';

const router = express.Router();

// ---------- Logger ----------
const dbIconSymbol = '📜';
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
    }
};

// ---------- Helper Functions ----------
interface JWTPayload {
    userId: string;
    iat?: number;
    exp?: number;
}

function authenticateJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const secret = process.env.JWT_SECRET || 'secret';
    try {
        const payload = jwt.verify(token, secret) as JWTPayload;
        (req as any).userId = payload.userId;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function extractUserId(req: Request): string | undefined {
    return (req as any).userId;
}

async function getSSHHostInfo(hostId: string): Promise<SSHConnectionConfig | null> {
    try {
        const result = await db
            .select({
                host: sshData.ip,
                port: sshData.port,
                username: sshData.username,
                password: sshData.password,
                privateKey: sshData.key,
                passphrase: sshData.keyPassword,
            })
            .from(sshData)
            .where(eq(sshData.id, parseInt(hostId, 10)));

        if (!result || result.length === 0) return null;

        const host = result[0];
        return {
            host: host.host,
            port: host.port || 22,
            username: host.username,
            password: host.password || undefined,
            privateKey: host.privateKey || undefined,
            passphrase: host.passphrase || undefined,
            timeout: 30000,
        };
    } catch {
        return null;
    }
}

async function checkScriptPermission(
    scriptId: number,
    userId: string,
    requiredPermission: 'read' | 'execute' | 'edit' | 'admin'
): Promise<boolean> {
    try {
        // Check if user owns the script
        const script = await db
            .select({ userId: scriptLibrary.userId, isPublic: scriptLibrary.isPublic })
            .from(scriptLibrary)
            .where(eq(scriptLibrary.id, scriptId))
            .limit(1);

        if (script.length === 0) return false;

        // Owner has all permissions
        if (script[0].userId === userId) return true;

        // Public scripts allow read and execute
        if (script[0].isPublic && (requiredPermission === 'read' || requiredPermission === 'execute')) {
            return true;
        }

        // Check explicit permissions
        const permissions = await db
            .select({ permissionType: scriptPermissions.permissionType })
            .from(scriptPermissions)
            .where(
                and(
                    eq(scriptPermissions.scriptId, scriptId),
                    or(
                        eq(scriptPermissions.userId, userId),
                        // TODO: Add group permission checking when groups are implemented
                    ),
                    or(
                        isNull(scriptPermissions.expiresAt),
                        sql`datetime(${scriptPermissions.expiresAt}) > datetime('now')`
                    )
                )
            );

        const permissionHierarchy = { 'read': 1, 'execute': 2, 'edit': 3, 'admin': 4 };
        const requiredLevel = permissionHierarchy[requiredPermission];

        return permissions.some(p =>
            permissionHierarchy[p.permissionType as keyof typeof permissionHierarchy] >= requiredLevel
        );
    } catch (error) {
        logger.error('Error checking script permission', error);
        return false;
    }
}

// ---------- Script Categories API ----------

// GET /scripts/categories - Get all categories
router.get('/categories', authenticateJWT, async (req: Request, res: Response) => {
    try {
        const categories = await db
            .select()
            .from(scriptCategories)
            .orderBy(asc(scriptCategories.sortOrder), asc(scriptCategories.name));

        res.json(categories);
    } catch (error) {
        logger.error('Error fetching script categories', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// POST /scripts/categories - Create new category
router.post('/categories', authenticateJWT, async (req: Request, res: Response) => {
    const { name, description, parentId, color, icon, sortOrder } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
    }

    try {
        const result = await db
            .insert(scriptCategories)
            .values({
                name,
                description,
                parentId: parentId || null,
                color: color || '#6B7280',
                icon: icon || 'folder',
                sortOrder: sortOrder || 0
            })
            .returning();

        res.status(201).json(result[0]);
    } catch (error) {
        logger.error('Error creating script category', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// ---------- Script Library CRUD API ----------

// GET /scripts - Get scripts with filtering and search
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
    const userId = extractUserId(req)!;
    const {
        page = '1',
        limit = '20',
        search,
        categoryId,
        language,
        isPublic,
        isTemplate,
        isFavorite,
        tags,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    try {
        // Build base conditions
        const baseConditions = [
            or(
                eq(scriptLibrary.userId, userId), // User's own scripts
                eq(scriptLibrary.isPublic, true)   // Public scripts
            )
        ];

        // Apply additional filters
        if (search) {
            baseConditions.push(
                or(
                    like(scriptLibrary.name, `%${search}%`),
                    like(scriptLibrary.description, `%${search}%`),
                    like(scriptLibrary.tags, `%${search}%`)
                )
            );
        }

        if (categoryId) {
            baseConditions.push(eq(scriptLibrary.categoryId, parseInt(categoryId as string, 10)));
        }

        if (language) {
            baseConditions.push(eq(scriptLibrary.language, language as string));
        }

        if (isPublic !== undefined) {
            baseConditions.push(eq(scriptLibrary.isPublic, isPublic === 'true'));
        }

        if (isTemplate !== undefined) {
            baseConditions.push(eq(scriptLibrary.isTemplate, isTemplate === 'true'));
        }

        if (isFavorite !== undefined) {
            baseConditions.push(
                and(
                    eq(scriptLibrary.isFavorite, isFavorite === 'true'),
                    eq(scriptLibrary.userId, userId) // Only user's own favorites
                )
            );
        }

        if (tags) {
            const tagList = (tags as string).split(',').map(tag => `%${tag.trim()}%`);
            const tagConditions = tagList.map(tag => like(scriptLibrary.tags, tag));
            baseConditions.push(or(...tagConditions));
        }

        // Apply sorting
        const sortColumn = sortBy === 'name' ? scriptLibrary.name :
                          sortBy === 'createdAt' ? scriptLibrary.createdAt :
                          sortBy === 'lastExecuted' ? scriptLibrary.lastExecuted :
                          sortBy === 'executionCount' ? scriptLibrary.executionCount :
                          scriptLibrary.updatedAt;

        // Get scripts with pagination
        const scripts = await db
            .select({
                id: scriptLibrary.id,
                name: scriptLibrary.name,
                description: scriptLibrary.description,
                language: scriptLibrary.language,
                categoryId: scriptLibrary.categoryId,
                categoryName: scriptCategories.name,
                tags: scriptLibrary.tags,
                isPublic: scriptLibrary.isPublic,
                isTemplate: scriptLibrary.isTemplate,
                isFavorite: scriptLibrary.isFavorite,
                version: scriptLibrary.version,
                lastExecuted: scriptLibrary.lastExecuted,
                executionCount: scriptLibrary.executionCount,
                createdAt: scriptLibrary.createdAt,
                updatedAt: scriptLibrary.updatedAt,
                userId: scriptLibrary.userId,
                userName: users.username
            })
            .from(scriptLibrary)
            .leftJoin(scriptCategories, eq(scriptLibrary.categoryId, scriptCategories.id))
            .leftJoin(users, eq(scriptLibrary.userId, users.id))
            .where(and(...baseConditions))
            .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
            .limit(limitNum)
            .offset(offset);

        // Get total count for pagination
        const totalResult = await db
            .select({ count: sql`count(*)` })
            .from(scriptLibrary)
            .where(and(...baseConditions));

        const total = parseInt(totalResult[0].count as string);

        res.json({
            scripts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error fetching scripts', error);
        res.status(500).json({ error: 'Failed to fetch scripts' });
    }
});

// GET /scripts/:id - Get specific script
router.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
    const scriptId = parseInt(req.params.id, 10);
    const userId = extractUserId(req)!;

    if (!scriptId) {
        return res.status(400).json({ error: 'Invalid script ID' });
    }

    // Check read permission
    if (!(await checkScriptPermission(scriptId, userId, 'read'))) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const script = await db
            .select({
                id: scriptLibrary.id,
                name: scriptLibrary.name,
                description: scriptLibrary.description,
                content: scriptLibrary.content,
                language: scriptLibrary.language,
                categoryId: scriptLibrary.categoryId,
                categoryName: scriptCategories.name,
                tags: scriptLibrary.tags,
                isPublic: scriptLibrary.isPublic,
                isTemplate: scriptLibrary.isTemplate,
                isFavorite: scriptLibrary.isFavorite,
                version: scriptLibrary.version,
                parameters: scriptLibrary.parameters,
                environment: scriptLibrary.environment,
                timeout: scriptLibrary.timeout,
                retryCount: scriptLibrary.retryCount,
                lastExecuted: scriptLibrary.lastExecuted,
                executionCount: scriptLibrary.executionCount,
                createdAt: scriptLibrary.createdAt,
                updatedAt: scriptLibrary.updatedAt,
                userId: scriptLibrary.userId,
                userName: users.username
            })
            .from(scriptLibrary)
            .leftJoin(scriptCategories, eq(scriptLibrary.categoryId, scriptCategories.id))
            .leftJoin(users, eq(scriptLibrary.userId, users.id))
            .where(eq(scriptLibrary.id, scriptId))
            .limit(1);

        if (script.length === 0) {
            return res.status(404).json({ error: 'Script not found' });
        }

        res.json(script[0]);
    } catch (error) {
        logger.error('Error fetching script', error);
        res.status(500).json({ error: 'Failed to fetch script' });
    }
});

// POST /scripts - Create new script
router.post('/', authenticateJWT, async (req: Request, res: Response) => {
    const userId = extractUserId(req)!;
    const {
        name,
        description,
        content,
        language = 'bash',
        categoryId,
        tags,
        isPublic = false,
        isTemplate = false,
        parameters,
        environment,
        timeout = 300,
        retryCount = 0
    } = req.body;

    if (!name || !content) {
        return res.status(400).json({ error: 'Name and content are required' });
    }

    try {
        const result = await db
            .insert(scriptLibrary)
            .values({
                userId,
                name,
                description,
                content,
                language,
                categoryId: categoryId || null,
                tags: tags ? JSON.stringify(tags) : null,
                isPublic,
                isTemplate,
                parameters: parameters ? JSON.stringify(parameters) : null,
                environment: environment ? JSON.stringify(environment) : null,
                timeout,
                retryCount,
                version: '1.0.0'
            })
            .returning();

        // Create initial version
        await db
            .insert(scriptVersions)
            .values({
                scriptId: result[0].id,
                version: '1.0.0',
                content,
                changeLog: 'Initial version',
                createdBy: userId,
                isActive: true
            });

        res.status(201).json(result[0]);
    } catch (error) {
        logger.error('Error creating script', error);
        res.status(500).json({ error: 'Failed to create script' });
    }
});

// POST /scripts/:id/execute - Execute script
router.post('/:id/execute', authenticateJWT, async (req: Request, res: Response) => {
    const scriptId = parseInt(req.params.id, 10);
    const userId = extractUserId(req)!;
    const { hostId, parameters = {}, versionId } = req.body;

    if (!scriptId) {
        return res.status(400).json({ error: 'Invalid script ID' });
    }

    if (!hostId) {
        return res.status(400).json({ error: 'Host ID is required' });
    }

    // Check execute permission
    if (!(await checkScriptPermission(scriptId, userId, 'execute'))) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        // Get script details
        let scriptContent: string;
        let timeout: number;

        if (versionId) {
            // Use specific version
            const version = await db
                .select({
                    content: scriptVersions.content,
                    timeout: scriptLibrary.timeout,
                })
                .from(scriptVersions)
                .leftJoin(scriptLibrary, eq(scriptVersions.scriptId, scriptLibrary.id))
                .where(and(eq(scriptVersions.id, versionId), eq(scriptVersions.scriptId, scriptId)))
                .limit(1);

            if (version.length === 0) {
                return res.status(404).json({ error: 'Script version not found' });
            }

            scriptContent = version[0].content;
            timeout = version[0].timeout || 300;
        } else {
            // Use current version
            const script = await db
                .select({
                    content: scriptLibrary.content,
                    timeout: scriptLibrary.timeout,
                })
                .from(scriptLibrary)
                .where(eq(scriptLibrary.id, scriptId))
                .limit(1);

            if (script.length === 0) {
                return res.status(404).json({ error: 'Script not found' });
            }

            scriptContent = script[0].content;
            timeout = script[0].timeout || 300;
        }

        // Get SSH connection info
        const sshConfig = await getSSHHostInfo(hostId.toString());
        if (!sshConfig) {
            return res.status(404).json({ error: 'SSH host not found' });
        }

        // Create execution history record
        const executionResult = await db
            .insert(scriptExecutionHistory)
            .values({
                scriptId,
                versionId: versionId || null,
                userId,
                hostId,
                parameters: JSON.stringify(parameters),
                status: 'running'
            })
            .returning();

        const executionId = executionResult[0].id;

        // Replace parameter placeholders in script content
        let processedContent = scriptContent;
        for (const [key, value] of Object.entries(parameters)) {
            const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
            processedContent = processedContent.replace(placeholder, String(value));
        }

        // Execute script
        let conn: Client | undefined;
        try {
            conn = await sshConnectionPool.getConnection(sshConfig);

            const startTime = Date.now();
            const result = await executeSSHCommand(conn, processedContent, {
                timeout: timeout * 1000
            });
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Update execution history with success
            await db
                .update(scriptExecutionHistory)
                .set({
                    status: 'completed',
                    exitCode: 0,
                    output: result.stdout,
                    errorOutput: result.stderr,
                    endTime: new Date().toISOString(),
                    duration
                })
                .where(eq(scriptExecutionHistory.id, executionId));

            // Update script execution stats
            await db
                .update(scriptLibrary)
                .set({
                    lastExecuted: new Date().toISOString(),
                    executionCount: sql`${scriptLibrary.executionCount} + 1`
                })
                .where(eq(scriptLibrary.id, scriptId));

            res.json({
                executionId,
                status: 'completed',
                exitCode: 0,
                output: result.stdout,
                errorOutput: result.stderr,
                duration
            });

        } catch (error) {
            // Update execution history with failure
            const exitCode = error instanceof SSHCommandError ? (error as any).exitCode || -1 : -1;
            const output = error instanceof SSHCommandError ? (error as any).output || '' : '';
            const errorOutput = error instanceof SSHCommandError ? (error as any).error || String(error) : String(error);

            await db
                .update(scriptExecutionHistory)
                .set({
                    status: 'failed',
                    exitCode,
                    output,
                    errorOutput,
                    endTime: new Date().toISOString(),
                    duration: Date.now() - parseInt(executionResult[0].startTime)
                })
                .where(eq(scriptExecutionHistory.id, executionId));

            throw error;
        } finally {
            if (sshConfig) sshConnectionPool.releaseConnection(sshConfig);
        }

    } catch (error) {
        logger.error('Error executing script', error);

        if (error instanceof SSHConnectionError) {
            return res.status(500).json({ error: 'SSH connection failed', details: error.message });
        }
        if (error instanceof SSHCommandError) {
            return res.status(500).json({
                error: 'Script execution failed',
                details: error.message,
                exitCode: (error as any).exitCode || -1,
                output: (error as any).output || '',
                errorOutput: (error as any).error || ''
            });
        }

        res.status(500).json({ error: 'Failed to execute script' });
    }
});

export default router;