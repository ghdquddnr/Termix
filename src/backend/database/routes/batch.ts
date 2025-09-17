/**
 * Batch Execution API Routes
 * 배치 명령 실행을 위한 API 엔드포인트
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import {
    serverGroups,
    serverGroupMembers,
    batchExecutions,
    batchExecutionResults,
    batchTemplates,
    sshData
} from '../db/schema.js';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { batchExecutionService } from '../../services/batch-execution.js';
import chalk from 'chalk';

const router = express.Router();

// 로거 설정
const batchIconSymbol = '🔄';
const getTimeStamp = (): string => chalk.gray(`[${new Date().toLocaleTimeString()}]`);
const formatMessage = (level: string, colorFn: chalk.Chalk, message: string): string => {
  return `${getTimeStamp()} ${colorFn(`[${level.toUpperCase()}]`)} ${chalk.hex('#1e3a8a')(`[${batchIconSymbol}]`)} ${message}`;
};

const logger = {
  info: (msg: string): void => console.log(formatMessage('info', chalk.cyan, msg)),
  warn: (msg: string): void => console.warn(formatMessage('warn', chalk.yellow, msg)),
  error: (msg: string, err?: unknown): void => {
    console.error(formatMessage('error', chalk.redBright, msg));
    if (err) console.error(err);
  },
  success: (msg: string): void => console.log(formatMessage('success', chalk.greenBright, msg)),
  debug: (msg: string): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', chalk.magenta, msg));
    }
  }
};

// JWT 미들웨어
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// 오류 처리 헬퍼
const handleError = (res: express.Response, error: unknown, message: string) => {
  logger.error(message, error);
  res.status(500).json({
    error: message,
    details: error instanceof Error ? error.message : String(error)
  });
};

const safeParseStringArray = (value: unknown): string[] => {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

// Server Groups API

/**
 * GET /api/batch/groups
 * 사용자의 서버 그룹 목록 조회
 */
router.get('/groups', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const groups = await db
      .select({
        id: serverGroups.id,
        name: serverGroups.name,
        description: serverGroups.description,
        color: serverGroups.color,
        icon: serverGroups.icon,
        tags: serverGroups.tags,
        isDefault: serverGroups.isDefault,
        createdAt: serverGroups.createdAt,
        updatedAt: serverGroups.updatedAt,
      })
      .from(serverGroups)
      .where(eq(serverGroups.userId, userId))
      .orderBy(asc(serverGroups.name));

    // 각 그룹의 서버 수 조회
    const groupsWithCount = await Promise.all(
      groups.map(async (group) => {
        const memberCountResult = await db
          .select()
          .from(serverGroupMembers)
          .where(eq(serverGroupMembers.groupId, group.id));

        const memberCount = memberCountResult.length;

        return {
          ...group,
          memberCount: memberCount,
          tags: safeParseStringArray(group.tags)
        };
      })
    );

    logger.info(`Retrieved ${groups.length} server groups for user ${userId}`);
    res.json(groupsWithCount);
  } catch (error) {
    handleError(res, error, 'Failed to retrieve server groups');
  }
});

/**
 * POST /api/batch/groups
 * 새 서버 그룹 생성
 */
router.post('/groups', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, color, icon, tags, isDefault } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // 기본 그룹으로 설정할 경우 기존 기본 그룹 해제
    if (isDefault) {
      await db
        .update(serverGroups)
        .set({ isDefault: false })
        .where(eq(serverGroups.userId, userId));
    }

    const result = await db
      .insert(serverGroups)
      .values({
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6B7280',
        icon: icon || 'server',
          tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null,
        isDefault: isDefault || false,
      })
      .returning();

    logger.success(`Created server group: ${name} for user ${userId}`);
    res.status(201).json({
      ...result[0],
      memberCount: 0,
      tags: tags || []
    });
  } catch (error) {
    handleError(res, error, 'Failed to create server group');
  }
});

/**
 * PUT /api/batch/groups/:groupId
 * 서버 그룹 수정
 */
router.put('/groups/:groupId', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const groupId = parseInt(req.params.groupId);
    const { name, description, color, icon, tags, isDefault } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // 그룹 소유권 확인
    const existingGroup = await db
      .select()
      .from(serverGroups)
      .where(and(eq(serverGroups.id, groupId), eq(serverGroups.userId, userId)))
      .limit(1);

    if (existingGroup.length === 0) {
      return res.status(404).json({ error: 'Server group not found' });
    }

    // 기본 그룹으로 설정할 경우 기존 기본 그룹 해제
    if (isDefault) {
      await db
        .update(serverGroups)
        .set({ isDefault: false })
        .where(eq(serverGroups.userId, userId));
    }

    const result = await db
      .update(serverGroups)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6B7280',
        icon: icon || 'server',
        tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null,
        isDefault: isDefault || false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(serverGroups.id, groupId))
      .returning();

    logger.success(`Updated server group: ${groupId} for user ${userId}`);
    res.json({
      ...result[0],
      tags: tags || []
    });
  } catch (error) {
    handleError(res, error, 'Failed to update server group');
  }
});

/**
 * DELETE /api/batch/groups/:groupId
 * 서버 그룹 삭제
 */
router.delete('/groups/:groupId', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const groupId = parseInt(req.params.groupId);

    // 그룹 소유권 확인
    const existingGroup = await db
      .select()
      .from(serverGroups)
      .where(and(eq(serverGroups.id, groupId), eq(serverGroups.userId, userId)))
      .limit(1);

    if (existingGroup.length === 0) {
      return res.status(404).json({ error: 'Server group not found' });
    }

    // 그룹 멤버 삭제
    await db
      .delete(serverGroupMembers)
      .where(eq(serverGroupMembers.groupId, groupId));

    // 그룹 삭제
    await db
      .delete(serverGroups)
      .where(eq(serverGroups.id, groupId));

    logger.success(`Deleted server group: ${groupId} for user ${userId}`);
    res.json({ message: 'Server group deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete server group');
  }
});

/**
 * GET /api/batch/groups/:groupId/members
 * 서버 그룹의 멤버 서버 목록 조회
 */
router.get('/groups/:groupId/members', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const groupId = parseInt(req.params.groupId);

    // 그룹 소유권 확인
    const group = await db
      .select()
      .from(serverGroups)
      .where(and(eq(serverGroups.id, groupId), eq(serverGroups.userId, userId)))
      .limit(1);

    if (group.length === 0) {
      return res.status(404).json({ error: 'Server group not found' });
    }

    const members = await db
      .select({
        id: sshData.id,
        name: sshData.name,
        ip: sshData.ip,
        port: sshData.port,
        username: sshData.username,
        folder: sshData.folder,
        tags: sshData.tags,
        addedAt: serverGroupMembers.addedAt,
      })
      .from(serverGroupMembers)
      .innerJoin(sshData, eq(serverGroupMembers.hostId, sshData.id))
      .where(eq(serverGroupMembers.groupId, groupId))
      .orderBy(asc(sshData.name));

    logger.info(`Retrieved ${members.length} members for group ${groupId}`);
    res.json(members.map(member => ({
      ...member,
          tags: safeParseStringArray(member.tags)
    })));
  } catch (error) {
    handleError(res, error, 'Failed to retrieve group members');
  }
});

/**
 * POST /api/batch/groups/:groupId/members
 * 서버 그룹에 서버 추가
 */
router.post('/groups/:groupId/members', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const groupId = parseInt(req.params.groupId);
    const { hostIds } = req.body;

    if (!Array.isArray(hostIds) || hostIds.length === 0) {
      return res.status(400).json({ error: 'Host IDs array is required' });
    }

    // 그룹 소유권 확인
    const group = await db
      .select()
      .from(serverGroups)
      .where(and(eq(serverGroups.id, groupId), eq(serverGroups.userId, userId)))
      .limit(1);

    if (group.length === 0) {
      return res.status(404).json({ error: 'Server group not found' });
    }

    // 사용자 소유의 서버인지 확인
    const validHosts = await db
      .select({ id: sshData.id })
      .from(sshData)
      .where(and(eq(sshData.userId, userId), inArray(sshData.id, hostIds)));

    const validHostIds = validHosts.map(h => h.id);

    if (validHostIds.length === 0) {
      return res.status(400).json({ error: 'No valid hosts found' });
    }

    // 기존 멤버 조회
    const existingMembers = await db
      .select({ hostId: serverGroupMembers.hostId })
      .from(serverGroupMembers)
      .where(eq(serverGroupMembers.groupId, groupId));

    const existingHostIds = existingMembers.map(m => m.hostId);
    const newHostIds = validHostIds.filter(id => !existingHostIds.includes(id));

    if (newHostIds.length === 0) {
      return res.status(400).json({ error: 'All hosts are already members of this group' });
    }

    // 새 멤버 추가
    const membersToAdd = newHostIds.map(hostId => ({
      groupId,
      hostId,
    }));

    await db.insert(serverGroupMembers).values(membersToAdd);

    logger.success(`Added ${newHostIds.length} hosts to group ${groupId}`);
    res.status(201).json({
      message: 'Hosts added to group successfully',
      addedCount: newHostIds.length,
      skippedCount: validHostIds.length - newHostIds.length
    });
  } catch (error) {
    handleError(res, error, 'Failed to add hosts to group');
  }
});

/**
 * DELETE /api/batch/groups/:groupId/members/:hostId
 * 서버 그룹에서 서버 제거
 */
router.delete('/groups/:groupId/members/:hostId', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const groupId = parseInt(req.params.groupId);
    const hostId = parseInt(req.params.hostId);

    // 그룹 소유권 확인
    const group = await db
      .select()
      .from(serverGroups)
      .where(and(eq(serverGroups.id, groupId), eq(serverGroups.userId, userId)))
      .limit(1);

    if (group.length === 0) {
      return res.status(404).json({ error: 'Server group not found' });
    }

    const result = await db
      .delete(serverGroupMembers)
      .where(and(
        eq(serverGroupMembers.groupId, groupId),
        eq(serverGroupMembers.hostId, hostId)
      ));

    logger.success(`Removed host ${hostId} from group ${groupId}`);
    res.json({ message: 'Host removed from group successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to remove host from group');
  }
});

// Batch Execution API

/**
 * POST /api/batch/execute
 * 배치 명령 실행
 */
router.post('/execute', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      description,
      command,
      serverGroupId,
      targetHosts,
      executionType = 'parallel',
      timeout = 300,
      retryCount = 0,
      retryDelay = 5,
      stopOnFirstError = false,
    } = req.body;

    if (!command?.trim()) {
      return res.status(400).json({ error: 'Command is required' });
    }

    if (!serverGroupId && (!targetHosts || !Array.isArray(targetHosts) || targetHosts.length === 0)) {
      return res.status(400).json({ error: 'Either serverGroupId or targetHosts is required' });
    }

    // 배치 실행 생성
    const batchExecution = await batchExecutionService.createExecution({
      userId,
      name: name?.trim() || null,
      description: description?.trim() || null,
      command: command.trim(),
      serverGroupId: serverGroupId || null,
      targetHosts: targetHosts || null,
      executionType,
      timeout,
      retryCount,
      retryDelay,
      stopOnFirstError,
    });

    logger.success(`Created batch execution ${batchExecution.id} for user ${userId}`);
    res.status(201).json(batchExecution);
  } catch (error) {
    handleError(res, error, 'Failed to create batch execution');
  }
});

/**
 * GET /api/batch/executions
 * 배치 실행 목록 조회
 */
router.get('/executions', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const executions = await db
      .select()
      .from(batchExecutions)
      .where(eq(batchExecutions.userId, userId))
      .orderBy(desc(batchExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    logger.info(`Retrieved ${executions.length} batch executions for user ${userId}`);
    res.json(executions);
  } catch (error) {
    handleError(res, error, 'Failed to retrieve batch executions');
  }
});

/**
 * GET /api/batch/executions/:executionId
 * 배치 실행 상세 조회
 */
router.get('/executions/:executionId', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const executionId = parseInt(req.params.executionId);

    const execution = await db
      .select()
      .from(batchExecutions)
      .where(and(eq(batchExecutions.id, executionId), eq(batchExecutions.userId, userId)))
      .limit(1);

    if (execution.length === 0) {
      return res.status(404).json({ error: 'Batch execution not found' });
    }

    // 실행 결과 조회
    const results = await db
      .select({
        id: batchExecutionResults.id,
        hostId: batchExecutionResults.hostId,
        status: batchExecutionResults.status,
        exitCode: batchExecutionResults.exitCode,
        output: batchExecutionResults.output,
        errorOutput: batchExecutionResults.errorOutput,
        retryAttempt: batchExecutionResults.retryAttempt,
        startTime: batchExecutionResults.startTime,
        endTime: batchExecutionResults.endTime,
        duration: batchExecutionResults.duration,
        error: batchExecutionResults.error,
        hostName: sshData.name,
        hostIp: sshData.ip,
      })
      .from(batchExecutionResults)
      .innerJoin(sshData, eq(batchExecutionResults.hostId, sshData.id))
      .where(eq(batchExecutionResults.batchId, executionId))
      .orderBy(asc(sshData.name));

    logger.info(`Retrieved details for batch execution ${executionId}`);
    res.json({
      ...execution[0],
      results
    });
  } catch (error) {
    handleError(res, error, 'Failed to retrieve batch execution details');
  }
});

/**
 * POST /api/batch/executions/:executionId/cancel
 * 배치 실행 취소
 */
router.post('/executions/:executionId/cancel', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const executionId = parseInt(req.params.executionId);

    const result = await batchExecutionService.cancelExecution(executionId, userId);

    if (!result) {
      return res.status(404).json({ error: 'Batch execution not found or already completed' });
    }

    logger.success(`Cancelled batch execution ${executionId}`);
    res.json({ message: 'Batch execution cancelled successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to cancel batch execution');
  }
});

// Batch Templates API

/**
 * GET /api/batch/templates
 * 배치 템플릿 목록 조회
 */
router.get('/templates', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const templates = await db
      .select()
      .from(batchTemplates)
      .where(eq(batchTemplates.userId, userId))
      .orderBy(desc(batchTemplates.lastUsed), desc(batchTemplates.createdAt));

    logger.info(`Retrieved ${templates.length} batch templates for user ${userId}`);
    res.json(templates.map(template => ({
      ...template,
      tags: safeParseStringArray(template.tags)
    })));
  } catch (error) {
    handleError(res, error, 'Failed to retrieve batch templates');
  }
});

/**
 * POST /api/batch/templates
 * 배치 템플릿 생성
 */
router.post('/templates', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      description,
      command,
      defaultTimeout = 300,
      defaultRetryCount = 0,
      defaultExecutionType = 'parallel',
      tags,
      isPublic = false,
    } = req.body;

    if (!name?.trim() || !command?.trim()) {
      return res.status(400).json({ error: 'Name and command are required' });
    }

    const result = await db
      .insert(batchTemplates)
      .values({
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        command: command.trim(),
        defaultTimeout,
        defaultRetryCount,
        defaultExecutionType,
        tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null,
        isPublic,
      })
      .returning();

    logger.success(`Created batch template: ${name} for user ${userId}`);
    res.status(201).json({
      ...result[0],
      tags: tags || []
    });
  } catch (error) {
    handleError(res, error, 'Failed to create batch template');
  }
});

export default router;
