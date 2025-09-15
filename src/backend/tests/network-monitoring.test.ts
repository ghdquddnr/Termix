/**
 * Network Monitoring API Tests
 * 네트워크 모니터링 API 단위 테스트
 */

import {
  parseNetstatOutput,
  parseSsOutput,
  parseNetworkInterfaceStats,
  parseUfwStatus,
  parseIptablesStatus,
  extractListeningPorts,
  calculateNetworkStatistics
} from '../utils/network-parser.js';
import {
  type NetworkConnection,
  NetworkConnectionState,
  NetworkProtocol,
  type ListeningPort,
  type NetworkInterfaceStats,
  type FirewallStatus
} from '../types/network-monitoring.js';

describe('Network Parser Tests', () => {
  describe('parseNetstatOutput', () => {
    test('should parse netstat -tulpn output correctly', () => {
      const netstatOutput = `
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1234/sshd: /usr/sbin
tcp        0      0 127.0.0.1:631           0.0.0.0:*               LISTEN      5678/cupsd
tcp        0      0 192.168.1.100:80        192.168.1.200:3456      ESTABLISHED 9012/nginx
udp        0      0 0.0.0.0:53              0.0.0.0:*                           3456/systemd-resolve
tcp6       0      0 :::22                   :::*                    LISTEN      1234/sshd: /usr/sbin
      `;

      const connections = parseNetstatOutput(netstatOutput);
      
      expect(connections).toHaveLength(5);
      
      // SSH 리스닝 포트 테스트
      const sshConnection = connections.find(c => c.localPort === 22 && c.protocol === NetworkProtocol.TCP);
      expect(sshConnection).toBeDefined();
      expect(sshConnection?.state).toBe(NetworkConnectionState.LISTEN);
      expect(sshConnection?.pid).toBe(1234);
      expect(sshConnection?.processName).toBe('sshd: /usr/sbin');
      
      // HTTP 연결 테스트
      const httpConnection = connections.find(c => c.localPort === 80);
      expect(httpConnection).toBeDefined();
      expect(httpConnection?.state).toBe(NetworkConnectionState.ESTABLISHED);
      expect(httpConnection?.remoteIP).toBe('192.168.1.200');
      expect(httpConnection?.remotePort).toBe(3456);
      
      // UDP 연결 테스트
      const udpConnection = connections.find(c => c.protocol === NetworkProtocol.UDP);
      expect(udpConnection).toBeDefined();
      expect(udpConnection?.localPort).toBe(53);
      
      // IPv6 연결 테스트
      const ipv6Connection = connections.find(c => c.protocol === NetworkProtocol.TCP6);
      expect(ipv6Connection).toBeDefined();
      expect(ipv6Connection?.localPort).toBe(22);
    });

    test('should handle malformed netstat output gracefully', () => {
      const malformedOutput = `
Invalid line without proper format
tcp incomplete line
      `;

      const connections = parseNetstatOutput(malformedOutput);
      expect(connections).toHaveLength(0);
    });
  });

  describe('parseSsOutput', () => {
    test('should parse ss -tulpn output correctly', () => {
      const ssOutput = `
Netid  State      Recv-Q Send-Q Local Address:Port               Peer Address:Port              
tcp    LISTEN     0      128          0.0.0.0:22                      0.0.0.0:*                users:(("sshd",pid=1234,fd=3))
tcp    ESTAB      0      0      192.168.1.100:80                192.168.1.200:3456              users:(("nginx",pid=9012,fd=7))
udp    UNCONN     0      0            0.0.0.0:53                      0.0.0.0:*                users:(("systemd-resolve",pid=3456,fd=12))
      `;

      const connections = parseSsOutput(ssOutput);
      
      expect(connections).toHaveLength(3);
      
      // SSH 연결 테스트
      const sshConnection = connections.find(c => c.localPort === 22);
      expect(sshConnection).toBeDefined();
      expect(sshConnection?.state).toBe(NetworkConnectionState.LISTEN);
      expect(sshConnection?.pid).toBe(1234);
      expect(sshConnection?.processName).toBe('sshd');
      
      // HTTP 연결 테스트
      const httpConnection = connections.find(c => c.localPort === 80);
      expect(httpConnection).toBeDefined();
      expect(httpConnection?.state).toBe(NetworkConnectionState.ESTABLISHED);
      expect(httpConnection?.pid).toBe(9012);
      expect(httpConnection?.processName).toBe('nginx');
    });
  });

  describe('parseNetworkInterfaceStats', () => {
    test('should parse /proc/net/dev output correctly', () => {
      const procNetDevOutput = `
Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo:  123456      789    0    0    0     0          0         0   123456      789    0    0    0     0       0          0
  eth0: 9876543210  5432109    0    0    0     0          0         0 1234567890  987654    0    0    0     0       0          0
  wlan0:       0        0    0    0    0     0          0         0        0        0    0    0    0     0       0          0
      `;

      const stats = parseNetworkInterfaceStats(procNetDevOutput);
      
      expect(stats).toHaveLength(3);
      
      // lo 인터페이스 테스트
      const loInterface = stats.find(s => s.interface === 'lo');
      expect(loInterface).toBeDefined();
      expect(loInterface?.rxBytes).toBe(123456);
      expect(loInterface?.rxPackets).toBe(789);
      expect(loInterface?.txBytes).toBe(123456);
      expect(loInterface?.txPackets).toBe(789);
      
      // eth0 인터페이스 테스트
      const eth0Interface = stats.find(s => s.interface === 'eth0');
      expect(eth0Interface).toBeDefined();
      expect(eth0Interface?.rxBytes).toBe(9876543210);
      expect(eth0Interface?.txBytes).toBe(1234567890);
    });
  });

  describe('parseUfwStatus', () => {
    test('should parse active ufw status correctly', () => {
      const ufwOutput = `
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
22/tcp (v6)               ALLOW       Anywhere (v6)
80/tcp (v6)               ALLOW       Anywhere (v6)
443/tcp (v6)              ALLOW       Anywhere (v6)
      `;

      const status = parseUfwStatus(ufwOutput);
      
      expect(status.active).toBe(true);
      expect(status.service).toBe('ufw');
      expect(status.ruleCount).toBe(6);
    });

    test('should parse inactive ufw status correctly', () => {
      const ufwOutput = `
Status: inactive
      `;

      const status = parseUfwStatus(ufwOutput);
      
      expect(status.active).toBe(false);
      expect(status.service).toBe('ufw');
      expect(status.ruleCount).toBe(0);
    });
  });

  describe('parseIptablesStatus', () => {
    test('should parse iptables -L output correctly', () => {
      const iptablesOutput = `
Chain INPUT (policy ACCEPT)
target     prot opt source               destination         
ACCEPT     tcp  --  anywhere             anywhere             tcp dpt:ssh
ACCEPT     tcp  --  anywhere             anywhere             tcp dpt:http
DROP       all  --  anywhere             anywhere            

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination         

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination         
      `;

      const status = parseIptablesStatus(iptablesOutput);
      
      expect(status.active).toBe(true);
      expect(status.service).toBe('iptables');
      expect(status.ruleCount).toBe(3); // 3개의 실제 규칙
    });
  });

  describe('extractListeningPorts', () => {
    test('should extract listening ports from connections', () => {
      const connections: NetworkConnection[] = [
        {
          protocol: NetworkProtocol.TCP,
          localAddress: '0.0.0.0:22',
          localIP: '0.0.0.0',
          localPort: 22,
          remoteAddress: '0.0.0.0:*',
          remoteIP: '0.0.0.0',
          remotePort: 0,
          state: NetworkConnectionState.LISTEN,
          pid: 1234,
          processName: 'sshd'
        },
        {
          protocol: NetworkProtocol.TCP,
          localAddress: '192.168.1.100:80',
          localIP: '192.168.1.100',
          localPort: 80,
          remoteAddress: '192.168.1.200:3456',
          remoteIP: '192.168.1.200',
          remotePort: 3456,
          state: NetworkConnectionState.ESTABLISHED,
          pid: 9012,
          processName: 'nginx'
        },
        {
          protocol: NetworkProtocol.TCP,
          localAddress: '127.0.0.1:3306',
          localIP: '127.0.0.1',
          localPort: 3306,
          remoteAddress: '0.0.0.0:*',
          remoteIP: '0.0.0.0',
          remotePort: 0,
          state: NetworkConnectionState.LISTEN,
          pid: 5678,
          processName: 'mysqld'
        }
      ];

      const listeningPorts = extractListeningPorts(connections);
      
      expect(listeningPorts).toHaveLength(2);
      
      const sshPort = listeningPorts.find(p => p.port === 22);
      expect(sshPort).toBeDefined();
      expect(sshPort?.serviceName).toBe('ssh');
      
      const mysqlPort = listeningPorts.find(p => p.port === 3306);
      expect(mysqlPort).toBeDefined();
      expect(mysqlPort?.serviceName).toBe('mysql');
    });
  });

  describe('calculateNetworkStatistics', () => {
    test('should calculate network statistics correctly', () => {
      const connections: NetworkConnection[] = [
        {
          protocol: NetworkProtocol.TCP,
          localAddress: '0.0.0.0:22',
          localIP: '0.0.0.0',
          localPort: 22,
          remoteAddress: '0.0.0.0:*',
          remoteIP: '0.0.0.0',
          remotePort: 0,
          state: NetworkConnectionState.LISTEN,
          pid: 1234,
          processName: 'sshd'
        },
        {
          protocol: NetworkProtocol.TCP,
          localAddress: '192.168.1.100:80',
          localIP: '192.168.1.100',
          localPort: 80,
          remoteAddress: '192.168.1.200:3456',
          remoteIP: '192.168.1.200',
          remotePort: 3456,
          state: NetworkConnectionState.ESTABLISHED,
          pid: 9012,
          processName: 'nginx'
        },
        {
          protocol: NetworkProtocol.UDP,
          localAddress: '0.0.0.0:53',
          localIP: '0.0.0.0',
          localPort: 53,
          remoteAddress: '0.0.0.0:*',
          remoteIP: '0.0.0.0',
          remotePort: 0,
          state: NetworkConnectionState.UNKNOWN,
          pid: 3456,
          processName: 'systemd-resolve'
        }
      ];

      const interfaceStats: NetworkInterfaceStats[] = [
        {
          interface: 'eth0',
          rxBytes: 1000000,
          rxPackets: 1000,
          rxErrors: 0,
          rxDropped: 0,
          txBytes: 500000,
          txPackets: 500,
          txErrors: 0,
          txDropped: 0
        }
      ];

      const statistics = calculateNetworkStatistics(connections, interfaceStats);
      
      expect(statistics.totalConnections).toBe(3);
      expect(statistics.connectionsByProtocol.tcp).toBe(2);
      expect(statistics.connectionsByProtocol.udp).toBe(1);
      expect(statistics.connectionsByState[NetworkConnectionState.LISTEN]).toBe(1);
      expect(statistics.connectionsByState[NetworkConnectionState.ESTABLISHED]).toBe(1);
      expect(statistics.listeningPorts).toBe(1);
      expect(statistics.interfaceStats).toHaveLength(1);
      expect(statistics.interfaceStats[0].interface).toBe('eth0');
    });
  });
});

describe('Network Monitoring Integration Tests', () => {
  test('should handle complete network monitoring workflow', () => {
    // 실제 netstat 출력 시뮬레이션
    const netstatOutput = `
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1234/sshd
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      5678/mysqld
tcp        0      0 192.168.1.100:80        192.168.1.200:3456      ESTABLISHED 9012/nginx
udp        0      0 0.0.0.0:53              0.0.0.0:*                           3456/systemd-resolve
    `;

    // 네트워크 인터페이스 통계 시뮬레이션
    const procNetDevOutput = `
Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
  eth0: 1000000     1000    0    0    0     0          0         0   500000      500    0    0    0     0       0          0
    `;

    // 방화벽 상태 시뮬레이션
    const ufwOutput = `
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
    `;

    // 전체 워크플로우 테스트
    const connections = parseNetstatOutput(netstatOutput);
    const interfaceStats = parseNetworkInterfaceStats(procNetDevOutput);
    const firewallStatus = parseUfwStatus(ufwOutput);
    const listeningPorts = extractListeningPorts(connections);
    const statistics = calculateNetworkStatistics(connections, interfaceStats);

    // 결과 검증
    expect(connections).toHaveLength(4);
    expect(listeningPorts).toHaveLength(2);
    expect(statistics.totalConnections).toBe(4);
    expect(statistics.listeningPorts).toBe(2);
    expect(firewallStatus.active).toBe(true);
    expect(firewallStatus.ruleCount).toBe(2);

    // 특정 서비스 확인
    const sshPort = listeningPorts.find(p => p.port === 22);
    expect(sshPort?.serviceName).toBe('ssh');
    
    const mysqlPort = listeningPorts.find(p => p.port === 3306);
    expect(mysqlPort?.serviceName).toBe('mysql');
  });
});

// Mock 데이터 및 유틸리티 함수들
export const mockNetstatOutput = `
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1234/sshd
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      5678/mysqld
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      9012/nginx
udp        0      0 0.0.0.0:53              0.0.0.0:*                           3456/systemd-resolve
`;

export const mockProcNetDev = `
Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo:  123456      789    0    0    0     0          0         0   123456      789    0    0    0     0       0          0
  eth0: 9876543210  5432109    0    0    0     0          0         0 1234567890  987654    0    0    0     0       0          0
`;

export const mockUfwStatus = `
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
`;

export function createMockNetworkConnection(overrides: Partial<NetworkConnection> = {}): NetworkConnection {
  return {
    protocol: NetworkProtocol.TCP,
    localAddress: '0.0.0.0:80',
    localIP: '0.0.0.0',
    localPort: 80,
    remoteAddress: '0.0.0.0:*',
    remoteIP: '0.0.0.0',
    remotePort: 0,
    state: NetworkConnectionState.LISTEN,
    pid: 1234,
    processName: 'nginx',
    ...overrides
  };
}