/**
 * Process Monitoring API Tests
 * 프로세스 모니터링 API 기본 테스트
 */

import { parsePsAuxOutput, parseSystemInfo } from '../utils/process-parser.js';
import { ProcessState } from '../types/process-monitoring.js';

// 테스트용 ps aux 출력 샘플
const samplePsAuxOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  19356  1024 ?        Ss   Jan01   0:01 /sbin/init
root         2  0.0  0.0      0     0 ?        S    Jan01   0:00 [kthreadd]
root         3  0.0  0.0      0     0 ?        I<   Jan01   0:00 [rcu_gp]
www-data  1234  2.5  1.5 123456  4096 ?        S    12:00   1:23 /usr/bin/node server.js
mysql     5678  1.0  5.2 567890 16384 ?        Sl   10:30   5:45 /usr/sbin/mysqld
user      9999  0.1  0.5  45678  2048 pts/1    R+   13:45   0:05 ps aux`;

// 테스트용 시스템 정보 샘플
const sampleUptimeOutput = `13:45:23 up 10 days, 2:30, 3 users, load average: 0.50, 0.65, 0.80`;
const sampleMeminfoOutput = `MemTotal:        4048576 kB
MemFree:         1024000 kB
MemAvailable:    2048000 kB
Buffers:          256000 kB
Cached:           512000 kB`;
const sampleLoadavgOutput = `0.50 0.65 0.80 2/123 9999`;
const sampleCpuCountOutput = `4`;

/**
 * ps aux 파싱 테스트
 */
function testPsAuxParsing(): boolean {
  console.log('🧪 Testing ps aux parsing...');
  
  try {
    const processes = parsePsAuxOutput(samplePsAuxOutput);
    
    // 기본 검증
    if (processes.length !== 6) {
      console.error(`❌ Expected 6 processes, got ${processes.length}`);
      return false;
    }
    
    // 첫 번째 프로세스 (init) 검증
    const initProcess = processes[0];
    if (initProcess.pid !== 1 || initProcess.user !== 'root' || initProcess.command !== '/sbin/init') {
      console.error('❌ Init process parsing failed');
      console.log('Expected: PID=1, user=root, command=/sbin/init');
      console.log(`Got: PID=${initProcess.pid}, user=${initProcess.user}, command=${initProcess.command}`);
      return false;
    }
    
    // 커널 스레드 검증
    const kernelThread = processes.find(p => p.command === '[kthreadd]');
    if (!kernelThread || kernelThread.state !== ProcessState.Sleeping) {
      console.error('❌ Kernel thread parsing failed');
      return false;
    }
    
    // 실행 중인 프로세스 검증
    const runningProcess = processes.find(p => p.state === ProcessState.Running);
    if (!runningProcess || runningProcess.command !== 'ps') {
      console.error('❌ Running process parsing failed');
      return false;
    }
    
    // MySQL 프로세스 검증 (높은 메모리 사용률)
    const mysqlProcess = processes.find(p => p.user === 'mysql');
    if (!mysqlProcess || mysqlProcess.memoryPercent !== 5.2) {
      console.error('❌ MySQL process parsing failed');
      return false;
    }
    
    console.log('✅ ps aux parsing test passed');
    return true;
  } catch (error) {
    console.error('❌ ps aux parsing test failed:', error);
    return false;
  }
}

/**
 * 시스템 정보 파싱 테스트
 */
function testSystemInfoParsing(): boolean {
  console.log('🧪 Testing system info parsing...');
  
  try {
    const systemInfo = parseSystemInfo(
      sampleUptimeOutput,
      sampleMeminfoOutput,
      sampleLoadavgOutput,
      sampleCpuCountOutput
    );
    
    // 메모리 정보 검증
    if (systemInfo.totalMemoryKB !== 4048576) {
      console.error(`❌ Total memory parsing failed: expected 4048576, got ${systemInfo.totalMemoryKB}`);
      return false;
    }
    
    if (systemInfo.freeMemoryKB !== 2048000) {
      console.error(`❌ Free memory parsing failed: expected 2048000, got ${systemInfo.freeMemoryKB}`);
      return false;
    }
    
    // 로드 평균 검증
    const expectedLoadAvg = [0.50, 0.65, 0.80];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(systemInfo.loadAverage[i] - expectedLoadAvg[i]) > 0.01) {
        console.error(`❌ Load average parsing failed at index ${i}: expected ${expectedLoadAvg[i]}, got ${systemInfo.loadAverage[i]}`);
        return false;
      }
    }
    
    // CPU 코어 수 검증
    if (systemInfo.cpuCount !== 4) {
      console.error(`❌ CPU count parsing failed: expected 4, got ${systemInfo.cpuCount}`);
      return false;
    }
    
    console.log('✅ System info parsing test passed');
    return true;
  } catch (error) {
    console.error('❌ System info parsing test failed:', error);
    return false;
  }
}

/**
 * 에러 케이스 테스트
 */
function testErrorCases(): boolean {
  console.log('🧪 Testing error cases...');
  
  try {
    // 빈 출력 테스트
    const emptyResult = parsePsAuxOutput('');
    if (emptyResult.length !== 0) {
      console.error('❌ Empty output should return empty array');
      return false;
    }
    
    // 헤더만 있는 출력 테스트
    const headerOnlyResult = parsePsAuxOutput('USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND');
    if (headerOnlyResult.length !== 0) {
      console.error('❌ Header-only output should return empty array');
      return false;
    }
    
    // 잘못된 형식 라인 포함 테스트
    const invalidLineOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  19356  1024 ?        Ss   Jan01   0:01 /sbin/init
invalid line that should be skipped
root         2  0.0  0.0      0     0 ?        S    Jan01   0:00 [kthreadd]`;
    
    const invalidResult = parsePsAuxOutput(invalidLineOutput);
    if (invalidResult.length !== 2) {
      console.error(`❌ Invalid line handling failed: expected 2 processes, got ${invalidResult.length}`);
      return false;
    }
    
    console.log('✅ Error cases test passed');
    return true;
  } catch (error) {
    console.error('❌ Error cases test failed:', error);
    return false;
  }
}

/**
 * 성능 테스트 (큰 데이터셋)
 */
function testPerformance(): boolean {
  console.log('🧪 Testing performance with large dataset...');
  
  try {
    // 1000개 프로세스 시뮬레이션
    const largeOutput = ['USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND'];
    
    for (let i = 1; i <= 1000; i++) {
      const pid = i;
      const cpu = (Math.random() * 100).toFixed(1);
      const mem = (Math.random() * 10).toFixed(1);
      const vsz = Math.floor(Math.random() * 1000000);
      const rss = Math.floor(Math.random() * 100000);
      const user = i % 3 === 0 ? 'root' : i % 3 === 1 ? 'www-data' : 'user';
      const command = i % 5 === 0 ? '[kernel_thread]' : `/usr/bin/process_${i}`;
      
      largeOutput.push(
        `${user.padEnd(10)} ${pid.toString().padStart(5)} ${cpu.padStart(4)} ${mem.padStart(4)} ${vsz.toString().padStart(8)} ${rss.toString().padStart(6)} ?        S    Jan01   0:01 ${command}`
      );
    }
    
    const startTime = Date.now();
    const processes = parsePsAuxOutput(largeOutput.join('\n'));
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    
    if (processes.length !== 1000) {
      console.error(`❌ Performance test failed: expected 1000 processes, got ${processes.length}`);
      return false;
    }
    
    if (duration > 100) { // 100ms 이하여야 함
      console.warn(`⚠️ Performance warning: parsing took ${duration}ms (should be < 100ms)`);
    }
    
    console.log(`✅ Performance test passed: parsed 1000 processes in ${duration}ms`);
    return true;
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
}

/**
 * 모든 테스트 실행
 */
export function runProcessMonitoringTests(): boolean {
  console.log('\n🧪 Starting Process Monitoring API Tests\n');
  
  const tests = [
    testPsAuxParsing,
    testSystemInfoParsing,
    testErrorCases,
    testPerformance
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      if (test()) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ Test failed with exception:`, error);
    }
    console.log(''); // 빈 줄 추가
  }
  
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed successfully!');
    return true;
  } else {
    console.log('❌ Some tests failed');
    return false;
  }
}

// Node.js에서 직접 실행될 때 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runProcessMonitoringTests();
  process.exit(success ? 0 : 1);
}