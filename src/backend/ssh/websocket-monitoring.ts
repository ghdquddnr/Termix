/**
 * WebSocket Monitoring Server
 * 프로세스 모니터링 실시간 통신을 위한 WebSocket 서버
 */

import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import chalk from 'chalk';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { Client } from 'ssh2';
import {
  createSSHConnection,
  executeSSHCommand,
  sshConnectionPool,
  SSHConnectionError,
  SSHCommandError,
  type SSHConnectionConfig
} from './ssh-utils.js';
import {
  parsePsAuxOutput,
  parseSystemInfo,
  applyProcessFilter,
  sortProcesses
} from '../utils/process-parser.js';
import {
  type ProcessInfo,
  type ProcessListResponse,
  ProcessSortField,
  type SystemInfo
} from '../types/process-monitoring.js';

// 로깅 설정
const websocketIconSymbol = '🔌';
const getTimeStamp = (): string => chalk.gray(`[${new Date().toLocaleTimeString()}]`);
const formatMessage = (level: string, colorFn: chalk.Chalk, message: string): string => {
  return `${getTimeStamp()} ${colorFn(`[${level.toUpperCase()}]`)} ${chalk.hex('#8b5cf6')(`[${websocketIconSymbol}]`)} ${message}`;
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

// 클라이언트 연결 타입 정의
interface ClientConnection {
  id: string;
  ws: WebSocket;
  hostId?: string;
  subscriptions: Set<string>; // 구독 중인 이벤트 타입들
  lastHeartbeat: number;
  active: boolean;
  lastDataHash?: string; // 마지막 전송된 데이터의 해시
}

// 메시지 타입 정의
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'request_update' | 'heartbeat' | 'error';
  hostId?: string;
  event?: string;
  data?: any;
  timestamp?: string;
}

interface WebSocketResponse {
  type: 'process_update' | 'system_update' | 'error' | 'heartbeat' | 'subscribed' | 'unsubscribed';
  hostId?: string;
  data?: any;
  timestamp: string;
  error?: string;
}

class WebSocketMonitoringServer {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatInterval: NodeJS.Timeout;
  private lastProcessData: Map<string, string> = new Map(); // hostId -> data hash
  private hostErrorCounts: Map<string, number> = new Map(); // hostId -> error count
  private failedHosts: Set<string> = new Set(); // hosts that consistently fail
  private performanceStats = {
    duplicateDataSkipped: 0,
    totalUpdates: 0,
    lastOptimizationCheck: Date.now()
  };
  
  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: ClientConnection = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastHeartbeat: Date.now(),
        active: true
      };

      this.clients.set(clientId, client);
      logger.info(`New WebSocket client connected: ${clientId}`);

      // 클라이언트 메시지 처리
      ws.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          logger.error(`Failed to parse message from client ${clientId}`, error);
          this.sendError(clientId, 'Invalid message format');
        }
      });

      // 클라이언트 연결 종료 처리
      ws.on('close', () => {
        logger.info(`Client disconnected: ${clientId}`);
        this.handleClientDisconnect(clientId);
      });

      // 에러 처리
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}`, error);
        this.handleClientDisconnect(clientId);
      });

      // 환영 메시지 전송
      this.sendMessage(clientId, {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
    });

    logger.success('WebSocket server initialized');
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateDataHash(data: ProcessListResponse): string {
    // 중요한 프로세스 정보만으로 해시 생성 (타임스탬프 제외)
    const relevantData = {
      processes: data.processes.map(p => ({
        pid: p.pid,
        cpuPercent: p.cpuPercent,
        memoryPercent: p.memoryPercent,
        memoryKB: p.memoryKB,
        state: p.state,
        command: p.command
      })),
      systemInfo: {
        cpuCount: data.systemInfo?.cpuCount,
        totalMemoryKB: data.systemInfo?.totalMemoryKB,
        usedMemoryKB: data.systemInfo?.usedMemoryKB,
        processCount: data.systemInfo?.processCount
      }
    };
    
    return crypto.createHash('md5').update(JSON.stringify(relevantData)).digest('hex');
  }

  private hasDataChanged(hostId: string, data: ProcessListResponse): boolean {
    const currentHash = this.calculateDataHash(data);
    const lastHash = this.lastProcessData.get(hostId);
    
    if (lastHash !== currentHash) {
      this.lastProcessData.set(hostId, currentHash);
      return true;
    }
    
    this.performanceStats.duplicateDataSkipped++;
    return false;
  }

  private async handleClientMessage(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.active) return;

    logger.debug(`Received message from ${clientId}: ${message.type}`);

    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(clientId, message);
        break;
      
      case 'unsubscribe':
        await this.handleUnsubscribe(clientId, message);
        break;
      
      case 'request_update':
        await this.handleRequestUpdate(clientId, message);
        break;
      
      case 'heartbeat':
        this.handleHeartbeat(clientId);
        break;
      
      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`);
    }
  }

  private async handleSubscribe(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !message.hostId || !message.event) {
      this.sendError(clientId, 'Missing hostId or event type');
      return;
    }

    const subscriptionKey = `${message.hostId}:${message.event}`;
    client.subscriptions.add(subscriptionKey);
    client.hostId = message.hostId;

    logger.info(`Client ${clientId} subscribed to ${subscriptionKey}`);

    // 해당 호스트에 대한 모니터링 시작
    if (message.event === 'processes') {
      this.startProcessMonitoring(message.hostId);
    }

    this.sendMessage(clientId, {
      type: 'subscribed',
      hostId: message.hostId,
      data: { event: message.event },
      timestamp: new Date().toISOString()
    });

    // 즉시 초기 데이터 전송
    await this.handleRequestUpdate(clientId, message);
  }

  private async handleUnsubscribe(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !message.hostId || !message.event) {
      this.sendError(clientId, 'Missing hostId or event type');
      return;
    }

    const subscriptionKey = `${message.hostId}:${message.event}`;
    client.subscriptions.delete(subscriptionKey);

    logger.info(`Client ${clientId} unsubscribed from ${subscriptionKey}`);

    // 더 이상 해당 호스트를 구독하는 클라이언트가 없으면 모니터링 중지
    if (message.event === 'processes') {
      const hasSubscribers = Array.from(this.clients.values()).some(c => 
        c.subscriptions.has(subscriptionKey)
      );
      if (!hasSubscribers) {
        this.stopProcessMonitoring(message.hostId);
      }
    }

    this.sendMessage(clientId, {
      type: 'unsubscribed',
      hostId: message.hostId,
      data: { event: message.event },
      timestamp: new Date().toISOString()
    });
  }

  private async handleRequestUpdate(clientId: string, message: WebSocketMessage): Promise<void> {
    if (!message.hostId) {
      this.sendError(clientId, 'Missing hostId');
      return;
    }

    try {
      const processData = await this.fetchProcessData(message.hostId);
      this.sendMessage(clientId, {
        type: 'process_update',
        hostId: message.hostId,
        data: processData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to fetch process data for host ${message.hostId}`, error);
      this.sendError(clientId, `Failed to fetch process data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private handleHeartbeat(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastHeartbeat = Date.now();
      this.sendMessage(clientId, {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.active = false;
      
      // 구독 정리
      for (const subscription of client.subscriptions) {
        const [hostId, event] = subscription.split(':');
        if (event === 'processes') {
          const hasOtherSubscribers = Array.from(this.clients.values()).some(c => 
            c.id !== clientId && c.subscriptions.has(subscription)
          );
          if (!hasOtherSubscribers) {
            this.stopProcessMonitoring(hostId);
          }
        }
      }
      
      this.clients.delete(clientId);
    }
  }

  private startProcessMonitoring(hostId: string): void {
    const intervalKey = `processes:${hostId}`;
    
    if (this.monitoringIntervals.has(intervalKey)) {
      return; // 이미 모니터링 중
    }

    // 실패한 호스트는 모니터링하지 않음 (API URL 수정으로 인해 실패 목록 초기화)
    if (this.failedHosts.has(hostId)) {
      logger.warn(`Retrying failed host ${hostId} due to API URL fix`);
      this.failedHosts.delete(hostId); // API URL이 수정되었으므로 재시도
      this.hostErrorCounts.delete(hostId);
    }

    logger.info(`Starting process monitoring for host ${hostId}`);

    const interval = setInterval(async () => {
      try {
        const processData = await this.fetchProcessData(hostId);
        this.performanceStats.totalUpdates++;
        
        // 성공 시 에러 카운트 리셋
        this.hostErrorCounts.delete(hostId);
        
        // 데이터가 변경된 경우에만 브로드캐스트
        if (this.hasDataChanged(hostId, processData)) {
          this.broadcastToSubscribers(`${hostId}:processes`, {
            type: 'process_update',
            hostId,
            data: processData,
            timestamp: new Date().toISOString()
          });
          
          logger.debug(`Process data updated for host ${hostId} (${processData.processes.length} processes)`);
        } else {
          logger.debug(`Process data unchanged for host ${hostId}, skipping broadcast`);
        }
      } catch (error) {
        logger.error(`Failed to fetch process data for host ${hostId}`, error);
        
        // 에러 카운트 증가
        const errorCount = (this.hostErrorCounts.get(hostId) || 0) + 1;
        this.hostErrorCounts.set(hostId, errorCount);
        
        // 3번 연속 실패 시 호스트를 실패 목록에 추가하고 모니터링 중지
        if (errorCount >= 3) {
          logger.warn(`Host ${hostId} failed ${errorCount} times, marking as failed and stopping monitoring`);
          this.failedHosts.add(hostId);
          this.stopProcessMonitoring(hostId);
          
          this.broadcastToSubscribers(`${hostId}:processes`, {
            type: 'error',
            hostId,
            error: `Host ${hostId} consistently failed. Please check host configuration. Monitoring stopped.`,
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        this.broadcastToSubscribers(`${hostId}:processes`, {
          type: 'error',
          hostId,
          error: error instanceof Error ? error.message : 'Failed to fetch process data',
          timestamp: new Date().toISOString()
        });
      }
    }, 2000); // 2초마다 업데이트

    this.monitoringIntervals.set(intervalKey, interval);
  }

  private stopProcessMonitoring(hostId: string): void {
    const intervalKey = `processes:${hostId}`;
    const interval = this.monitoringIntervals.get(intervalKey);
    
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(intervalKey);
      logger.info(`Stopped process monitoring for host ${hostId}`);
    }
  }

  private async fetchProcessData(hostId: string): Promise<ProcessListResponse> {
    try {
      // 기존 모니터링 API를 통해 데이터 가져오기
      const response = await fetch(`http://localhost:8081/monitoring/processes/${hostId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Host ${hostId} not found. Please check if the host exists and is properly configured.`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ProcessListResponse;
      return data;
    } catch (error) {
      logger.error(`Failed to fetch process data from monitoring API`, error);
      throw error;
    }
  }

  private broadcastToSubscribers(subscriptionKey: string, message: WebSocketResponse): void {
    let sentCount = 0;
    
    for (const client of this.clients.values()) {
      if (client.active && client.subscriptions.has(subscriptionKey)) {
        this.sendMessage(client.id, message);
        sentCount++;
      }
    }

    if (sentCount > 0) {
      logger.debug(`Broadcasted ${message.type} to ${sentCount} subscribers for ${subscriptionKey}`);
    }
  }

  private sendMessage(clientId: string, message: WebSocketResponse): void {
    const client = this.clients.get(clientId);
    if (!client || !client.active) return;

    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      } else {
        logger.warn(`Cannot send message to client ${clientId}: WebSocket not open`);
        this.handleClientDisconnect(clientId);
      }
    } catch (error) {
      logger.error(`Failed to send message to client ${clientId}`, error);
      this.handleClientDisconnect(clientId);
    }
  }

  private sendError(clientId: string, error: string): void {
    this.sendMessage(clientId, {
      type: 'error',
      error,
      timestamp: new Date().toISOString()
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60초 타임아웃

      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastHeartbeat > timeout) {
          logger.warn(`Client ${clientId} heartbeat timeout`);
          this.handleClientDisconnect(clientId);
        }
      }
    }, 30000); // 30초마다 체크
  }

  public getStats(): { 
    clients: number; 
    subscriptions: number; 
    monitoringIntervals: number;
    performance: {
      totalUpdates: number;
      duplicateDataSkipped: number;
      optimizationRate: number;
      uptime: number;
    };
  } {
    const totalSubscriptions = Array.from(this.clients.values())
      .reduce((sum, client) => sum + client.subscriptions.size, 0);

    const optimizationRate = this.performanceStats.totalUpdates > 0 
      ? (this.performanceStats.duplicateDataSkipped / this.performanceStats.totalUpdates) * 100 
      : 0;

    return {
      clients: this.clients.size,
      subscriptions: totalSubscriptions,
      monitoringIntervals: this.monitoringIntervals.size,
      performance: {
        totalUpdates: this.performanceStats.totalUpdates,
        duplicateDataSkipped: this.performanceStats.duplicateDataSkipped,
        optimizationRate: Math.round(optimizationRate * 100) / 100,
        uptime: Math.round((Date.now() - this.performanceStats.lastOptimizationCheck) / 1000)
      }
    };
  }

  public close(): void {
    logger.info('Shutting down WebSocket monitoring server...');

    // 모든 모니터링 인터벌 정리
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    // 하트비트 인터벌 정리
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // 모든 클라이언트 연결 종료
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    }
    this.clients.clear();

    // WebSocket 서버 종료
    this.wss.close();
    logger.success('WebSocket monitoring server shut down');
  }
}

// Express 앱 설정
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// HTTP 서버 생성
const server = createServer(app);

// WebSocket 모니터링 서버 인스턴스
let wsMonitoringServer: WebSocketMonitoringServer;

// 상태 정보 엔드포인트
app.get('/status', (req, res) => {
  const stats = wsMonitoringServer ? wsMonitoringServer.getStats() : { clients: 0, subscriptions: 0, monitoringIntervals: 0 };
  res.json({
    status: 'running',
    ...stats,
    timestamp: new Date().toISOString()
  });
});

// 건강 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 서버 시작
const PORT = 8086;
server.listen(PORT, () => {
  logger.success(`WebSocket monitoring server started on port ${PORT}`);
  logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
  logger.info(`HTTP status endpoint: http://localhost:${PORT}/status`);

  // WebSocket 서버 초기화
  wsMonitoringServer = new WebSocketMonitoringServer(server);
});

// 종료 시 정리
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (wsMonitoringServer) {
    wsMonitoringServer.close();
  }
  server.close(() => {
    logger.success('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (wsMonitoringServer) {
    wsMonitoringServer.close();
  }
  server.close(() => {
    logger.success('HTTP server closed');
    process.exit(0);
  });
});

export default wsMonitoringServer;