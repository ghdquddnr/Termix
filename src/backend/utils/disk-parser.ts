/**
 * Disk Data Parser Utilities
 * 디스크 명령어 출력을 파싱하는 유틸리티 함수들
 */

import {
  type DiskUsageInfo,
  type DirectorySize,
  type FilesystemInfo,
  type LargeFile,
  DiskSortField
} from '../types/disk-monitoring.js';

/**
 * du -sh 출력을 파싱합니다
 * @param output du 명령어 출력
 * @returns DiskUsageInfo 배열
 */
export function parseDuOutput(output: string): DiskUsageInfo[] {
  const lines = output.split('\n').filter(line => line.trim());
  const diskUsage: DiskUsageInfo[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      // du 출력 형식: "크기\t경로" 또는 "크기 경로"
      const parts = line.split(/\t|\s+/);
      if (parts.length < 2) continue;

      const sizeStr = parts[0];
      const path = parts.slice(1).join(' ').trim();

      const sizeBytes = parseSize(sizeStr);

      const usage: DiskUsageInfo = {
        path,
        usedBytes: sizeBytes,
        usedHuman: sizeStr
      };

      diskUsage.push(usage);
    } catch (error) {
      console.warn(`Failed to parse du line: ${line}`, error);
    }
  }

  return diskUsage;
}

/**
 * df -h 출력을 파싱합니다
 * @param output df 명령어 출력
 * @returns FilesystemInfo 배열
 */
export function parseDfOutput(output: string): FilesystemInfo[] {
  const lines = output.split('\n').filter(line => line.trim());
  const filesystems: FilesystemInfo[] = [];

  let headerFound = false;
  for (const line of lines) {
    if (!headerFound) {
      // 헤더 라인 확인
      if (line.includes('Filesystem') || line.includes('Size') || line.includes('Used')) {
        headerFound = true;
      }
      continue;
    }

    if (!line.trim()) continue;

    try {
      // df 출력 형식: Filesystem Size Used Avail Use% Mounted on
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;

      const device = parts[0];
      const totalHuman = parts[1];
      const usedHuman = parts[2];
      const availableHuman = parts[3];
      const usagePercentStr = parts[4].replace('%', '');
      const mountPoint = parts.slice(5).join(' ');

      const totalBytes = parseSize(totalHuman);
      const usedBytes = parseSize(usedHuman);
      const availableBytes = parseSize(availableHuman);
      const usagePercent = parseFloat(usagePercentStr) || 0;

      const filesystem: FilesystemInfo = {
        device,
        type: 'unknown', // df 명령어로는 타입을 직접 알 수 없음
        mountPoint,
        totalBytes,
        usedBytes,
        availableBytes,
        usagePercent,
        totalHuman,
        usedHuman,
        availableHuman
      };

      filesystems.push(filesystem);
    } catch (error) {
      console.warn(`Failed to parse df line: ${line}`, error);
    }
  }

  return filesystems;
}

/**
 * find 명령어로 찾은 큰 파일들을 파싱합니다
 * @param output find 명령어 출력 (ls -la 형태)
 * @returns LargeFile 배열
 */
export function parseLargeFilesOutput(output: string): LargeFile[] {
  const lines = output.split('\n').filter(line => line.trim());
  const largeFiles: LargeFile[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      // ls -la 형식: -rwxrwxrwx 1 owner group size date path
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;

      const permissions = parts[0];
      const owner = parts[2];
      const sizeBytes = parseInt(parts[4], 10);

      // 날짜와 시간 부분 (최소 3개 부분: 월 일 시간)
      const dateTimeParts = parts.slice(5, 8);
      const lastModified = dateTimeParts.join(' ');

      // 파일 경로 (나머지 모든 부분)
      const path = parts.slice(8).join(' ');
      const type = getFileExtension(path);
      const sizeHuman = formatBytes(sizeBytes);

      const largeFile: LargeFile = {
        path,
        sizeBytes,
        sizeHuman,
        type,
        lastModified,
        owner,
        permissions
      };

      largeFiles.push(largeFile);
    } catch (error) {
      console.warn(`Failed to parse large file line: ${line}`, error);
    }
  }

  return largeFiles;
}

/**
 * 디렉토리 크기 정보를 파싱합니다 (du -sh 여러 디렉토리)
 * @param output du 명령어 출력
 * @returns DirectorySize 배열
 */
export function parseDirectorySizes(output: string): DirectorySize[] {
  const lines = output.split('\n').filter(line => line.trim());
  const directories: DirectorySize[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parts = line.split(/\t|\s+/);
      if (parts.length < 2) continue;

      const sizeStr = parts[0];
      const path = parts.slice(1).join(' ').trim();
      const sizeBytes = parseSize(sizeStr);

      const directory: DirectorySize = {
        path,
        sizeBytes,
        sizeHuman: sizeStr
      };

      directories.push(directory);
    } catch (error) {
      console.warn(`Failed to parse directory size line: ${line}`, error);
    }
  }

  return directories;
}

/**
 * mount 명령어 출력을 파싱하여 파일시스템 타입 정보를 보완합니다
 * @param output mount 명령어 출력
 * @param filesystems 기존 FilesystemInfo 배열
 * @returns 업데이트된 FilesystemInfo 배열
 */
export function enhanceFilesystemsWithMountInfo(
  output: string,
  filesystems: FilesystemInfo[]
): FilesystemInfo[] {
  const lines = output.split('\n').filter(line => line.trim());
  const mountInfo = new Map<string, { type: string; options: string[] }>();

  for (const line of lines) {
    try {
      // mount 출력 형식: device on mountpoint type fstype (options)
      const match = line.match(/^(.+?)\s+on\s+(.+?)\s+type\s+(\S+)\s+\((.+?)\)$/);
      if (match) {
        const [, device, mountPoint, type, optionsStr] = match;
        const options = optionsStr.split(',').map(opt => opt.trim());
        mountInfo.set(mountPoint, { type, options });
      }
    } catch (error) {
      console.warn(`Failed to parse mount line: ${line}`, error);
    }
  }

  // 파일시스템 정보 업데이트
  return filesystems.map(fs => {
    const mountData = mountInfo.get(fs.mountPoint);
    if (mountData) {
      return {
        ...fs,
        type: mountData.type,
        mountOptions: mountData.options
      };
    }
    return fs;
  });
}

/**
 * 크기 문자열을 바이트로 변환합니다
 * @param sizeStr 크기 문자열 (예: "1.5G", "500M", "1024K")
 * @returns 바이트 단위 크기
 */
export function parseSize(sizeStr: string): number {
  const str = sizeStr.trim().toUpperCase();
  const match = str.match(/^([0-9,.]+)([KMGTPE]?)B?$/);

  if (!match) {
    // 숫자만 있는 경우 (바이트 단위로 가정)
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  const [, numStr, unit] = match;
  const num = parseFloat(numStr.replace(/,/g, ''));

  if (isNaN(num)) return 0;

  const multipliers: { [key: string]: number } = {
    '': 1,
    'K': 1024,
    'M': 1024 * 1024,
    'G': 1024 * 1024 * 1024,
    'T': 1024 * 1024 * 1024 * 1024,
    'P': 1024 * 1024 * 1024 * 1024 * 1024,
    'E': 1024 * 1024 * 1024 * 1024 * 1024 * 1024
  };

  return Math.round(num * (multipliers[unit] || 1));
}

/**
 * 바이트를 사람이 읽기 쉬운 형태로 변환합니다
 * @param bytes 바이트 크기
 * @returns 사람이 읽기 쉬운 크기 문자열
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B';

  const units = ['B', 'K', 'M', 'G', 'T', 'P', 'E'];
  const base = 1024;

  const unitIndex = Math.floor(Math.log(Math.abs(bytes)) / Math.log(base));
  const adjustedIndex = Math.min(unitIndex, units.length - 1);

  const value = bytes / Math.pow(base, adjustedIndex);
  const formattedValue = adjustedIndex === 0 ? value.toString() : value.toFixed(1);

  return `${formattedValue}${units[adjustedIndex]}`;
}

/**
 * 파일 확장자를 추출합니다
 * @param filepath 파일 경로
 * @returns 파일 확장자
 */
export function getFileExtension(filepath: string): string {
  const match = filepath.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : 'unknown';
}

/**
 * 디스크 사용량 정보를 정렬합니다
 * @param items 정렬할 항목들
 * @param sortBy 정렬 기준
 * @param sortOrder 정렬 순서
 * @returns 정렬된 배열
 */
export function sortDiskUsage<T extends DiskUsageInfo | DirectorySize | LargeFile>(
  items: T[],
  sortBy: DiskSortField,
  sortOrder: 'asc' | 'desc' = 'desc'
): T[] {
  const sorted = [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case DiskSortField.SIZE:
        const aSize = 'sizeBytes' in a ? a.sizeBytes : a.usedBytes || 0;
        const bSize = 'sizeBytes' in b ? b.sizeBytes : b.usedBytes || 0;
        comparison = aSize - bSize;
        break;

      case DiskSortField.NAME:
        comparison = a.path.localeCompare(b.path);
        break;

      case DiskSortField.LAST_MODIFIED:
        if ('lastModified' in a && 'lastModified' in b) {
          const aTime = new Date(a.lastModified || 0).getTime();
          const bTime = new Date(b.lastModified || 0).getTime();
          comparison = aTime - bTime;
        }
        break;

      case DiskSortField.USAGE_PERCENT:
        if ('usagePercent' in a && 'usagePercent' in b) {
          comparison = (a.usagePercent || 0) - (b.usagePercent || 0);
        }
        break;

      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * 디스크 사용량 정보를 필터링합니다
 * @param items 필터링할 항목들
 * @param minSize 최소 크기 (바이트)
 * @param paths 포함할 경로 패턴들
 * @returns 필터링된 배열
 */
export function filterDiskUsage<T extends DiskUsageInfo | DirectorySize | LargeFile>(
  items: T[],
  minSize?: number,
  paths?: string[]
): T[] {
  return items.filter(item => {
    // 최소 크기 필터
    if (minSize !== undefined) {
      const itemSize = 'sizeBytes' in item ? item.sizeBytes : item.usedBytes || 0;
      if (itemSize < minSize) return false;
    }

    // 경로 패턴 필터
    if (paths && paths.length > 0) {
      const matchesPath = paths.some(pattern => {
        try {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
          return regex.test(item.path);
        } catch {
          return item.path.includes(pattern);
        }
      });
      if (!matchesPath) return false;
    }

    return true;
  });
}

/**
 * 페이지네이션을 적용합니다
 * @param items 페이지네이션할 항목들
 * @param limit 페이지 크기
 * @param offset 시작 오프셋
 * @returns 페이지네이션된 배열
 */
export function paginateDiskUsage<T>(
  items: T[],
  limit?: number,
  offset?: number
): T[] {
  if (!limit && !offset) return items;

  const start = offset || 0;
  const end = limit ? start + limit : undefined;

  return items.slice(start, end);
}