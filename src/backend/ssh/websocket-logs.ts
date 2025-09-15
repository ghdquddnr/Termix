/**
 * WebSocket Logs Streaming Server
 * 원격 로그 파일 실시간 스트리밍 (tail -F)
 */

import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import chalk from 'chalk';
import { Client, type ClientChannel } from 'ssh2';
import { db } from '../database/db/index.js';
import { sshData } from '../database/db/schema.js';
import { eq } from 'drizzle-orm';
import { type SSHConnectionConfig } from './ssh-utils.js';

const logIconSymbol = '📜';
const getTimeStamp = (): string => chalk.gray(`[${new Date().toLocaleTimeString()}]`);
const formatMessage = (level: string, colorFn: chalk.Chalk, message: string): string => {
  return `${getTimeStamp()} ${colorFn(`[${level.toUpperCase()}]`)} ${chalk.hex('#f59e0b')(`[${logIconSymbol}]`)} ${message}`;
};
const logger = {
  info: (msg: string) => console.log(formatMessage('info', chalk.cyan, msg)),
  warn: (msg: string) => console.warn(formatMessage('warn', chalk.yellow, msg)),
  error: (msg: string, err?: unknown) => { console.error(formatMessage('error', chalk.redBright, msg)); if (err) console.error(err); },
  success: (msg: string) => console.log(formatMessage('success', chalk.greenBright, msg)),
};

type SubscriptionKey = string; // `${clientId}:${hostId}:${file}`

interface TailSession { conn: Client; process?: ClientChannel; }

async function getSSHHostInfo(hostId: string): Promise<SSHConnectionConfig | null> {
  try {
    const result = await db.select({
      host: sshData.ip,
      port: sshData.port,
      username: sshData.username,
      password: sshData.password,
      privateKey: sshData.key,
      passphrase: sshData.keyPassword,
    }).from(sshData).where(eq(sshData.id, parseInt(hostId, 10)));
    if (!result || !result.length) return null;
    const r = result[0];
    return {
      host: r.host,
      port: r.port || 22,
      username: r.username,
      password: r.password || undefined,
      privateKey: r.privateKey || undefined,
      passphrase: r.passphrase || undefined,
      timeout: 30000,
    };
  } catch (e) {
    logger.error('Failed to load SSH host', e);
    return null;
  }
}

const app = express();
app.use(cors({ origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const sessions = new Map<SubscriptionKey, TailSession>();

wss.on('connection', (ws: WebSocket) => {
  const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  logger.info(`WS logs client connected: ${clientId}`);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe' && msg.hostId && msg.file) {
        await handleSubscribe(ws, clientId, String(msg.hostId), String(msg.file), msg.initialLines || 200);
      } else if (msg.type === 'unsubscribe' && msg.hostId && msg.file) {
        handleUnsubscribe(clientId, String(msg.hostId), String(msg.file));
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
      }
    } catch (e) {
      logger.error('Invalid WS logs message', e);
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    // Clean up all sessions for this client
    for (const key of Array.from(sessions.keys())) {
      if (key.startsWith(`${clientId}:`)) {
        const sess = sessions.get(key);
        try { sess?.process?.close(); } catch {}
        try { sess?.conn.end(); } catch {}
        sessions.delete(key);
      }
    }
    logger.info(`WS logs client disconnected: ${clientId}`);
  });
});

async function handleSubscribe(ws: WebSocket, clientId: string, hostId: string, file: string, initialLines: number) {
  const ssh = await getSSHHostInfo(hostId);
  if (!ssh) {
    ws.send(JSON.stringify({ type: 'error', error: 'Host not found' }));
    return;
  }

  const conn = new Client();
  conn.on('ready', () => {
    const escaped = `'${String(file).replaceAll("'", `'"'"'`)}'`;
    const cmd = `tail -n ${Math.max(0, Math.min(2000, parseInt(String(initialLines) || '200', 10)))} -F -- ${escaped}`;
    conn.exec(cmd, (err, stream) => {
      if (err || !stream) {
        ws.send(JSON.stringify({ type: 'error', error: 'Failed to start tail' }));
        try { conn.end(); } catch {}
        return;
      }
      const key: SubscriptionKey = `${clientId}:${hostId}:${file}`;
      sessions.set(key, { conn, process: stream });
      stream.on('data', (chunk: Buffer) => {
        ws.send(JSON.stringify({ type: 'log', hostId, file, data: chunk.toString('utf8'), t: Date.now() }));
      });
      stream.on('close', () => {
        ws.send(JSON.stringify({ type: 'eof', hostId, file }));
        sessions.delete(key);
        try { conn.end(); } catch {}
      });
      stream.stderr.on('data', () => {});
    });
  });
  conn.on('error', (e) => {
    ws.send(JSON.stringify({ type: 'error', error: `SSH error: ${e instanceof Error ? e.message : 'unknown'}` }));
  });
  conn.connect({
    host: ssh.host,
    port: ssh.port,
    username: ssh.username,
    password: ssh.password,
    privateKey: ssh.privateKey,
    passphrase: ssh.passphrase,
    readyTimeout: ssh.timeout || 30000,
  });
}

function handleUnsubscribe(clientId: string, hostId: string, file: string) {
  const key: SubscriptionKey = `${clientId}:${hostId}:${file}`;
  const sess = sessions.get(key);
  if (sess) {
    try { sess.process?.close(); } catch {}
    try { sess.conn.end(); } catch {}
    sessions.delete(key);
  }
}

// Lightweight status endpoint
app.get('/status', (_req, res) => {
  res.json({ sessions: sessions.size, t: Date.now() });
});

const PORT = 8087;
server.listen(PORT, () => {
  logger.success(`WebSocket logs server started on port ${PORT}`);
});

export default wss;
