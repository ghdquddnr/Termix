import {useState, useEffect} from "react"
import {useTheme} from "@/components/theme-provider"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Switch} from "@/components/ui/switch"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Separator} from "@/components/ui/separator"
import {Badge} from "@/components/ui/badge"
import {Sun, Moon, Monitor, Palette, Eye, Settings, Sparkles} from "lucide-react"
import type {ThemeMode, ThemeSettings as ThemeSettingsType} from "@/lib/theme-utils"

interface ThemeSettingsProps {
  className?: string
}

export function ThemeSettings({className}: ThemeSettingsProps) {
  const {theme, themeSettings, setTheme, updateThemeSettings, resolvedTheme, systemTheme} = useTheme()
  const [previewMode, setPreviewMode] = useState<ThemeMode>(theme)
  const [isPreviewActive, setIsPreviewActive] = useState(false)
  const [customColors, setCustomColors] = useState({
    primary: themeSettings.customColors?.primary || "",
    secondary: themeSettings.customColors?.secondary || "",
    accent: themeSettings.customColors?.accent || ""
  })

  // 테마 옵션 정의
  const themeOptions = [
    {
      value: 'light' as ThemeMode,
      label: '라이트 모드',
      description: '밝은 배경과 어두운 텍스트',
      icon: Sun
    },
    {
      value: 'dark' as ThemeMode,
      label: '다크 모드',
      description: '어두운 배경과 밝은 텍스트',
      icon: Moon
    },
    {
      value: 'system' as ThemeMode,
      label: '시스템 설정',
      description: '운영체제 설정을 따름',
      icon: Monitor
    }
  ]

  // 미리보기 모드 적용
  useEffect(() => {
    if (isPreviewActive && previewMode !== theme) {
      const root = document.documentElement
      root.classList.remove("light", "dark")
      const effectiveTheme = previewMode === "system" ? systemTheme : previewMode
      root.classList.add(effectiveTheme)
    }
  }, [previewMode, isPreviewActive, theme, systemTheme])

  // 미리보기 종료 시 원래 테마로 복원
  useEffect(() => {
    if (!isPreviewActive) {
      const root = document.documentElement
      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)
    }
  }, [isPreviewActive, resolvedTheme])

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme)
    setPreviewMode(newTheme)
    setIsPreviewActive(false)
  }

  const handlePreviewChange = (newTheme: ThemeMode) => {
    setPreviewMode(newTheme)
    setIsPreviewActive(true)
  }

  const applyPreview = () => {
    if (previewMode !== theme) {
      setTheme(previewMode)
    }
    setIsPreviewActive(false)
  }

  const cancelPreview = () => {
    setPreviewMode(theme)
    setIsPreviewActive(false)
  }

  const handleCustomColorChange = (colorType: 'primary' | 'secondary' | 'accent', value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [colorType]: value
    }))
  }

  const applyCustomColors = () => {
    updateThemeSettings({
      customColors: {
        primary: customColors.primary || undefined,
        secondary: customColors.secondary || undefined,
        accent: customColors.accent || undefined
      }
    })
  }

  const resetCustomColors = () => {
    setCustomColors({primary: "", secondary: "", accent: ""})
    updateThemeSettings({
      customColors: {}
    })
  }

  const getCurrentThemeInfo = () => {
    const currentOption = themeOptions.find(option => option.value === theme)
    const effectiveTheme = resolvedTheme
    return {
      ...currentOption,
      effectiveTheme,
      isSystemTheme: theme === 'system'
    }
  }

  const themeInfo = getCurrentThemeInfo()
  const hasCustomColors = Object.values(customColors).some(color => color.length > 0)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 현재 테마 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            테마 설정
          </CardTitle>
          <CardDescription>
            애플리케이션의 외관과 색상 테마를 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              {themeInfo?.icon && <themeInfo.icon className="size-5" />}
              <div>
                <div className="font-medium">{themeInfo?.label}</div>
                <div className="text-sm text-muted-foreground">
                  현재 적용: {themeInfo?.effectiveTheme === 'dark' ? '다크' : '라이트'} 모드
                </div>
              </div>
            </div>
            <Badge variant={themeInfo?.effectiveTheme === 'dark' ? 'default' : 'secondary'}>
              {themeInfo?.isSystemTheme && '시스템 '}{themeInfo?.effectiveTheme === 'dark' ? '다크' : '라이트'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 테마 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>테마 모드 선택</CardTitle>
          <CardDescription>
            원하는 테마 모드를 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {themeOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  theme === option.value ? 'border-primary bg-muted/30' : ''
                }`}
                onClick={() => handleThemeChange(option.value)}
              >
                <div className="flex items-center gap-3">
                  <option.icon className="size-5" />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {theme === option.value && (
                    <Badge variant="default">선택됨</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 실시간 미리보기 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-5" />
            실시간 미리보기
          </CardTitle>
          <CardDescription>
            테마 변경 전에 미리 확인해보세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="preview-select" className="text-sm font-medium whitespace-nowrap">
              미리보기 테마
            </Label>
            <Select
              value={previewMode}
              onValueChange={(value: ThemeMode) => handlePreviewChange(value)}
            >
              <SelectTrigger id="preview-select" className="w-[180px]">
                <SelectValue placeholder="테마 선택" />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="size-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isPreviewActive && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                미리보기가 활성화되었습니다
              </span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelPreview}>
                  취소
                </Button>
                <Button size="sm" onClick={applyPreview}>
                  적용
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 커스텀 색상 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-5" />
            커스텀 색상
          </CardTitle>
          <CardDescription>
            기본 색상을 사용자 정의할 수 있습니다 (고급 기능)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primary-color">주 색상</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={customColors.primary}
                  onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                  className="w-16 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  placeholder="#3b82f6"
                  value={customColors.primary}
                  onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secondary-color">보조 색상</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={customColors.secondary}
                  onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                  className="w-16 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  placeholder="#64748b"
                  value={customColors.secondary}
                  onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accent-color">강조 색상</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={customColors.accent}
                  onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                  className="w-16 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  placeholder="#f59e0b"
                  value={customColors.accent}
                  onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasCustomColors && (
                <Badge variant="secondary">
                  커스텀 색상 적용됨
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetCustomColors}
                disabled={!hasCustomColors}
              >
                초기화
              </Button>
              <Button 
                size="sm" 
                onClick={applyCustomColors}
                disabled={!hasCustomColors}
              >
                색상 적용
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 테마 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>테마 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">현재 테마 모드:</span>
              <span className="font-medium">{themeInfo?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">적용된 테마:</span>
              <span className="font-medium">{themeInfo?.effectiveTheme === 'dark' ? '다크 모드' : '라이트 모드'}</span>
            </div>
            {theme === 'system' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">시스템 테마:</span>
                <span className="font-medium">{systemTheme === 'dark' ? '다크' : '라이트'}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">마지막 업데이트:</span>
              <span className="font-medium">
                {themeSettings.lastUpdated ? 
                  new Date(themeSettings.lastUpdated).toLocaleString('ko-KR') : 
                  '정보 없음'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}