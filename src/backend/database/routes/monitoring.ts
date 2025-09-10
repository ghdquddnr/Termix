/**
 * Monitoring Routes
 * 프로세스 모니터링 API 엔드포인트
 */

import express, { type Request, type Response } from 'express';
import { Client } from 'ssh2';
import { 
  createSSHConnection, 
  executeSSHCommand, 
  closeSSHConnection,
  sshConnectionPool,
  SSHConnectionError,
  SSHCommandError,
  type SSHConnectionConfig 
} from '../../ssh/ssh-utils.js';
import { 
  parsePsAuxOutput,
  parseExtendedPsOutput,
  parseSystemInfo,
  applyProcessFilter,
  sortProcesses,
  paginateProcesses
} from '../../utils/process-parser.js';
import {
  type ProcessInfo,
  type ProcessListResponse,
  type ProcessListOptions,
  ProcessSortField,
  type ProcessMonitoringError,
  ProcessErrorCode,
  type SystemInfo
} from '../../types/process-monitoring.js';
import { db } from '../db/index.js';
import { sshData } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { asc } from 'drizzle-orm';

const router = express.Router();

// 로깅 유틸리티
const logError = (message: string, error: any) => {
  console.error(`[MONITORING] ${message}:`, error);
};

const logInfo = (message: string) => {
  console.log(`[MONITORING] ${message}`);
};

/**
 * SSH 호스트 정보를 데이터베이스에서 가져옵니다.
 */
async function getSSHHostInfo(hostId: string): Promise<SSHConnectionConfig | null> {
  try {
    const result = await db.select({
      host: sshData.ip,
      port: sshData.port,
      username: sshData.username,
      password: sshData.password,
      privateKey: sshData.key,
      passphrase: sshData.keyPassword
    }).from(sshData).where(eq(sshData.id, parseInt(hostId, 10)));

    if (!result || result.length === 0) {
      return null;
    }

    const hostData = result[0];
    return {
      host: hostData.host,
      port: hostData.port || 22,
      username: hostData.username,
      password: hostData.password,
      privateKey: hostData.privateKey,
      passphrase: hostData.passphrase,
      timeout: 30000
    };
  } catch (error) {
    logError('Failed to get SSH host info', error);
    return null;
  }
}

/**
 * 에러 응답을 생성합니다.
 */
function createErrorResponse(
  code: ProcessErrorCode,
  message: string,
  details?: any
): ProcessMonitoringError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * GET /api/monitoring/processes/:hostId
 * 특정 호스트의 프로세스 목록을 조회합니다.
 */
router.get('/processes/:hostId', async (req: Request, res: Response) => {
  const { hostId } = req.params;
  const {
    sortBy = ProcessSortField.CPU,
    sortOrder = 'desc',
    user,
    command,
    state,
    minCpu,
    maxCpu,
    minMemory,
    maxMemory,
    excludeKernel = 'false',
    excludeZombies = 'false',
    limit,
    offset
  } = req.query;

  logInfo(`Getting process list for host: ${hostId}`);

  try {
    // SSH 호스트 정보 조회
    const sshConfig = await getSSHHostInfo(hostId);
    if (!sshConfig) {
      return res.status(404).json(
        createErrorResponse(
          ProcessErrorCode.SSH_CONNECTION_FAILED,
          'SSH host not found'
        )
      );
    }

    // SSH 연결 생성
    let conn: Client;
    try {
      conn = await sshConnectionPool.getConnection(sshConfig);
    } catch (error) {
      logError(`SSH connection failed for host ${hostId}`, error);
      return res.status(500).json(
        createErrorResponse(
          ProcessErrorCode.SSH_CONNECTION_FAILED,
          error instanceof SSHConnectionError ? error.message : 'SSH connection failed',
          { host: sshConfig.host, port: sshConfig.port }
        )
      );
    }

    try {
      // 여러 명령어를 병렬로 실행
      const commands = [
        'ps aux',                                    // 기본 프로세스 정보
        'cat /proc/uptime',                         // 시스템 가동 시간
        'cat /proc/meminfo | head -n 5',           // 메모리 정보
        'cat /proc/loadavg',                        // 로드 평균
        'cat /proc/cpuinfo | grep processor | wc -l' // CPU 코어 수
      ];

      const results = await Promise.allSettled(
        commands.map(cmd => executeSSHCommand(conn, cmd, { timeout: 10000 }))
      );

      // 프로세스 정보 파싱
      let processes: ProcessInfo[] = [];
      if (results[0].status === 'fulfilled') {
        processes = parsePsAuxOutput(results[0].value.stdout);
      } else {
        throw new Error('Failed to get process information');
      }

      // 시스템 정보 수집
      let systemInfo: SystemInfo;
      try {
        const uptimeOutput = results[1].status === 'fulfilled' ? results[1].value.stdout : '';
        const meminfoOutput = results[2].status === 'fulfilled' ? results[2].value.stdout : '';
        const loadavgOutput = results[3].status === 'fulfilled' ? results[3].value.stdout : '';
        const cpuCountOutput = results[4].status === 'fulfilled' ? results[4].value.stdout : '1';

        systemInfo = parseSystemInfo(uptimeOutput, meminfoOutput, loadavgOutput, cpuCountOutput);
        systemInfo.processCount = processes.length;
      } catch (error) {
        logError('Failed to parse system info', error);
        systemInfo = {
          uptime: 0,
          loadAverage: [0, 0, 0],
          totalMemoryKB: 0,
          freeMemoryKB: 0,
          usedMemoryKB: 0,
          cpuCount: 1,
          processCount: processes.length
        };
      }

      // 필터 적용
      const filter = {
        user: user as string,
        command: command as string,
        state: state as any,
        minCpu: minCpu ? parseFloat(minCpu as string) : undefined,
        maxCpu: maxCpu ? parseFloat(maxCpu as string) : undefined,
        minMemory: minMemory ? parseFloat(minMemory as string) : undefined,
        maxMemory: maxMemory ? parseFloat(maxMemory as string) : undefined,
        excludeKernel: excludeKernel === 'true',
        excludeZombies: excludeZombies === 'true'
      };

      const filteredProcesses = applyProcessFilter(processes, filter);

      // 정렬 적용
      const sortedProcesses = sortProcesses(
        filteredProcesses,
        sortBy as ProcessSortField,
        sortOrder as 'asc' | 'desc'
      );

      // 페이지네이션 적용
      const limitNum = limit ? parseInt(limit as string, 10) : undefined;
      const offsetNum = offset ? parseInt(offset as string, 10) : undefined;
      const paginatedProcesses = paginateProcesses(sortedProcesses, limitNum, offsetNum);

      // 응답 생성
      const response: ProcessListResponse = {
        processes: paginatedProcesses,
        total: processes.length,
        filtered: filteredProcesses.length,
        timestamp: new Date().toISOString(),
        hostname: sshConfig.host,
        systemInfo
      };

      logInfo(`Successfully retrieved ${paginatedProcesses.length} processes from host ${hostId}`);
      res.json(response);

    } finally {
      // 연결 반환
      sshConnectionPool.releaseConnection(sshConfig);
    }

  } catch (error) {
    logError(`Error getting process list for host ${hostId}`, error);
    
    if (error instanceof SSHCommandError) {
      res.status(500).json(
        createErrorResponse(
          ProcessErrorCode.COMMAND_EXECUTION_FAILED,
          `Command execution failed: ${error.message}`,
          { command: error.command, exitCode: error.exitCode, stderr: error.stderr }
        )
      );
    } else {
      res.status(500).json(
        createErrorResponse(
          ProcessErrorCode.SYSTEM_ERROR,
          'Internal server error',
          { error: error instanceof Error ? error.message : String(error) }
        )
      );
    }
  }
});

/**
 * GET /api/monitoring/processes/:hostId/:pid
 * 특정 프로세스의 상세 정보를 조회합니다.
 */
router.get('/processes/:hostId/:pid', async (req: Request, res: Response) => {
  const { hostId, pid } = req.params;

  logInfo(`Getting process details for PID ${pid} on host ${hostId}`);

  try {
    const sshConfig = await getSSHHostInfo(hostId);
    if (!sshConfig) {
      return res.status(404).json(
        createErrorResponse(
          ProcessErrorCode.SSH_CONNECTION_FAILED,
          'SSH host not found'
        )
      );
    }

    const conn = await sshConnectionPool.getConnection(sshConfig);

    try {
      // 특정 프로세스 정보 조회
      const command = `ps -p ${pid} -o user,pid,ppid,%cpu,%mem,vsz,rss,tty,stat,start,time,nice,comm,args --no-headers`;
      const result = await executeSSHCommand(conn, command, { timeout: 5000 });

      if (!result.stdout.trim()) {
        return res.status(404).json(
          createErrorResponse(
            ProcessErrorCode.PROCESS_NOT_FOUND,
            `Process with PID ${pid} not found`
          )
        );
      }

      const processes = parseExtendedPsOutput(`HEADER\n${result.stdout}`);
      const process = processes[0];

      if (!process) {
        return res.status(404).json(
          createErrorResponse(
            ProcessErrorCode.PROCESS_NOT_FOUND,
            `Failed to parse process information for PID ${pid}`
          )
        );
      }

      logInfo(`Successfully retrieved process details for PID ${pid}`);
      res.json(process);

    } finally {
      sshConnectionPool.releaseConnection(sshConfig);
    }

  } catch (error) {
    logError(`Error getting process details for PID ${pid}`, error);
    
    if (error instanceof SSHCommandError) {
      res.status(500).json(
        createErrorResponse(
          ProcessErrorCode.COMMAND_EXECUTION_FAILED,
          `Command execution failed: ${error.message}`,
          { command: error.command, exitCode: error.exitCode }
        )
      );
    } else {
      res.status(500).json(
        createErrorResponse(
          ProcessErrorCode.SYSTEM_ERROR,
          'Internal server error'
        )
      );
    }
  }
});

/**
 * GET /api/monitoring/system/:hostId
 * 시스템 정보를 조회합니다.
 */
router.get('/system/:hostId', async (req: Request, res: Response) => {
  const { hostId } = req.params;

  logInfo(`Getting system info for host: ${hostId}`);

  try {
    const sshConfig = await getSSHHostInfo(hostId);
    if (!sshConfig) {
      return res.status(404).json(
        createErrorResponse(
          ProcessErrorCode.SSH_CONNECTION_FAILED,
          'SSH host not found'
        )
      );
    }

    const conn = await sshConnectionPool.getConnection(sshConfig);

    try {
      const commands = [
        'uptime',
        'cat /proc/meminfo',
        'cat /proc/loadavg',
        'nproc',
        'ps aux | wc -l'
      ];

      const results = await Promise.allSettled(
        commands.map(cmd => executeSSHCommand(conn, cmd, { timeout: 5000 }))
      );

      const uptimeOutput = results[0].status === 'fulfilled' ? results[0].value.stdout : '';
      const meminfoOutput = results[1].status === 'fulfilled' ? results[1].value.stdout : '';
      const loadavgOutput = results[2].status === 'fulfilled' ? results[2].value.stdout : '';
      const cpuCountOutput = results[3].status === 'fulfilled' ? results[3].value.stdout : '1';
      const processCountOutput = results[4].status === 'fulfilled' ? results[4].value.stdout : '0';

      const systemInfo = parseSystemInfo(uptimeOutput, meminfoOutput, loadavgOutput, cpuCountOutput);
      systemInfo.processCount = parseInt(processCountOutput.trim(), 10) - 1; // 헤더 제외

      logInfo(`Successfully retrieved system info for host ${hostId}`);
      res.json({
        ...systemInfo,
        hostname: sshConfig.host,
        timestamp: new Date().toISOString()
      });

    } finally {
      sshConnectionPool.releaseConnection(sshConfig);
    }

  } catch (error) {
    logError(`Error getting system info for host ${hostId}`, error);
    
    res.status(500).json(
      createErrorResponse(
        ProcessErrorCode.SYSTEM_ERROR,
        'Failed to retrieve system information'
      )
    );
  }
});

/**
 * GET /api/monitoring/hosts
 * 모니터링 가능한 호스트 목록을 조회합니다.
 */
router.get('/hosts', async (req: Request, res: Response) => {
  try {
    const result = await db.select({
      id: sshData.id,
      host: sshData.ip,
      port: sshData.port,
      username: sshData.username,
      createdAt: sshData.createdAt
    }).from(sshData).orderBy(asc(sshData.ip));

    const hosts = result.map((row) => ({
      id: row.id,
      host: row.host,
      port: row.port,
      username: row.username,
      createdAt: row.createdAt
    }));

    res.json(hosts);
  } catch (error) {
    logError('Error getting host list', error);
    res.status(500).json(
      createErrorResponse(
        ProcessErrorCode.SYSTEM_ERROR,
        'Failed to retrieve host list'
      )
    );
  }
});

export default router;