/**
 * Service Monitoring Types
 * systemd 서비스 모니터링을 위한 TypeScript 타입 정의
 */

// 서비스 상태 열거형
export enum ServiceState {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  ACTIVATING = 'activating',
  DEACTIVATING = 'deactivating',
  FAILED = 'failed',
  UNKNOWN = 'unknown'
}

// 서비스 로드 상태
export enum ServiceLoadState {
  LOADED = 'loaded',
  NOT_FOUND = 'not-found',
  MASKED = 'masked',
  ERROR = 'error'
}

// 서비스 활성화 상태 
export enum ServiceActiveState {
  ACTIVE = 'active',
  RELOADING = 'reloading',
  INACTIVE = 'inactive',
  FAILED = 'failed',
  ACTIVATING = 'activating',
  DEACTIVATING = 'deactivating'
}

// 서비스 서브 상태
export enum ServiceSubState {
  RUNNING = 'running',
  DEAD = 'dead',
  EXITED = 'exited',
  FAILED = 'failed',
  START_PRE = 'start-pre',
  START = 'start',
  START_POST = 'start-post',
  RELOAD = 'reload',
  STOP = 'stop',
  STOP_WATCHDOG = 'stop-watchdog',
  STOP_POST = 'stop-post',
  FINAL_WATCHDOG = 'final-watchdog',
  FINAL_SIGTERM = 'final-sigterm',
  FINAL_SIGKILL = 'final-sigkill'
}

// 서비스 액션 타입
export enum ServiceAction {
  START = 'start',
  STOP = 'stop', 
  RESTART = 'restart',
  RELOAD = 'reload',
  ENABLE = 'enable',
  DISABLE = 'disable'
}

// 서비스 타입 (unit type)
export enum ServiceUnitType {
  SERVICE = 'service',
  SOCKET = 'socket',
  TARGET = 'target',
  DEVICE = 'device',
  MOUNT = 'mount',
  AUTOMOUNT = 'automount',
  TIMER = 'timer',
  SWAP = 'swap',
  PATH = 'path',
  SLICE = 'slice',
  SCOPE = 'scope'
}

// 서비스 정보 인터페이스
export interface ServiceInfo {
  // 기본 정보
  name: string;                    // 서비스 이름
  description: string;             // 서비스 설명
  unitType: ServiceUnitType;       // 유닛 타입
  
  // 상태 정보
  loadState: ServiceLoadState;     // 로드 상태
  activeState: ServiceActiveState; // 활성 상태
  subState: ServiceSubState;       // 서브 상태
  
  // 추가 정보
  enabledState?: string;           // 활성화 상태 (enabled/disabled/static/masked)
  preset?: string;                 // 프리셋 상태
  mainPid?: number;               // 메인 프로세스 PID
  memory?: string;                // 메모리 사용량
  cpuUsage?: string;              // CPU 사용률
  
  // 시간 정보
  activeEnterTimestamp?: string;   // 활성화된 시간
  activeExitTimestamp?: string;    // 비활성화된 시간
  inactiveEnterTimestamp?: string; // 비활성 진입 시간
  inactiveExitTimestamp?: string;  // 비활성 종료 시간
  
  // 경로 정보
  unitPath?: string;              // 유닛 파일 경로
  dropInPaths?: string[];         // Drop-in 파일 경로들
  
  // 의존성 정보
  wants?: string[];               // Wants 의존성
  wantedBy?: string[];           // WantedBy 의존성
  requires?: string[];            // Requires 의존성
  requiredBy?: string[];         // RequiredBy 의존성
  after?: string[];              // After 의존성
  before?: string[];             // Before 의존성
  
  // 실행 정보
  execMainStartTimestamp?: string;  // 메인 실행 시작 시간
  execMainExitTimestamp?: string;   // 메인 실행 종료 시간
  execMainCode?: number;            // 메인 실행 종료 코드
  execMainStatus?: number;          // 메인 실행 상태
  
  // 기타
  docs?: string[];                // 문서 URL들
  listenStreams?: string[];       // 리스닝 스트림 (소켓 서비스용)
}

// 서비스 목록 응답
export interface ServiceListResponse {
  hostId: number;
  hostname: string;
  timestamp: string;
  totalServices: number;
  services: ServiceInfo[];
  summary: {
    active: number;
    inactive: number;
    failed: number;
    activating: number;
    deactivating: number;
  };
}

// 서비스 목록 옵션
export interface ServiceListOptions {
  // 필터 옵션
  state?: ServiceState;             // 상태별 필터
  unitType?: ServiceUnitType;       // 타입별 필터
  pattern?: string;                 // 이름 패턴 필터 (glob)
  
  // 정렬 옵션
  sortBy?: ServiceSortField;
  sortOrder?: 'asc' | 'desc';
  
  // 페이징 옵션
  page?: number;
  limit?: number;
  
  // 추가 정보 포함 여부
  includeDetails?: boolean;         // 상세 정보 포함
  includeInactive?: boolean;        // 비활성 서비스 포함
}

// 서비스 정렬 필드
export enum ServiceSortField {
  NAME = 'name',
  STATE = 'state',
  TYPE = 'unitType',
  MEMORY = 'memory',
  CPU = 'cpuUsage',
  ACTIVE_TIME = 'activeEnterTimestamp',
  DESCRIPTION = 'description'
}

// 서비스 필터 인터페이스
export interface ServiceFilter {
  name?: string;                   // 이름 검색
  state?: ServiceState[];          // 상태 필터
  unitType?: ServiceUnitType[];    // 타입 필터
  enabledOnly?: boolean;           // 활성화된 서비스만
  runningOnly?: boolean;          // 실행 중인 서비스만
}

// 서비스 액션 요청
export interface ServiceActionRequest {
  action: ServiceAction;
  force?: boolean;                // 강제 실행 여부
  noReload?: boolean;             // 리로드 없이 실행
}

// 서비스 액션 응답
export interface ServiceActionResponse {
  success: boolean;
  action: ServiceAction;
  serviceName: string;
  message: string;
  timestamp: string;
  previousState?: ServiceActiveState;
  currentState?: ServiceActiveState;
  executionTime?: number;         // 실행 시간 (ms)
}

// 서비스 상태 조회 응답
export interface ServiceStatusResponse {
  service: ServiceInfo;
  recentLogs?: string[];          // 최근 로그 (선택적)
  processes?: Array<{             // 관련 프로세스 (선택적)
    pid: number;
    command: string;
    cpu: number;
    memory: number;
  }>;
}

// 서비스 로그 요청 옵션
export interface ServiceLogOptions {
  lines?: number;                 // 가져올 로그 라인 수
  since?: string;                 // 시작 시간
  until?: string;                 // 종료 시간
  follow?: boolean;               // 실시간 팔로우
  priority?: string;              // 로그 우선순위 (0-7)
  unit?: string;                  // 특정 유닛만
}

// 서비스 로그 응답
export interface ServiceLogResponse {
  serviceName: string;
  logs: ServiceLogEntry[];
  totalLines?: number;
  hasMore?: boolean;
  timestamp: string;
}

// 서비스 로그 엔트리
export interface ServiceLogEntry {
  timestamp: string;
  priority: number;               // syslog 우선순위 (0-7)
  facility: string;               // syslog facility
  message: string;                // 로그 메시지
  hostname?: string;              // 호스트명
  pid?: number;                   // 프로세스 ID
  uid?: number;                   // 사용자 ID
  gid?: number;                   // 그룹 ID
  comm?: string;                  // 커맨드명
  exe?: string;                   // 실행 파일 경로
  cmdline?: string;               // 커맨드 라인
}

// 서비스 에러 타입
export enum ServiceErrorCode {
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED', 
  SERVICE_ALREADY_ACTIVE = 'SERVICE_ALREADY_ACTIVE',
  SERVICE_ALREADY_INACTIVE = 'SERVICE_ALREADY_INACTIVE',
  INVALID_ACTION = 'INVALID_ACTION',
  SYSTEMCTL_ERROR = 'SYSTEMCTL_ERROR',
  SSH_ERROR = 'SSH_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 서비스 모니터링 에러 인터페이스
export interface ServiceMonitoringError {
  code: ServiceErrorCode;
  message: string;
  serviceName?: string;
  hostId?: number;
  details?: any;
  timestamp: string;
}

// systemctl 명령어 출력 파싱을 위한 타입
export interface SystemctlListOutput {
  unit: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

// systemctl show 명령어 출력 파싱을 위한 타입
export interface SystemctlShowOutput {
  [key: string]: string;
}

// 서비스 통계 정보
export interface ServiceStatistics {
  total: number;
  byState: Record<ServiceActiveState, number>;
  byType: Record<ServiceUnitType, number>;
  failed: ServiceInfo[];          // 실패한 서비스들
  recentlyChanged: ServiceInfo[]; // 최근 변경된 서비스들
  highResource: ServiceInfo[];    // 리소스 사용량이 높은 서비스들
}