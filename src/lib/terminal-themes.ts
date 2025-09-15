/**
 * XTerm.js 터미널 테마 설정
 * 애플리케이션 테마와 연동되는 터미널 컬러 스키마
 */

export interface TerminalThemeColors {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

// 다크 테마 터미널 컬러 스키마
export const darkTerminalTheme: TerminalThemeColors = {
  background: '#09090b',
  foreground: '#fafafa',
  cursor: '#fafafa',
  cursorAccent: '#09090b',
  selection: 'rgba(255, 255, 255, 0.3)',
  
  // Standard colors
  black: '#000000',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#e5e5e5',
  
  // Bright colors
  brightBlack: '#525252',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#fbbf24',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff'
};

// 라이트 테마 터미널 컬러 스키마
export const lightTerminalTheme: TerminalThemeColors = {
  background: '#ffffff',
  foreground: '#18181b',
  cursor: '#18181b',
  cursorAccent: '#ffffff',
  selection: 'rgba(0, 0, 0, 0.2)',
  
  // Standard colors
  black: '#18181b',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#f4f4f5',
  
  // Bright colors
  brightBlack: '#71717a',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#ffffff'
};

/**
 * 애플리케이션 테마에 따른 터미널 테마 반환
 */
export function getTerminalTheme(resolvedTheme: 'light' | 'dark'): TerminalThemeColors {
  return resolvedTheme === 'dark' ? darkTerminalTheme : lightTerminalTheme;
}

/**
 * XTerm.js ITheme 객체로 변환
 */
export function convertToXTermTheme(themeColors: TerminalThemeColors) {
  return {
    background: themeColors.background,
    foreground: themeColors.foreground,
    cursor: themeColors.cursor,
    cursorAccent: themeColors.cursorAccent,
    selection: themeColors.selection,
    black: themeColors.black,
    red: themeColors.red,
    green: themeColors.green,
    yellow: themeColors.yellow,
    blue: themeColors.blue,
    magenta: themeColors.magenta,
    cyan: themeColors.cyan,
    white: themeColors.white,
    brightBlack: themeColors.brightBlack,
    brightRed: themeColors.brightRed,
    brightGreen: themeColors.brightGreen,
    brightYellow: themeColors.brightYellow,
    brightBlue: themeColors.brightBlue,
    brightMagenta: themeColors.brightMagenta,
    brightCyan: themeColors.brightCyan,
    brightWhite: themeColors.brightWhite
  };
}