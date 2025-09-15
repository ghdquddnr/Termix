/**
 * Network Monitoring Type Definitions
 * 네트워크 연결 모니터링을 위한 타입 정의
 */

/**
 * 네트워크 연결 상태
 */
export enum NetworkConnectionState {
  LISTEN = 'LISTEN',
  ESTABLISHED = 'ESTABLISHED',
  SYN_SENT = 'SYN_SENT',
  SYN_RECV = 'SYN_RECV',
  FIN_WAIT1 = 'FIN_WAIT1',
  FIN_WAIT2 = 'FIN_WAIT2',
  TIME_WAIT = 'TIME_WAIT',
  CLOSE = 'CLOSE',
  CLOSE_WAIT = 'CLOSE_WAIT',
  LAST_ACK = 'LAST_ACK',
  CLOSING = 'CLOSING',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 프로토콜 타입
 */
export enum NetworkProtocol {
  TCP = 'tcp',
  UDP = 'udp',
  TCP6 = 'tcp6',
  UDP6 = 'udp6'
}

/**
 * 네트워크 연결 정보
 */
export interface NetworkConnection {
  /** 프로토콜 (tcp, udp, tcp6, udp6) */
  protocol: NetworkProtocol;
  /** 로컬 주소 (IP:포트) */
  localAddress: string;
  /** 로컬 IP */
  localIP: string;
  /** 로컬 포트 */
  localPort: number;
  /** 원격 주소 (IP:포트) */
  remoteAddress: string;
  /** 원격 IP */
  remoteIP: string;
  /** 원격 포트 */
  remotePort: number;
  /** 연결 상태 */
  state: NetworkConnectionState;
  /** 프로세스 ID */
  pid?: number;
  /** 프로세스 이름 */
  processName?: string;
  /** 사용자명 */
  user?: string;
}

/**
 * 리스닝 포트 정보
 */
export interface ListeningPort {
  /** 프로토콜 */
  protocol: NetworkProtocol;
  /** IP 주소 */
  ip: string;
  /** 포트 번호 */
  port: number;
  /** 프로세스 ID */
  pid?: number;
  /** 프로세스 이름 */
  processName?: string;
  /** 사용자명 */
  user?: string;
  /** 서비스명 (알려진 포트의 경우) */
  serviceName?: string;
}

/**
 * 네트워크 인터페이스 통계
 */
export interface NetworkInterfaceStats {
  /** 인터페이스명 */
  interface: string;
  /** 수신 바이트 */
  rxBytes: number;
  /** 수신 패킷 */
  rxPackets: number;
  /** 수신 에러 */
  rxErrors: number;
  /** 수신 드롭 */
  rxDropped: number;
  /** 전송 바이트 */
  txBytes: number;
  /** 전송 패킷 */
  txPackets: number;
  /** 전송 에러 */
  txErrors: number;
  /** 전송 드롭 */
  txDropped: number;
}

/**
 * 방화벽 상태 정보
 */
export interface FirewallStatus {
  /** 방화벽 활성 상태 */
  active: boolean;
  /** 방화벽 서비스명 (ufw, iptables, firewalld 등) */
  service: string;
  /** 기본 정책 */
  defaultPolicy?: {
    incoming: string;
    outgoing: string;
    forwarding?: string;
  };
  /** 활성 규칙 수 */
  ruleCount?: number;
}

/**
 * 네트워크 통계 정보
 */
export interface NetworkStatistics {
  /** 활성 연결 수 */
  totalConnections: number;
  /** 프로토콜별 연결 수 */
  connectionsByProtocol: {
    tcp: number;
    udp: number;
    tcp6: number;
    udp6: number;
  };
  /** 상태별 연결 수 */
  connectionsByState: Record<NetworkConnectionState, number>;
  /** 리스닝 포트 수 */
  listeningPorts: number;
  /** 네트워크 인터페이스 통계 */
  interfaceStats: NetworkInterfaceStats[];
}

/**
 * 네트워크 모니터링 응답
 */
export interface NetworkMonitoringResponse {
  /** 네트워크 연결 목록 */
  connections: NetworkConnection[];
  /** 리스닝 포트 목록 */
  listeningPorts: ListeningPort[];
  /** 네트워크 통계 */
  statistics: NetworkStatistics;
  /** 방화벽 상태 */
  firewallStatus: FirewallStatus;
  /** 조회 시각 */
  timestamp: string;
  /** 호스트명 */
  hostname: string;
}

/**
 * 네트워크 모니터링 에러 코드
 */
export enum NetworkErrorCode {
  SSH_CONNECTION_FAILED = 'SSH_CONNECTION_FAILED',
  COMMAND_EXECUTION_FAILED = 'COMMAND_EXECUTION_FAILED',
  PARSING_FAILED = 'PARSING_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

/**
 * 네트워크 모니터링 에러
 */
export interface NetworkMonitoringError {
  code: NetworkErrorCode;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * 네트워크 연결 필터 옵션
 */
export interface NetworkConnectionFilter {
  /** 프로토콜 필터 */
  protocol?: NetworkProtocol[];
  /** 상태 필터 */
  state?: NetworkConnectionState[];
  /** 로컬 포트 범위 */
  localPortRange?: {
    min: number;
    max: number;
  };
  /** 원격 포트 범위 */
  remotePortRange?: {
    min: number;
    max: number;
  };
  /** 프로세스명 필터 */
  processName?: string;
  /** 사용자명 필터 */
  user?: string;
  /** 리스닝 포트만 표시 */
  listeningOnly?: boolean;
}

/**
 * 네트워크 모니터링 옵션
 */
export interface NetworkMonitoringOptions {
  /** 연결 필터 */
  filter?: NetworkConnectionFilter;
  /** 결과 제한 */
  limit?: number;
  /** 오프셋 */
  offset?: number;
  /** 통계 포함 여부 */
  includeStatistics?: boolean;
  /** 방화벽 상태 포함 여부 */
  includeFirewall?: boolean;
}