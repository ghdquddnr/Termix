/**
 * Theme Configuration
 * 테마 관련 설정과 상수를 정의합니다.
 * 번들 크기 최적화를 위해 분리되었습니다.
 */

// 핵심 테마 변수만 포함 (번들 크기 최적화)
export const ESSENTIAL_THEME_VARIABLES = [
  '--color-background',
  '--color-foreground',
  '--color-primary',
  '--color-border'
] as const;

// 확장 테마 변수 (필요시에만 로드)
export const EXTENDED_THEME_VARIABLES = [
  '--color-primary-foreground',
  '--color-secondary',
  '--color-secondary-foreground',
  '--color-accent',
  '--color-accent-foreground',
  '--color-surface',
  '--color-card',
  '--color-popover',
  '--color-muted',
  '--color-muted-foreground',
  '--color-destructive',
  '--color-destructive-foreground',
  '--color-input',
  '--color-ring'
] as const;

// 터미널/에디터 변수 (필요시에만 로드)
export const COMPONENT_THEME_VARIABLES = [
  '--terminal-background',
  '--terminal-foreground',
  '--terminal-cursor',
  '--terminal-selection',
  '--editor-background',
  '--editor-foreground',
  '--editor-line-number',
  '--editor-selection'
] as const;

// 테마 전환 설정
export const THEME_TRANSITION_CONFIG = {
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  properties: [
    'background-color',
    'color',
    'border-color',
    'box-shadow'
  ]
} as const;

// 성능 최적화 설정
export const PERFORMANCE_CONFIG = {
  // CSS 변수 캐시 만료 시간 (ms)
  cacheExpiry: 5 * 60 * 1000, // 5분
  
  // 미리 로드할 변수 수
  preloadLimit: 8,
  
  // 일괄 업데이트 지연 시간 (ms)
  batchUpdateDelay: 16, // ~1 frame
  
  // 메타 태그 업데이트 지연 시간 (ms)
  metaUpdateDelay: 32
} as const;

// 테마 모드 타입
export type ThemeMode = 'light' | 'dark' | 'system';

// 테마 변수 타입
export type ThemeVariable = 
  | typeof ESSENTIAL_THEME_VARIABLES[number]
  | typeof EXTENDED_THEME_VARIABLES[number]
  | typeof COMPONENT_THEME_VARIABLES[number];