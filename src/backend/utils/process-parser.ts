/**
 * Process Parser Utilities
 * ps aux 명령어 결과 파싱 및 시스템 정보 처리
 */

import { 
  type ProcessInfo, 
  ProcessState, 
  ProcessStateLabels,
  type RawProcessData,
  type SystemInfo,
  type ProcessListResponse,
  type ProcessFilter,
  ProcessSortField,
  type ProcessListOptions
} from '../types/process-monitoring.js';

/**
 * ps aux 명령어 출력을 파싱합니다.
 */
export function parsePsAuxOutput(output: string): ProcessInfo[] {
  const lines = output.trim().split('\n');
  
  if (lines.length === 0) {
    return [];
  }

  // 헤더 라인을 제거 (보통 첫 번째 라인)
  const headerLine = lines[0];
  const dataLines = lines.slice(1);

  const processes: ProcessInfo[] = [];

  for (const line of dataLines) {
    try {
      const process = parsePsAuxLine(line);
      if (process) {
        processes.push(process);
      }
    } catch (error) {
      console.warn(`Failed to parse process line: ${line}`, error);
      // 개별 라인 파싱 실패는 무시하고 계속 진행
    }
  }

  return processes;
}

/**
 * ps aux 한 줄을 파싱합니다.
 */
function parsePsAuxLine(line: string): ProcessInfo | null {
  // ps aux 출력 형식: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return null;
  }

  // 정규표현식을 사용하여 필드 분리
  // COMMAND 필드에 공백이 포함될 수 있으므로 주의깊게 파싱
  const match = trimmedLine.match(
    /^(\S+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/
  );

  if (!match) {
    // 매칭에 실패한 경우 공백으로 분리하여 재시도
    return parseBySpaceSplit(trimmedLine);
  }

  const [
    , user, pidStr, cpuStr, memStr, vszStr, rssStr, 
    tty, stat, start, time, command
  ] = match;

  return createProcessInfo({
    USER: user,
    PID: pidStr,
    '%CPU': cpuStr,
    '%MEM': memStr,
    VSZ: vszStr,
    RSS: rssStr,
    TTY: tty,
    STAT: stat,
    START: start,
    TIME: time,
    COMMAND: command
  });
}

/**
 * 공백으로 분리하여 파싱 (백업 방법)
 */
function parseBySpaceSplit(line: string): ProcessInfo | null {
  const parts = line.split(/\s+/);
  
  if (parts.length < 11) {
    return null;
  }

  // COMMAND는 나머지 모든 부분을 합침
  const command = parts.slice(10).join(' ');

  return createProcessInfo({
    USER: parts[0],
    PID: parts[1],
    '%CPU': parts[2],
    '%MEM': parts[3],
    VSZ: parts[4],
    RSS: parts[5],
    TTY: parts[6],
    STAT: parts[7],
    START: parts[8],
    TIME: parts[9],
    COMMAND: command
  });
}

/**
 * 원시 프로세스 데이터를 ProcessInfo 객체로 변환합니다.
 */
function createProcessInfo(raw: RawProcessData): ProcessInfo {
  const pid = parseInt(raw.PID, 10);
  const cpuPercent = parseFloat(raw['%CPU']) || 0;
  const memoryPercent = parseFloat(raw['%MEM']) || 0;
  const virtualMemoryKB = parseInt(raw.VSZ, 10) || 0;
  const residentMemoryKB = parseInt(raw.RSS, 10) || 0;

  // 명령어와 인수 분리
  const fullCommand = raw.COMMAND;
  const commandParts = parseCommand(fullCommand);

  // 프로세스 상태 파싱
  const state = parseProcessState(raw.STAT);

  // 우선순위 추출 (STAT 필드에서)
  const priority = extractPriority(raw.STAT);

  // PPID는 별도 명령어로 가져와야 함 (ps -eo 사용 시)
  const ppid = raw.PPID ? parseInt(raw.PPID, 10) : 0;

  return {
    pid,
    ppid,
    user: raw.USER,
    command: commandParts.command,
    args: commandParts.args,
    fullCommand,
    state,
    priority,
    cpuPercent,
    memoryPercent,
    memoryKB: residentMemoryKB,
    virtualMemoryKB,
    residentMemoryKB,
    startTime: raw.START,
    elapsedTime: raw.TIME,
    tty: raw.TTY
  };
}

/**
 * 명령어 문자열을 파싱하여 명령어와 인수로 분리합니다.
 */
function parseCommand(commandStr: string): { command: string; args: string[] } {
  // 대괄호로 둘러싸인 커널 스레드 처리 [kthreadd]
  if (commandStr.startsWith('[') && commandStr.endsWith(']')) {
    return {
      command: commandStr,
      args: []
    };
  }

  // 공백으로 분리하되, 따옴표 내부는 하나의 인수로 처리
  const parts = commandStr.match(/(?:[^\s"]+|"[^"]*")+/g) || [commandStr];
  
  if (parts.length === 0) {
    return { command: commandStr, args: [] };
  }

  const command = parts[0];
  const args = parts.slice(1).map(arg => 
    arg.startsWith('"') && arg.endsWith('"') ? arg.slice(1, -1) : arg
  );

  return { command, args };
}

/**
 * 프로세스 상태를 파싱합니다.
 */
function parseProcessState(statStr: string): ProcessState {
  if (!statStr || statStr.length === 0) {
    return ProcessState.Unknown;
  }

  // 첫 번째 문자가 주요 상태
  const mainState = statStr[0].toLowerCase();

  switch (mainState) {
    case 'r': return ProcessState.Running;
    case 's': return ProcessState.Sleeping;
    case 'd': return ProcessState.Waiting;
    case 'z': return ProcessState.Zombie;
    case 't': return ProcessState.Stopped;
    case 'x': return ProcessState.Dead;
    default: return ProcessState.Unknown;
  }
}

/**
 * STAT 필드에서 우선순위 정보를 추출합니다.
 */
function extractPriority(statStr: string): number {
  // STAT 필드에는 우선순위 정보가 없으므로 기본값 반환
  // 실제 우선순위는 별도의 ps -o 명령어로 가져와야 함
  return 0;
}

/**
 * 시스템 정보를 파싱합니다.
 */
export function parseSystemInfo(
  uptimeOutput?: string,
  meminfoOutput?: string,
  loadavgOutput?: string,
  cpuinfoOutput?: string
): SystemInfo {
  const systemInfo: SystemInfo = {
    uptime: 0,
    loadAverage: [0, 0, 0],
    totalMemoryKB: 0,
    freeMemoryKB: 0,
    usedMemoryKB: 0,
    cpuCount: 0,
    processCount: 0
  };

  // uptime 파싱
  if (uptimeOutput) {
    const uptimeMatch = uptimeOutput.match(/up\s+(.+?),/);
    if (uptimeMatch) {
      systemInfo.uptime = parseUptime(uptimeMatch[1]);
    }

    // 로드 평균 파싱
    const loadMatch = uptimeOutput.match(/load average:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    if (loadMatch) {
      systemInfo.loadAverage = [
        parseFloat(loadMatch[1]),
        parseFloat(loadMatch[2]),
        parseFloat(loadMatch[3])
      ];
    }
  }

  // /proc/loadavg 파싱 (별도로 제공된 경우)
  if (loadavgOutput) {
    const loadParts = loadavgOutput.trim().split(/\s+/);
    if (loadParts.length >= 3) {
      systemInfo.loadAverage = [
        parseFloat(loadParts[0]),
        parseFloat(loadParts[1]),
        parseFloat(loadParts[2])
      ];
    }
  }

  // 메모리 정보 파싱 (/proc/meminfo)
  if (meminfoOutput) {
    const memTotal = meminfoOutput.match(/MemTotal:\s*(\d+)\s*kB/);
    const memFree = meminfoOutput.match(/MemFree:\s*(\d+)\s*kB/);
    const memAvailable = meminfoOutput.match(/MemAvailable:\s*(\d+)\s*kB/);

    if (memTotal) {
      systemInfo.totalMemoryKB = parseInt(memTotal[1], 10);
    }

    if (memAvailable) {
      systemInfo.freeMemoryKB = parseInt(memAvailable[1], 10);
    } else if (memFree) {
      systemInfo.freeMemoryKB = parseInt(memFree[1], 10);
    }

    systemInfo.usedMemoryKB = systemInfo.totalMemoryKB - systemInfo.freeMemoryKB;
  }

  // CPU 정보 파싱 (/proc/cpuinfo 또는 nproc 출력)
  if (cpuinfoOutput) {
    const trimmed = cpuinfoOutput.trim();
    // nproc 명령어 출력인 경우 (단순 숫자)
    if (/^\d+$/.test(trimmed)) {
      systemInfo.cpuCount = parseInt(trimmed, 10);
    } else {
      // /proc/cpuinfo 출력인 경우
      const processorMatches = cpuinfoOutput.match(/processor\s*:/g);
      systemInfo.cpuCount = processorMatches ? processorMatches.length : 1;
    }
  }

  return systemInfo;
}

/**
 * uptime 문자열을 초 단위로 변환합니다.
 */
function parseUptime(uptimeStr: string): number {
  let totalSeconds = 0;

  // 일 단위
  const daysMatch = uptimeStr.match(/(\d+)\s*days?/);
  if (daysMatch) {
    totalSeconds += parseInt(daysMatch[1], 10) * 24 * 60 * 60;
  }

  // 시간:분 형식
  const timeMatch = uptimeStr.match(/(\d+):(\d+)/);
  if (timeMatch) {
    totalSeconds += parseInt(timeMatch[1], 10) * 60 * 60;
    totalSeconds += parseInt(timeMatch[2], 10) * 60;
  }

  // 분 단위
  const minutesMatch = uptimeStr.match(/(\d+)\s*min/);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  }

  return totalSeconds;
}

/**
 * 프로세스 목록에 필터를 적용합니다.
 */
export function applyProcessFilter(processes: ProcessInfo[], filter: ProcessFilter): ProcessInfo[] {
  return processes.filter(process => {
    // 사용자 필터
    if (filter.user && process.user !== filter.user) {
      return false;
    }

    // 명령어 필터 (부분 일치)
    if (filter.command && !process.command.toLowerCase().includes(filter.command.toLowerCase())) {
      return false;
    }

    // 상태 필터
    if (filter.state && process.state !== filter.state) {
      return false;
    }

    // CPU 사용률 필터
    if (filter.minCpu !== undefined && process.cpuPercent < filter.minCpu) {
      return false;
    }
    if (filter.maxCpu !== undefined && process.cpuPercent > filter.maxCpu) {
      return false;
    }

    // 메모리 사용률 필터
    if (filter.minMemory !== undefined && process.memoryPercent < filter.minMemory) {
      return false;
    }
    if (filter.maxMemory !== undefined && process.memoryPercent > filter.maxMemory) {
      return false;
    }

    // 커널 프로세스 제외
    if (filter.excludeKernel && isKernelProcess(process)) {
      return false;
    }

    // 좀비 프로세스 제외
    if (filter.excludeZombies && process.state === ProcessState.Zombie) {
      return false;
    }

    return true;
  });
}

/**
 * 프로세스 목록을 정렬합니다.
 */
export function sortProcesses(
  processes: ProcessInfo[], 
  sortBy: ProcessSortField, 
  order: 'asc' | 'desc' = 'desc'
): ProcessInfo[] {
  return processes.sort((a, b) => {
    let valueA: any;
    let valueB: any;

    switch (sortBy) {
      case ProcessSortField.PID:
        valueA = a.pid;
        valueB = b.pid;
        break;
      case ProcessSortField.CPU:
        valueA = a.cpuPercent;
        valueB = b.cpuPercent;
        break;
      case ProcessSortField.Memory:
        valueA = a.memoryPercent;
        valueB = b.memoryPercent;
        break;
      case ProcessSortField.User:
        valueA = a.user.toLowerCase();
        valueB = b.user.toLowerCase();
        break;
      case ProcessSortField.Command:
        valueA = a.command.toLowerCase();
        valueB = b.command.toLowerCase();
        break;
      case ProcessSortField.StartTime:
        valueA = a.startTime;
        valueB = b.startTime;
        break;
      case ProcessSortField.ElapsedTime:
        valueA = parseElapsedTime(a.elapsedTime);
        valueB = parseElapsedTime(b.elapsedTime);
        break;
      default:
        return 0;
    }

    if (valueA < valueB) {
      return order === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/**
 * 페이지네이션을 적용합니다.
 */
export function paginateProcesses(
  processes: ProcessInfo[], 
  limit?: number, 
  offset?: number
): ProcessInfo[] {
  if (limit === undefined) {
    return processes;
  }

  const start = offset || 0;
  const end = start + limit;

  return processes.slice(start, end);
}

/**
 * 커널 프로세스인지 확인합니다.
 */
function isKernelProcess(process: ProcessInfo): boolean {
  return process.command.startsWith('[') && process.command.endsWith(']');
}

/**
 * 실행 시간 문자열을 초 단위로 변환합니다.
 */
function parseElapsedTime(timeStr: string): number {
  // TIME 형식: MM:SS 또는 HH:MM:SS
  const parts = timeStr.split(':').map(part => parseInt(part, 10));

  if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

/**
 * 확장된 ps 명령어 출력을 파싱합니다 (PPID, 우선순위 포함).
 */
export function parseExtendedPsOutput(output: string): ProcessInfo[] {
  // ps -eo user,pid,ppid,pcpu,pmem,vsz,rss,tty,stat,start,time,nice,comm,args
  const lines = output.trim().split('\n');
  
  if (lines.length === 0) {
    return [];
  }

  const dataLines = lines.slice(1); // 헤더 제거
  const processes: ProcessInfo[] = [];

  for (const line of dataLines) {
    try {
      const process = parseExtendedPsLine(line);
      if (process) {
        processes.push(process);
      }
    } catch (error) {
      console.warn(`Failed to parse extended process line: ${line}`, error);
    }
  }

  return processes;
}

/**
 * 확장된 ps 명령어 한 줄을 파싱합니다.
 */
function parseExtendedPsLine(line: string): ProcessInfo | null {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return null;
  }

  // 확장된 형식을 위한 정규표현식
  const parts = trimmedLine.split(/\s+/);
  if (parts.length < 13) {
    return null;
  }

  const [
    user, pidStr, ppidStr, cpuStr, memStr, vszStr, rssStr,
    tty, stat, start, time, priorityStr, comm, ...argsParts
  ] = parts;

  const command = argsParts.join(' ') || comm;

  return createProcessInfo({
    USER: user,
    PID: pidStr,
    PPID: ppidStr,
    '%CPU': cpuStr,
    '%MEM': memStr,
    VSZ: vszStr,
    RSS: rssStr,
    TTY: tty,
    STAT: stat,
    START: start,
    TIME: time,
    COMMAND: command
  });
}