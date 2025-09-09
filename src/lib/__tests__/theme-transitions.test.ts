/**
 * Theme Transitions Test Suite
 * 
 * 테마 전환 애니메이션 및 유틸리티 함수들을 테스트합니다.
 */

import {
  applyThemeTransition,
  preventThemeFlash,
  isValidColor,
  hexToRgb,
  rgbToHex,
  getColorBrightness,
  isColorDark,
  waitForThemeTransition,
  watchSystemTheme,
  shouldUseReducedMotion,
  updateThemeMetaTags
} from '../theme-transitions';

// Mock DOM methods
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn()
    },
    style: {
      setProperty: jest.fn(),
      removeProperty: jest.fn()
    }
  },
  writable: true
});

Object.defineProperty(document, 'head', {
  value: {
    appendChild: jest.fn()
  },
  writable: true
});

Object.defineProperty(document, 'querySelector', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation(() => ({
    name: '',
    content: ''
  })),
  writable: true
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn().mockImplementation(fn => setTimeout(fn, 16)),
  writable: true
});

describe('Theme Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('테마 전환 애니메이션', () => {
    it('기본 전환 설정을 적용해야 한다', () => {
      applyThemeTransition();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-transition-duration',
        '300ms'
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-transition-timing',
        'cubic-bezier(0.4, 0, 0.2, 1)'
      );
    });

    it('커스텀 전환 설정을 적용해야 한다', () => {
      applyThemeTransition({
        duration: 500,
        easing: 'ease-in-out'
      });

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-transition-duration',
        '500ms'
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-transition-timing',
        'ease-in-out'
      );
    });

    it('전환이 비활성화되면 설정을 적용하지 않아야 한다', () => {
      applyThemeTransition({ disableTransition: true });

      expect(document.documentElement.style.setProperty).not.toHaveBeenCalled();
    });

    it('깜빡임 방지 기능이 작동해야 한다', () => {
      preventThemeFlash();

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('no-transition');
    });
  });

  describe('색상 유틸리티', () => {
    it('유효한 색상을 검증해야 한다', () => {
      expect(isValidColor('#ff0000')).toBe(true);
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidColor('red')).toBe(true);
      expect(isValidColor('invalid-color')).toBe(false);
    });

    it('HEX를 RGB로 변환해야 한다', () => {
      const rgb = hexToRgb('#ff0000');
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });

      const rgb2 = hexToRgb('#00ff00');
      expect(rgb2).toEqual({ r: 0, g: 255, b: 0 });

      const invalid = hexToRgb('invalid');
      expect(invalid).toBeNull();
    });

    it('RGB를 HEX로 변환해야 한다', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
    });

    it('색상 밝기를 계산해야 한다', () => {
      const whiteBrightness = getColorBrightness('#ffffff');
      const blackBrightness = getColorBrightness('#000000');
      
      expect(whiteBrightness).toBeCloseTo(1, 1);
      expect(blackBrightness).toBeCloseTo(0, 1);
      expect(whiteBrightness).toBeGreaterThan(blackBrightness);
    });

    it('어두운 색상을 식별해야 한다', () => {
      expect(isColorDark('#000000')).toBe(true);
      expect(isColorDark('#ffffff')).toBe(false);
      expect(isColorDark('#333333')).toBe(true);
      expect(isColorDark('#cccccc')).toBe(false);
    });
  });

  describe('전환 완료 대기', () => {
    it('기본 지속시간으로 대기해야 한다', async () => {
      const startTime = Date.now();
      await waitForThemeTransition();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
    });

    it('커스텀 지속시간으로 대기해야 한다', async () => {
      const startTime = Date.now();
      await waitForThemeTransition({ duration: 100 });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('전환이 비활성화되면 즉시 완료되어야 한다', async () => {
      const startTime = Date.now();
      await waitForThemeTransition({ disableTransition: true });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('시스템 테마 감시', () => {
    it('시스템 테마 변경을 감지해야 한다', () => {
      const callback = jest.fn();
      const cleanup = watchSystemTheme(callback);

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(typeof cleanup).toBe('function');
    });

    it('접근성 설정을 확인해야 한다', () => {
      // reduced motion 활성화
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('reduce'),
      }));

      expect(shouldUseReducedMotion()).toBe(true);

      // reduced motion 비활성화
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: false,
      }));

      expect(shouldUseReducedMotion()).toBe(false);
    });
  });

  describe('메타 태그 업데이트', () => {
    beforeEach(() => {
      (document.querySelector as jest.Mock).mockReturnValue(null);
      (document.createElement as jest.Mock).mockReturnValue({
        name: '',
        content: ''
      });
    });

    it('라이트 테마 메타 태그를 설정해야 한다', () => {
      updateThemeMetaTags('light');

      expect(document.createElement).toHaveBeenCalledWith('meta');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('다크 테마 메타 태그를 설정해야 한다', () => {
      updateThemeMetaTags('dark');

      expect(document.createElement).toHaveBeenCalledWith('meta');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('기존 메타 태그를 업데이트해야 한다', () => {
      const existingMeta = { content: '' };
      (document.querySelector as jest.Mock).mockReturnValue(existingMeta);

      updateThemeMetaTags('dark');

      expect(existingMeta.content).toBe('#121212');
    });
  });
});