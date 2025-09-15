/**
 * Log parsing and filtering utilities
 */

export type LogFileInfo = {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  name: string;
};

export function parseFindStatOutput(output: string): LogFileInfo[] {
  // Expected format per line: size|mtime|path
  const lines = output.split(/\r?\n/).filter(Boolean);
  const result: LogFileInfo[] = [];
  for (const line of lines) {
    const [sizeStr, mtimeStr, ...pathParts] = line.split('|');
    if (!sizeStr || !mtimeStr || pathParts.length === 0) continue;
    const path = pathParts.join('|');
    const size = parseInt(sizeStr, 10);
    if (Number.isNaN(size)) continue;
    const name = path.split('/').pop() || path;
    result.push({
      path,
      sizeBytes: size,
      modifiedAt: new Date(parseInt(mtimeStr, 10) * 1000).toISOString(),
      name,
    });
  }
  return result;
}

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export function lineMatchesLevel(line: string, levels: LogLevel[] = []): boolean {
  if (!levels.length) return true;
  const upper = line.toUpperCase();
  return levels.some(lvl => upper.includes(`[${lvl}]`) || upper.includes(` ${lvl} `) || upper.startsWith(`${lvl}:`) || upper.includes(`${lvl}/`));
}

export type GrepMatch = {
  file: string;
  line: number;
  text: string;
};

export function parseGrepOutput(output: string): GrepMatch[] {
  // grep -nH outputs: file:line:text
  const lines = output.split(/\r?\n/).filter(Boolean);
  const result: GrepMatch[] = [];
  for (const line of lines) {
    const firstColon = line.indexOf(':');
    const secondColon = firstColon >= 0 ? line.indexOf(':', firstColon + 1) : -1;
    if (firstColon <= 0 || secondColon <= firstColon) continue;
    const file = line.slice(0, firstColon);
    const lineNum = parseInt(line.slice(firstColon + 1, secondColon), 10);
    const text = line.slice(secondColon + 1);
    if (!Number.isNaN(lineNum)) {
      result.push({ file, line: lineNum, text });
    }
  }
  return result;
}

