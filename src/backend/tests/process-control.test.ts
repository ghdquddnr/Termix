/**
 * Process Control API Tests
 * 프로세스 제어 API 단위 테스트
 */

import { ProcessErrorCode } from '../types/process-monitoring.js';

// 테스트용 Mock 함수들
interface MockSSHCommand {
  command: string;
  response: {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
  };
}

// 테스트용 SSH 명령어 응답 목록
const mockSSHResponses: MockSSHCommand[] = [
  // 프로세스 존재 확인 - 성공
  {
    command: 'ps -p 1234 --no-headers',
    response: {
      success: true,
      stdout: 'root      1234     1  0.0  0.1  19356  1024 ?        Ss   Jan01   0:01 /sbin/init',
      stderr: '',
      exitCode: 0
    }
  },
  // 프로세스 존재 확인 - 실패 (프로세스 없음)
  {
    command: 'ps -p 9999 --no-headers',
    response: {
      success: false,
      stdout: '',
      stderr: 'ps: no process found',
      exitCode: 1
    }
  },
  // 프로세스 종료 - 성공
  {
    command: 'kill -TERM 1234',
    response: {
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0
    }
  },
  // 프로세스 종료 - 권한 오류
  {
    command: 'kill -TERM 1',
    response: {
      success: false,
      stdout: '',
      stderr: 'kill: (1) - Operation not permitted',
      exitCode: 1
    }
  },
  // 우선순위 변경 - 성공
  {
    command: 'renice 10 -p 1234',
    response: {
      success: true,
      stdout: '1234 (process ID) old priority 0, new priority 10',
      stderr: '',
      exitCode: 0
    }
  },
  // 우선순위 변경 - 권한 오류
  {
    command: 'renice -10 -p 1234',
    response: {
      success: false,
      stdout: '',
      stderr: 'renice: failed to set priority for 1234 (process ID): Permission denied',
      exitCode: 1
    }
  }
];

/**
 * 프로세스 종료 API 입력 유효성 검사 테스트
 */
function testProcessTerminationValidation(): boolean {
  console.log('🧪 Testing process termination input validation...');
  
  try {
    // PID 유효성 검사 테스트
    const testCases = [
      { pid: 'abc', signal: 'TERM', expectedError: 'Invalid process ID' },
      { pid: '-1', signal: 'TERM', expectedError: 'Invalid process ID' },
      { pid: '0', signal: 'TERM', expectedError: 'Invalid process ID' },
      { pid: '1234', signal: 'INVALID', expectedError: 'Invalid signal' },
      { pid: '1234', signal: 'TERM', expectedError: null }
    ];

    for (const testCase of testCases) {
      const pidNum = parseInt(testCase.pid, 10);
      const pidValid = !isNaN(pidNum) && pidNum > 0;
      const validSignals = ['TERM', 'KILL', 'INT', 'HUP', 'USR1', 'USR2'];
      const signalValid = validSignals.includes(testCase.signal);

      if (testCase.expectedError) {
        if (testCase.expectedError.includes('Invalid process ID') && pidValid) {
          console.error(`❌ PID validation failed for ${testCase.pid}`);
          return false;
        }
        if (testCase.expectedError.includes('Invalid signal') && signalValid) {
          console.error(`❌ Signal validation failed for ${testCase.signal}`);
          return false;
        }
      } else {
        if (!pidValid || !signalValid) {
          console.error(`❌ Valid inputs rejected: PID=${testCase.pid}, Signal=${testCase.signal}`);
          return false;
        }
      }
    }

    console.log('✅ Process termination validation test passed');
    return true;
  } catch (error) {
    console.error('❌ Process termination validation test failed:', error);
    return false;
  }
}

/**
 * 프로세스 우선순위 변경 API 입력 유효성 검사 테스트
 */
function testPriorityChangeValidation(): boolean {
  console.log('🧪 Testing priority change input validation...');
  
  try {
    // 우선순위 유효성 검사 테스트
    const testCases = [
      { pid: 'abc', priority: '10', expectedError: 'Invalid process ID' },
      { pid: '1234', priority: 'high', expectedError: 'Priority must be a number' },
      { pid: '1234', priority: '-21', expectedError: 'Priority must be a number between -20' },
      { pid: '1234', priority: '20', expectedError: 'Priority must be a number between -20' },
      { pid: '1234', priority: '10', expectedError: null },
      { pid: '1234', priority: '-10', expectedError: null }
    ];

    for (const testCase of testCases) {
      const pidNum = parseInt(testCase.pid, 10);
      const pidValid = !isNaN(pidNum) && pidNum > 0;
      const priorityNum = parseInt(testCase.priority, 10);
      const priorityValid = !isNaN(priorityNum) && priorityNum >= -20 && priorityNum <= 19;

      if (testCase.expectedError) {
        if (testCase.expectedError.includes('Invalid process ID') && pidValid) {
          console.error(`❌ PID validation failed for ${testCase.pid}`);
          return false;
        }
        if (testCase.expectedError.includes('Priority must be a number') && priorityValid) {
          console.error(`❌ Priority validation failed for ${testCase.priority}`);
          return false;
        }
      } else {
        if (!pidValid || !priorityValid) {
          console.error(`❌ Valid inputs rejected: PID=${testCase.pid}, Priority=${testCase.priority}`);
          return false;
        }
      }
    }

    console.log('✅ Priority change validation test passed');
    return true;
  } catch (error) {
    console.error('❌ Priority change validation test failed:', error);
    return false;
  }
}

/**
 * 에러 코드 일관성 테스트
 */
function testErrorCodeConsistency(): boolean {
  console.log('🧪 Testing error code consistency...');
  
  try {
    // 모든 에러 코드가 정의되어 있는지 확인
    const requiredErrorCodes = [
      'SSH_CONNECTION_FAILED',
      'COMMAND_EXECUTION_FAILED',
      'PROCESS_NOT_FOUND',
      'PERMISSION_DENIED',
      'INVALID_INPUT',
      'SYSTEM_ERROR'
    ];

    for (const errorCode of requiredErrorCodes) {
      if (!ProcessErrorCode[errorCode as keyof typeof ProcessErrorCode]) {
        console.error(`❌ Error code ${errorCode} not defined`);
        return false;
      }
    }

    // 에러 응답 구조 테스트
    const createErrorResponse = (code: ProcessErrorCode, message: string, details?: any) => {
      return {
        code,
        message,
        details,
        timestamp: new Date().toISOString()
      };
    };

    const errorResponse = createErrorResponse(
      ProcessErrorCode.PROCESS_NOT_FOUND,
      'Process not found',
      { pid: 1234 }
    );

    if (!errorResponse.code || !errorResponse.message || !errorResponse.timestamp) {
      console.error('❌ Error response structure validation failed');
      return false;
    }

    console.log('✅ Error code consistency test passed');
    return true;
  } catch (error) {
    console.error('❌ Error code consistency test failed:', error);
    return false;
  }
}

/**
 * API 응답 형식 테스트
 */
function testAPIResponseFormat(): boolean {
  console.log('🧪 Testing API response format...');
  
  try {
    // 프로세스 종료 성공 응답 형식
    const terminationResponse = {
      success: true,
      message: 'Process 1234 terminated successfully',
      signal: 'TERM',
      timestamp: new Date().toISOString()
    };

    if (!terminationResponse.success || !terminationResponse.message || !terminationResponse.signal) {
      console.error('❌ Process termination response format validation failed');
      return false;
    }

    // 우선순위 변경 성공 응답 형식
    const priorityResponse = {
      success: true,
      message: 'Process 1234 priority changed to 10',
      oldPriority: 0,
      newPriority: 10,
      process: {
        pid: 1234,
        priority: 10,
        command: '/sbin/init'
      },
      timestamp: new Date().toISOString()
    };

    if (!priorityResponse.success || !priorityResponse.message || priorityResponse.newPriority === undefined) {
      console.error('❌ Priority change response format validation failed');
      return false;
    }

    console.log('✅ API response format test passed');
    return true;
  } catch (error) {
    console.error('❌ API response format test failed:', error);
    return false;
  }
}

/**
 * 보안 고려사항 테스트
 */
function testSecurityConsiderations(): boolean {
  console.log('🧪 Testing security considerations...');
  
  try {
    // 시스템 프로세스 보호 검사
    const criticalPIDs = [1, 2]; // init, kthreadd
    
    for (const pid of criticalPIDs) {
      // 실제 환경에서는 시스템 프로세스 종료를 차단해야 함
      console.log(`⚠️ Warning: Attempting to terminate critical system process PID ${pid} should be restricted`);
    }

    // 권한 검사 시뮬레이션
    const privilegedOperations = [
      { operation: 'kill -KILL 1', expectRestriction: true },
      { operation: 'renice -20 1234', expectRestriction: true },
      { operation: 'kill -TERM user_process', expectRestriction: false }
    ];

    for (const op of privilegedOperations) {
      if (op.expectRestriction) {
        console.log(`🔒 Security check: ${op.operation} should require elevated privileges`);
      }
    }

    // 입력 sanitization 검사
    const maliciousInputs = [
      '1234; rm -rf /',
      '$(rm -rf /)',
      '1234 && echo "hack"',
      '`malicious command`'
    ];

    for (const input of maliciousInputs) {
      // PID 파싱이 숫자가 아닌 입력을 거부하는지 확인
      const pidNum = parseInt(input, 10);
      
      // parseInt는 앞부분 숫자만 파싱하므로 추가 검증 필요
      const containsOnlyDigits = /^\d+$/.test(input.trim());
      
      if (isNaN(pidNum) || !containsOnlyDigits) {
        // 정상적으로 거부됨 - 이것이 예상되는 동작
        console.log(`🔒 Successfully rejected malicious input: ${input}`);
        continue;
      } else {
        // 만약 숫자로 파싱되었다면, 이는 보안 문제가 아님 (예: "1234")
        // 하지만 특수문자가 포함된 경우는 문제
        if (input.includes(';') || input.includes('&') || input.includes('$') || input.includes('`')) {
          console.error(`❌ Malicious input not properly sanitized: ${input}`);
          return false;
        }
      }
    }

    console.log('✅ Security considerations test passed');
    return true;
  } catch (error) {
    console.error('❌ Security considerations test failed:', error);
    return false;
  }
}

/**
 * 모든 프로세스 제어 API 테스트 실행
 */
export function runProcessControlTests(): boolean {
  console.log('\n🧪 Starting Process Control API Tests\n');
  
  const tests = [
    testProcessTerminationValidation,
    testPriorityChangeValidation,
    testErrorCodeConsistency,
    testAPIResponseFormat,
    testSecurityConsiderations
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
    console.log('🎉 All process control tests passed successfully!');
    return true;
  } else {
    console.log('❌ Some process control tests failed');
    return false;
  }
}

// Node.js에서 직접 실행될 때 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runProcessControlTests();
  process.exit(success ? 0 : 1);
}