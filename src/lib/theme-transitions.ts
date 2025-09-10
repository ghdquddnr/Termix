/**
 * Theme Transition Utilities
 * 
 * 테마 전환시 부드러운 애니메이션과 시각적 효과를 제공합니다.
 * CSS 변수 캐싱과 최적화된 성능을 제공합니다.
 */

import { 
  ESSENTIAL_THEME_VARIABLES, 
  EXTENDED_THEME_VARIABLES, 
  COMPONENT_THEME_VARIABLES,
  PERFORMANCE_CONFIG,
  THEME_TRANSITION_CONFIG,
  type ThemeVariable 
} from './theme-config';

// 성능 최적화된 CSS 변수 캐시
const cssVariableCache = new Map<string, { value: string; timestamp: number }>();

/**
 * CSS 변수 값을 캐시에서 가져오거나 계산합니다. (성능 최적화 버전)
 */
function getCachedCSSVariable(property: string): string {
  const cached = cssVariableCache.get(property);
  const now = Date.now();
  
  // 캐시가 유효한지 확인
  if (cached && (now - cached.timestamp) < PERFORMANCE_CONFIG.cacheExpiry) {
    return cached.value;
  }
  
  const value = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  cssVariableCache.set(property, { value, timestamp: now });
  return value;
}

/**
 * 만료된 캐시 항목만 정리합니다.
 */
function clearExpiredCache(): void {
  const now = Date.now();
  const expired: string[] = [];
  
  cssVariableCache.forEach(({ timestamp }, key) => {
    if ((now - timestamp) >= PERFORMANCE_CONFIG.cacheExpiry) {
      expired.push(key);
    }
  });
  
  expired.forEach(key => cssVariableCache.delete(key));
}

/**
 * 테마 변경 시 캐시를 완전히 초기화합니다.
 */
function clearCSSVariableCache(): void {
  cssVariableCache.clear();
}

/**
 * 핵심 테마 변수만 미리 로드합니다. (번들 크기 최적화)
 */
function preloadEssentialVariables(): void {
  requestIdleCallback(() => {
    ESSENTIAL_THEME_VARIABLES.slice(0, PERFORMANCE_CONFIG.preloadLimit)
      .forEach(key => getCachedCSSVariable(key));
  }, { timeout: 1000 });
}

/**
 * 필요시에만 확장 변수를 로드합니다.
 */
function preloadExtendedVariables(): void {
  requestIdleCallback(() => {
    EXTENDED_THEME_VARIABLES.forEach(key => getCachedCSSVariable(key));
  }, { timeout: 2000 });
}

/**
 * 컴포넌트별 변수를 필요시에만 로드합니다.
 */
function preloadComponentVariables(): void {
  requestIdleCallback(() => {
    COMPONENT_THEME_VARIABLES.forEach(key => getCachedCSSVariable(key));
  }, { timeout: 3000 });
}

/**
 * CSS 변수 일괄 업데이트 (성능 최적화된 버전)
 */
function batchUpdateCSSVariables(updates: Record<string, string>): void {
  const root = document.documentElement;
  const now = Date.now();
  
  // requestAnimationFrame으로 업데이트를 일괄 처리
  requestAnimationFrame(() => {
    Object.entries(updates).forEach(([property, value]) => {
      root.style.setProperty(property, value);
      cssVariableCache.set(property, { value, timestamp: now });
    });
  });
}

export interface ThemeTransitionOptions {
  duration?: number;
  easing?: string;
  disableTransition?: boolean;
}

const DEFAULT_TRANSITION_OPTIONS: Required<ThemeTransitionOptions> = {
  duration: THEME_TRANSITION_CONFIG.duration,
  easing: THEME_TRANSITION_CONFIG.easing,
  disableTransition: false,
};

/**
 * 테마 전환 시 부드러운 애니메이션을 적용합니다.
 */
export function applyThemeTransition(options: ThemeTransitionOptions = {}): void {
  const opts = { ...DEFAULT_TRANSITION_OPTIONS, ...options };
  
  if (opts.disableTransition) {
    return;
  }

  const root = document.documentElement;
  
  // 기존 transition 클래스 제거
  root.classList.remove('no-transition');
  
  // CSS 변수 일괄 업데이트 (성능 최적화)
  batchUpdateCSSVariables({
    '--theme-transition-duration': `${opts.duration}ms`,
    '--theme-transition-timing': opts.easing
  });
  
  // 페이지 로드 시 transition 방지를 위한 클래스 제거
  requestAnimationFrame(() => {
    root.classList.remove('no-transition');
  });
  
  // 핵심 테마 변수만 미리 로드 (번들 크기 최적화)
  preloadEssentialVariables();
}

/**
 * 테마 전환 중 깜빡임을 방지합니다.
 */
export function preventThemeFlash(): void {
  const root = document.documentElement;
  root.classList.add('no-transition');
  
  // 한 프레임 후 제거하여 부드러운 전환 허용
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove('no-transition');
    });
  });
}

/**
 * 페이지 로드 시 테마 깜빡임을 방지하는 스크립트입니다.
 * HTML head에 인라인으로 삽입해야 합니다.
 */
export const THEME_FLASH_PREVENTION_SCRIPT = `
(function() {
  try {
    // 쿠키에서 테마 설정 읽기
    const cookies = document.cookie.split(';');
    let themeSettings = null;
    
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'termix-theme-settings') {
        try {
          themeSettings = JSON.parse(decodeURIComponent(value));
          break;
        } catch (e) {
          // 파싱 에러 무시
        }
      }
    }
    
    if (themeSettings) {
      const { mode, systemTheme } = themeSettings;
      let resolvedTheme = mode;
      
      if (mode === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      // 즉시 테마 클래스 적용
      document.documentElement.classList.add('no-transition');
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolvedTheme);
      
      // 커스텀 컬러 적용
      if (themeSettings.customColors) {
        const { primary, secondary, accent } = themeSettings.customColors;
        const root = document.documentElement;
        if (primary) root.style.setProperty('--color-primary', primary);
        if (secondary) root.style.setProperty('--color-secondary', secondary);
        if (accent) root.style.setProperty('--color-accent', accent);
      }
    }
  } catch (error) {
    console.warn('Theme flash prevention failed:', error);
  }
})();
`;

/**
 * 색상 값의 유효성을 검사합니다.
 */
export function isValidColor(color: string): boolean {
  const style = new Option().style;
  style.color = color;
  return style.color !== '';
}

/**
 * HEX 색상을 RGB로 변환합니다.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * RGB 색상을 HEX로 변환합니다.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * 색상의 밝기를 계산합니다 (0-1 범위).
 */
export function getColorBrightness(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0.5;
  
  // Relative luminance calculation
  const { r, g, b } = rgb;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * 색상이 어두운지 밝은지 판단합니다.
 */
export function isColorDark(color: string): boolean {
  return getColorBrightness(color) < 0.5;
}

/**
 * 테마 전환 완료를 감지하는 Promise를 반환합니다.
 */
export function waitForThemeTransition(options: ThemeTransitionOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_TRANSITION_OPTIONS, ...options };
  
  if (opts.disableTransition) {
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    setTimeout(resolve, opts.duration + 50); // 약간의 여유시간 추가
  });
}

/**
 * 시스템 테마 변경을 감지하는 이벤트 리스너를 등록합니다.
 */
export function watchSystemTheme(callback: (isDark: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  // 정리 함수 반환
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

/**
 * 접근성을 고려한 애니메이션 설정을 확인합니다.
 */
export function shouldUseReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 메타 태그 요소 캐시
const metaTagCache = new Map<string, HTMLMetaElement>();

/**
 * 메타 태그를 캐시에서 가져오거나 생성합니다.
 */
function getCachedMetaTag(name: string): HTMLMetaElement {
  if (metaTagCache.has(name)) {
    return metaTagCache.get(name)!;
  }
  
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  
  metaTagCache.set(name, meta);
  return meta;
}

/**
 * 테마별 메타 태그를 업데이트합니다. (최적화된 버전)
 */
export function updateThemeMetaTags(theme: 'light' | 'dark'): void {
  const themeColor = theme === 'dark' ? '#121212' : '#ffffff';
  const statusBarStyle = theme === 'dark' ? 'black-translucent' : 'default';
  
  // 메타 태그 일괄 업데이트
  requestAnimationFrame(() => {
    getCachedMetaTag('theme-color').content = themeColor;
    getCachedMetaTag('msapplication-navbutton-color').content = themeColor;
    getCachedMetaTag('apple-mobile-web-app-status-bar-style').content = statusBarStyle;
  });
}

// 익스포트할 최적화된 함수들
export {
  getCachedCSSVariable,
  clearCSSVariableCache,
  clearExpiredCache,
  preloadEssentialVariables,
  preloadExtendedVariables,
  preloadComponentVariables,
  batchUpdateCSSVariables
};

// 레거시 호환성을 위한 별칭
export const preloadThemeVariables = preloadEssentialVariables;