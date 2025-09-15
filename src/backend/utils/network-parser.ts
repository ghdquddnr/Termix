/**
 * Network Data Parser Utilities
 * 네트워크 명령어 출력을 파싱하는 유틸리티 함수들
 */

import {
  type NetworkConnection,
  NetworkConnectionState,
  NetworkProtocol,
  type ListeningPort,
  type NetworkInterfaceStats,
  type FirewallStatus,
  type NetworkStatistics
} from '../types/network-monitoring.js';

/**
 * netstat -tulpn 출력을 파싱합니다
 */
export function parseNetstatOutput(output: string): NetworkConnection[] {
  const lines = output.split('\n').filter(line => line.trim());
  const connections: NetworkConnection[] = [];

  for (const line of lines) {
    // 헤더 라인 스킵
    if (line.includes('Proto') || line.includes('Active') || !line.trim()) {
      continue;
    }

    // netstat 출력 형식: Proto Recv-Q Send-Q Local Address Foreign Address State PID/Program name
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;

    try {
      const protocol = parseProtocol(parts[0]);
      if (!protocol) continue;

      const localAddr = parseAddress(parts[3]);
      const remoteAddr = parseAddress(parts[4]);
      const state = parseConnectionState(parts[5]);
      const pidInfo = parts[6] ? parsePidInfo(parts[6]) : { pid: undefined, processName: undefined };

      const connection: NetworkConnection = {
        protocol,
        localAddress: parts[3],
        localIP: localAddr.ip,
        localPort: localAddr.port,
        remoteAddress: parts[4],
        remoteIP: remoteAddr.ip,
        remotePort: remoteAddr.port,
        state,
        pid: pidInfo.pid,
        processName: pidInfo.processName
      };

      connections.push(connection);
    } catch (error) {
      console.warn(`Failed to parse netstat line: ${line}`, error);
    }
  }

  return connections;
}

/**
 * ss -tulpn 출력을 파싱합니다 (현대적 대안)
 */
export function parseSsOutput(output: string): NetworkConnection[] {
  const lines = output.split('\n').filter(line => line.trim());
  const connections: NetworkConnection[] = [];

  for (const line of lines) {
    // 헤더 라인 스킵
    if (line.includes('Netid') || line.includes('State') || !line.trim()) {
      continue;
    }

    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;

    try {
      const protocol = parseProtocol(parts[0]);
      if (!protocol) continue;

      const state = parseConnectionState(parts[1]);
      const localAddr = parseAddress(parts[4]);
      const remoteAddr = parts.length > 5 ? parseAddress(parts[5]) : { ip: '0.0.0.0', port: 0 };
      
      // ss 출력에서 프로세스 정보 추출
      const processInfo = extractProcessInfoFromSs(line);

      const connection: NetworkConnection = {
        protocol,
        localAddress: parts[4],
        localIP: localAddr.ip,
        localPort: localAddr.port,
        remoteAddress: parts[5] || '0.0.0.0:0',
        remoteIP: remoteAddr.ip,
        remotePort: remoteAddr.port,
        state,
        pid: processInfo.pid,
        processName: processInfo.processName,
        user: processInfo.user
      };

      connections.push(connection);
    } catch (error) {
      console.warn(`Failed to parse ss line: ${line}`, error);
    }
  }

  return connections;
}

/**
 * /proc/net/dev 출력을 파싱하여 네트워크 인터페이스 통계를 반환합니다
 */
export function parseNetworkInterfaceStats(output: string): NetworkInterfaceStats[] {
  const lines = output.split('\n').filter(line => line.trim());
  const stats: NetworkInterfaceStats[] = [];

  for (let i = 2; i < lines.length; i++) { // 처음 2줄은 헤더
    const line = lines[i].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const interfaceName = line.substring(0, colonIndex).trim();
    const values = line.substring(colonIndex + 1).trim().split(/\s+/).map(Number);

    if (values.length >= 16) {
      stats.push({
        interface: interfaceName,
        rxBytes: values[0],
        rxPackets: values[1],
        rxErrors: values[2],
        rxDropped: values[3],
        txBytes: values[8],
        txPackets: values[9],
        txErrors: values[10],
        txDropped: values[11]
      });
    }
  }

  return stats;
}

/**
 * ufw status 출력을 파싱합니다
 */
export function parseUfwStatus(output: string): FirewallStatus {
  const lines = output.split('\n');
  const active = lines.some(line => line.includes('Status: active'));
  
  let ruleCount = 0;
  for (const line of lines) {
    if (line.includes('->') || line.includes('ALLOW') || line.includes('DENY')) {
      ruleCount++;
    }
  }

  return {
    active,
    service: 'ufw',
    ruleCount
  };
}

/**
 * iptables 상태를 파싱합니다
 */
export function parseIptablesStatus(output: string): FirewallStatus {
  const lines = output.split('\n');
  let ruleCount = 0;
  
  for (const line of lines) {
    if (line.includes('Chain') || line.includes('target') || !line.trim()) {
      continue;
    }
    ruleCount++;
  }

  return {
    active: ruleCount > 0,
    service: 'iptables',
    ruleCount
  };
}

/**
 * 리스닝 포트만 필터링합니다
 */
export function extractListeningPorts(connections: NetworkConnection[]): ListeningPort[] {
  return connections
    .filter(conn => conn.state === NetworkConnectionState.LISTEN)
    .map(conn => ({
      protocol: conn.protocol,
      ip: conn.localIP,
      port: conn.localPort,
      pid: conn.pid,
      processName: conn.processName,
      user: conn.user,
      serviceName: getWellKnownServiceName(conn.localPort)
    }));
}

/**
 * 네트워크 통계를 계산합니다
 */
export function calculateNetworkStatistics(connections: NetworkConnection[], interfaceStats: NetworkInterfaceStats[]): NetworkStatistics {
  const stats: NetworkStatistics = {
    totalConnections: connections.length,
    connectionsByProtocol: {
      tcp: 0,
      udp: 0,
      tcp6: 0,
      udp6: 0
    },
    connectionsByState: {} as Record<NetworkConnectionState, number>,
    listeningPorts: 0,
    interfaceStats
  };

  // 초기화
  Object.values(NetworkConnectionState).forEach(state => {
    stats.connectionsByState[state] = 0;
  });

  // 연결별 통계 계산
  for (const conn of connections) {
    // 프로토콜별 카운트
    if (conn.protocol in stats.connectionsByProtocol) {
      stats.connectionsByProtocol[conn.protocol as keyof typeof stats.connectionsByProtocol]++;
    }

    // 상태별 카운트
    stats.connectionsByState[conn.state]++;

    // 리스닝 포트 카운트
    if (conn.state === NetworkConnectionState.LISTEN) {
      stats.listeningPorts++;
    }
  }

  return stats;
}

/**
 * 프로토콜 문자열을 파싱합니다
 */
function parseProtocol(proto: string): NetworkProtocol | null {
  switch (proto.toLowerCase()) {
    case 'tcp': return NetworkProtocol.TCP;
    case 'udp': return NetworkProtocol.UDP;
    case 'tcp6': return NetworkProtocol.TCP6;
    case 'udp6': return NetworkProtocol.UDP6;
    default: return null;
  }
}

/**
 * 주소 문자열을 IP와 포트로 파싱합니다
 */
function parseAddress(address: string): { ip: string; port: number } {
  if (address === '*:*' || address === '0.0.0.0:*') {
    return { ip: '0.0.0.0', port: 0 };
  }

  // IPv6 주소 처리
  if (address.includes('[')) {
    const match = address.match(/\[(.*?)\]:(\d+)/);
    if (match) {
      return { ip: match[1], port: parseInt(match[2], 10) };
    }
  }

  // IPv4 주소 처리
  const lastColonIndex = address.lastIndexOf(':');
  if (lastColonIndex !== -1) {
    const ip = address.substring(0, lastColonIndex);
    const port = address.substring(lastColonIndex + 1);
    
    return {
      ip: ip === '*' ? '0.0.0.0' : ip,
      port: port === '*' ? 0 : parseInt(port, 10) || 0
    };
  }

  return { ip: address, port: 0 };
}

/**
 * 연결 상태를 파싱합니다
 */
function parseConnectionState(state: string): NetworkConnectionState {
  switch (state.toUpperCase()) {
    case 'LISTEN': return NetworkConnectionState.LISTEN;
    case 'ESTABLISHED': return NetworkConnectionState.ESTABLISHED;
    case 'SYN_SENT': return NetworkConnectionState.SYN_SENT;
    case 'SYN_RECV': return NetworkConnectionState.SYN_RECV;
    case 'FIN_WAIT1': return NetworkConnectionState.FIN_WAIT1;
    case 'FIN_WAIT2': return NetworkConnectionState.FIN_WAIT2;
    case 'TIME_WAIT': return NetworkConnectionState.TIME_WAIT;
    case 'CLOSE': return NetworkConnectionState.CLOSE;
    case 'CLOSE_WAIT': return NetworkConnectionState.CLOSE_WAIT;
    case 'LAST_ACK': return NetworkConnectionState.LAST_ACK;
    case 'CLOSING': return NetworkConnectionState.CLOSING;
    case 'UNCONN': return NetworkConnectionState.UNKNOWN; // UDP의 경우
    default: return NetworkConnectionState.UNKNOWN;
  }
}

/**
 * PID/프로세스명 정보를 파싱합니다
 */
function parsePidInfo(pidInfo: string): { pid?: number; processName?: string } {
  if (!pidInfo || pidInfo === '-') {
    return { pid: undefined, processName: undefined };
  }

  const match = pidInfo.match(/(\d+)\/(.+)/);
  if (match) {
    return {
      pid: parseInt(match[1], 10),
      processName: match[2]
    };
  }

  return { pid: undefined, processName: pidInfo };
}

/**
 * ss 출력에서 프로세스 정보를 추출합니다
 */
function extractProcessInfoFromSs(line: string): { pid?: number; processName?: string; user?: string } {
  // ss 출력에서 users:(("process",pid=1234,fd=5)) 형태 찾기
  const userMatch = line.match(/users:\(\("([^"]+)",pid=(\d+),fd=\d+\)\)/);
  if (userMatch) {
    return {
      processName: userMatch[1],
      pid: parseInt(userMatch[2], 10),
      user: undefined // ss에서는 직접 사용자 정보를 제공하지 않음
    };
  }

  return { pid: undefined, processName: undefined, user: undefined };
}

/**
 * 잘 알려진 포트의 서비스명을 반환합니다
 */
function getWellKnownServiceName(port: number): string | undefined {
  const wellKnownPorts: Record<number, string> = {
    21: 'ftp',
    22: 'ssh',
    23: 'telnet',
    25: 'smtp',
    53: 'dns',
    80: 'http',
    110: 'pop3',
    143: 'imap',
    443: 'https',
    993: 'imaps',
    995: 'pop3s',
    3306: 'mysql',
    5432: 'postgresql',
    6379: 'redis',
    27017: 'mongodb'
  };

  return wellKnownPorts[port];
}