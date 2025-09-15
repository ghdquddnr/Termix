/**
 * Disk Monitoring Type Definitions
 * 디스크 사용량 모니터링을 위한 타입 정의
 */

/**
 * 디스크 사용량 정보
 */
export interface DiskUsageInfo {
  /** 파일시스템 또는 디렉토리 경로 */
  path: string;
  /** 사용된 공간 (바이트) */
  usedBytes: number;
  /** 사용된 공간 (사람이 읽기 쉬운 형태) */
  usedHuman: string;
  /** 전체 공간 (바이트, 선택적) */
  totalBytes?: number;
  /** 전체 공간 (사람이 읽기 쉬운 형태, 선택적) */
  totalHuman?: string;
  /** 사용 가능한 공간 (바이트, 선택적) */
  availableBytes?: number;
  /** 사용 가능한 공간 (사람이 읽기 쉬운 형태, 선택적) */
  availableHuman?: string;
  /** 사용률 (퍼센트, 0-100) */
  usagePercent?: number;
  /** 파일시스템 타입 */
  filesystem?: string;
  /** 마운트 포인트 */
  mountPoint?: string;
}

/**
 * 디렉토리 크기 정보
 */
export interface DirectorySize {
  /** 디렉토리 경로 */
  path: string;
  /** 크기 (바이트) */
  sizeBytes: number;
  /** 크기 (사람이 읽기 쉬운 형태) */
  sizeHuman: string;
  /** 파일 개수 (선택적) */
  fileCount?: number;
  /** 디렉토리 개수 (선택적) */
  dirCount?: number;
  /** 마지막 수정 시간 (선택적) */
  lastModified?: string;
}

/**
 * 파일시스템 정보
 */
export interface FilesystemInfo {
  /** 파일시스템 디바이스 */
  device: string;
  /** 파일시스템 타입 */
  type: string;
  /** 마운트 포인트 */
  mountPoint: string;
  /** 전체 크기 (바이트) */
  totalBytes: number;
  /** 사용된 크기 (바이트) */
  usedBytes: number;
  /** 사용 가능한 크기 (바이트) */
  availableBytes: number;
  /** 사용률 (퍼센트) */
  usagePercent: number;
  /** 전체 크기 (사람이 읽기 쉬운 형태) */
  totalHuman: string;
  /** 사용된 크기 (사람이 읽기 쉬운 형태) */
  usedHuman: string;
  /** 사용 가능한 크기 (사람이 읽기 쉬운 형태) */
  availableHuman: string;
  /** 마운트 옵션 (선택적) */
  mountOptions?: string[];
}

/**
 * 큰 파일 정보
 */
export interface LargeFile {
  /** 파일 경로 */
  path: string;
  /** 파일 크기 (바이트) */
  sizeBytes: number;
  /** 파일 크기 (사람이 읽기 쉬운 형태) */
  sizeHuman: string;
  /** 파일 타입/확장자 */
  type: string;
  /** 마지막 수정 시간 */
  lastModified: string;
  /** 마지막 접근 시간 (선택적) */
  lastAccessed?: string;
  /** 소유자 */
  owner: string;
  /** 권한 */
  permissions: string;
}

/**
 * 디스크 모니터링 응답
 */
export interface DiskMonitoringResponse {
  /** 디스크 사용량 정보 목록 */
  diskUsage: DiskUsageInfo[];
  /** 파일시스템 정보 목록 */
  filesystems: FilesystemInfo[];
  /** 디렉토리 크기 정보 목록 (선택적) */
  directoryUsage?: DirectorySize[];
  /** 큰 파일 목록 (선택적) */
  largeFiles?: LargeFile[];
  /** 전체 항목 수 */
  total: number;
  /** 응답 시간 */
  timestamp: string;
  /** 호스트명 */
  hostname: string;
}

/**
 * 디스크 모니터링 옵션
 */
export interface DiskMonitoringOptions {
  /** 디렉토리 크기 분석 포함 여부 */
  includeDirectories?: boolean;
  /** 큰 파일 검색 포함 여부 */
  includeLargeFiles?: boolean;
  /** 큰 파일 최소 크기 (바이트) */
  largeFileThreshold?: number;
  /** 분석할 경로 목록 (기본값: 루트 파일시스템) */
  paths?: string[];
  /** 결과 개수 제한 */
  limit?: number;
  /** 결과 오프셋 */
  offset?: number;
  /** 정렬 기준 */
  sortBy?: DiskSortField;
  /** 정렬 순서 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 디스크 정렬 기준
 */
export enum DiskSortField {
  SIZE = 'size',
  NAME = 'name',
  USAGE_PERCENT = 'usagePercent',
  LAST_MODIFIED = 'lastModified'
}

/**
 * 디스크 모니터링 에러 코드
 */
export enum DiskErrorCode {
  SSH_CONNECTION_FAILED = 'SSH_CONNECTION_FAILED',
  COMMAND_EXECUTION_FAILED = 'COMMAND_EXECUTION_FAILED',
  PARSING_ERROR = 'PARSING_ERROR',
  PATH_NOT_FOUND = 'PATH_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_INPUT = 'INVALID_INPUT',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

/**
 * 디스크 모니터링 에러
 */
export interface DiskMonitoringError {
  /** 에러 코드 */
  code: DiskErrorCode;
  /** 에러 메시지 */
  message: string;
  /** 상세 정보 */
  details?: any;
  /** 발생 시간 */
  timestamp: string;
}

/**
 * 디스크 캐시 정보
 */
export interface DiskCacheEntry {
  /** 호스트 ID */
  hostId: string;
  /** 캐시 키 */
  cacheKey: string;
  /** 캐시된 데이터 */
  data: DiskMonitoringResponse | DiskUsageInfo[] | FilesystemInfo[] | LargeFile[] | DirectorySize[];
  /** 캐시 생성 시간 */
  createdAt: number;
  /** 캐시 만료 시간 (밀리초) */
  expiresAt: number;
  /** 캐시 히트 횟수 */
  hitCount?: number;
}

/**
 * 디스크 캐시 옵션
 */
export interface DiskCacheOptions {
  /** 캐시 TTL (초, 기본값: 300초) */
  ttl?: number;
  /** 최대 캐시 항목 수 (기본값: 100) */
  maxSize?: number;
  /** 자동 정리 활성화 (기본값: true) */
  autoCleanup?: boolean;
  /** 정리 주기 (밀리초, 기본값: 60000ms) */
  cleanupInterval?: number;
}