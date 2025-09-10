/**
 * Process Monitoring Frontend Types
 * 프로세스 모니터링 프론트엔드 타입 정의
 */

// 프로세스 상태 열거형
export enum ProcessState {
  Running = 'R',
  Sleeping = 'S',
  Waiting = 'D',
  Zombie = 'Z',
  Stopped = 'T',
  Tracing = 't',
  Dead = 'X',
  Unknown = '?'
}

// 프로세스 상태 한국어 레이블
export const ProcessStateLabels: Record<ProcessState, string> = {
  [ProcessState.Running]: '실행 중',
  [ProcessState.Sleeping]: '대기 중',
  [ProcessState.Waiting]: '대기 중 (차단)',
  [ProcessState.Zombie]: '좀비',
  [ProcessState.Stopped]: '중지됨',
  [ProcessState.Tracing]: '추적 중',
  [ProcessState.Dead]: '종료됨',
  [ProcessState.Unknown]: '알 수 없음'
};

// 프로세스 정보 인터페이스
export interface ProcessInfo {
  pid: number;
  ppid: number;
  user: string;
  group?: string;
  command: string;
  args: string[];
  fullCommand: string;
  state: ProcessState;
  priority: number;
  cpuPercent: number;
  memoryPercent: number;
  memoryKB: number;
  virtualMemoryKB: number;
  residentMemoryKB: number;
  startTime: string;
  elapsedTime: string;
  tty: string;
  threads?: number;
}

// 시스템 정보 인터페이스
export interface SystemInfo {
  uptime: number;
  loadAverage: number[];
  totalMemoryKB: number;
  freeMemoryKB: number;
  usedMemoryKB: number;
  cpuCount: number;
  processCount: number;
}

// 프로세스 목록 응답
export interface ProcessListResponse {
  processes: ProcessInfo[];
  total: number;
  filtered: number;
  timestamp: string;
  hostname: string;
  systemInfo: SystemInfo;
}

// 프로세스 정렬 필드
export enum ProcessSortField {
  PID = 'pid',
  USER = 'user',
  COMMAND = 'command',
  CPU = 'cpuPercent',
  MEMORY = 'memoryPercent',
  TIME = 'elapsedTime',
  PRIORITY = 'priority'
}

// 프로세스 필터
export interface ProcessFilter {
  user?: string;
  command?: string;
  state?: ProcessState;
  minCpu?: number;
  maxCpu?: number;
  minMemory?: number;
  maxMemory?: number;
  excludeKernel?: boolean;
  excludeZombies?: boolean;
}

// 프로세스 목록 조회 옵션
export interface ProcessListOptions {
  sortBy?: ProcessSortField;
  sortOrder?: 'asc' | 'desc';
  filter?: ProcessFilter;
  limit?: number;
  offset?: number;
}

// 호스트 정보
export interface HostInfo {
  id: number;
  host: string;
  port: number;
  username: string;
  createdAt: string;
}

// 프로세스 제어 응답
export interface ProcessTerminationResponse {
  success: boolean;
  message: string;
  signal: string;
  timestamp: string;
}

export interface ProcessPriorityResponse {
  success: boolean;
  message: string;
  oldPriority: number;
  newPriority: number;
  process: ProcessInfo;
  timestamp: string;
}

// 에러 응답
export interface ProcessMonitoringError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// UI 컴포넌트 props
export interface ProcessTableProps {
  processes: ProcessInfo[];
  systemInfo: SystemInfo;
  loading: boolean;
  onTerminateProcess: (pid: number, signal?: string) => Promise<void>;
  onChangePriority: (pid: number, priority: number) => Promise<void>;
  onRefresh: () => void;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface ProcessMonitorProps {
  hostId: string;
  hostName: string;
}

export interface ProcessFilterProps {
  filter: ProcessFilter;
  onFilterChange: (filter: ProcessFilter) => void;
  onClearFilter: () => void;
}

// 실시간 업데이트 설정
export interface RealtimeSettings {
  enabled: boolean;
  interval: number; // milliseconds
  autoStart: boolean;
}

// 프로세스 액션 타입
export type ProcessAction = 'terminate' | 'priority' | 'details';

// 프로세스 신호 타입
export type ProcessSignal = 'TERM' | 'KILL' | 'INT' | 'HUP' | 'USR1' | 'USR2';

// 프로세스 신호 레이블
export const ProcessSignalLabels: Record<ProcessSignal, string> = {
  TERM: '정상 종료 (TERM)',
  KILL: '강제 종료 (KILL)',
  INT: '인터럽트 (INT)',
  HUP: '재시작 (HUP)',
  USR1: '사용자 신호 1',
  USR2: '사용자 신호 2'
};