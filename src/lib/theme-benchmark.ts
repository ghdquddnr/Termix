/**
 * Theme Benchmark Utilities
 * 테마 시스템의 실시간 성능 모니터링과 벤치마킹
 */

import { themePerformanceMonitor } from './theme-performance.test';

// Performance Observer for theme-related operations
class ThemeBenchmark {
  private static instance: ThemeBenchmark;
  private observer: PerformanceObserver | null = null;
  private isRunning = false;

  static getInstance(): ThemeBenchmark {
    if (!ThemeBenchmark.instance) {
      ThemeBenchmark.instance = new ThemeBenchmark();
    }
    return ThemeBenchmark.instance;
  }

  /**
   * 테마 성능 모니터링을 시작합니다.
   */
  startMonitoring(): void {
    if (this.isRunning || typeof window === 'undefined') return;

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('theme') || entry.name.includes('css')) {
            themePerformanceMonitor.recordMetric(entry.name, entry.duration);
          }
        });
      });

      this.observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      this.isRunning = true;
      console.log('🎨 Theme performance monitoring started');
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  /**
   * 테마 성능 모니터링을 중지합니다.
   */
  stopMonitoring(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isRunning = false;
    console.log('🎨 Theme performance monitoring stopped');
  }

  /**
   * 테마 전환 성능을 측정합니다.
   */
  measureThemeChange(themeName: string, operation: () => void): number {
    if (typeof window === 'undefined') return 0;

    const measureName = `theme-change-${themeName}`;
    performance.mark(`${measureName}-start`);
    
    operation();
    
    performance.mark(`${measureName}-end`);
    performance.measure(measureName, `${measureName}-start`, `${measureName}-end`);
    
    const measure = performance.getEntriesByName(measureName, 'measure')[0];
    return measure ? measure.duration : 0;
  }

  /**
   * CSS 변수 접근 성능을 측정합니다.
   */
  measureCSSVariableAccess(variableName: string, iterations = 100): {
    averageTime: number;
    totalTime: number;
  } {
    if (typeof window === 'undefined') return { averageTime: 0, totalTime: 0 };

    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      getComputedStyle(document.documentElement).getPropertyValue(variableName);
    }
    
    const totalTime = performance.now() - startTime;
    const averageTime = totalTime / iterations;

    themePerformanceMonitor.recordMetric(`css-variable-access-${variableName}`, averageTime);
    
    return {
      averageTime,
      totalTime
    };
  }

  /**
   * 페이지 로드 시 테마 적용 성능을 측정합니다.
   */
  measureInitialThemeLoad(): void {
    if (typeof window === 'undefined') return;

    const measureName = 'theme-initial-load';
    
    // DOM 로드 시점부터 측정
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        performance.mark(`${measureName}-dom-ready`);
      });
    }

    // 테마 적용 완료 시점 측정
    requestAnimationFrame(() => {
      performance.mark(`${measureName}-theme-applied`);
      
      if (performance.getEntriesByName(`${measureName}-dom-ready`).length > 0) {
        performance.measure(
          measureName,
          `${measureName}-dom-ready`,
          `${measureName}-theme-applied`
        );
        
        const measure = performance.getEntriesByName(measureName, 'measure')[0];
        if (measure) {
          themePerformanceMonitor.recordMetric('initial-theme-load', measure.duration);
        }
      }
    });
  }

  /**
   * 현재 성능 상태를 확인합니다.
   */
  getPerformanceStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    lastMeasurement?: number;
  } {
    return {
      isMonitoring: this.isRunning,
      metricsCount: 0, // themePerformanceMonitor의 내부 메트릭 카운트
      lastMeasurement: performance.now()
    };
  }
}

// 전역 벤치마크 인스턴스
export const themeBenchmark = ThemeBenchmark.getInstance();

// 자동 성능 모니터링 시작 (개발 환경에서만)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 페이지 로드 후 모니터링 시작
  if (document.readyState === 'complete') {
    themeBenchmark.startMonitoring();
    themeBenchmark.measureInitialThemeLoad();
  } else {
    window.addEventListener('load', () => {
      themeBenchmark.startMonitoring();
      themeBenchmark.measureInitialThemeLoad();
    });
  }
}

// 페이지 언로드 시 모니터링 정리
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    themeBenchmark.stopMonitoring();
  });
}

// 테마 성능 디버그 유틸리티
export const debugThemePerformance = {
  /**
   * 콘솔에 성능 정보를 출력합니다.
   */
  logPerformanceInfo: () => {
    console.group('🎨 Theme Performance Debug Info');
    console.log('Status:', themeBenchmark.getPerformanceStatus());
    
    // 메모리 정보 (지원되는 경우)
    if ('memory' in performance) {
      console.log('Memory:', {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      });
    }
    
    console.groupEnd();
  },

  /**
   * 테마 전환 테스트를 실행합니다.
   */
  testThemeTransitions: () => {
    const themes = ['light', 'dark'];
    const results: Record<string, number> = {};

    themes.forEach(theme => {
      const duration = themeBenchmark.measureThemeChange(theme, () => {
        document.documentElement.className = theme;
      });
      results[`${theme}-transition`] = duration;
    });

    console.table(results);
    return results;
  },

  /**
   * CSS 변수 성능 테스트를 실행합니다.
   */
  testCSSVariables: () => {
    const variables = [
      '--color-primary',
      '--color-background',
      '--color-foreground',
      '--color-border'
    ];

    const results: Record<string, number> = {};

    variables.forEach(variable => {
      const { averageTime } = themeBenchmark.measureCSSVariableAccess(variable, 50);
      results[variable] = averageTime;
    });

    console.table(results);
    return results;
  }
};

// 글로벌 객체에 디버그 유틸리티 노출 (개발 환경에서만)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugThemePerformance = debugThemePerformance;
  console.log('🎨 Theme debug utilities available at window.debugThemePerformance');
}