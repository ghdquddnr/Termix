import {createContext, useContext, useEffect, useState, useCallback} from "react"
import {getThemeFromCookie, saveThemeToCookie, type ThemeSettings, type ThemeMode} from "@/lib/theme-utils"
import {
    applyThemeTransition, 
    updateThemeMetaTags, 
    shouldUseReducedMotion,
    batchUpdateCSSVariables,
    clearCSSVariableCache,
    preloadEssentialVariables,
    preloadExtendedVariables
} from "@/lib/theme-transitions"

// 개발 환경에서만 성능 모니터링 로드
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('@/lib/theme-benchmark').catch(() => {
    // 벤치마크 로드 실패 시 무시 (선택적 기능)
  });
}

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: ThemeMode
    storageKey?: string
}

type ThemeProviderState = {
    theme: ThemeMode
    themeSettings: ThemeSettings
    setTheme: (theme: ThemeMode) => void
    updateThemeSettings: (settings: Partial<ThemeSettings>) => void
    resolvedTheme: 'light' | 'dark'
    systemTheme: 'light' | 'dark'
}

const initialState: ThemeProviderState = {
    theme: "system",
    themeSettings: {
        mode: "system"
    },
    setTheme: () => null,
    updateThemeSettings: () => null,
    resolvedTheme: 'light',
    systemTheme: 'light'
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
                                  children,
                                  defaultTheme = "system",
                                  storageKey = "vite-ui-theme",
                                  ...props
                              }: ThemeProviderProps) {
    const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
        // 초기 로딩 시 쿠키에서 테마 설정 복원
        const saved = getThemeFromCookie()
        return saved || { mode: defaultTheme }
    })

    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        }
        return 'light'
    })

    // 시스템 테마 자동 감지 기능
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        
        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
            const newSystemTheme = e.matches ? "dark" : "light"
            setSystemTheme(newSystemTheme)
            
            // 현재 테마가 system이면 쿠키에 시스템 테마 정보 업데이트
            if (themeSettings.mode === "system") {
                const updatedSettings = {
                    ...themeSettings,
                    systemTheme: newSystemTheme,
                    lastUpdated: new Date().toISOString()
                }
                setThemeSettings(updatedSettings)
                saveThemeToCookie(updatedSettings)
            }
        }

        mediaQuery.addEventListener('change', handleSystemThemeChange)
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }, [themeSettings.mode])

    // 현재 적용되는 테마 계산
    const resolvedTheme = themeSettings.mode === "system" ? systemTheme : themeSettings.mode

    // DOM에 테마 적용
    useEffect(() => {
        const root = window.document.documentElement
        
        // 페이지 로드 시 깜빡임 방지를 위해 no-transition 클래스 제거
        requestAnimationFrame(() => {
            root.classList.remove("no-transition")
        })
        
        // 테마 전환 애니메이션 적용 (접근성 고려)
        const shouldDisableTransition = shouldUseReducedMotion()
        if (!shouldDisableTransition) {
            applyThemeTransition({
                disableTransition: false
            })
        }
        
        // 기존 테마 클래스 제거
        root.classList.remove("light", "dark")
        
        // 새 테마 클래스 추가
        root.classList.add(resolvedTheme)

        // CSS 변수 캐시 초기화 (테마 변경 시)
        clearCSSVariableCache()
        
        // CSS 커스텀 속성으로 커스텀 컬러 적용 (최적화된 버전)
        if (themeSettings.customColors) {
            const { primary, secondary, accent } = themeSettings.customColors
            const updates: Record<string, string> = {}
            
            if (primary) updates['--color-primary'] = primary
            if (secondary) updates['--color-secondary'] = secondary
            if (accent) updates['--color-accent'] = accent
            
            // 일괄 업데이트
            if (Object.keys(updates).length > 0) {
                batchUpdateCSSVariables(updates)
            }
        }

        // 메타 태그 업데이트 (모바일 브라우저 테마 색상)
        updateThemeMetaTags(resolvedTheme)

        // 백워드 호환성을 위한 localStorage 업데이트
        if (storageKey) {
            localStorage.setItem(storageKey, themeSettings.mode)
        }
        
        // 확장 변수를 필요시에만 로드 (번들 크기 최적화)
        if (themeSettings.customColors || resolvedTheme !== 'system') {
            preloadExtendedVariables()
        }
    }, [resolvedTheme, themeSettings.customColors, storageKey])

    const setTheme = useCallback((theme: ThemeMode) => {
        const updatedSettings: ThemeSettings = {
            ...themeSettings,
            mode: theme,
            systemTheme: theme === "system" ? systemTheme : undefined,
            lastUpdated: new Date().toISOString()
        }
        
        setThemeSettings(updatedSettings)
        saveThemeToCookie(updatedSettings)
    }, [themeSettings, systemTheme])

    const updateThemeSettings = useCallback((newSettings: Partial<ThemeSettings>) => {
        const updatedSettings: ThemeSettings = {
            ...themeSettings,
            ...newSettings,
            lastUpdated: new Date().toISOString()
        }
        
        setThemeSettings(updatedSettings)
        saveThemeToCookie(updatedSettings)
    }, [themeSettings])

    const value: ThemeProviderState = {
        theme: themeSettings.mode,
        themeSettings,
        setTheme,
        updateThemeSettings,
        resolvedTheme,
        systemTheme
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}