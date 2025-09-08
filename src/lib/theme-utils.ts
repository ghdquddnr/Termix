/**
 * Theme System Cookie Storage Schema
 * 
 * 테마 설정을 쿠키에 저장하기 위한 스키마 및 유틸리티 함수들
 * 기존 기능에 영향을 주지 않도록 독립적으로 구현
 */

// 테마 타입 정의
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSettings {
  mode: ThemeMode;
  systemTheme?: 'light' | 'dark'; // 시스템 테마 감지 결과
  customColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  terminalTheme?: string; // xterm.js 테마명
  editorTheme?: string;   // CodeMirror 테마명
  lastUpdated?: string;   // 마지막 업데이트 시간
}

// 기본 테마 설정
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'system',
  systemTheme: 'light',
  customColors: {},
  terminalTheme: 'default',
  editorTheme: 'default',
  lastUpdated: new Date().toISOString(),
};

// 쿠키 설정
export const THEME_COOKIE_NAME = 'termix-theme';
export const THEME_COOKIE_EXPIRY_DAYS = 365; // 1년

/**
 * 쿠키에서 테마 설정을 불러옵니다
 * 기존 getCookie 함수 로직을 재사용하되 JSON 파싱 추가
 */
export function getThemeFromCookie(): ThemeSettings {
  try {
    const cookieValue = document.cookie
      .split('; ')
      .reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === THEME_COOKIE_NAME ? decodeURIComponent(parts[1]) : r;
      }, "");

    if (!cookieValue) {
      return DEFAULT_THEME_SETTINGS;
    }

    const parsed = JSON.parse(cookieValue) as ThemeSettings;
    
    // 기본값과 병합하여 누락된 속성 보완
    return {
      ...DEFAULT_THEME_SETTINGS,
      ...parsed,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    console.warn('Failed to parse theme cookie:', error);
    return DEFAULT_THEME_SETTINGS;
  }
}

/**
 * 테마 설정을 쿠키에 저장합니다
 * 기존 setCookie 함수 로직을 재사용하되 JSON 직렬화 추가
 */
export function saveThemeToCookie(settings: Partial<ThemeSettings>): void {
  try {
    const currentSettings = getThemeFromCookie();
    const updatedSettings: ThemeSettings = {
      ...currentSettings,
      ...settings,
      lastUpdated: new Date().toISOString(),
    };

    const jsonValue = JSON.stringify(updatedSettings);
    const expires = new Date(Date.now() + THEME_COOKIE_EXPIRY_DAYS * 864e5).toUTCString();
    
    document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(jsonValue)}; expires=${expires}; path=/`;
  } catch (error) {
    console.error('Failed to save theme to cookie:', error);
  }
}

/**
 * 시스템 테마 감지
 */
export function detectSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * 현재 적용되어야 할 실제 테마 모드를 반환
 * system 모드인 경우 시스템 설정에 따라 결정
 */
export function getEffectiveTheme(settings: ThemeSettings): 'light' | 'dark' {
  if (settings.mode === 'system') {
    return settings.systemTheme || detectSystemTheme();
  }
  return settings.mode as 'light' | 'dark';
}

/**
 * 테마 설정 유효성 검사
 */
export function validateThemeSettings(settings: unknown): settings is ThemeSettings {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  const settingsObj = settings as Record<string, unknown>;
  const validModes: ThemeMode[] = ['light', 'dark', 'system'];
  
  if (!validModes.includes(settingsObj.mode as ThemeMode)) {
    return false;
  }

  return true;
}

/**
 * 시스템 테마 변경 감지 리스너 설정
 */
export function setupSystemThemeListener(callback: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}; // cleanup function
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  
  // 최신 브라우저 방식
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
  
  // 구형 브라우저 지원
  if (mediaQuery.addListener) {
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener?.(handler);
  }

  return () => {};
}

/**
 * 개발/디버깅용: 쿠키 삭제
 */
export function clearThemeCookie(): void {
  document.cookie = `${THEME_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}