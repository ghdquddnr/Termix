/**
 * Theme Utils Test Suite
 * 
 * 테마 유틸리티 함수들의 쿠키 저장/불러오기 기능을 테스트합니다.
 */

import {
  getThemeFromCookie,
  saveThemeToCookie,
  detectSystemTheme,
  getEffectiveTheme,
  validateThemeSettings,
  clearThemeCookie,
  type ThemeSettings,
  DEFAULT_THEME_SETTINGS
} from '../theme-utils';

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Theme Utils', () => {
  beforeEach(() => {
    // 각 테스트 전에 쿠키 초기화
    document.cookie = '';
    clearThemeCookie();
  });

  describe('쿠키 저장 및 불러오기', () => {
    it('기본 테마 설정을 쿠키에 저장하고 불러올 수 있어야 한다', () => {
      const themeSettings: ThemeSettings = {
        mode: 'dark',
        customColors: {
          primary: '#ff6b35',
          secondary: '#4ecdc4'
        },
        terminalTheme: 'dark',
        editorTheme: 'monokai'
      };

      saveThemeToCookie(themeSettings);
      const retrieved = getThemeFromCookie();

      expect(retrieved.mode).toBe('dark');
      expect(retrieved.customColors?.primary).toBe('#ff6b35');
      expect(retrieved.customColors?.secondary).toBe('#4ecdc4');
      expect(retrieved.terminalTheme).toBe('dark');
      expect(retrieved.editorTheme).toBe('monokai');
    });

    it('부분적인 테마 설정도 올바르게 저장되어야 한다', () => {
      const partialSettings = {
        mode: 'light' as const,
        customColors: {
          primary: '#007bff'
        }
      };

      saveThemeToCookie(partialSettings);
      const retrieved = getThemeFromCookie();

      expect(retrieved.mode).toBe('light');
      expect(retrieved.customColors?.primary).toBe('#007bff');
      // 기본값들이 유지되어야 함
      expect(retrieved.terminalTheme).toBe(DEFAULT_THEME_SETTINGS.terminalTheme);
    });

    it('쿠키가 없을 때 기본 설정을 반환해야 한다', () => {
      const settings = getThemeFromCookie();
      
      expect(settings.mode).toBe(DEFAULT_THEME_SETTINGS.mode);
      expect(settings.systemTheme).toBe(DEFAULT_THEME_SETTINGS.systemTheme);
      expect(settings.terminalTheme).toBe(DEFAULT_THEME_SETTINGS.terminalTheme);
    });

    it('잘못된 쿠키 데이터가 있을 때 기본 설정을 반환해야 한다', () => {
      // 잘못된 JSON 데이터를 쿠키에 직접 설정
      document.cookie = 'termix-theme-settings=invalid-json-data';
      
      const settings = getThemeFromCookie();
      
      expect(settings.mode).toBe(DEFAULT_THEME_SETTINGS.mode);
    });

    it('쿠키를 삭제할 수 있어야 한다', () => {
      const themeSettings: ThemeSettings = {
        mode: 'dark',
        customColors: { primary: '#ff0000' }
      };

      saveThemeToCookie(themeSettings);
      expect(getThemeFromCookie().mode).toBe('dark');

      clearThemeCookie();
      const retrieved = getThemeFromCookie();
      expect(retrieved.mode).toBe(DEFAULT_THEME_SETTINGS.mode);
    });
  });

  describe('시스템 테마 감지', () => {
    it('시스템이 다크 모드일 때 올바르게 감지해야 한다', () => {
      // matchMedia mock이 dark를 반환하도록 설정
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const systemTheme = detectSystemTheme();
      expect(systemTheme).toBe('dark');
    });

    it('시스템이 라이트 모드일 때 올바르게 감지해야 한다', () => {
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const systemTheme = detectSystemTheme();
      expect(systemTheme).toBe('light');
    });
  });

  describe('유효한 테마 계산', () => {
    it('라이트 모드 설정이 올바르게 반영되어야 한다', () => {
      const settings: ThemeSettings = { mode: 'light' };
      const effectiveTheme = getEffectiveTheme(settings);
      expect(effectiveTheme).toBe('light');
    });

    it('다크 모드 설정이 올바르게 반영되어야 한다', () => {
      const settings: ThemeSettings = { mode: 'dark' };
      const effectiveTheme = getEffectiveTheme(settings);
      expect(effectiveTheme).toBe('dark');
    });

    it('시스템 모드에서 시스템 테마를 따라야 한다', () => {
      const settings: ThemeSettings = { 
        mode: 'system',
        systemTheme: 'dark'
      };
      const effectiveTheme = getEffectiveTheme(settings);
      expect(effectiveTheme).toBe('dark');
    });

    it('시스템 모드에서 systemTheme이 없으면 자동 감지해야 한다', () => {
      const settings: ThemeSettings = { mode: 'system' };
      
      // 다크 모드로 설정
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('dark'),
        media: query,
      }));
      
      const effectiveTheme = getEffectiveTheme(settings);
      expect(effectiveTheme).toBe('dark');
    });
  });

  describe('테마 설정 유효성 검사', () => {
    it('올바른 테마 설정을 검증해야 한다', () => {
      const validSettings: ThemeSettings = {
        mode: 'dark',
        systemTheme: 'light',
        customColors: {
          primary: '#ff0000',
          secondary: '#00ff00'
        },
        terminalTheme: 'custom',
        editorTheme: 'monokai',
        lastUpdated: new Date().toISOString()
      };

      expect(validateThemeSettings(validSettings)).toBe(true);
    });

    it('잘못된 mode 값을 거부해야 한다', () => {
      const invalidSettings = {
        mode: 'invalid-mode',
        systemTheme: 'light'
      };

      expect(validateThemeSettings(invalidSettings)).toBe(false);
    });

    it('잘못된 systemTheme 값을 거부해야 한다', () => {
      const invalidSettings = {
        mode: 'system',
        systemTheme: 'invalid-theme'
      };

      expect(validateThemeSettings(invalidSettings)).toBe(false);
    });

    it('빈 객체를 거부해야 한다', () => {
      expect(validateThemeSettings({})).toBe(false);
    });

    it('null이나 undefined를 거부해야 한다', () => {
      expect(validateThemeSettings(null)).toBe(false);
      expect(validateThemeSettings(undefined)).toBe(false);
    });
  });

  describe('lastUpdated 타임스탬프', () => {
    it('테마 저장 시 lastUpdated가 설정되어야 한다', () => {
      const beforeSave = Date.now();
      
      saveThemeToCookie({ mode: 'dark' });
      
      const retrieved = getThemeFromCookie();
      const afterSave = Date.now();
      
      expect(retrieved.lastUpdated).toBeDefined();
      if (retrieved.lastUpdated) {
        const timestamp = new Date(retrieved.lastUpdated).getTime();
        expect(timestamp).toBeGreaterThanOrEqual(beforeSave);
        expect(timestamp).toBeLessThanOrEqual(afterSave);
      }
    });
  });
});