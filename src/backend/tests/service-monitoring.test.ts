/**
 * Service Monitoring API Tests
 * systemd 서비스 모니터링 API 단위 테스트
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import servicesRouter from '../database/routes/services.js';
import { db } from '../database/db/index.js';
import { sshData } from '../database/db/schema.js';
import { eq } from 'drizzle-orm';
import { 
  ServiceAction, 
  ServiceActiveState,
  ServiceUnitType,
  ServiceErrorCode
} from '../types/service-monitoring.js';

// 테스트용 Express 앱 설정
const app = express();
app.use(bodyParser.json());
app.use('/services', servicesRouter);

// 테스트 데이터
const testHost = {
  id: 999,
  name: 'test-host',
  ip: '127.0.0.1',
  port: 22,
  username: 'testuser',
  password: 'testpass',
  authType: 'password',
  enableTerminal: true,
  enableTunnel: false,
  enableFileManager: false,
  folder: '',
  tags: [],
  pin: false,
  defaultPath: '/home/testuser',
  tunnelConnections: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock SSH 연결 및 명령어 실행
jest.mock('../ssh/ssh-utils.js', () => ({
  createSSHConnection: jest.fn().mockResolvedValue('mock-connection'),
  executeSSHCommand: jest.fn(),
  closeSSHConnection: jest.fn().mockResolvedValue(undefined),
  sshConnectionPool: new Map(),
  SSHConnectionError: class extends Error { constructor(message: string) { super(message); } },
  SSHCommandError: class extends Error { constructor(message: string) { super(message); } }
}));

// Mock 데이터
const mockSystemctlListOutput = `UNIT                        LOAD   ACTIVE SUB     DESCRIPTION
systemd-journald.service    loaded active running Journal Service
nginx.service               loaded active running The nginx HTTP and reverse proxy server
postgresql.service          loaded failed failed  PostgreSQL database server
apache2.service             loaded inactive dead   The Apache HTTP Server
sshd.service                loaded active running OpenSSH server daemon
docker.service              loaded active running Docker Application Container Engine

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.

6 loaded units listed. Pass --all to see loaded but inactive units, too.`;

const mockSystemctlShowOutput = `Type=notify
Restart=on-failure
NotifyAccess=main
RestartUSec=100ms
LoadState=loaded
ActiveState=active
SubState=running
UnitFileState=enabled
MainPID=1234
MemoryCurrent=52428800
CPUUsageNSec=1500000000
ActiveEnterTimestamp=Mon 2024-01-15 10:30:00 UTC
ExecMainStartTimestamp=Mon 2024-01-15 10:30:00 UTC
Documentation=man:systemd-journald.service(8) man:journald.conf(5)
FragmentPath=/lib/systemd/system/systemd-journald.service`;

const mockJournalctlOutput = `{"__REALTIME_TIMESTAMP": "1705315800000000", "MESSAGE": "Started Journal Service.", "PRIORITY": "6", "_HOSTNAME": "test-host", "_PID": "1234"}
{"__REALTIME_TIMESTAMP": "1705315801000000", "MESSAGE": "Journal started", "PRIORITY": "6", "_HOSTNAME": "test-host", "_PID": "1234"}`;

describe('Service Monitoring API', () => {
  beforeAll(async () => {
    // 테스트용 호스트 데이터 삽입
    try {
      await db.insert(sshData).values(testHost);
    } catch (error) {
      // 이미 존재하는 경우 무시
    }
  });

  afterAll(async () => {
    // 테스트용 데이터 정리
    try {
      await db.delete(sshData).where(eq(sshData.id, testHost.id));
    } catch (error) {
      // 정리 실패해도 무시
    }
  });

  beforeEach(() => {
    // Mock 함수들 초기화
    jest.clearAllMocks();
  });

  describe('GET /services/:hostId', () => {
    test('should return service list successfully', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand.mockResolvedValueOnce(mockSystemctlListOutput);

      const response = await request(app)
        .get('/services/999')
        .expect(200);

      expect(response.body).toHaveProperty('hostId', 999);
      expect(response.body).toHaveProperty('hostname', '127.0.0.1');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.services)).toBe(true);
      expect(response.body.services.length).toBeGreaterThan(0);

      // 첫 번째 서비스 검증
      const firstService = response.body.services[0];
      expect(firstService).toHaveProperty('name');
      expect(firstService).toHaveProperty('description');
      expect(firstService).toHaveProperty('unitType');
      expect(firstService).toHaveProperty('loadState');
      expect(firstService).toHaveProperty('activeState');
      expect(firstService).toHaveProperty('subState');
    });

    test('should handle invalid host ID', async () => {
      const response = await request(app)
        .get('/services/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid host ID');
      expect(response.body).toHaveProperty('code', ServiceErrorCode.SERVICE_NOT_FOUND);
    });

    test('should handle non-existent host', async () => {
      const response = await request(app)
        .get('/services/99999')
        .expect(500);

      expect(response.body).toHaveProperty('code', ServiceErrorCode.SERVICE_NOT_FOUND);
      expect(response.body.message).toContain('not found');
    });

    test('should support filtering and sorting options', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand.mockResolvedValueOnce(mockSystemctlListOutput);

      const response = await request(app)
        .get('/services/999')
        .query({
          search: 'nginx',
          sortBy: 'name',
          sortOrder: 'desc',
          limit: 10,
          page: 1
        })
        .expect(200);

      expect(response.body).toHaveProperty('services');
      expect(response.body.services.length).toBeLessThanOrEqual(10);
    });

    test('should include detailed information when requested', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand
        .mockResolvedValueOnce(mockSystemctlListOutput)
        .mockResolvedValueOnce(mockSystemctlShowOutput);

      const response = await request(app)
        .get('/services/999')
        .query({ details: 'true' })
        .expect(200);

      expect(response.body).toHaveProperty('services');
    });
  });

  describe('GET /services/:hostId/:serviceName/status', () => {
    test('should return service status successfully', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand
        .mockResolvedValueOnce(mockSystemctlShowOutput)
        .mockResolvedValueOnce('systemd-journald.service loaded active running Journal Service');

      const response = await request(app)
        .get('/services/999/systemd-journald.service/status')
        .expect(200);

      expect(response.body).toHaveProperty('service');
      expect(response.body.service).toHaveProperty('name', 'systemd-journald.service');
      expect(response.body.service).toHaveProperty('activeState');
      expect(response.body.service).toHaveProperty('subState');
    });

    test('should include recent logs when requested', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand
        .mockResolvedValueOnce(mockSystemctlShowOutput)
        .mockResolvedValueOnce('systemd-journald.service loaded active running Journal Service')
        .mockResolvedValueOnce(mockJournalctlOutput);

      const response = await request(app)
        .get('/services/999/systemd-journald.service/status')
        .query({ logs: 'true' })
        .expect(200);

      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('recentLogs');
      expect(Array.isArray(response.body.recentLogs)).toBe(true);
    });

    test('should handle service not found', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand
        .mockResolvedValueOnce('') // empty systemctl show output
        .mockResolvedValueOnce(''); // empty list output

      const response = await request(app)
        .get('/services/999/nonexistent.service/status')
        .expect(500);

      expect(response.body).toHaveProperty('code', ServiceErrorCode.SERVICE_NOT_FOUND);
    });
  });

  describe('POST /services/:hostId/:serviceName/action', () => {
    test('should start service successfully', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand
        .mockResolvedValueOnce('inactive') // 현재 상태 조회
        .mockResolvedValueOnce('') // systemctl start 실행
        .mockResolvedValueOnce('active'); // 실행 후 상태 조회

      const response = await request(app)
        .post('/services/999/nginx.service/action')
        .send({ action: ServiceAction.START })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('action', ServiceAction.START);
      expect(response.body).toHaveProperty('serviceName', 'nginx.service');
      expect(response.body).toHaveProperty('previousState');
      expect(response.body).toHaveProperty('currentState');
      expect(response.body).toHaveProperty('executionTime');
    });

    test('should stop service successfully', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand
        .mockResolvedValueOnce('active')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('inactive');

      const response = await request(app)
        .post('/services/999/nginx.service/action')
        .send({ action: ServiceAction.STOP })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('action', ServiceAction.STOP);
    });

    test('should restart service successfully', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand
        .mockResolvedValueOnce('active')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('active');

      const response = await request(app)
        .post('/services/999/nginx.service/action')
        .send({ action: ServiceAction.RESTART })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('action', ServiceAction.RESTART);
    });

    test('should handle invalid action', async () => {
      const response = await request(app)
        .post('/services/999/nginx.service/action')
        .send({ action: 'invalid_action' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid action');
      expect(response.body).toHaveProperty('code', ServiceErrorCode.INVALID_ACTION);
    });

    test('should handle permission denied', async () => {
      const { executeSSHCommand, SSHCommandError } = require('../ssh/ssh-utils.js');
      executeSSHCommand
        .mockResolvedValueOnce('active')
        .mockRejectedValueOnce(new SSHCommandError('Permission denied'));

      const response = await request(app)
        .post('/services/999/nginx.service/action')
        .send({ action: ServiceAction.STOP })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Permission denied');
    });
  });

  describe('GET /services/:hostId/:serviceName/logs', () => {
    test('should return service logs successfully', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand.mockResolvedValueOnce(mockJournalctlOutput);

      const response = await request(app)
        .get('/services/999/systemd-journald.service/logs')
        .expect(200);

      expect(response.body).toHaveProperty('serviceName', 'systemd-journald.service');
      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
      expect(response.body.logs.length).toBeGreaterThan(0);

      // 로그 엔트리 구조 검증
      const firstLog = response.body.logs[0];
      expect(firstLog).toHaveProperty('timestamp');
      expect(firstLog).toHaveProperty('message');
      expect(firstLog).toHaveProperty('priority');
    });

    test('should support log filtering options', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand.mockResolvedValueOnce(mockJournalctlOutput);

      const response = await request(app)
        .get('/services/999/systemd-journald.service/logs')
        .query({
          lines: 50,
          since: '2024-01-15',
          priority: '6'
        })
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('totalLines');
    });
  });

  describe('GET /services/:hostId/statistics', () => {
    test('should return service statistics successfully', async () => {
      const { executeSSHCommand } = require('../ssh/ssh-utils.js');
      executeSSHCommand.mockResolvedValueOnce(mockSystemctlListOutput);

      const response = await request(app)
        .get('/services/999/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byState');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('recentlyChanged');
      expect(response.body).toHaveProperty('highResource');

      expect(typeof response.body.total).toBe('number');
      expect(Array.isArray(response.body.failed)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle SSH connection errors', async () => {
      const { createSSHConnection, SSHConnectionError } = require('../ssh/ssh-utils.js');
      createSSHConnection.mockRejectedValueOnce(new SSHConnectionError('Connection failed'));

      const response = await request(app)
        .get('/services/999')
        .expect(500);

      expect(response.body).toHaveProperty('code', ServiceErrorCode.SSH_ERROR);
      expect(response.body.message).toContain('SSH connection failed');
    });

    test('should handle systemctl command errors', async () => {
      const { executeSSHCommand, SSHCommandError } = require('../ssh/ssh-utils.js');
      executeSSHCommand.mockRejectedValueOnce(new SSHCommandError('systemctl: command not found'));

      const response = await request(app)
        .get('/services/999')
        .expect(500);

      expect(response.body).toHaveProperty('code', ServiceErrorCode.SYSTEMCTL_ERROR);
    });
  });

  describe('Parser Functions', () => {
    test('should parse systemctl list-units output correctly', async () => {
      const { parseSystemctlListUnits } = require('../utils/service-parser.js');
      
      const result = parseSystemctlListUnits(mockSystemctlListOutput);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const firstService = result[0];
      expect(firstService).toHaveProperty('unit');
      expect(firstService).toHaveProperty('load');
      expect(firstService).toHaveProperty('active');
      expect(firstService).toHaveProperty('sub');
      expect(firstService).toHaveProperty('description');
    });

    test('should parse systemctl show output correctly', async () => {
      const { parseSystemctlShow } = require('../utils/service-parser.js');
      
      const result = parseSystemctlShow(mockSystemctlShowOutput);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('LoadState', 'loaded');
      expect(result).toHaveProperty('ActiveState', 'active');
      expect(result).toHaveProperty('SubState', 'running');
      expect(result).toHaveProperty('MainPID', '1234');
    });

    test('should parse journalctl output correctly', async () => {
      const { parseJournalctlOutput } = require('../utils/service-parser.js');
      
      const result = parseJournalctlOutput(mockJournalctlOutput);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      
      const firstLog = result[0];
      expect(firstLog).toHaveProperty('timestamp');
      expect(firstLog).toHaveProperty('message', 'Started Journal Service.');
      expect(firstLog).toHaveProperty('priority', 6);
    });
  });
});

// 통합 테스트 (선택적 - 실제 SSH 연결 필요)
describe('Service Monitoring Integration Tests', () => {
  // 실제 SSH 호스트가 있는 경우에만 실행
  const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';
  const testHostId = process.env.TEST_HOST_ID;

  if (!shouldRunIntegrationTests || !testHostId) {
    test.skip('Integration tests skipped - set RUN_INTEGRATION_TESTS=true and TEST_HOST_ID to run', () => {});
    return;
  }

  beforeAll(async () => {
    // 실제 SSH 연결 모듈 로드
    jest.unmock('../ssh/ssh-utils.js');
  });

  test('should connect to real host and fetch services', async () => {
    const response = await request(app)
      .get(`/services/${testHostId}`)
      .timeout(10000)
      .expect(200);

    expect(response.body).toHaveProperty('services');
    expect(response.body.services.length).toBeGreaterThan(0);
  }, 15000);

  test('should get real service status', async () => {
    // 일반적으로 존재하는 서비스 테스트
    const response = await request(app)
      .get(`/services/${testHostId}/sshd.service/status`)
      .timeout(10000)
      .expect(200);

    expect(response.body).toHaveProperty('service');
    expect(response.body.service).toHaveProperty('name', 'sshd.service');
  }, 15000);
});