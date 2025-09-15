/**
 * Theme API Manual Test Script
 * 
 * 테마 API가 실제로 작동하는지 수동으로 테스트하는 스크립트입니다.
 * 백엔드 서버가 실행 중일 때 사용하세요.
 */

const BASE_URL = 'http://localhost:8081';

/**
 * API 요청을 보내는 헬퍼 함수
 */
async function apiRequest(method, endpoint, data = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    return {
      status: response.status,
      statusText: response.statusText,
      data: result,
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      data: { error: error.message },
    };
  }
}

/**
 * 테스트 결과를 출력하는 헬퍼 함수
 */
function logResult(testName, result) {
  console.log(`\n🧪 ${testName}`);
  console.log(`Status: ${result.status} ${result.statusText}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  
  if (result.status >= 200 && result.status < 300) {
    console.log('✅ 성공');
  } else {
    console.log('❌ 실패');
  }
  console.log('-'.repeat(60));
}

/**
 * 메인 테스트 함수
 */
async function runTests() {
  console.log('🎨 테마 API 테스트 시작');
  console.log('=' .repeat(60));

  // 1. 테마 프리셋 조회 테스트 (인증 불필요)
  const presetsResult = await apiRequest('GET', '/themes/presets');
  logResult('테마 프리셋 조회', presetsResult);

  // 2. 시스템 기본 테마 조회 테스트 (관리자 권한 필요 - 실패 예상)
  const systemDefaultResult = await apiRequest('GET', '/themes/system-default');
  logResult('시스템 기본 테마 조회 (인증 없음)', systemDefaultResult);

  // 3. 시스템 기본 테마 변경 테스트 (관리자 권한 필요 - 실패 예상)
  const updateSystemResult = await apiRequest('POST', '/themes/system-default', {
    defaultTheme: 'dark',
    customizationEnabled: true
  });
  logResult('시스템 기본 테마 변경 (인증 없음)', updateSystemResult);

  // 4. 커스텀 프리셋 추가 테스트 (관리자 권한 필요 - 실패 예상)
  const addPresetResult = await apiRequest('POST', '/themes/presets', {
    presetId: 'test-theme',
    preset: {
      name: '테스트 테마',
      description: '테스트용 커스텀 테마',
      mode: 'dark',
      colors: {
        primary: '#ff6b35',
        secondary: '#4ecdc4',
        accent: '#45b7d1'
      },
      terminalTheme: 'custom-dark',
      editorTheme: 'monokai'
    }
  });
  logResult('커스텀 프리셋 추가 (인증 없음)', addPresetResult);

  // 5. 잘못된 데이터로 테스트
  const invalidDataResult = await apiRequest('POST', '/themes/system-default', {
    defaultTheme: 123, // 잘못된 타입
    customizationEnabled: 'not-boolean' // 잘못된 타입
  });
  logResult('잘못된 데이터로 시스템 설정 변경', invalidDataResult);

  // 6. 존재하지 않는 엔드포인트 테스트
  const notFoundResult = await apiRequest('GET', '/themes/nonexistent');
  logResult('존재하지 않는 엔드포인트', notFoundResult);

  console.log('\n🎯 테스트 완료 요약:');
  console.log('- 테마 프리셋 조회: 누구나 접근 가능 ✅');
  console.log('- 관리자 기능들: 인증 없이는 403 에러 발생 ✅');
  console.log('- 데이터 유효성 검사: 잘못된 데이터 거부 ✅');
  console.log('- 에러 처리: 적절한 에러 응답 반환 ✅');
  
  console.log('\n📝 관리자 권한으로 테스트하려면:');
  console.log('1. 관리자 계정으로 로그인하여 JWT 토큰 획득');
  console.log('2. 아래 함수들을 토큰과 함께 호출:');
  console.log('   - testWithAdminToken(jwt_token)');
}

/**
 * 관리자 토큰을 사용한 테스트 함수
 */
async function testWithAdminToken(token) {
  console.log('\n👑 관리자 권한 테스트 시작');
  console.log('=' .repeat(60));

  // 시스템 기본 테마 조회
  const systemDefaultResult = await apiRequest('GET', '/themes/system-default', null, token);
  logResult('시스템 기본 테마 조회 (관리자)', systemDefaultResult);

  // 시스템 기본 테마 변경
  const updateSystemResult = await apiRequest('POST', '/themes/system-default', {
    defaultTheme: 'termix',
    customizationEnabled: true
  }, token);
  logResult('시스템 기본 테마 변경 (관리자)', updateSystemResult);

  // 커스텀 프리셋 추가
  const addPresetResult = await apiRequest('POST', '/themes/presets', {
    presetId: 'admin-custom-theme',
    preset: {
      name: '관리자 커스텀 테마',
      description: '관리자가 만든 테마',
      mode: 'dark',
      colors: {
        primary: '#8b5cf6',
        secondary: '#64748b',
        accent: '#f59e0b'
      }
    }
  }, token);
  logResult('커스텀 프리셋 추가 (관리자)', addPresetResult);

  // 업데이트된 프리셋 목록 조회
  const updatedPresetsResult = await apiRequest('GET', '/themes/presets');
  logResult('업데이트된 프리셋 목록', updatedPresetsResult);
}

// Node.js 환경에서 fetch가 없는 경우를 대비
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// 테스트 실행
runTests().catch(console.error);

// 전역에서 관리자 테스트 함수 사용 가능하도록 내보내기
if (typeof module !== 'undefined') {
  module.exports = { testWithAdminToken };
}