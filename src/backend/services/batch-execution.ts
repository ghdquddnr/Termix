/**
 * Batch Execution Service
 * 다중 SSH 연결 관리 및 병렬 명령 실행 서비스
 */

import { Client } from 'ssh2';
import { db } from '../database/db/index.js';
import {
    batchExecutions,
    batchExecutionResults,
    serverGroups,
    serverGroupMembers,
    sshData
} from '../database/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import {
    createSSHConnection,
    executeSSHCommand,
    closeSSHConnection,
    SSHConnectionError,
    SSHCommandError
} from '../ssh/ssh-utils.js';
import type { SSHConnectionConfig, CommandResult } from '../ssh/ssh-utils.js';
import chalk from 'chalk';

// 로거 설정
const batchIconSymbol = '⚡';
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

// 배치 실행 인터페이스
export interface BatchExecutionRequest {
  userId: string;
  name?: string | null;
  description?: string | null;
  command: string;
  serverGroupId?: number | null;
  targetHosts?: number[] | null;
  executionType: 'parallel' | 'sequential';
  timeout: number;
  retryCount: number;
  retryDelay: number;
  stopOnFirstError: boolean;
}

// 실행 결과 인터페이스
export interface HostExecutionResult {
  hostId: number;
  hostName: string;
  hostIp: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  exitCode?: number | null;
  output?: string;
  errorOutput?: string;
  retryAttempt: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
}

// 다중 SSH 연결 관리 클래스
class MultiSSHManager {
  private connections = new Map<number, { conn: Client; config: SSHConnectionConfig }>();
  private maxConcurrent: number;
  private activeConnections = 0;

  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * SSH 연결 생성
   */
  async createConnection(hostId: number, config: SSHConnectionConfig): Promise<Client> {
    if (this.activeConnections >= this.maxConcurrent) {
      throw new Error(`Maximum concurrent connections (${this.maxConcurrent}) reached`);
    }

    try {
      const conn = await createSSHConnection(config);
      this.connections.set(hostId, { conn, config });
      this.activeConnections++;

      // 연결 종료 이벤트 처리
      conn.on('close', () => {
        this.connections.delete(hostId);
        this.activeConnections--;
      });

      return conn;
    } catch (error) {
      logger.error(`Failed to create SSH connection for host ${hostId}`, error);
      throw error;
    }
  }

  /**
   * 연결 반환
   */
  getConnection(hostId: number): Client | null {
    return this.connections.get(hostId)?.conn || null;
  }

  /**
   * 모든 연결 종료
   */
  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(({ conn }) =>
      closeSSHConnection(conn).catch(err => logger.error('Error closing connection', err))
    );

    await Promise.allSettled(closePromises);
    this.connections.clear();
    this.activeConnections = 0;
  }

  /**
   * 활성 연결 수 반환
   */
  getActiveConnectionCount(): number {
    return this.activeConnections;
  }
}

// 병렬 명령 실행 엔진
class ParallelExecutionEngine {
  private sshManager: MultiSSHManager;
  private running = false;

  constructor(maxConcurrent = 10) {
    this.sshManager = new MultiSSHManager(maxConcurrent);
  }

  /**
   * 배치 실행 수행
   */
  async executeBatch(
    batchId: number,
    hosts: Array<{ id: number; name: string; ip: string; port: number; username: string; password?: string; privateKey?: string; keyPassword?: string }>,
    command: string,
    options: {
      executionType: 'parallel' | 'sequential';
      timeout: number;
      retryCount: number;
      retryDelay: number;
      stopOnFirstError: boolean;
    }
  ): Promise<void> {
    this.running = true;

    try {
      // 배치 실행 시작 시간 기록
      await db
        .update(batchExecutions)
        .set({
          status: 'running',
          startTime: new Date().toISOString(),
          totalHosts: hosts.length,
        })
        .where(eq(batchExecutions.id, batchId));

      // 초기 실행 결과 레코드 생성
      const initialResults = hosts.map(host => ({
        batchId,
        hostId: host.id,
        status: 'pending' as const,
        retryAttempt: 0,
      }));

      await db.insert(batchExecutionResults).values(initialResults);

      logger.info(`Starting batch execution ${batchId} for ${hosts.length} hosts`);

      if (options.executionType === 'parallel') {
        await this.executeParallel(batchId, hosts, command, options);
      } else {
        await this.executeSequential(batchId, hosts, command, options);
      }

      // 최종 상태 업데이트
      await this.updateBatchStatus(batchId);

    } catch (error) {
      logger.error(`Batch execution ${batchId} failed`, error);
      await db
        .update(batchExecutions)
        .set({
          status: 'failed',
          endTime: new Date().toISOString(),
        })
        .where(eq(batchExecutions.id, batchId));
    } finally {
      await this.sshManager.closeAllConnections();
      this.running = false;
    }
  }

  /**
   * 병렬 실행
   */
  private async executeParallel(
    batchId: number,
    hosts: Array<{ id: number; name: string; ip: string; port: number; username: string; password?: string; privateKey?: string; keyPassword?: string }>,
    command: string,
    options: {
      timeout: number;
      retryCount: number;
      retryDelay: number;
      stopOnFirstError: boolean;
    }
  ): Promise<void> {
    const executionPromises = hosts.map(host =>
      this.executeOnHost(batchId, host, command, options)
    );

    if (options.stopOnFirstError) {
      // 첫 번째 오류에서 중단
      const results = await Promise.allSettled(executionPromises);
      const firstError = results.find(result => result.status === 'rejected');
      if (firstError) {
        logger.warn(`Stopping batch execution due to first error: ${firstError.reason}`);
      }
    } else {
      // 모든 실행 완료까지 대기
      await Promise.allSettled(executionPromises);
    }
  }

  /**
   * 순차 실행
   */
  private async executeSequential(
    batchId: number,
    hosts: Array<{ id: number; name: string; ip: string; port: number; username: string; password?: string; privateKey?: string; keyPassword?: string }>,
    command: string,
    options: {
      timeout: number;
      retryCount: number;
      retryDelay: number;
      stopOnFirstError: boolean;
    }
  ): Promise<void> {
    for (const host of hosts) {
      if (!this.running) break;

      try {
        await this.executeOnHost(batchId, host, command, options);
      } catch (error) {
        if (options.stopOnFirstError) {
          logger.warn(`Stopping sequential execution due to error on host ${host.name}: ${error}`);
          break;
        }
      }
    }
  }

  /**
   * 단일 호스트에서 명령 실행
   */
  private async executeOnHost(
    batchId: number,
    host: { id: number; name: string; ip: string; port: number; username: string; password?: string; privateKey?: string; keyPassword?: string },
    command: string,
    options: {
      timeout: number;
      retryCount: number;
      retryDelay: number;
    }
  ): Promise<void> {
    const startTime = new Date();
    let retryAttempt = 0;

    while (retryAttempt <= options.retryCount && this.running) {
      try {
        // 실행 시작 상태 업데이트
        await db
          .update(batchExecutionResults)
          .set({
            status: 'running',
            retryAttempt,
            startTime: startTime.toISOString(),
          })
          .where(and(
            eq(batchExecutionResults.batchId, batchId),
            eq(batchExecutionResults.hostId, host.id)
          ));

        logger.debug(`Executing command on host ${host.name} (attempt ${retryAttempt + 1})`);

        // SSH 연결 생성
        const sshConfig: SSHConnectionConfig = {
          host: host.ip,
          port: host.port,
          username: host.username,
          password: host.password,
          privateKey: host.privateKey ? Buffer.from(host.privateKey, 'utf8') : undefined,
          passphrase: host.keyPassword,
          timeout: options.timeout * 1000,
        };

        const conn = await this.sshManager.createConnection(host.id, sshConfig);

        // 명령 실행
        const result = await executeSSHCommand(conn, command, {
          timeout: options.timeout * 1000,
        });

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        // 성공 결과 저장
        await db
          .update(batchExecutionResults)
          .set({
            status: 'completed',
            exitCode: result.exitCode,
            output: result.stdout,
            errorOutput: result.stderr,
            endTime: endTime.toISOString(),
            duration,
          })
          .where(and(
            eq(batchExecutionResults.batchId, batchId),
            eq(batchExecutionResults.hostId, host.id)
          ));

        logger.success(`Command completed on host ${host.name} in ${duration}ms`);
        return;

      } catch (error) {
        retryAttempt++;
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        const isLastAttempt = retryAttempt > options.retryCount;
        const status = isLastAttempt ? 'failed' : 'pending';

        let errorMessage = 'Unknown error';
        let exitCode: number | null = null;
        let errorOutput = '';

        if (error instanceof SSHConnectionError) {
          errorMessage = `SSH Connection Error: ${error.message}`;
        } else if (error instanceof SSHCommandError) {
          errorMessage = `SSH Command Error: ${error.message}`;
          exitCode = error.exitCode;
          errorOutput = error.stderr;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        // 실패 결과 저장
        await db
          .update(batchExecutionResults)
          .set({
            status,
            exitCode,
            errorOutput,
            endTime: endTime.toISOString(),
            duration,
            error: errorMessage,
          })
          .where(and(
            eq(batchExecutionResults.batchId, batchId),
            eq(batchExecutionResults.hostId, host.id)
          ));

        if (isLastAttempt) {
          logger.error(`Command failed on host ${host.name} after ${retryAttempt} attempts: ${errorMessage}`);
          throw error;
        } else {
          logger.warn(`Command failed on host ${host.name} (attempt ${retryAttempt}), retrying in ${options.retryDelay}s: ${errorMessage}`);
          await this.sleep(options.retryDelay * 1000);
        }
      }
    }
  }

  /**
   * 배치 실행 최종 상태 업데이트
   */
  private async updateBatchStatus(batchId: number): Promise<void> {
    // 실행 결과 집계
    const results = await db
      .select({
        status: batchExecutionResults.status,
      })
      .from(batchExecutionResults)
      .where(eq(batchExecutionResults.batchId, batchId));

    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const total = results.length;

    const batchStatus = failed === 0 ? 'completed' : (completed === 0 ? 'failed' : 'completed');

    await db
      .update(batchExecutions)
      .set({
        status: batchStatus,
        completedHosts: completed,
        failedHosts: failed,
        endTime: new Date().toISOString(),
      })
      .where(eq(batchExecutions.id, batchId));

    logger.info(`Batch execution ${batchId} completed: ${completed}/${total} succeeded, ${failed}/${total} failed`);
  }

  /**
   * 실행 취소
   */
  cancel(): void {
    this.running = false;
    logger.info('Batch execution cancellation requested');
  }

  /**
   * 대기 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 배치 실행 서비스
class BatchExecutionService {
  private executionEngines = new Map<number, ParallelExecutionEngine>();

  /**
   * 배치 실행 생성
   */
  async createExecution(request: BatchExecutionRequest): Promise<any> {
    // 대상 호스트 결정
    let targetHostIds: number[];

    if (request.serverGroupId) {
      // 서버 그룹의 멤버 조회
      const groupMembers = await db
        .select({ hostId: serverGroupMembers.hostId })
        .from(serverGroupMembers)
        .innerJoin(serverGroups, eq(serverGroupMembers.groupId, serverGroups.id))
        .where(and(
          eq(serverGroups.id, request.serverGroupId),
          eq(serverGroups.userId, request.userId)
        ));

      targetHostIds = groupMembers.map(m => m.hostId);
    } else if (request.targetHosts) {
      // 사용자 소유의 호스트인지 확인
      const validHosts = await db
        .select({ id: sshData.id })
        .from(sshData)
        .where(and(
          eq(sshData.userId, request.userId),
          inArray(sshData.id, request.targetHosts)
        ));

      targetHostIds = validHosts.map(h => h.id);
    } else {
      throw new Error('Either serverGroupId or targetHosts must be provided');
    }

    if (targetHostIds.length === 0) {
      throw new Error('No valid target hosts found');
    }

    // 배치 실행 레코드 생성
    const batchExecution = await db
      .insert(batchExecutions)
      .values({
        userId: request.userId,
        name: request.name,
        description: request.description,
        command: request.command,
        serverGroupId: request.serverGroupId,
        targetHosts: request.targetHosts ? JSON.stringify(request.targetHosts) : null,
        executionType: request.executionType,
        timeout: request.timeout,
        retryCount: request.retryCount,
        retryDelay: request.retryDelay,
        stopOnFirstError: request.stopOnFirstError,
        totalHosts: targetHostIds.length,
      })
      .returning();

    const batchId = batchExecution[0].id;

    // 백그라운드에서 실행 시작
    this.startExecution(batchId, targetHostIds, request);

    return batchExecution[0];
  }

  /**
   * 배치 실행 시작 (백그라운드)
   */
  private async startExecution(
    batchId: number,
    targetHostIds: number[],
    request: BatchExecutionRequest
  ): Promise<void> {
    try {
      // 대상 호스트 정보 조회
      const hosts = await db
        .select({
          id: sshData.id,
          name: sshData.name,
          ip: sshData.ip,
          port: sshData.port,
          username: sshData.username,
          password: sshData.password,
          privateKey: sshData.key,
          keyPassword: sshData.keyPassword,
        })
        .from(sshData)
        .where(inArray(sshData.id, targetHostIds));

      // 실행 엔진 생성 및 실행
      const engine = new ParallelExecutionEngine();
      this.executionEngines.set(batchId, engine);

      await engine.executeBatch(batchId, hosts, request.command, {
        executionType: request.executionType,
        timeout: request.timeout,
        retryCount: request.retryCount,
        retryDelay: request.retryDelay,
        stopOnFirstError: request.stopOnFirstError,
      });

    } catch (error) {
      logger.error(`Background execution failed for batch ${batchId}`, error);
    } finally {
      this.executionEngines.delete(batchId);
    }
  }

  /**
   * 배치 실행 취소
   */
  async cancelExecution(batchId: number, userId: string): Promise<boolean> {
    // 권한 확인
    const execution = await db
      .select()
      .from(batchExecutions)
      .where(and(
        eq(batchExecutions.id, batchId),
        eq(batchExecutions.userId, userId)
      ))
      .limit(1);

    if (execution.length === 0) {
      return false;
    }

    const currentStatus = execution[0].status;
    if (currentStatus !== 'pending' && currentStatus !== 'running') {
      return false; // 이미 완료된 실행
    }

    // 실행 엔진 취소
    const engine = this.executionEngines.get(batchId);
    if (engine) {
      engine.cancel();
    }

    // 상태 업데이트
    await db
      .update(batchExecutions)
      .set({
        status: 'cancelled',
        endTime: new Date().toISOString(),
      })
      .where(eq(batchExecutions.id, batchId));

    // 실행 중인 호스트 결과도 취소로 업데이트
    await db
      .update(batchExecutionResults)
      .set({
        status: 'cancelled',
        endTime: new Date().toISOString(),
      })
      .where(and(
        eq(batchExecutionResults.batchId, batchId),
        inArray(batchExecutionResults.status, ['pending', 'running'])
      ));

    return true;
  }
}

// 싱글톤 인스턴스
export const batchExecutionService = new BatchExecutionService();