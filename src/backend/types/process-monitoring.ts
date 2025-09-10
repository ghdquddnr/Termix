/**
 * Process Monitoring Types
 * 프로세스 모니터링 관련 타입 정의
 */

// 프로세스 정보 인터페이스
export interface ProcessInfo {
  pid: number;                    // 프로세스 ID
  ppid: number;                   // 부모 프로세스 ID
  user: string;                   // 프로세스 소유자
  group?: string;                 // 프로세스 그룹
  command: string;                // 실행 명령어
  args: string[];                 // 명령어 인수
  fullCommand: string;            // 전체 명령어 (명령어 + 인수)
  state: ProcessState;            // 프로세스 상태
  priority: number;               // 우선순위 (nice 값)
  cpuPercent: number;             // CPU 사용률 (%)
  memoryPercent: number;          // 메모리 사용률 (%)
  memoryKB: number;               // 메모리 사용량 (KB)
  virtualMemoryKB: number;        // 가상 메모리 사용량 (KB)
  residentMemoryKB: number;       // 물리 메모리 사용량 (KB)
  startTime: string;              // 시작 시간
  elapsedTime: string;            // 실행 시간
  tty: string;                    // 터미널 장치
  threads?: number;               // 스레드 수
}

// 프로세스 상태 열거형
export enum ProcessState {
  Running = 'R',           // 실행 중
  Sleeping = 'S',          // 대기 중 (인터럽트 가능)
  Waiting = 'D',           // 대기 중 (인터럽트 불가능)
  Zombie = 'Z',            // 좀비 프로세스
  Stopped = 'T',           // 중지됨
  Tracing = 't',           // 추적 중
  Dead = 'X',              // 죽은 프로세스
  Unknown = '?'            // 알 수 없음
}

// 프로세스 상태 한국어 맵핑
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

// 프로세스 목록 조회 옵션
export interface ProcessListOptions {
  sortBy?: ProcessSortField;      // 정렬 기준
  sortOrder?: 'asc' | 'desc';     // 정렬 순서
  filter?: ProcessFilter;         // 필터 조건
  limit?: number;                 // 결과 수 제한
  offset?: number;                // 오프셋
}

// 프로세스 정렬 필드
export enum ProcessSortField {
  PID = 'pid',
  CPU = 'cpuPercent',
  Memory = 'memoryPercent',
  User = 'user',
  Command = 'command',
  StartTime = 'startTime',
  ElapsedTime = 'elapsedTime'
}

// 프로세스 필터 조건
export interface ProcessFilter {
  user?: string;                  // 사용자 필터
  command?: string;               // 명령어 필터 (부분 일치)
  state?: ProcessState;           // 상태 필터
  minCpu?: number;                // 최소 CPU 사용률
  maxCpu?: number;                // 최대 CPU 사용률
  minMemory?: number;             // 최소 메모리 사용률
  maxMemory?: number;             // 최대 메모리 사용률
  excludeKernel?: boolean;        // 커널 프로세스 제외
  excludeZombies?: boolean;       // 좀비 프로세스 제외
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

// 시스템 정보
export interface SystemInfo {
  uptime: number;                 // 시스템 가동 시간 (초)
  loadAverage: number[];          // 로드 평균 [1분, 5분, 15분]
  totalMemoryKB: number;          // 전체 메모리 (KB)
  freeMemoryKB: number;           // 사용 가능 메모리 (KB)
  usedMemoryKB: number;           // 사용 중 메모리 (KB)
  cpuCount: number;               // CPU 코어 수
  processCount: number;           // 총 프로세스 수
}

// 프로세스 제어 액션
export enum ProcessAction {
  Kill = 'kill',                 // 강제 종료 (SIGKILL)
  Terminate = 'terminate',       // 종료 요청 (SIGTERM)
  Stop = 'stop',                 // 일시 중지 (SIGSTOP)
  Continue = 'continue',         // 재개 (SIGCONT)
  Interrupt = 'interrupt',       // 인터럽트 (SIGINT)
  Hangup = 'hangup'              // 행업 (SIGHUP)
}

// 프로세스 제어 요청
export interface ProcessControlRequest {
  action: ProcessAction;
  signal?: number;                // 커스텀 시그널 번호
  force?: boolean;                // 강제 실행 여부
}

// 프로세스 제어 응답
export interface ProcessControlResponse {
  success: boolean;
  message: string;
  pid: number;
  action: ProcessAction;
  timestamp: string;
}

// 프로세스 우선순위 변경 요청
export interface ProcessPriorityRequest {
  priority: number;               // 새로운 우선순위 (-20 ~ 19)
}

// 프로세스 우선순위 변경 응답
export interface ProcessPriorityResponse {
  success: boolean;
  message: string;
  pid: number;
  oldPriority: number;
  newPriority: number;
  timestamp: string;
}

// 프로세스 모니터링 에러 타입
export interface ProcessMonitoringError {
  code: ProcessErrorCode;
  message: string;
  details?: any;
  timestamp: string;
}

// 프로세스 에러 코드
export enum ProcessErrorCode {
  SSH_CONNECTION_FAILED = 'SSH_CONNECTION_FAILED',
  COMMAND_EXECUTION_FAILED = 'COMMAND_EXECUTION_FAILED',
  PROCESS_NOT_FOUND = 'PROCESS_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_SIGNAL = 'INVALID_SIGNAL',
  INVALID_PRIORITY = 'INVALID_PRIORITY',
  PARSE_ERROR = 'PARSE_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// ps aux 출력 파싱을 위한 원시 데이터 타입
export interface RawProcessData {
  USER: string;
  PID: string;
  PPID?: string;
  '%CPU': string;
  '%MEM': string;
  VSZ: string;
  RSS: string;
  TTY: string;
  STAT: string;
  START: string;
  TIME: string;
  COMMAND: string;
}

// 실시간 프로세스 업데이트 이벤트
export interface ProcessUpdateEvent {
  type: 'add' | 'update' | 'remove';
  process: ProcessInfo;
  timestamp: string;
}

// WebSocket 메시지 타입
export interface ProcessWebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'update' | 'error';
  hostId?: string;
  data?: ProcessUpdateEvent | ProcessMonitoringError;
  timestamp: string;
}

// 프로세스 통계 정보
export interface ProcessStatistics {
  totalProcesses: number;
  runningProcesses: number;
  sleepingProcesses: number;
  zombieProcesses: number;
  stoppedProcesses: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  topCpuProcesses: ProcessInfo[];
  topMemoryProcesses: ProcessInfo[];
  recentlyStarted: ProcessInfo[];
}

// 프로세스 히스토리 데이터
export interface ProcessHistoryData {
  timestamp: string;
  processCount: number;
  cpuUsage: number;
  memoryUsage: number;
  loadAverage: number[];
}

// 프로세스 모니터링 설정
export interface ProcessMonitoringConfig {
  refreshInterval: number;        // 새로고침 간격 (초)
  maxHistoryPoints: number;       // 최대 히스토리 데이터 점수
  enableRealtime: boolean;        // 실시간 업데이트 활성화
  autoRefresh: boolean;           // 자동 새로고침
  defaultSortField: ProcessSortField;
  defaultSortOrder: 'asc' | 'desc';
  defaultFilters: Partial<ProcessFilter>;
}