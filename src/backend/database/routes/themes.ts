/**
 * Theme API Routes
 * 
 * 테마 관련 API 엔드포인트들
 * - 시스템 기본 테마 설정 (관리자 전용)
 * - 테마 프리셋 조회
 * 
 * 기존 기능에 영향을 주지 않도록 독립적으로 구현
 */

import express from 'express';
import {db} from '../db/index.js';
import {settings} from '../db/schema.js';
import {eq} from 'drizzle-orm';
import type {Request, Response} from 'express';

const router = express.Router();

// 테마 관련 설정 키 상수들
const THEME_SETTING_KEYS = {
  SYSTEM_DEFAULT_THEME: 'system_default_theme',
  THEME_PRESETS: 'theme_presets',
  THEME_CUSTOMIZATION_ENABLED: 'theme_customization_enabled',
} as const;

// 기본 테마 프리셋 정의
const DEFAULT_THEME_PRESETS = {
  light: {
    name: 'Light',
    description: '밝은 테마',
    mode: 'light',
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      accent: '#17a2b8',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529',
    },
    terminalTheme: 'default',
    editorTheme: 'default',
  },
  dark: {
    name: 'Dark',
    description: '어두운 테마',
    mode: 'dark',
    colors: {
      primary: '#0d6efd',
      secondary: '#6c757d',
      accent: '#20c997',
      background: '#121212',
      surface: '#1e1e1e',
      text: '#ffffff',
    },
    terminalTheme: 'dark',
    editorTheme: 'dark',
  },
  system: {
    name: 'System',
    description: '시스템 설정 따라가기',
    mode: 'system',
    colors: {
      primary: '#007bff',
      secondary: '#6c757d', 
      accent: '#17a2b8',
    },
    terminalTheme: 'system',
    editorTheme: 'system',
  },
  termix: {
    name: 'Termix',
    description: 'Termix 기본 테마',
    mode: 'dark',
    colors: {
      primary: '#00d4aa',
      secondary: '#1e3a8a',
      accent: '#f59e0b',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
    },
    terminalTheme: 'termix-dark',
    editorTheme: 'termix-dark',
  },
};

/**
 * 관리자 권한 확인 미들웨어
 */
const requireAdmin = async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user || !user.is_admin) {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: '관리자 권한이 필요합니다.' 
      });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ 
      error: 'Admin check failed',
      message: '권한 확인 중 오류가 발생했습니다.' 
    });
  }
};

/**
 * 설정값을 안전하게 가져오는 유틸리티 함수
 */
async function getSetting(key: string, defaultValue: any = null): Promise<any> {
  try {
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (result.length === 0) {
      return defaultValue;
    }
    
    try {
      return JSON.parse(result[0].value);
    } catch {
      // JSON 파싱 실패시 문자열 그대로 반환
      return result[0].value;
    }
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * 설정값을 안전하게 저장하는 유틸리티 함수
 */
async function setSetting(key: string, value: any): Promise<boolean> {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    // UPSERT 방식으로 설정 저장
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    
    if (existing.length > 0) {
      await db.update(settings)
        .set({ value: stringValue })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({
        key: key,
        value: stringValue,
      });
    }
    
    return true;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    return false;
  }
}

// =============================================================================
// 테마 프리셋 조회 API (모든 사용자 접근 가능)
// =============================================================================

/**
 * GET /api/themes/presets
 * 사용 가능한 테마 프리셋 목록을 반환합니다
 */
router.get('/presets', async (req: Request, res: Response) => {
  try {
    // 저장된 커스텀 프리셋 가져오기
    const customPresets = await getSetting(THEME_SETTING_KEYS.THEME_PRESETS, {});
    
    // 기본 프리셋과 커스텀 프리셋 병합
    const allPresets = {
      ...DEFAULT_THEME_PRESETS,
      ...customPresets,
    };
    
    res.json({
      presets: allPresets,
      default: await getSetting(THEME_SETTING_KEYS.SYSTEM_DEFAULT_THEME, 'system'),
      customizationEnabled: await getSetting(THEME_SETTING_KEYS.THEME_CUSTOMIZATION_ENABLED, true),
    });
  } catch (error) {
    console.error('Error fetching theme presets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch theme presets',
      message: '테마 프리셋을 불러오는 중 오류가 발생했습니다.' 
    });
  }
});

// =============================================================================
// 시스템 기본 테마 설정 API (관리자 전용)
// =============================================================================

/**
 * GET /api/themes/system-default
 * 시스템 기본 테마 설정을 조회합니다
 */
router.get('/system-default', requireAdmin, async (req: Request, res: Response) => {
  try {
    const defaultTheme = await getSetting(THEME_SETTING_KEYS.SYSTEM_DEFAULT_THEME, 'system');
    const customizationEnabled = await getSetting(THEME_SETTING_KEYS.THEME_CUSTOMIZATION_ENABLED, true);
    
    res.json({
      defaultTheme,
      customizationEnabled,
    });
  } catch (error) {
    console.error('Error fetching system default theme:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system default theme',
      message: '시스템 기본 테마를 불러오는 중 오류가 발생했습니다.' 
    });
  }
});

/**
 * POST /api/themes/system-default
 * 시스템 기본 테마 설정을 변경합니다
 */
router.post('/system-default', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { defaultTheme, customizationEnabled } = req.body;
    
    // 유효성 검사
    if (defaultTheme && typeof defaultTheme !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid default theme',
        message: '기본 테마 설정이 올바르지 않습니다.' 
      });
    }
    
    if (customizationEnabled !== undefined && typeof customizationEnabled !== 'boolean') {
      return res.status(400).json({ 
        error: 'Invalid customization setting',
        message: '커스터마이징 설정이 올바르지 않습니다.' 
      });
    }
    
    // 설정 저장
    const results: boolean[] = [];
    
    if (defaultTheme !== undefined) {
      results.push(await setSetting(THEME_SETTING_KEYS.SYSTEM_DEFAULT_THEME, defaultTheme));
    }
    
    if (customizationEnabled !== undefined) {
      results.push(await setSetting(THEME_SETTING_KEYS.THEME_CUSTOMIZATION_ENABLED, customizationEnabled));
    }
    
    if (results.some(result => !result)) {
      return res.status(500).json({ 
        error: 'Failed to save settings',
        message: '설정 저장 중 일부 오류가 발생했습니다.' 
      });
    }
    
    res.json({
      success: true,
      message: '시스템 테마 설정이 성공적으로 변경되었습니다.',
      settings: {
        defaultTheme: defaultTheme || await getSetting(THEME_SETTING_KEYS.SYSTEM_DEFAULT_THEME, 'system'),
        customizationEnabled: customizationEnabled !== undefined ? customizationEnabled : await getSetting(THEME_SETTING_KEYS.THEME_CUSTOMIZATION_ENABLED, true),
      },
    });
  } catch (error) {
    console.error('Error updating system default theme:', error);
    res.status(500).json({ 
      error: 'Failed to update system default theme',
      message: '시스템 기본 테마 변경 중 오류가 발생했습니다.' 
    });
  }
});

// =============================================================================
// 커스텀 테마 프리셋 관리 API (관리자 전용)
// =============================================================================

/**
 * POST /api/themes/presets
 * 커스텀 테마 프리셋을 추가하거나 수정합니다
 */
router.post('/presets', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { presetId, preset } = req.body;
    
    if (!presetId || !preset || typeof preset !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid preset data',
        message: '프리셋 데이터가 올바르지 않습니다.' 
      });
    }
    
    // 기존 커스텀 프리셋 가져오기
    const customPresets = await getSetting(THEME_SETTING_KEYS.THEME_PRESETS, {});
    
    // 새 프리셋 추가
    customPresets[presetId] = {
      ...preset,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    
    // 저장
    const success = await setSetting(THEME_SETTING_KEYS.THEME_PRESETS, customPresets);
    
    if (!success) {
      return res.status(500).json({ 
        error: 'Failed to save preset',
        message: '프리셋 저장 중 오류가 발생했습니다.' 
      });
    }
    
    res.json({
      success: true,
      message: `테마 프리셋 '${presetId}'가 성공적으로 저장되었습니다.`,
      preset: customPresets[presetId],
    });
  } catch (error) {
    console.error('Error saving theme preset:', error);
    res.status(500).json({ 
      error: 'Failed to save theme preset',
      message: '테마 프리셋 저장 중 오류가 발생했습니다.' 
    });
  }
});

/**
 * DELETE /api/themes/presets/:presetId
 * 커스텀 테마 프리셋을 삭제합니다
 */
router.delete('/presets/:presetId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { presetId } = req.params;
    
    // 기본 프리셋은 삭제할 수 없음
    if (presetId in DEFAULT_THEME_PRESETS) {
      return res.status(400).json({ 
        error: 'Cannot delete default preset',
        message: '기본 프리셋은 삭제할 수 없습니다.' 
      });
    }
    
    // 기존 커스텀 프리셋 가져오기
    const customPresets = await getSetting(THEME_SETTING_KEYS.THEME_PRESETS, {});
    
    if (!(presetId in customPresets)) {
      return res.status(404).json({ 
        error: 'Preset not found',
        message: '해당 프리셋을 찾을 수 없습니다.' 
      });
    }
    
    // 프리셋 삭제
    delete customPresets[presetId];
    
    // 저장
    const success = await setSetting(THEME_SETTING_KEYS.THEME_PRESETS, customPresets);
    
    if (!success) {
      return res.status(500).json({ 
        error: 'Failed to delete preset',
        message: '프리셋 삭제 중 오류가 발생했습니다.' 
      });
    }
    
    res.json({
      success: true,
      message: `테마 프리셋 '${presetId}'가 성공적으로 삭제되었습니다.`,
    });
  } catch (error) {
    console.error('Error deleting theme preset:', error);
    res.status(500).json({ 
      error: 'Failed to delete theme preset',
      message: '테마 프리셋 삭제 중 오류가 발생했습니다.' 
    });
  }
});

export default router;