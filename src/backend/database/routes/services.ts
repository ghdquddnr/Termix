/**
 * Service Management Routes
 * systemd 서비스 관리 API 엔드포인트
 */

import express, { type Request, type Response } from 'express';
import { Client } from 'ssh2';
import { 
  createSSHConnection, 
  executeSSHCommand, 
  SSHConnectionError,
  SSHCommandError,
  type SSHConnectionConfig,
  type CommandResult
} from '../../ssh/ssh-utils.js';
import {
  parseSystemctlListUnits,
  parseSystemctlShow,
  convertToServiceInfo,
  parseJournalctlOutput,
  applyServiceFilter,
  sortServices,
  paginateServices,
  calculateServiceStatistics
} from '../../utils/service-parser.js';
import {
  type ServiceInfo,
  type ServiceListResponse,
  type ServiceListOptions,
  type ServiceFilter,
  ServiceSortField,
  type ServiceActionRequest,
  type ServiceActionResponse,
  type ServiceStatusResponse,
  type ServiceLogOptions,
  type ServiceLogResponse,
  type ServiceStatistics,
  ServiceAction,
  ServiceActiveState,
  ServiceUnitType,
  ServiceErrorCode,
  type ServiceMonitoringError
} from '../../types/service-monitoring.js';
import { db } from '../db/index.js';
import { sshData } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// 로깅 유틸리티
const logError = (message: string, error: any) => {
  console.error(`[SERVICES] ${message}:`, error);
};

const logInfo = (message: string) => {
  console.log(`[SERVICES] ${message}`);
};

/**
 * SSH 호스트 정보 조회
 */
async function getSSHHost(hostId: number): Promise<SSHConnectionConfig> {
  const hosts = await db.select().from(sshData).where(eq(sshData.id, hostId));
  
  if (hosts.length === 0) {
    throw {
      code: ServiceErrorCode.SERVICE_NOT_FOUND,
      message: `SSH host with ID ${hostId} not found`,
      hostId,
      timestamp: new Date().toISOString()
    } as ServiceMonitoringError;
  }
  
  const host = hosts[0];
  return {
    host: host.ip,
    port: host.port,
    username: host.username,
    password: host.password || undefined,
    privateKey: host.key || undefined,
    passphrase: host.keyPassword || undefined
  };
}

/**
 * 에러 응답 생성
 */
function createErrorResponse(error: any, hostId?: number, serviceName?: string): ServiceMonitoringError {
  if (error.code && Object.values(ServiceErrorCode).includes(error.code)) {
    return error;
  }
  
  let errorCode = ServiceErrorCode.UNKNOWN_ERROR;
  let message = 'Unknown error occurred';
  
  if (error instanceof SSHConnectionError) {
    errorCode = ServiceErrorCode.SSH_ERROR;
    message = `SSH connection failed: ${error.message}`;
  } else if (error instanceof SSHCommandError) {
    if (error.message.includes('Permission denied')) {
      errorCode = ServiceErrorCode.PERMISSION_DENIED;
      message = 'Permission denied. sudo privileges may be required.';
    } else if (error.message.includes('Unit not found')) {
      errorCode = ServiceErrorCode.SERVICE_NOT_FOUND;
      message = `Service '${serviceName}' not found`;
    } else {
      errorCode = ServiceErrorCode.SYSTEMCTL_ERROR;
      message = `systemctl command failed: ${error.message}`;
    }
  } else if (error.message) {
    message = error.message;
  }
  
  return {
    code: errorCode,
    message,
    serviceName,
    hostId,
    details: error,
    timestamp: new Date().toISOString()
  };
}

/**
 * GET /api/services/:hostId
 * systemd 서비스 목록 조회
 */
router.get('/:hostId', async (req: Request, res: Response) => {
  const hostId = parseInt(req.params.hostId, 10);
  
  if (isNaN(hostId)) {
    return res.status(400).json({
      error: 'Invalid host ID',
      code: ServiceErrorCode.SERVICE_NOT_FOUND
    });
  }
  
  try {
    const sshConfig = await getSSHHost(hostId);
        
    logInfo(`Fetching service list for host ${hostId}`);
    
    // SSH 연결 생성
    const connection = await createSSHConnection(sshConfig);
    
    try {
      // systemctl list-units 실행
      const listCommand = req.query.all === 'true' 
        ? 'systemctl list-units --all --no-pager --plain' 
        : 'systemctl list-units --no-pager --plain';
        
      const listResult = await executeSSHCommand(connection, listCommand, { timeout: 10000 });
      if (!listResult.success) {
        throw new SSHCommandError(`systemctl list-units failed: ${listResult.stderr}`, listCommand, listResult.exitCode, listResult.stderr);
      }
      const listOutput = listResult.stdout;
      logInfo(`systemctl list-units output length: ${listOutput.length} characters`);
      
      // 출력 파싱
      const systemctlData = parseSystemctlListUnits(listOutput);
      logInfo(`Parsed ${systemctlData.length} services from systemctl output`);
      
      // 옵션 파싱
      const options: ServiceListOptions = {
        includeDetails: req.query.details === 'true',
        includeInactive: req.query.inactive === 'true',
        sortBy: (req.query.sortBy as ServiceSortField) || ServiceSortField.NAME,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 50, 1000),
        pattern: req.query.pattern as string,
        unitType: req.query.unitType as ServiceUnitType,
      };
      
      // ServiceInfo로 변환
      let services: ServiceInfo[] = systemctlData.map(data => convertToServiceInfo(data));
      
      // 상세 정보 포함 시 systemctl show 실행
      if (options.includeDetails && services.length > 0) {
        const serviceNames = services.slice(0, 20).map(s => s.name); // 최대 20개만
        const showCommand = `systemctl show ${serviceNames.join(' ')} --no-pager`;
        
        try {
          const showResult = await executeSSHCommand(connection, showCommand, { timeout: 15000 });
          if (showResult.success) {
            const showData = parseSystemctlShow(showResult.stdout);
            // 상세 정보 추가 (실제로는 각 서비스별로 별도 파싱이 필요)
            // 여기서는 단순화된 버전으로 구현
          }
        } catch (showError) {
          logError('Failed to get detailed service info', showError);
          // 상세 정보 실패해도 기본 정보는 반환
        }
      }
      
      // 필터 적용
      const filter: ServiceFilter = {
        name: req.query.search as string,
        unitType: req.query.unitType ? [req.query.unitType as ServiceUnitType] : undefined,
        enabledOnly: req.query.enabledOnly === 'true',
        runningOnly: req.query.runningOnly === 'true'
      };
      
      services = applyServiceFilter(services, filter);
      
      // 정렬
      services = sortServices(services, options.sortBy!, options.sortOrder!);
      
      // 페이징
      const totalServices = services.length;
      services = paginateServices(services, options.page!, options.limit!);
      
      // 통계 계산
      const stats = calculateServiceStatistics(services);
      
      // 응답 생성
      const response: ServiceListResponse = {
        hostId,
        hostname: sshConfig.host,
        timestamp: new Date().toISOString(),
        totalServices,
        services,
        summary: {
          active: stats.byState[ServiceActiveState.ACTIVE] || 0,
          inactive: stats.byState[ServiceActiveState.INACTIVE] || 0,
          failed: stats.byState[ServiceActiveState.FAILED] || 0,
          activating: stats.byState[ServiceActiveState.ACTIVATING] || 0,
          deactivating: stats.byState[ServiceActiveState.DEACTIVATING] || 0
        }
      };
      
      logInfo(`Returning ${services.length} services (${totalServices} total)`);
      res.json(response);
      
    } finally {
      connection.end();
    }
    
  } catch (error) {
    logError(`Failed to fetch services for host ${hostId}`, error);
    const errorResponse = createErrorResponse(error, hostId);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/services/:hostId/:serviceName/status
 * 특정 서비스의 상태 조회
 */
router.get('/:hostId/:serviceName/status', async (req: Request, res: Response) => {
  const hostId = parseInt(req.params.hostId, 10);
  const serviceName = req.params.serviceName;
  
  if (isNaN(hostId)) {
    return res.status(400).json({
      error: 'Invalid host ID',
      code: ServiceErrorCode.SERVICE_NOT_FOUND
    });
  }
  
  try {
    const sshConfig = await getSSHHost(hostId);
        
    logInfo(`Fetching status for service ${serviceName} on host ${hostId}`);
    
    const connection = await createSSHConnection(sshConfig);
    
    try {
      // systemctl show로 상세 정보 조회
      const showCommand = `systemctl show ${serviceName} --no-pager`;
      const showResult = await executeSSHCommand(connection, showCommand, { timeout: 10000 });
      if (!showResult.success) {
        throw new SSHCommandError(`systemctl show failed: ${showResult.stderr}`, showCommand, showResult.exitCode, showResult.stderr);
      }
      const showData = parseSystemctlShow(showResult.stdout);
      
      // systemctl list-units로 기본 정보 조회
      const listCommand = `systemctl list-units ${serviceName} --no-pager --plain`;
      const listResult = await executeSSHCommand(connection, listCommand, { timeout: 5000 });
      if (!listResult.success) {
        throw new SSHCommandError(`systemctl list-units failed: ${listResult.stderr}`, listCommand, listResult.exitCode, listResult.stderr);
      }
      const listData = parseSystemctlListUnits(listResult.stdout);
      
      if (listData.length === 0) {
        throw {
          code: ServiceErrorCode.SERVICE_NOT_FOUND,
          message: `Service '${serviceName}' not found`,
          serviceName,
          hostId,
          timestamp: new Date().toISOString()
        };
      }
      
      // ServiceInfo로 변환
      const service = convertToServiceInfo(listData[0], showData);
      
      const response: ServiceStatusResponse = {
        service
      };
      
      // 최근 로그 포함 요청 시
      if (req.query.logs === 'true') {
        try {
          const logCommand = `journalctl -u ${serviceName} -n 10 --no-pager -o json`;
          const logResult = await executeSSHCommand(connection, logCommand, { timeout: 5000 });
          if (logResult.success) {
            const logEntries = parseJournalctlOutput(logResult.stdout);
            response.recentLogs = logEntries.map(entry => entry.message);
          }
        } catch (logError) {
          logError('Failed to fetch recent logs', logError);
          // 로그 조회 실패해도 서비스 정보는 반환
        }
      }
      
      // 관련 프로세스 포함 요청 시
      if (req.query.processes === 'true' && service.mainPid) {
        try {
          const psCommand = `ps -p ${service.mainPid} -o pid,comm,pcpu,pmem --no-headers`;
          const psResult = await executeSSHCommand(connection, psCommand, { timeout: 3000 });
          
          if (psResult.success && psResult.stdout.trim()) {
            const lines = psResult.stdout.trim().split('\n');
            response.processes = lines.map(line => {
              const parts = line.trim().split(/\s+/);
              return {
                pid: parseInt(parts[0]),
                command: parts[1],
                cpu: parseFloat(parts[2]),
                memory: parseFloat(parts[3])
              };
            });
          }
        } catch (processError) {
          logError('Failed to fetch process info', processError);
          // 프로세스 조회 실패해도 서비스 정보는 반환
        }
      }
      
      res.json(response);
      
    } finally {
      connection.end();
    }
    
  } catch (error) {
    logError(`Failed to fetch status for service ${serviceName} on host ${hostId}`, error);
    const errorResponse = createErrorResponse(error, hostId, serviceName);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /api/services/:hostId/:serviceName/action
 * 서비스 제어 (시작, 중지, 재시작 등)
 */
router.post('/:hostId/:serviceName/action', async (req: Request, res: Response) => {
  const hostId = parseInt(req.params.hostId, 10);
  const serviceName = req.params.serviceName;
  const actionRequest: ServiceActionRequest = req.body;
  
  if (isNaN(hostId)) {
    return res.status(400).json({
      error: 'Invalid host ID',
      code: ServiceErrorCode.SERVICE_NOT_FOUND
    });
  }
  
  if (!actionRequest.action || !Object.values(ServiceAction).includes(actionRequest.action)) {
    return res.status(400).json({
      error: 'Invalid action',
      code: ServiceErrorCode.INVALID_ACTION
    });
  }
  
  const startTime = Date.now();
  
  try {
    const sshConfig = await getSSHHost(hostId);
        
    logInfo(`Executing action ${actionRequest.action} on service ${serviceName} (host ${hostId})`);
    
    const connection = await createSSHConnection(sshConfig);
    
    try {
      // 현재 상태 조회
      const statusCommand = `systemctl is-active ${serviceName}`;
      let previousState: ServiceActiveState;
      
      try {
        const statusResult = await executeSSHCommand(connection, statusCommand, { timeout: 3000 });
        previousState = statusResult.success && statusResult.stdout.trim() === 'active' ? ServiceActiveState.ACTIVE : ServiceActiveState.INACTIVE;
      } catch (statusError) {
        previousState = ServiceActiveState.INACTIVE;
      }
      
      // systemctl 명령어 구성
      let command: string;
      const forceFlag = actionRequest.force ? ' --force' : '';
      const noReloadFlag = actionRequest.noReload ? ' --no-reload' : '';
      
      switch (actionRequest.action) {
        case ServiceAction.START:
          command = `sudo systemctl start ${serviceName}${forceFlag}`;
          break;
        case ServiceAction.STOP:
          command = `sudo systemctl stop ${serviceName}${forceFlag}`;
          break;
        case ServiceAction.RESTART:
          command = `sudo systemctl restart ${serviceName}${forceFlag}`;
          break;
        case ServiceAction.RELOAD:
          command = `sudo systemctl reload ${serviceName}${forceFlag}`;
          break;
        case ServiceAction.ENABLE:
          command = `sudo systemctl enable ${serviceName}${noReloadFlag}`;
          break;
        case ServiceAction.DISABLE:
          command = `sudo systemctl disable ${serviceName}${noReloadFlag}`;
          break;
        default:
          throw {
            code: ServiceErrorCode.INVALID_ACTION,
            message: `Invalid action: ${actionRequest.action}`,
            serviceName,
            hostId,
            timestamp: new Date().toISOString()
          };
      }
      
      // 명령어 실행
      const result = await executeSSHCommand(connection, command, { timeout: 30000 }); // 30초 타임아웃
      if (!result.success) {
        throw new SSHCommandError(`Command failed: ${result.stderr}`, command, result.exitCode, result.stderr);
      }
      
      // 실행 후 상태 확인
      let currentState: ServiceActiveState;
      try {
        const newStatusResult = await executeSSHCommand(connection, statusCommand, { timeout: 3000 });
        currentState = newStatusResult.success && newStatusResult.stdout.trim() === 'active' ? ServiceActiveState.ACTIVE : ServiceActiveState.INACTIVE;
      } catch (statusError) {
        currentState = ServiceActiveState.INACTIVE;
      }
      
      const executionTime = Date.now() - startTime;
      
      const response: ServiceActionResponse = {
        success: true,
        action: actionRequest.action,
        serviceName,
        message: `Successfully executed ${actionRequest.action} on ${serviceName}`,
        timestamp: new Date().toISOString(),
        previousState,
        currentState,
        executionTime
      };
      
      logInfo(`Action ${actionRequest.action} completed for ${serviceName} in ${executionTime}ms`);
      res.json(response);
      
    } finally {
      connection.end();
    }
    
  } catch (error) {
    logError(`Failed to execute action ${actionRequest.action} on service ${serviceName}`, error);
    const errorResponse = createErrorResponse(error, hostId, serviceName);
    const executionTime = Date.now() - startTime;
    
    const response: ServiceActionResponse = {
      success: false,
      action: actionRequest.action,
      serviceName,
      message: errorResponse.message,
      timestamp: new Date().toISOString(),
      executionTime
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/services/:hostId/:serviceName/logs
 * 서비스 로그 조회
 */
router.get('/:hostId/:serviceName/logs', async (req: Request, res: Response) => {
  const hostId = parseInt(req.params.hostId, 10);
  const serviceName = req.params.serviceName;
  
  if (isNaN(hostId)) {
    return res.status(400).json({
      error: 'Invalid host ID',
      code: ServiceErrorCode.SERVICE_NOT_FOUND
    });
  }
  
  try {
    const sshConfig = await getSSHHost(hostId);
        
    // 로그 옵션 파싱
    const options: ServiceLogOptions = {
      lines: Math.min(parseInt(req.query.lines as string) || 100, 1000),
      since: req.query.since as string,
      until: req.query.until as string,
      follow: req.query.follow === 'true',
      priority: req.query.priority as string,
      unit: serviceName
    };
    
    logInfo(`Fetching logs for service ${serviceName} on host ${hostId}`);
    
    const connection = await createSSHConnection(sshConfig);
    
    try {
      // journalctl 명령어 구성
      let command = `journalctl -u ${serviceName} -n ${options.lines} --no-pager -o json`;
      
      if (options.since) {
        command += ` --since "${options.since}"`;
      }
      
      if (options.until) {
        command += ` --until "${options.until}"`;
      }
      
      if (options.priority) {
        command += ` -p ${options.priority}`;
      }
      
      const logResult = await executeSSHCommand(connection, command, { timeout: 15000 });
      if (!logResult.success) {
        throw new SSHCommandError(`journalctl failed: ${logResult.stderr}`, command, logResult.exitCode, logResult.stderr);
      }
      const logEntries = parseJournalctlOutput(logResult.stdout);
      
      const response: ServiceLogResponse = {
        serviceName,
        logs: logEntries,
        totalLines: logEntries.length,
        hasMore: logEntries.length === options.lines,
        timestamp: new Date().toISOString()
      };
      
      logInfo(`Retrieved ${logEntries.length} log entries for ${serviceName}`);
      res.json(response);
      
    } finally {
      connection.end();
    }
    
  } catch (error) {
    logError(`Failed to fetch logs for service ${serviceName} on host ${hostId}`, error);
    const errorResponse = createErrorResponse(error, hostId, serviceName);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/services/:hostId/statistics
 * 서비스 통계 조회
 */
router.get('/:hostId/statistics', async (req: Request, res: Response) => {
  const hostId = parseInt(req.params.hostId, 10);
  
  if (isNaN(hostId)) {
    return res.status(400).json({
      error: 'Invalid host ID',
      code: ServiceErrorCode.SERVICE_NOT_FOUND
    });
  }
  
  try {
    const sshConfig = await getSSHHost(hostId);
        
    logInfo(`Fetching service statistics for host ${hostId}`);
    
    const connection = await createSSHConnection(sshConfig);
    
    try {
      // 모든 서비스 조회
      const listCommand = 'systemctl list-units --all --no-pager --plain';
      const listResult = await executeSSHCommand(connection, listCommand, { timeout: 15000 });
      if (!listResult.success) {
        throw new SSHCommandError(`systemctl list-units failed: ${listResult.stderr}`, listCommand, listResult.exitCode, listResult.stderr);
      }
      const systemctlData = parseSystemctlListUnits(listResult.stdout);
      
      // ServiceInfo로 변환
      const services: ServiceInfo[] = systemctlData.map(data => convertToServiceInfo(data));
      
      // 통계 계산
      const statistics = calculateServiceStatistics(services);
      
      logInfo(`Calculated statistics for ${services.length} services`);
      res.json(statistics);
      
    } finally {
      connection.end();
    }
    
  } catch (error) {
    logError(`Failed to fetch service statistics for host ${hostId}`, error);
    const errorResponse = createErrorResponse(error, hostId);
    res.status(500).json(errorResponse);
  }
});

export default router;