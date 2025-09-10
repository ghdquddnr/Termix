/**
 * Theme Performance Tests
 * 테마 시스템의 성능을 측정하고 검증합니다.
 */

import { 
  getCachedCSSVariable, 
  clearCSSVariableCache, 
  batchUpdateCSSVariables,
  preloadEssentialVariables,
  clearExpiredCache
} from './theme-transitions';
import { ESSENTIAL_THEME_VARIABLES, PERFORMANCE_CONFIG } from './theme-config';

// Performance benchmarking utilities
export class ThemePerformanceMonitor {
  private static instance: ThemePerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): ThemePerformanceMonitor {
    if (!ThemePerformanceMonitor.instance) {
      ThemePerformanceMonitor.instance = new ThemePerformanceMonitor();
    }
    return ThemePerformanceMonitor.instance;
  }

  /**
   * 테마 전환 성능을 측정합니다.
   */
  async measureThemeTransition(fromTheme: string, toTheme: string): Promise<{
    transitionTime: number;
    cssVariableUpdateTime: number;
    domUpdateTime: number;
    totalTime: number;
  }> {
    const startTime = performance.now();
    
    // CSS 변수 업데이트 시간 측정
    const cssUpdateStart = performance.now();
    const root = document.documentElement;
    root.classList.remove(fromTheme);
    root.classList.add(toTheme);
    const cssUpdateTime = performance.now() - cssUpdateStart;

    // DOM 업데이트 완료 대기
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // 전환 애니메이션 완료 대기
    const transitionStart = performance.now();
    await new Promise(resolve => 
      setTimeout(resolve, PERFORMANCE_CONFIG.batchUpdateDelay * 2)
    );
    const transitionTime = performance.now() - transitionStart;

    // DOM 업데이트 시간 측정
    const domUpdateStart = performance.now();
    clearCSSVariableCache();
    preloadEssentialVariables();
    const domUpdateTime = performance.now() - domUpdateStart;

    const totalTime = performance.now() - startTime;

    return {
      transitionTime,
      cssVariableUpdateTime: cssUpdateTime,
      domUpdateTime,
      totalTime
    };
  }

  /**
   * CSS 변수 캐시 성능을 측정합니다.
   */
  measureCachePerformance(): {
    cacheHitTime: number;
    cacheMissTime: number;
    cacheEfficiency: number;
  } {
    const iterations = 100;
    let cacheHitTotalTime = 0;
    let cacheMissTotalTime = 0;

    // 캐시 미스 시간 측정
    clearCSSVariableCache();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      getCachedCSSVariable('--color-primary');
      cacheMissTotalTime += performance.now() - start;
      clearCSSVariableCache();
    }

    // 캐시 히트 시간 측정
    getCachedCSSVariable('--color-primary'); // 캐시에 저장
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      getCachedCSSVariable('--color-primary');
      cacheHitTotalTime += performance.now() - start;
    }

    const cacheHitTime = cacheHitTotalTime / iterations;
    const cacheMissTime = cacheMissTotalTime / iterations;
    const cacheEfficiency = (cacheMissTime - cacheHitTime) / cacheMissTime * 100;

    return {
      cacheHitTime,
      cacheMissTime,
      cacheEfficiency
    };
  }

  /**
   * 일괄 업데이트 성능을 측정합니다.
   */
  measureBatchUpdatePerformance(): {
    batchUpdateTime: number;
    individualUpdateTime: number;
    performanceGain: number;
  } {
    const testUpdates = {
      '--color-primary': '#ff0000',
      '--color-secondary': '#00ff00',
      '--color-accent': '#0000ff',
      '--color-background': '#ffffff'
    };

    // 일괄 업데이트 시간 측정
    const batchStart = performance.now();
    batchUpdateCSSVariables(testUpdates);
    const batchUpdateTime = performance.now() - batchStart;

    // 개별 업데이트 시간 측정
    const individualStart = performance.now();
    const root = document.documentElement;
    Object.entries(testUpdates).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    const individualUpdateTime = performance.now() - individualStart;

    const performanceGain = (individualUpdateTime - batchUpdateTime) / individualUpdateTime * 100;

    return {
      batchUpdateTime,
      individualUpdateTime,
      performanceGain
    };
  }

  /**
   * 메모리 사용량을 측정합니다.
   */
  measureMemoryUsage(): {
    cacheSize: number;
    estimatedMemoryKB: number;
  } {
    const cacheSize = (global as any).cssVariableCache?.size || 0;
    // 대략적인 메모리 사용량 계산 (키 + 값 + 타임스탬프)
    const estimatedMemoryKB = cacheSize * 0.1; // 대략 100바이트 per entry

    return {
      cacheSize,
      estimatedMemoryKB
    };
  }

  /**
   * 전체 성능 리포트를 생성합니다.
   */
  async generatePerformanceReport(): Promise<{
    themeTransition: Awaited<ReturnType<typeof this.measureThemeTransition>>;
    cachePerformance: ReturnType<typeof this.measureCachePerformance>;
    batchUpdatePerformance: ReturnType<typeof this.measureBatchUpdatePerformance>;
    memoryUsage: ReturnType<typeof this.measureMemoryUsage>;
    score: number;
  }> {
    const themeTransition = await this.measureThemeTransition('light', 'dark');
    const cachePerformance = this.measureCachePerformance();
    const batchUpdatePerformance = this.measureBatchUpdatePerformance();
    const memoryUsage = this.measureMemoryUsage();

    // 성능 점수 계산 (0-100)
    let score = 100;
    
    // 전환 시간이 300ms를 초과하면 감점
    if (themeTransition.totalTime > 300) {
      score -= (themeTransition.totalTime - 300) / 10;
    }
    
    // 캐시 효율성이 50% 미만이면 감점
    if (cachePerformance.cacheEfficiency < 50) {
      score -= (50 - cachePerformance.cacheEfficiency);
    }
    
    // 메모리 사용량이 50KB를 초과하면 감점
    if (memoryUsage.estimatedMemoryKB > 50) {
      score -= (memoryUsage.estimatedMemoryKB - 50) * 2;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      themeTransition,
      cachePerformance,
      batchUpdatePerformance,
      memoryUsage,
      score
    };
  }

  /**
   * 성능 메트릭을 기록합니다.
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  /**
   * 메트릭 통계를 가져옵니다.
   */
  getMetricStats(name: string): {
    min: number;
    max: number;
    avg: number;
    count: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    };
  }

  /**
   * 모든 메트릭을 초기화합니다.
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// 전역 성능 모니터 인스턴스
export const themePerformanceMonitor = ThemePerformanceMonitor.getInstance();

// 테스트 유틸리티
export const runPerformanceTests = async () => {
  console.group('🎨 Theme Performance Tests');
  
  try {
    const report = await themePerformanceMonitor.generatePerformanceReport();
    
    console.log('📊 Performance Report:');
    console.table({
      'Total Transition Time': `${report.themeTransition.totalTime.toFixed(2)}ms`,
      'CSS Update Time': `${report.themeTransition.cssVariableUpdateTime.toFixed(2)}ms`,
      'Cache Efficiency': `${report.cachePerformance.cacheEfficiency.toFixed(1)}%`,
      'Batch Performance Gain': `${report.batchUpdatePerformance.performanceGain.toFixed(1)}%`,
      'Memory Usage': `${report.memoryUsage.estimatedMemoryKB.toFixed(1)}KB`,
      'Performance Score': `${report.score.toFixed(0)}/100`
    });

    // 성능 기준 검증
    const performanceChecks = {
      'Transition time < 300ms': report.themeTransition.totalTime < 300,
      'Cache efficiency > 50%': report.cachePerformance.cacheEfficiency > 50,
      'Memory usage < 50KB': report.memoryUsage.estimatedMemoryKB < 50,
      'Performance score > 80': report.score > 80
    };

    console.log('✅ Performance Checks:');
    Object.entries(performanceChecks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });

    return report;
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
};