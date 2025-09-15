/**
 * Theme Utils Test
 * 
 * 테마 시스템 쿠키 유틸리티 함수들의 동작을 테스트합니다.
 * 기존 기능에 영향을 주지 않는지 확인합니다.
 */

import {
  ThemeSettings,
  DEFAULT_THEME_SETTINGS,
  THEME_COOKIE_NAME,
  getThemeFromCookie,
  saveThemeToCookie,
  detectSystemTheme,
  getEffectiveTheme,
  validateThemeSettings,
  clearThemeCookie,
} from './theme-utils';

// DOM mock 설정
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

// matchMedia mock 설정
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Theme Utils Cookie Storage', () => {
  
  beforeEach(() => {
    // 각 테스트 전에 쿠키 초기화
    document.cookie = '';
    clearThemeCookie();
  });

  describe('기본 설정 테스트', () => {
    test('DEFAULT_THEME_SETTINGS가 올바른 기본값을 가지고 있어야 함', () => {
      expect(DEFAULT_THEME_SETTINGS).toEqual({
        mode: 'system',
        systemTheme: 'light',
        customColors: {},
        terminalTheme: 'default',
        editorTheme: 'default',
        lastUpdated: expect.any(String),
      });
    });

    test('쿠키명이 termix-theme여야 함', () => {
      expect(THEME_COOKIE_NAME).toBe('termix-theme');
    });
  });

  describe('쿠키 저장/불러오기 테스트', () => {
    test('빈 쿠키에서 기본값을 반환해야 함', () => {
      const theme = getThemeFromCookie();
      expect(theme.mode).toBe('system');
      expect(theme.systemTheme).toBe('light');
    });

    test('테마 설정을 쿠키에 저장할 수 있어야 함', () => {
      const testSettings: Partial<ThemeSettings> = {
        mode: 'dark',
        terminalTheme: 'dark-theme',
      };

      saveThemeToCookie(testSettings);

      // 쿠키가 설정되었는지 확인
      expect(document.cookie).toContain(THEME_COOKIE_NAME);
      expect(document.cookie).toContain('dark');
    });

    test('저장된 테마 설정을 불러올 수 있어야 함', () => {
      const testSettings: Partial<ThemeSettings> = {
        mode: 'light',
        customColors: { primary: '#ff0000' },
        terminalTheme: 'light-theme',
      };

      saveThemeToCookie(testSettings);
      const loadedTheme = getThemeFromCookie();

      expect(loadedTheme.mode).toBe('light');
      expect(loadedTheme.customColors?.primary).toBe('#ff0000');
      expect(loadedTheme.terminalTheme).toBe('light-theme');
      expect(loadedTheme.lastUpdated).toBeDefined();
    });

    test('부분 설정 업데이트가 기존 설정과 병합되어야 함', () => {
      // 초기 설정 저장
      saveThemeToCookie({ mode: 'dark', terminalTheme: 'dark-theme' });

      // 부분 업데이트
      saveThemeToCookie({ customColors: { accent: '#00ff00' } });

      const theme = getThemeFromCookie();
      expect(theme.mode).toBe('dark'); // 기존 설정 유지
      expect(theme.terminalTheme).toBe('dark-theme'); // 기존 설정 유지
      expect(theme.customColors?.accent).toBe('#00ff00'); // 새 설정 추가
    });

    test('잘못된 JSON 쿠키에서 기본값을 반환해야 함', () => {
      // 잘못된 JSON 설정
      document.cookie = `${THEME_COOKIE_NAME}=invalid-json; path=/`;

      const theme = getThemeFromCookie();
      expect(theme).toEqual(expect.objectContaining(DEFAULT_THEME_SETTINGS));
    });
  });

  describe('시스템 테마 감지 테스트', () => {
    test('시스템 테마를 감지할 수 있어야 함', () => {
      const theme = detectSystemTheme();
      expect(['light', 'dark']).toContain(theme);
    });

    test('system 모드에서 실제 테마를 올바르게 반환해야 함', () => {
      const settings: ThemeSettings = {
        ...DEFAULT_THEME_SETTINGS,
        mode: 'system',
        systemTheme: 'dark',
      };

      const effectiveTheme = getEffectiveTheme(settings);
      expect(effectiveTheme).toBe('dark');
    });

    test('light/dark 모드에서 직접 테마를 반환해야 함', () => {
      const lightSettings: ThemeSettings = {
        ...DEFAULT_THEME_SETTINGS,
        mode: 'light',
      };

      const darkSettings: ThemeSettings = {
        ...DEFAULT_THEME_SETTINGS,
        mode: 'dark',
      };

      expect(getEffectiveTheme(lightSettings)).toBe('light');
      expect(getEffectiveTheme(darkSettings)).toBe('dark');
    });
  });

  describe('유효성 검사 테스트', () => {
    test('올바른 테마 설정을 검증해야 함', () => {
      const validSettings = {
        mode: 'light' as const,
        customColors: {},
      };

      expect(validateThemeSettings(validSettings)).toBe(true);
    });

    test('잘못된 테마 설정을 거부해야 함', () => {
      const invalidSettings = [
        null,
        undefined,
        'string',
        { mode: 'invalid' },
        {},
      ];

      invalidSettings.forEach(setting => {
        expect(validateThemeSettings(setting)).toBe(false);
      });
    });
  });

  describe('기존 기능 영향도 테스트', () => {
    test('기존 jwt 쿠키에 영향을 주지 않아야 함', () => {
      // 기존 jwt 쿠키 설정 (App.tsx에서 사용)
      document.cookie = 'jwt=test-token; path=/';

      // 테마 쿠키 저장
      saveThemeToCookie({ mode: 'dark' });

      // jwt 쿠키가 그대로 남아있는지 확인
      expect(document.cookie).toContain('jwt=test-token');
      expect(document.cookie).toContain(THEME_COOKIE_NAME);
    });

    test('다른 쿠키들과 독립적으로 작동해야 함', () => {
      // 다른 쿠키들 설정
      document.cookie = 'other-cookie=other-value; path=/';
      document.cookie = 'another-cookie=another-value; path=/';

      // 테마 쿠키 저장 및 불러오기
      saveThemeToCookie({ mode: 'light' });
      const theme = getThemeFromCookie();

      expect(theme.mode).toBe('light');
      expect(document.cookie).toContain('other-cookie=other-value');
      expect(document.cookie).toContain('another-cookie=another-value');
    });
  });

  describe('에러 처리 테스트', () => {
    test('쿠키 저장 실패 시 에러를 무시해야 함', () => {
      // JSON.stringify가 실패하는 순환 참조 객체
      const circularRef: any = {};
      circularRef.self = circularRef;

      // 에러가 발생하지 않아야 함 (console.error는 호출됨)
      expect(() => {
        saveThemeToCookie(circularRef as any);
      }).not.toThrow();
    });

    test('쿠키 읽기 실패 시 기본값을 반환해야 함', () => {
      // document.cookie를 일시적으로 오류 발생하도록 설정
      const originalCookie = Object.getOwnPropertyDescriptor(document, 'cookie');
      
      Object.defineProperty(document, 'cookie', {
        get: () => { throw new Error('Cookie access denied'); },
        configurable: true,
      });

      const theme = getThemeFromCookie();
      expect(theme).toEqual(expect.objectContaining(DEFAULT_THEME_SETTINGS));

      // 원래 설정 복구
      if (originalCookie) {
        Object.defineProperty(document, 'cookie', originalCookie);
      }
    });
  });

  describe('쿠키 만료 설정 테스트', () => {
    test('쿠키 만료일이 1년으로 설정되어야 함', () => {
      saveThemeToCookie({ mode: 'dark' });

      // 쿠키 문자열에서 expires 확인
      expect(document.cookie).toMatch(/expires=/);
      
      // 대략적인 만료일 확인 (1년 후)
      const cookieString = document.cookie;
      const expiresMatch = cookieString.match(/expires=([^;]+)/);
      
      if (expiresMatch) {
        const expiresDate = new Date(expiresMatch[1]);
        const oneYearLater = new Date(Date.now() + 365 * 864e5);
        
        // 1일 오차 허용
        const timeDiff = Math.abs(expiresDate.getTime() - oneYearLater.getTime());
        expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000); // 24시간
      }
    });
  });
});