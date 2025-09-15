/**
 * SSH Utility Functions for Process Monitoring
 * SSH 연결을 통한 원격 명령어 실행을 위한 공통 유틸리티
 */

import { Client, type ConnectConfig } from 'ssh2';
import chalk from 'chalk';

// SSH 연결 설정 인터페이스
export interface SSHConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer | string;
  passphrase?: string;
  timeout?: number;
}

// 명령어 실행 결과 인터페이스
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
}

// 에러 타입
export class SSHConnectionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly host: string
  ) {
    super(message);
    this.name = 'SSHConnectionError';
  }
}

export class SSHCommandError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly exitCode: number | null,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'SSHCommandError';
  }
}

// 로거 설정
const sshIconSymbol = '🔧';
const getTimeStamp = (): string => chalk.gray(`[${new Date().toLocaleTimeString()}]`);
const formatMessage = (level: string, colorFn: chalk.Chalk, message: string): string => {
  return `${getTimeStamp()} ${colorFn(`[${level.toUpperCase()}]`)} ${chalk.hex('#1e3a8a')(`[${sshIconSymbol}]`)} ${message}`;
};

const logger = {
  info: (msg: string): void => {
    console.log(formatMessage('info', chalk.cyan, msg));
  },
  warn: (msg: string): void => {
    console.warn(formatMessage('warn', chalk.yellow, msg));
  },
  error: (msg: string, err?: unknown): void => {
    console.error(formatMessage('error', chalk.redBright, msg));
    if (err) console.error(err);
  },
  success: (msg: string): void => {
    console.log(formatMessage('success', chalk.greenBright, msg));
  },
  debug: (msg: string): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', chalk.magenta, msg));
    }
  }
};

/**
 * SSH 연결을 생성합니다.
 */
export function createSSHConnection(config: SSHConnectionConfig): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timeout = config.timeout || 30000; // 30초 기본 타임아웃

    const timeoutId = setTimeout(() => {
      conn.destroy();
      reject(new SSHConnectionError(
        `SSH connection timeout after ${timeout}ms`,
        'TIMEOUT',
        config.host
      ));
    }, timeout);

    conn.on('ready', () => {
      clearTimeout(timeoutId);
      logger.success(`SSH connection established to ${config.host}:${config.port}`);
      resolve(conn);
    });

    conn.on('error', (err) => {
      clearTimeout(timeoutId);
      logger.error(`SSH connection failed to ${config.host}:${config.port}`, err);
      reject(new SSHConnectionError(
        `SSH connection failed: ${err.message}`,
        (err as any).code || 'CONNECTION_ERROR',
        config.host
      ));
    });

    // SSH 연결 설정 준비
    const sshConfig: ConnectConfig = {
      host: config.host,
      port: config.port,
      username: config.username,
      readyTimeout: timeout,
      keepaliveInterval: 30000,
      keepaliveCountMax: 3
    };

    // 인증 방법 설정
    if (config.privateKey) {
      sshConfig.privateKey = config.privateKey;
      if (config.passphrase) {
        sshConfig.passphrase = config.passphrase;
      }
    } else if (config.password) {
      sshConfig.password = config.password;
    } else {
      reject(new SSHConnectionError(
        'No authentication method provided (password or privateKey required)',
        'NO_AUTH',
        config.host
      ));
      return;
    }

    logger.info(`Connecting to SSH server at ${config.host}:${config.port}...`);
    conn.connect(sshConfig);
  });
}

/**
 * SSH 연결을 통해 명령어를 실행합니다.
 */
export function executeSSHCommand(
  conn: Client,
  command: string,
  options: {
    timeout?: number;
    encoding?: BufferEncoding;
    maxBuffer?: number;
  } = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = options.timeout || 30000;
    const maxBuffer = options.maxBuffer || 1024 * 1024; // 1MB 기본값
    const encoding = options.encoding || 'utf8';

    let stdout = '';
    let stderr = '';
    let stdoutBuffer = Buffer.alloc(0);
    let stderrBuffer = Buffer.alloc(0);

    logger.debug(`Executing command: ${command}`);

    conn.exec(command, (err, stream) => {
      if (err) {
        logger.error(`Failed to execute command: ${command}`, err);
        reject(new SSHCommandError(
          `Failed to execute command: ${err.message}`,
          command,
          null,
          ''
        ));
        return;
      }

      const timeoutId = setTimeout(() => {
        stream.destroy();
        reject(new SSHCommandError(
          `Command timeout after ${timeout}ms`,
          command,
          null,
          stderr
        ));
      }, timeout);

      stream.on('close', (code: number | null, signal: string | null) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // 최종 문자열 변환
        stdout = stdoutBuffer.toString(encoding);
        stderr = stderrBuffer.toString(encoding);

        logger.debug(`Command completed in ${duration}ms with exit code: ${code}`);

        const result: CommandResult = {
          success: code === 0,
          stdout,
          stderr,
          exitCode: code,
          duration
        };

        if (code === 0) {
          resolve(result);
        } else {
          reject(new SSHCommandError(
            `Command failed with exit code ${code}`,
            command,
            code,
            stderr
          ));
        }
      });

      stream.on('data', (data: Buffer) => {
        stdoutBuffer = Buffer.concat([stdoutBuffer, data]);
        if (stdoutBuffer.length > maxBuffer) {
          stream.destroy();
          reject(new SSHCommandError(
            `Command output exceeded maximum buffer size (${maxBuffer} bytes)`,
            command,
            null,
            stderr
          ));
        }
      });

      stream.stderr.on('data', (data: Buffer) => {
        stderrBuffer = Buffer.concat([stderrBuffer, data]);
        if (stderrBuffer.length > maxBuffer) {
          stream.destroy();
          reject(new SSHCommandError(
            `Command error output exceeded maximum buffer size (${maxBuffer} bytes)`,
            command,
            null,
            stderr
          ));
        }
      });

      stream.on('error', (streamErr) => {
        clearTimeout(timeoutId);
        logger.error(`Stream error for command: ${command}`, streamErr);
        reject(new SSHCommandError(
          `Stream error: ${streamErr.message}`,
          command,
          null,
          stderr
        ));
      });
    });
  });
}

/**
 * SSH 연결을 안전하게 종료합니다.
 */
export function closeSSHConnection(conn: Client): Promise<void> {
  return new Promise((resolve) => {
    conn.on('close', () => {
      logger.info('SSH connection closed');
      resolve();
    });

    conn.end();

    // 강제 종료 타임아웃 (5초)
    setTimeout(() => {
      conn.destroy();
      resolve();
    }, 5000);
  });
}

/**
 * 여러 명령어를 순차적으로 실행합니다.
 */
export async function executeMultipleCommands(
  conn: Client,
  commands: string[],
  options: {
    stopOnError?: boolean;
    timeout?: number;
  } = {}
): Promise<CommandResult[]> {
  const results: CommandResult[] = [];
  const stopOnError = options.stopOnError ?? true;

  for (const command of commands) {
    try {
      const result = await executeSSHCommand(conn, command, {
        timeout: options.timeout
      });
      results.push(result);
    } catch (error) {
      if (error instanceof SSHCommandError) {
        results.push({
          success: false,
          stdout: '',
          stderr: error.stderr,
          exitCode: error.exitCode,
          duration: 0
        });

        if (stopOnError) {
          break;
        }
      } else {
        throw error;
      }
    }
  }

  return results;
}

/**
 * SSH 연결 풀 관리 클래스
 */
export class SSHConnectionPool {
  private connections = new Map<string, { conn: Client; lastUsed: number; inUse: boolean }>();
  private readonly maxConnections: number;
  private readonly idleTimeout: number;

  constructor(maxConnections = 10, idleTimeout = 300000) { // 5분 기본 타임아웃
    this.maxConnections = maxConnections;
    this.idleTimeout = idleTimeout;

    // 정기적으로 유휴 연결 정리
    setInterval(() => this.cleanupIdleConnections(), 60000); // 1분마다
  }

  /**
   * 연결 키 생성
   */
  private getConnectionKey(config: SSHConnectionConfig): string {
    return `${config.username}@${config.host}:${config.port}`;
  }

  /**
   * 연결 획득
   */
  async getConnection(config: SSHConnectionConfig): Promise<Client> {
    const key = this.getConnectionKey(config);
    const existing = this.connections.get(key);

    if (existing && !existing.inUse) {
      existing.inUse = true;
      existing.lastUsed = Date.now();
      logger.debug(`Reusing existing SSH connection: ${key}`);
      return existing.conn;
    }

    if (this.connections.size >= this.maxConnections) {
      throw new SSHConnectionError(
        'SSH connection pool is full',
        'POOL_FULL',
        config.host
      );
    }

    const conn = await createSSHConnection(config);
    this.connections.set(key, {
      conn,
      lastUsed: Date.now(),
      inUse: true
    });

    logger.debug(`Created new SSH connection: ${key}`);
    return conn;
  }

  /**
   * 연결 반환
   */
  releaseConnection(config: SSHConnectionConfig): void {
    const key = this.getConnectionKey(config);
    const existing = this.connections.get(key);

    if (existing) {
      existing.inUse = false;
      existing.lastUsed = Date.now();
      logger.debug(`Released SSH connection: ${key}`);
    }
  }

  /**
   * 유휴 연결 정리
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [key, { conn, lastUsed, inUse }] of this.connections) {
      if (!inUse && (now - lastUsed) > this.idleTimeout) {
        toRemove.push(key);
        conn.end();
      }
    }

    for (const key of toRemove) {
      this.connections.delete(key);
      logger.debug(`Removed idle SSH connection: ${key}`);
    }
  }

  /**
   * 모든 연결 종료
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(({ conn }) =>
      closeSSHConnection(conn)
    );

    await Promise.all(closePromises);
    this.connections.clear();
    logger.info('All SSH connections closed');
  }
}

// 전역 연결 풀 인스턴스
export const sshConnectionPool = new SSHConnectionPool();