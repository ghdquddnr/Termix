/**
 * Logs Routes
 * 로그 파일 조회, 검색, 다운로드 및 북마크 관리 API
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
import { sshData, logBookmarks, logSearchHistory } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { parseFindStatOutput, parseGrepOutput, type LogLevel } from '../../utils/log-parser.js';

const router = express.Router();

// ---------- Helpers ----------
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

function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const secret = process.env.JWT_SECRET || 'secret';
  try {
    jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---------- Bookmarks (declare before parameterized routes) ----------

// GET /logs/bookmarks?hostId=...
router.get('/bookmarks', authenticateJWT, async (req: Request, res: Response) => {
  const userId = (extractUserId(req) || '') as string;
  const hostId = req.query.hostId ? parseInt(String(req.query.hostId), 10) : undefined;
  try {
    const rows = await db
      .select()
      .from(logBookmarks)
      .where(hostId ? eq(logBookmarks.hostId, hostId) : undefined as any);
    const filtered = rows.filter(r => r.userId === userId);
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// POST /logs/bookmarks
// body: { hostId: number, logFile: string, note?: string, lineNumber?: number, timestamp?: string, tags?: string }
router.post('/bookmarks', authenticateJWT, async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  const { hostId, logFile, note, lineNumber, timestamp, tags } = req.body || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!hostId || !logFile) return res.status(400).json({ error: 'hostId and logFile are required' });
  try {
    await db.insert(logBookmarks).values({
      userId,
      hostId,
      logFile,
      note,
      lineNumber,
      timestamp,
      tags
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
});

// DELETE /logs/bookmarks/:id
router.delete('/bookmarks/:id', authenticateJWT, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    await db.delete(logBookmarks).where(eq(logBookmarks.id, id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// ---------- Routes ----------

// GET /logs/:hostId
// /var/log 하위 로그 파일 목록을 조회합니다.
router.get('/:hostId', async (req: Request, res: Response) => {
  const { hostId } = req.params;
  const basePath = (req.query.path as string) || '/var/log';
  const maxDepth = parseInt((req.query.maxDepth as string) || '2', 10);
  const limit = parseInt((req.query.limit as string) || '200', 10);

  const sshConfig = await getSSHHostInfo(hostId);
  if (!sshConfig) {
    // Graceful empty response to prevent front-end XHR error noise
    return res.json({ path: basePath, count: 0, files: [], warning: 'SSH host not found' });
  }

  let conn: Client | undefined;
  try {
    conn = await sshConnectionPool.getConnection(sshConfig);
    const depth = Math.max(1, Math.min(maxDepth, 4));
    const cap = Math.max(1, Math.min(limit, 2000));
    const pattern = `\\( -name '*.log' -o -name '*.gz' -o -name '*.txt' -o -name 'syslog*' -o -name 'messages*' -o -name '*.journal' \\)`;

    let output = '';
    try {
      const cmdPrintf = `find ${escapePath(basePath)} -maxdepth ${depth} -type f ${pattern} 2>/dev/null -printf '%s|%T@|%p\\n' | sort -t'|' -k3 | head -n ${cap}`;
      const r = await executeSSHCommand(conn, cmdPrintf, { timeout: 15000 });
      output = r.stdout;
    } catch {
      try {
        const cmdStatGNU = `find ${escapePath(basePath)} -maxdepth ${depth} -type f ${pattern} -exec stat -c '%s|%Y|%n' {} + 2>/dev/null | head -n ${cap}`;
        const r2 = await executeSSHCommand(conn, cmdStatGNU, { timeout: 20000 });
        output = r2.stdout;
      } catch {
        try {
          const cmdStatBSD = `find ${escapePath(basePath)} -maxdepth ${depth} -type f ${pattern} -exec stat -f '%z|%m|%N' {} + 2>/dev/null | head -n ${cap}`;
          const r3 = await executeSSHCommand(conn, cmdStatBSD, { timeout: 20000 });
          output = r3.stdout;
        } catch {
          output = '';
        }
      }
    }

    const files = parseFindStatOutput(output);
    res.json({ path: basePath, count: files.length, files });
  } catch (error) {
    // Graceful empty response on SSH/command failure (avoid 500 in console)
    res.json({ path: basePath, count: 0, files: [], warning: error instanceof Error ? error.message : String(error) });
  } finally {
    if (sshConfig) sshConnectionPool.releaseConnection(sshConfig);
  }
});

// POST /logs/:hostId/search
// 본문: { query: string, path?: string, files?: string[], levels?: LogLevel[], limit?: number }
router.post('/:hostId/search', async (req: Request, res: Response) => {
  const { hostId } = req.params;
  const { query, path, files, levels, limit = 500 } = req.body || {} as {
    query: string; path?: string; files?: string[]; levels?: LogLevel[]; limit?: number;
  };

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query is required' });
  }

  const sshConfig = await getSSHHostInfo(hostId);
  if (!sshConfig) {
    return res.json({ count: 0, matches: [], warning: 'SSH host not found' });
  }

  let conn: Client | undefined;
  try {
    conn = await sshConnectionPool.getConnection(sshConfig);
    const levelExpr = Array.isArray(levels) && levels.length ? `| egrep -i '\\b(${levels.map(safeGrep).join('|')})\\b'` : '';

    let targetExpr = '';
    if (Array.isArray(files) && files.length) {
      targetExpr = files.map(escapePath).join(' ');
    } else {
      const dir = escapePath(path || '/var/log');
      // target files in directory
      targetExpr = `$(find ${dir} -maxdepth 2 -type f \\
        \\( -name '*.log' -o -name 'syslog*' -o -name 'messages*' \\)
      2>/dev/null)`;
    }

    const safeQuery = safeGrep(query);
    const cmd = `grep -nH -E -i -- '${safeQuery}' ${targetExpr} 2>/dev/null ${levelExpr} | head -n ${Math.max(1, Math.min(limit, 2000))}`;
    const result = await executeSSHCommand(conn, cmd, { timeout: 20000 });
    const matches = parseGrepOutput(result.stdout);
    res.json({ count: matches.length, matches });
  } catch (error) {
    res.json({ count: 0, matches: [], warning: error instanceof Error ? error.message : String(error) });
  } finally {
    if (sshConfig) sshConnectionPool.releaseConnection(sshConfig);
  }
});

// GET /logs/:hostId/download?file=...&compress=1
router.get('/:hostId/download', async (req: Request, res: Response) => {
  const { hostId } = req.params;
  const file = req.query.file as string;
  const compress = String(req.query.compress || '0') === '1';
  if (!file) return res.status(400).json({ error: 'file is required' });

  const sshConfig = await getSSHHostInfo(hostId);
  if (!sshConfig) return res.status(404).json({ error: 'SSH host not found' });

  let conn: Client | undefined;
  try {
    conn = await sshConnectionPool.getConnection(sshConfig);
    const escaped = escapePath(file);
    const cmd = compress ? `gzip -c -- ${escaped}` : `cat -- ${escaped}`;
    // Use raw stream
    await new Promise<void>((resolve, reject) => {
      conn!.exec(cmd, (err, stream) => {
        if (err) return reject(err);

        res.status(200);
        res.setHeader('Content-Type', compress ? 'application/gzip' : 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(escaped.split('/').pop() || 'log')}${compress ? '.gz' : ''}"`);

        stream.on('data', (chunk: Buffer) => {
          res.write(chunk);
        });
        stream.on('close', () => {
          res.end();
          resolve();
        });
        stream.stderr.on('data', () => {});
        stream.on('error', reject);
      });
    });
  } catch (error) {
    handleSshError(res, error);
  } finally {
    if (sshConfig) sshConnectionPool.releaseConnection(sshConfig);
  }
});

// ---------- Helpers ----------

function escapePath(p: string): string {
  // Basic escaping for spaces and special chars
  return `'${String(p).replaceAll("'", `'"'"'`)}'`;
}

function safeGrep(q: string): string {
  // Escape single quotes and backslashes for grep -E
  return String(q).replace(/['\\]/g, (m) => `\\${m}`);
}

function handleSshError(res: Response, error: unknown) {
  if (error instanceof SSHConnectionError) {
    return res.status(500).json({ error: 'SSH connection failed', details: error.message });
  }
  if (error instanceof SSHCommandError) {
    return res.status(500).json({ error: 'Command execution failed', details: error.message, exitCode: error.exitCode });
  }
  return res.status(500).json({ error: 'Internal server error' });
}

function extractUserId(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return undefined;
  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const payload = jwt.verify(token, secret) as any;
    return payload?.userId;
  } catch {
    return undefined;
  }
}

export default router;
