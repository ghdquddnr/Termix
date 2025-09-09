/**
 * Theme Provider Test Suite
 * 
 * ThemeProvider 컴포넌트와 useTheme 훅의 기능을 테스트합니다.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../theme-provider';
import * as themeUtils from '../../lib/theme-utils';
import * as themeTransitions from '../../lib/theme-transitions';

// Mock the dependencies
jest.mock('../../lib/theme-utils');
jest.mock('../../lib/theme-transitions');

const mockGetThemeFromCookie = themeUtils.getThemeFromCookie as jest.MockedFunction<typeof themeUtils.getThemeFromCookie>;
const mockSaveThemeToCookie = themeUtils.saveThemeToCookie as jest.MockedFunction<typeof themeUtils.saveThemeToCookie>;
const mockApplyThemeTransition = themeTransitions.applyThemeTransition as jest.MockedFunction<typeof themeTransitions.applyThemeTransition>;
const mockUpdateThemeMetaTags = themeTransitions.updateThemeMetaTags as jest.MockedFunction<typeof themeTransitions.updateThemeMetaTags>;
const mockShouldUseReducedMotion = themeTransitions.shouldUseReducedMotion as jest.MockedFunction<typeof themeTransitions.shouldUseReducedMotion>;

// Mock DOM methods
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
    },
    style: {
      setProperty: jest.fn(),
    }
  },
  writable: true
});

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

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

describe('ThemeProvider', () => {
  const TestComponent = () => {
    const { theme, resolvedTheme, setTheme } = useTheme();
    return (
      <div>
        <span data-testid="current-theme">{theme}</span>
        <span data-testid="resolved-theme">{resolvedTheme}</span>
        <button data-testid="set-dark" onClick={() => setTheme('dark')}>
          Set Dark
        </button>
        <button data-testid="set-light" onClick={() => setTheme('light')}>
          Set Light
        </button>
        <button data-testid="set-system" onClick={() => setTheme('system')}>
          Set System
        </button>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockGetThemeFromCookie.mockReturnValue({ mode: 'system' });
    mockSaveThemeToCookie.mockImplementation(() => {});
    mockApplyThemeTransition.mockImplementation(() => {});
    mockUpdateThemeMetaTags.mockImplementation(() => {});
    mockShouldUseReducedMotion.mockReturnValue(false);
  });

  describe('초기 설정', () => {
    it('쿠키에서 테마 설정을 불러와야 한다', () => {
      mockGetThemeFromCookie.mockReturnValue({
        mode: 'dark',
        customColors: { primary: '#ff0000' }
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(mockGetThemeFromCookie).toHaveBeenCalled();
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('쿠키가 없을 때 기본 테마를 사용해야 한다', () => {
      mockGetThemeFromCookie.mockReturnValue({ mode: 'system' });

      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    });

    it('시스템 테마를 올바르게 감지해야 한다', () => {
      // 다크 모드로 설정
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('dark'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      mockGetThemeFromCookie.mockReturnValue({ mode: 'system' });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });
  });

  describe('테마 전환', () => {
    it('테마를 변경할 수 있어야 한다', async () => {
      mockGetThemeFromCookie.mockReturnValue({ mode: 'system' });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const setDarkButton = screen.getByTestId('set-dark');
      
      await act(async () => {
        setDarkButton.click();
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(mockSaveThemeToCookie).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'dark',
          lastUpdated: expect.any(String)
        })
      );
    });

    it('테마 변경 시 DOM 클래스를 업데이트해야 한다', async () => {
      mockGetThemeFromCookie.mockReturnValue({ mode: 'light' });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
        expect(document.documentElement.classList.add).toHaveBeenCalledWith('light');
      });

      const setDarkButton = screen.getByTestId('set-dark');
      
      await act(async () => {
        setDarkButton.click();
      });

      await waitFor(() => {
        expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
      });
    });

    it('테마 변경 시 애니메이션을 적용해야 한다', async () => {
      mockGetThemeFromCookie.mockReturnValue({ mode: 'light' });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(mockApplyThemeTransition).toHaveBeenCalled();
      });
    });

    it('접근성을 고려하여 애니메이션을 비활성화해야 한다', async () => {
      mockShouldUseReducedMotion.mockReturnValue(true);
      mockGetThemeFromCookie.mockReturnValue({ mode: 'light' });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(mockApplyThemeTransition).toHaveBeenCalledWith({
          disableTransition: true
        });
      });
    });

    it('메타 태그를 업데이트해야 한다', async () => {
      mockGetThemeFromCookie.mockReturnValue({ mode: 'dark' });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(mockUpdateThemeMetaTags).toHaveBeenCalledWith('dark');
      });
    });
  });

  describe('커스텀 색상', () => {
    it('커스텀 색상을 CSS 변수로 적용해야 한다', async () => {
      mockGetThemeFromCookie.mockReturnValue({
        mode: 'dark',
        customColors: {
          primary: '#ff6b35',
          secondary: '#4ecdc4',
          accent: '#45b7d1'
        }
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
          '--color-primary',
          '#ff6b35'
        );
        expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
          '--color-secondary',
          '#4ecdc4'
        );
        expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
          '--color-accent',
          '#45b7d1'
        );
      });
    });
  });

  describe('백워드 호환성', () => {
    it('localStorage를 업데이트해야 한다', async () => {
      mockGetThemeFromCookie.mockReturnValue({ mode: 'dark' });

      render(
        <ThemeProvider storageKey="custom-theme-key">
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith('custom-theme-key', 'dark');
      });
    });
  });

  describe('시스템 테마 변경 감지', () => {
    it('시스템 테마 변경을 감지하고 업데이트해야 한다', async () => {
      const mockAddEventListener = jest.fn();
      const mockRemoveEventListener = jest.fn();
      
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('dark'),
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      }));

      mockGetThemeFromCookie.mockReturnValue({ mode: 'system' });

      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      // 컴포넌트 언마운트시 이벤트 리스너 제거
      unmount();
      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('useTheme 훅', () => {
    it('ThemeProvider 외부에서 사용하면 에러를 던져야 한다', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('테마 설정을 업데이트할 수 있어야 한다', async () => {
      mockGetThemeFromCookie.mockReturnValue({ mode: 'light' });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        result.current.updateThemeSettings({
          customColors: { primary: '#ff0000' }
        });
      });

      expect(mockSaveThemeToCookie).toHaveBeenCalledWith(
        expect.objectContaining({
          customColors: { primary: '#ff0000' },
          lastUpdated: expect.any(String)
        })
      );
    });
  });
});