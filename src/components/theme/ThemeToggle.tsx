import * as React from "react"
import {useTheme} from "@/components/theme-provider"
import {Button} from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Sun, Moon, Monitor, Palette} from "lucide-react"
import type {ThemeMode} from "@/lib/theme-utils"

interface ThemeToggleProps {
  variant?: "button" | "dropdown"
  size?: "sm" | "default" | "lg"
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({
  variant = "dropdown",
  size = "default",
  showLabel = false,
  className
}: ThemeToggleProps) {
  const {theme, setTheme, resolvedTheme} = useTheme()

  const themeOptions = [
    {
      value: 'light' as ThemeMode,
      label: '라이트 모드',
      shortLabel: '라이트',
      icon: Sun
    },
    {
      value: 'dark' as ThemeMode,
      label: '다크 모드',
      shortLabel: '다크',
      icon: Moon
    },
    {
      value: 'system' as ThemeMode,
      label: '시스템 설정',
      shortLabel: '시스템',
      icon: Monitor
    }
  ]

  const currentTheme = themeOptions.find(option => option.value === theme)
  const CurrentIcon = currentTheme?.icon || Monitor

  if (variant === "button") {
    // 단순 토글 버튼 (라이트 ↔ 다크)
    const handleToggle = () => {
      const newTheme: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark'
      setTheme(newTheme)
    }

    const ToggleIcon = resolvedTheme === 'dark' ? Sun : Moon
    const toggleLabel = resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'

    return (
      <Button
        variant="ghost"
        size={size}
        onClick={handleToggle}
        className={className}
        aria-label={`${toggleLabel}로 전환`}
      >
        <ToggleIcon className="size-4" />
        {showLabel && <span className="ml-2">{toggleLabel}</span>}
      </Button>
    )
  }

  // 드롭다운 메뉴
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={size} 
          className={className}
          aria-label="테마 선택"
        >
          <CurrentIcon className="size-4" />
          {showLabel && (
            <span className="ml-2">
              {currentTheme?.shortLabel}
            </span>
          )}
          <span className="sr-only">테마 메뉴 열기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <option.icon className="size-4" />
            <span className="flex-1">{option.label}</span>
            {theme === option.value && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// 더 간단한 인라인 토글 (아이콘만)
export function ThemeToggleIcon({
  className,
  size = "default"
}: {
  className?: string
  size?: "sm" | "default" | "lg"
}) {
  return <ThemeToggle variant="button" size={size} className={className} />
}

// 라벨과 함께 표시하는 토글
export function ThemeToggleWithLabel({
  className,
  size = "default"
}: {
  className?: string
  size?: "sm" | "default" | "lg"
}) {
  return <ThemeToggle variant="dropdown" size={size} showLabel className={className} />
}