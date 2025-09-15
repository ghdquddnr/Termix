/**
 * Logs utils JS test (uses built files in dist)
 */

const path = require('path');
const { parseFindStatOutput, parseGrepOutput, lineMatchesLevel } = require(path.resolve(__dirname, '../../../dist/backend/utils/log-parser.js'));

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function testParseFindStatOutput() {
  const sample = `1024|1700000000|/var/log/syslog\n2048|1700000100|/var/log/nginx/access.log\n`;
  const result = parseFindStatOutput(sample);
  assert(result.length === 2, 'length');
  assert(result[0].path === '/var/log/syslog', 'path');
  assert(result[0].sizeBytes === 1024, 'size');
  assert(typeof result[0].modifiedAt === 'string', 'mtime');
  assert(result[1].name === 'access.log', 'name');
}

function testParseGrepOutput() {
  const sample = `/var/log/syslog:12:INFO server started\n/var/log/syslog:34:ERROR failure occurred\n`;
  const result = parseGrepOutput(sample);
  assert(result.length === 2, 'grep length');
  assert(result[0].file === '/var/log/syslog', 'grep file');
  assert(result[0].line === 12, 'grep line');
  assert(result[1].text.includes('ERROR'), 'grep text');
}

function testLineMatchesLevel() {
  const line1 = '2024-01-01 00:00:00 [INFO] started';
  const line2 = 'WARN config missing';
  const line3 = 'trace detail';
  assert(lineMatchesLevel(line1, ['INFO']), 'level1');
  assert(lineMatchesLevel(line2, ['WARN']), 'level2');
  assert(!lineMatchesLevel(line3, ['ERROR']), 'level3');
}

function run() {
  const tests = [
    ['parseFindStatOutput', testParseFindStatOutput],
    ['parseGrepOutput', testParseGrepOutput],
    ['lineMatchesLevel', testLineMatchesLevel],
  ];
  let passed = 0;
  for (const [name, fn] of tests) {
    try { fn(); console.log(`✅ ${name}`); passed++; }
    catch (e) { console.error(`❌ ${name}`, e); }
  }
  if (passed !== tests.length) process.exit(1);
}

run();

