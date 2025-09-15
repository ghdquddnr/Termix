/**
 * Logs backend utils tests
 */

import { parseFindStatOutput, parseGrepOutput, lineMatchesLevel } from '../utils/log-parser.js';

function testParseFindStatOutput(): boolean {
  const sample = `1024|1700000000|/var/log/syslog\n2048|1700000100|/var/log/nginx/access.log\n`;
  const result = parseFindStatOutput(sample);
  if (result.length !== 2) return false;
  if (result[0].path !== '/var/log/syslog') return false;
  if (result[0].sizeBytes !== 1024) return false;
  if (!result[0].modifiedAt.startsWith('202')) return false; // ISO string
  if (result[1].name !== 'access.log') return false;
  return true;
}

function testParseGrepOutput(): boolean {
  const sample = `/var/log/syslog:12:INFO server started\n/var/log/syslog:34:ERROR failure occurred\n`;
  const result = parseGrepOutput(sample);
  if (result.length !== 2) return false;
  if (result[0].file !== '/var/log/syslog') return false;
  if (result[0].line !== 12) return false;
  if (!result[1].text.includes('ERROR')) return false;
  return true;
}

function testLineMatchesLevel(): boolean {
  const line1 = '2024-01-01 00:00:00 [INFO] started';
  const line2 = 'WARN config missing';
  const line3 = 'trace detail';
  if (!lineMatchesLevel(line1, ['INFO'])) return false;
  if (!lineMatchesLevel(line2, ['WARN'])) return false;
  if (lineMatchesLevel(line3, ['ERROR'])) return false;
  return true;
}

function run(): void {
  const tests = [
    ['parseFindStatOutput', testParseFindStatOutput],
    ['parseGrepOutput', testParseGrepOutput],
    ['lineMatchesLevel', testLineMatchesLevel],
  ] as const;

  let passed = 0;
  for (const [name, fn] of tests) {
    try {
      const ok = fn();
      // eslint-disable-next-line no-console
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) passed++;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`❌ ${name} threw`, e);
    }
  }

  if (passed !== tests.length) {
    process.exit(1);
  }
}

run();

