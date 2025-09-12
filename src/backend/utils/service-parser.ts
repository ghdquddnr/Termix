/**
 * Service Parser Utilities
 * systemctl 명령어 출력을 파싱하는 유틸리티 함수들
 */

import {
  type ServiceInfo,
  ServiceState,
  ServiceLoadState,
  ServiceActiveState,
  ServiceSubState,
  ServiceUnitType,
  type ServiceFilter,
  ServiceSortField,
  type ServiceListOptions,
  type ServiceStatistics,
  type SystemctlListOutput,
  type SystemctlShowOutput,
  type ServiceLogEntry,
  type ServiceMonitoringError,
  ServiceErrorCode
} from '../types/service-monitoring.js';

/**
 * systemctl list-units 명령어 출력을 파싱합니다
 */
export function parseSystemctlListUnits(output: string): SystemctlListOutput[] {
  const lines = output.trim().split('\n');
  const services: SystemctlListOutput[] = [];
  
  // 헤더 라인들을 건너뛰고 서비스 목록 시작점 찾기
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('UNIT') && line.includes('LOAD') && line.includes('ACTIVE') && line.includes('SUB')) {
      dataStartIndex = i + 1;
      break;
    }
  }
  
  if (dataStartIndex === -1) {
    throw new Error('systemctl list-units output format not recognized');
  }
  
  // 데이터 라인들 파싱
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 빈 라인이나 요약 라인들 건너뛰기
    if (!line || 
        line.includes('LOAD   = Reflects') || 
        line.includes('ACTIVE = The high-level') ||
        line.includes('SUB    = The low-level') ||
        line.includes('loaded units listed') ||
        line.includes('To show all installed') ||
        line.startsWith('●') ||
        line.includes('legend:')) {
      continue;
    }
    
    // 정규표현식을 사용한 파싱 (공백으로 구분된 필드들)
    const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (match) {
      const [, unit, load, active, sub, description] = match;
      services.push({
        unit: unit.trim(),
        load: load.trim(),
        active: active.trim(),
        sub: sub.trim(),
        description: description.trim()
      });
    }
  }
  
  return services;
}

/**
 * systemctl show 명령어 출력을 파싱합니다
 */
export function parseSystemctlShow(output: string): SystemctlShowOutput {
  const lines = output.trim().split('\n');
  const properties: SystemctlShowOutput = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      properties[key] = value;
    }
  }
  
  return properties;
}

/**
 * systemctl list-units와 show 정보를 ServiceInfo로 변환합니다
 */
export function convertToServiceInfo(
  listOutput: SystemctlListOutput,
  showOutput?: SystemctlShowOutput
): ServiceInfo {
  // 기본 정보 추출
  const unitName = listOutput.unit;
  const unitParts = unitName.split('.');
  const unitType = unitParts.length > 1 ? unitParts[unitParts.length - 1] : 'service';
  
  const serviceInfo: ServiceInfo = {
    name: unitName,
    description: listOutput.description || '',
    unitType: parseUnitType(unitType),
    loadState: parseLoadState(listOutput.load),
    activeState: parseActiveState(listOutput.active),
    subState: parseSubState(listOutput.sub)
  };
  
  // show 출력에서 추가 정보 추출
  if (showOutput) {
    serviceInfo.enabledState = showOutput.UnitFileState || undefined;
    serviceInfo.preset = showOutput.UnitFilePreset || undefined;
    
    // PID 정보
    if (showOutput.MainPID && showOutput.MainPID !== '0') {
      serviceInfo.mainPid = parseInt(showOutput.MainPID, 10);
    }
    
    // 메모리 사용량
    if (showOutput.MemoryCurrent) {
      const memoryBytes = parseInt(showOutput.MemoryCurrent, 10);
      if (!isNaN(memoryBytes) && memoryBytes > 0) {
        serviceInfo.memory = formatBytes(memoryBytes);
      }
    }
    
    // CPU 사용량
    if (showOutput.CPUUsageNSec) {
      const cpuNsec = parseInt(showOutput.CPUUsageNSec, 10);
      if (!isNaN(cpuNsec) && cpuNsec > 0) {
        serviceInfo.cpuUsage = formatCpuUsage(cpuNsec);
      }
    }
    
    // 타임스탬프 정보
    serviceInfo.activeEnterTimestamp = parseTimestamp(showOutput.ActiveEnterTimestamp);
    serviceInfo.activeExitTimestamp = parseTimestamp(showOutput.ActiveExitTimestamp);
    serviceInfo.inactiveEnterTimestamp = parseTimestamp(showOutput.InactiveEnterTimestamp);
    serviceInfo.inactiveExitTimestamp = parseTimestamp(showOutput.InactiveExitTimestamp);
    
    // 경로 정보
    serviceInfo.unitPath = showOutput.FragmentPath || undefined;
    if (showOutput.DropInPaths) {
      serviceInfo.dropInPaths = showOutput.DropInPaths.split(' ').filter(path => path.length > 0);
    }
    
    // 의존성 정보
    if (showOutput.Wants) {
      serviceInfo.wants = showOutput.Wants.split(' ').filter(dep => dep.length > 0);
    }
    if (showOutput.WantedBy) {
      serviceInfo.wantedBy = showOutput.WantedBy.split(' ').filter(dep => dep.length > 0);
    }
    if (showOutput.Requires) {
      serviceInfo.requires = showOutput.Requires.split(' ').filter(dep => dep.length > 0);
    }
    if (showOutput.RequiredBy) {
      serviceInfo.requiredBy = showOutput.RequiredBy.split(' ').filter(dep => dep.length > 0);
    }
    if (showOutput.After) {
      serviceInfo.after = showOutput.After.split(' ').filter(dep => dep.length > 0);
    }
    if (showOutput.Before) {
      serviceInfo.before = showOutput.Before.split(' ').filter(dep => dep.length > 0);
    }
    
    // 실행 정보
    serviceInfo.execMainStartTimestamp = parseTimestamp(showOutput.ExecMainStartTimestamp);
    serviceInfo.execMainExitTimestamp = parseTimestamp(showOutput.ExecMainExitTimestamp);
    if (showOutput.ExecMainCode) {
      serviceInfo.execMainCode = parseInt(showOutput.ExecMainCode, 10);
    }
    if (showOutput.ExecMainStatus) {
      serviceInfo.execMainStatus = parseInt(showOutput.ExecMainStatus, 10);
    }
    
    // 문서 URL
    if (showOutput.Documentation) {
      serviceInfo.docs = showOutput.Documentation.split(' ').filter(doc => doc.length > 0);
    }
    
    // 소켓 서비스의 리스닝 스트림
    if (showOutput.Listen) {
      serviceInfo.listenStreams = showOutput.Listen.split(' ').filter(stream => stream.length > 0);
    }
  }
  
  return serviceInfo;
}

/**
 * journalctl 출력을 ServiceLogEntry 배열로 파싱합니다
 */
export function parseJournalctlOutput(output: string): ServiceLogEntry[] {
  const lines = output.trim().split('\n');
  const logEntries: ServiceLogEntry[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      // JSON 형태로 출력된 journalctl 로그 파싱
      const logData = JSON.parse(line);
      
      const entry: ServiceLogEntry = {
        timestamp: logData.__REALTIME_TIMESTAMP 
          ? new Date(parseInt(logData.__REALTIME_TIMESTAMP) / 1000).toISOString()
          : new Date().toISOString(),
        priority: parseInt(logData.PRIORITY) || 6,
        facility: logData.SYSLOG_FACILITY || 'daemon',
        message: logData.MESSAGE || '',
        hostname: logData._HOSTNAME,
        pid: logData._PID ? parseInt(logData._PID) : undefined,
        uid: logData._UID ? parseInt(logData._UID) : undefined,
        gid: logData._GID ? parseInt(logData._GID) : undefined,
        comm: logData._COMM,
        exe: logData._EXE,
        cmdline: logData._CMDLINE
      };
      
      logEntries.push(entry);
    } catch (error) {
      // JSON 파싱 실패 시 일반 텍스트로 처리
      const entry: ServiceLogEntry = {
        timestamp: new Date().toISOString(),
        priority: 6,
        facility: 'daemon',
        message: line
      };
      logEntries.push(entry);
    }
  }
  
  return logEntries;
}

/**
 * 서비스 필터를 적용합니다
 */
export function applyServiceFilter(services: ServiceInfo[], filter: ServiceFilter): ServiceInfo[] {
  return services.filter(service => {
    // 이름 검색
    if (filter.name && !service.name.toLowerCase().includes(filter.name.toLowerCase())) {
      return false;
    }
    
    // 상태 필터
    if (filter.state && filter.state.length > 0) {
      const serviceState = mapActiveStateToServiceState(service.activeState);
      if (!filter.state.includes(serviceState)) {
        return false;
      }
    }
    
    // 타입 필터
    if (filter.unitType && filter.unitType.length > 0 && !filter.unitType.includes(service.unitType)) {
      return false;
    }
    
    // 활성화된 서비스만
    if (filter.enabledOnly && service.enabledState !== 'enabled') {
      return false;
    }
    
    // 실행 중인 서비스만
    if (filter.runningOnly && service.subState !== ServiceSubState.RUNNING) {
      return false;
    }
    
    return true;
  });
}

/**
 * 서비스 목록을 정렬합니다
 */
export function sortServices(
  services: ServiceInfo[], 
  sortBy: ServiceSortField, 
  sortOrder: 'asc' | 'desc' = 'asc'
): ServiceInfo[] {
  return [...services].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case ServiceSortField.NAME:
        compareValue = a.name.localeCompare(b.name);
        break;
        
      case ServiceSortField.STATE:
        compareValue = a.activeState.localeCompare(b.activeState);
        break;
        
      case ServiceSortField.TYPE:
        compareValue = a.unitType.localeCompare(b.unitType);
        break;
        
      case ServiceSortField.DESCRIPTION:
        compareValue = a.description.localeCompare(b.description);
        break;
        
      case ServiceSortField.MEMORY:
        const memoryA = parseFloat(a.memory?.replace(/[^0-9.]/g, '') || '0');
        const memoryB = parseFloat(b.memory?.replace(/[^0-9.]/g, '') || '0');
        compareValue = memoryA - memoryB;
        break;
        
      case ServiceSortField.CPU:
        const cpuA = parseFloat(a.cpuUsage?.replace(/[^0-9.]/g, '') || '0');
        const cpuB = parseFloat(b.cpuUsage?.replace(/[^0-9.]/g, '') || '0');
        compareValue = cpuA - cpuB;
        break;
        
      case ServiceSortField.ACTIVE_TIME:
        const timeA = new Date(a.activeEnterTimestamp || 0).getTime();
        const timeB = new Date(b.activeEnterTimestamp || 0).getTime();
        compareValue = timeA - timeB;
        break;
        
      default:
        compareValue = a.name.localeCompare(b.name);
    }
    
    return sortOrder === 'desc' ? -compareValue : compareValue;
  });
}

/**
 * 서비스 목록을 페이징합니다
 */
export function paginateServices(
  services: ServiceInfo[], 
  page: number = 1, 
  limit: number = 50
): ServiceInfo[] {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return services.slice(startIndex, endIndex);
}

/**
 * 서비스 통계를 계산합니다
 */
export function calculateServiceStatistics(services: ServiceInfo[]): ServiceStatistics {
  const stats: ServiceStatistics = {
    total: services.length,
    byState: {} as Record<ServiceActiveState, number>,
    byType: {} as Record<ServiceUnitType, number>,
    failed: [],
    recentlyChanged: [],
    highResource: []
  };
  
  // 상태별 카운트 초기화
  Object.values(ServiceActiveState).forEach(state => {
    stats.byState[state] = 0;
  });
  
  // 타입별 카운트 초기화
  Object.values(ServiceUnitType).forEach(type => {
    stats.byType[type] = 0;
  });
  
  // 각 서비스 분석
  for (const service of services) {
    // 상태별 카운트
    stats.byState[service.activeState]++;
    
    // 타입별 카운트
    stats.byType[service.unitType]++;
    
    // 실패한 서비스
    if (service.activeState === ServiceActiveState.FAILED) {
      stats.failed.push(service);
    }
    
    // 최근 변경된 서비스 (1시간 이내)
    if (service.activeEnterTimestamp) {
      const activeTime = new Date(service.activeEnterTimestamp).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (activeTime > oneHourAgo) {
        stats.recentlyChanged.push(service);
      }
    }
    
    // 리소스 사용량이 높은 서비스
    const memoryMB = parseFloat(service.memory?.replace(/[^0-9.]/g, '') || '0');
    const cpuPercent = parseFloat(service.cpuUsage?.replace(/[^0-9.]/g, '') || '0');
    if (memoryMB > 100 || cpuPercent > 50) { // 100MB 이상 또는 CPU 50% 이상
      stats.highResource.push(service);
    }
  }
  
  // 정렬
  stats.failed.sort((a, b) => a.name.localeCompare(b.name));
  stats.recentlyChanged.sort((a, b) => 
    new Date(b.activeEnterTimestamp || 0).getTime() - new Date(a.activeEnterTimestamp || 0).getTime()
  );
  stats.highResource.sort((a, b) => {
    const memoryA = parseFloat(a.memory?.replace(/[^0-9.]/g, '') || '0');
    const memoryB = parseFloat(b.memory?.replace(/[^0-9.]/g, '') || '0');
    return memoryB - memoryA;
  });
  
  return stats;
}

// 헬퍼 함수들

function parseUnitType(unitType: string): ServiceUnitType {
  switch (unitType.toLowerCase()) {
    case 'service': return ServiceUnitType.SERVICE;
    case 'socket': return ServiceUnitType.SOCKET;
    case 'target': return ServiceUnitType.TARGET;
    case 'device': return ServiceUnitType.DEVICE;
    case 'mount': return ServiceUnitType.MOUNT;
    case 'automount': return ServiceUnitType.AUTOMOUNT;
    case 'timer': return ServiceUnitType.TIMER;
    case 'swap': return ServiceUnitType.SWAP;
    case 'path': return ServiceUnitType.PATH;
    case 'slice': return ServiceUnitType.SLICE;
    case 'scope': return ServiceUnitType.SCOPE;
    default: return ServiceUnitType.SERVICE;
  }
}

function parseLoadState(load: string): ServiceLoadState {
  switch (load.toLowerCase()) {
    case 'loaded': return ServiceLoadState.LOADED;
    case 'not-found': return ServiceLoadState.NOT_FOUND;
    case 'masked': return ServiceLoadState.MASKED;
    case 'error': return ServiceLoadState.ERROR;
    default: return ServiceLoadState.LOADED;
  }
}

function parseActiveState(active: string): ServiceActiveState {
  switch (active.toLowerCase()) {
    case 'active': return ServiceActiveState.ACTIVE;
    case 'reloading': return ServiceActiveState.RELOADING;
    case 'inactive': return ServiceActiveState.INACTIVE;
    case 'failed': return ServiceActiveState.FAILED;
    case 'activating': return ServiceActiveState.ACTIVATING;
    case 'deactivating': return ServiceActiveState.DEACTIVATING;
    default: return ServiceActiveState.INACTIVE;
  }
}

function parseSubState(sub: string): ServiceSubState {
  switch (sub.toLowerCase()) {
    case 'running': return ServiceSubState.RUNNING;
    case 'dead': return ServiceSubState.DEAD;
    case 'exited': return ServiceSubState.EXITED;
    case 'failed': return ServiceSubState.FAILED;
    case 'start-pre': return ServiceSubState.START_PRE;
    case 'start': return ServiceSubState.START;
    case 'start-post': return ServiceSubState.START_POST;
    case 'reload': return ServiceSubState.RELOAD;
    case 'stop': return ServiceSubState.STOP;
    case 'stop-watchdog': return ServiceSubState.STOP_WATCHDOG;
    case 'stop-post': return ServiceSubState.STOP_POST;
    case 'final-watchdog': return ServiceSubState.FINAL_WATCHDOG;
    case 'final-sigterm': return ServiceSubState.FINAL_SIGTERM;
    case 'final-sigkill': return ServiceSubState.FINAL_SIGKILL;
    default: return ServiceSubState.DEAD;
  }
}

function mapActiveStateToServiceState(activeState: ServiceActiveState): ServiceState {
  switch (activeState) {
    case ServiceActiveState.ACTIVE: return ServiceState.ACTIVE;
    case ServiceActiveState.INACTIVE: return ServiceState.INACTIVE;
    case ServiceActiveState.ACTIVATING: return ServiceState.ACTIVATING;
    case ServiceActiveState.DEACTIVATING: return ServiceState.DEACTIVATING;
    case ServiceActiveState.FAILED: return ServiceState.FAILED;
    default: return ServiceState.UNKNOWN;
  }
}

function parseTimestamp(timestamp: string | undefined): string | undefined {
  if (!timestamp || timestamp === '0' || timestamp === 'n/a') {
    return undefined;
  }
  
  // Unix timestamp (microseconds)
  if (/^\d+$/.test(timestamp)) {
    const timestampMs = parseInt(timestamp) / 1000;
    return new Date(timestampMs).toISOString();
  }
  
  return timestamp;
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(1)} ${sizes[i]}`;
}

function formatCpuUsage(nanoseconds: number): string {
  // CPU 사용량은 일반적으로 시간당 백분율로 표시
  // 정확한 계산을 위해서는 더 복잡한 로직이 필요하지만,
  // 여기서는 단순히 나노초를 백분율로 변환
  const seconds = nanoseconds / 1000000000;
  const percentage = Math.min((seconds / 3600) * 100, 100); // 최대 100%
  
  return `${percentage.toFixed(2)}%`;
}