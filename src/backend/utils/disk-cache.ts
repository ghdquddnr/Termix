/**
 * Disk Monitoring Cache Utilities
 * 디스크 모니터링 데이터 캐싱을 위한 유틸리티
 */

import {
  type DiskCacheEntry,
  type DiskCacheOptions,
  type DiskMonitoringResponse,
  type DiskUsageInfo,
  type FilesystemInfo,
  type LargeFile,
  type DirectorySize
} from '../types/disk-monitoring.js';

/**
 * 디스크 모니터링 캐시 매니저
 */
export class DiskCache {
  private cache = new Map<string, DiskCacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly defaultOptions: Required<DiskCacheOptions> = {
    ttl: 300, // 5분
    maxSize: 100,
    autoCleanup: true,
    cleanupInterval: 60000 // 1분
  };

  private options: Required<DiskCacheOptions>;

  constructor(options?: DiskCacheOptions) {
    this.options = { ...this.defaultOptions, ...options };

    if (this.options.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * 캐시에서 데이터를 가져옵니다
   * @param hostId 호스트 ID
   * @param cacheKey 캐시 키
   * @returns 캐시된 데이터 또는 null
   */
  get<T = any>(hostId: string, cacheKey: string): T | null {
    const key = this.buildKey(hostId, cacheKey);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // 만료 검사
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // 히트 카운트 증가
    if (entry.hitCount !== undefined) {
      entry.hitCount++;
    }

    return entry.data as T;
  }

  /**
   * 캐시에 데이터를 저장합니다
   * @param hostId 호스트 ID
   * @param cacheKey 캐시 키
   * @param data 저장할 데이터
   * @param ttl TTL (초, 선택적)
   */
  set(
    hostId: string,
    cacheKey: string,
    data: DiskMonitoringResponse | DiskUsageInfo[] | FilesystemInfo[] | LargeFile[] | DirectorySize[],
    ttl?: number
  ): void {
    const key = this.buildKey(hostId, cacheKey);
    const effectiveTtl = (ttl || this.options.ttl) * 1000; // 밀리초로 변환
    const now = Date.now();

    const entry: DiskCacheEntry = {
      hostId,
      cacheKey,
      data,
      createdAt: now,
      expiresAt: now + effectiveTtl,
      hitCount: 0
    };

    // 캐시 크기 제한 확인
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
  }

  /**
   * 특정 호스트의 캐시를 삭제합니다
   * @param hostId 호스트 ID
   * @param cacheKey 캐시 키 (선택적, 미지정시 해당 호스트의 모든 캐시 삭제)
   */
  delete(hostId: string, cacheKey?: string): void {
    if (cacheKey) {
      const key = this.buildKey(hostId, cacheKey);
      this.cache.delete(key);
    } else {
      // 해당 호스트의 모든 캐시 삭제
      for (const [key, entry] of this.cache.entries()) {
        if (entry.hostId === hostId) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * 모든 캐시를 삭제합니다
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 캐시 항목들을 정리합니다
   * @returns 정리된 항목 수
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 캐시 통계를 반환합니다
   */
  getStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;
    let totalHits = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
      totalHits += entry.hitCount || 0;
    }

    return {
      totalEntries: this.cache.size,
      activeEntries: activeCount,
      expiredEntries: expiredCount,
      totalHits,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl
    };
  }

  /**
   * 캐시 정리 타이머를 시작합니다
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`[DISK_CACHE] Cleaned up ${cleaned} expired entries`);
      }
    }, this.options.cleanupInterval);
  }

  /**
   * 캐시 정리 타이머를 중지합니다
   */
  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 가장 오래된 캐시 항목을 제거합니다
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 캐시 키를 생성합니다
   * @param hostId 호스트 ID
   * @param cacheKey 캐시 키
   * @returns 결합된 캐시 키
   */
  private buildKey(hostId: string, cacheKey: string): string {
    return `${hostId}:${cacheKey}`;
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

/**
 * 글로벌 디스크 캐시 인스턴스
 */
export const diskCache = new DiskCache({
  ttl: 300, // 5분
  maxSize: 200,
  autoCleanup: true,
  cleanupInterval: 60000 // 1분
});

/**
 * 캐시 키 생성 유틸리티
 */
export class DiskCacheKeys {
  static diskUsage(paths?: string[]): string {
    if (paths && paths.length > 0) {
      return `disk_usage:${paths.sort().join(',')}`;
    }
    return 'disk_usage:all';
  }

  static filesystems(): string {
    return 'filesystems';
  }

  static directoryUsage(paths: string[]): string {
    return `directory_usage:${paths.sort().join(',')}`;
  }

  static largeFiles(threshold: number, paths?: string[]): string {
    const pathsKey = paths && paths.length > 0 ? paths.sort().join(',') : 'all';
    return `large_files:${threshold}:${pathsKey}`;
  }

  static monitoring(options: any): string {
    const optionsStr = JSON.stringify(options, Object.keys(options).sort());
    const hash = this.simpleHash(optionsStr);
    return `monitoring:${hash}`;
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }

    return Math.abs(hash).toString(16);
  }
}