/**
 * CodeMirror 에디터 테마 설정
 * 애플리케이션 테마와 연동되는 코드 에디터 컬러 스키마
 */

import { EditorView } from '@codemirror/view';

/**
 * 다크 테마 CodeMirror 스타일
 */
export const darkCodeMirrorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'hsl(var(--background)) !important',
    color: 'hsl(var(--foreground))',
  },
  '.cm-content': {
    padding: '16px',
    caretColor: 'hsl(var(--foreground))',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--muted)) !important',
    color: 'hsl(var(--muted-foreground))',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'hsl(var(--accent))',
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(var(--accent) / 0.1)',
  },
  '.cm-lineNumbers': {
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-cursor': {
    borderLeftColor: 'hsl(var(--foreground))',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'hsl(var(--primary) / 0.2) !important',
  },
  '.cm-focused .cm-selectionBackground': {
    backgroundColor: 'hsl(var(--primary) / 0.3) !important',
  },
  '.cm-searchMatch': {
    backgroundColor: 'hsl(var(--secondary))',
    outline: '1px solid hsl(var(--border))',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'hsl(var(--primary))',
  },
  '.cm-tooltip': {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
    color: 'hsl(var(--popover-foreground))',
  },
  '.cm-completionLabel': {
    color: 'hsl(var(--foreground))',
  },
  '.cm-completionDetail': {
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-foldGutter': {
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--muted-foreground))',
  },
}, { dark: true });

/**
 * 라이트 테마 CodeMirror 스타일
 */
export const lightCodeMirrorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'hsl(var(--background)) !important',
    color: 'hsl(var(--foreground))',
  },
  '.cm-content': {
    padding: '16px',
    caretColor: 'hsl(var(--foreground))',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--muted)) !important',
    color: 'hsl(var(--muted-foreground))',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'hsl(var(--accent))',
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(var(--accent) / 0.1)',
  },
  '.cm-lineNumbers': {
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-cursor': {
    borderLeftColor: 'hsl(var(--foreground))',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'hsl(var(--primary) / 0.2) !important',
  },
  '.cm-focused .cm-selectionBackground': {
    backgroundColor: 'hsl(var(--primary) / 0.3) !important',
  },
  '.cm-searchMatch': {
    backgroundColor: 'hsl(var(--secondary))',
    outline: '1px solid hsl(var(--border))',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'hsl(var(--primary))',
  },
  '.cm-tooltip': {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
    color: 'hsl(var(--popover-foreground))',
  },
  '.cm-completionLabel': {
    color: 'hsl(var(--foreground))',
  },
  '.cm-completionDetail': {
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-foldGutter': {
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--muted-foreground))',
  },
}, { dark: false });

/**
 * 애플리케이션 테마에 따른 CodeMirror 테마 반환
 */
export function getCodeMirrorTheme(resolvedTheme: 'light' | 'dark') {
  return resolvedTheme === 'dark' ? darkCodeMirrorTheme : lightCodeMirrorTheme;
}