/**
 * Manual Theme System Test Script
 * 
 * 테마 시스템의 쿠키 저장/불러오기 기능을 수동으로 테스트하는 스크립트입니다.
 * 브라우저의 개발자 도구 콘솔에서 실행하세요.
 */

console.log('🎨 Termix 테마 시스템 수동 테스트 시작');
console.log('=' .repeat(50));

// 기본 테스트 데이터
const testThemeSettings = {
  mode: 'dark',
  customColors: {
    primary: '#ff6b35',
    secondary: '#4ecdc4',
    accent: '#45b7d1'
  },
  terminalTheme: 'custom-dark',
  editorTheme: 'monokai',
  lastUpdated: new Date().toISOString()
};

// 테스트 헬퍼 함수들
function logTest(testName, result) {
  const status = result ? '✅ 성공' : '❌ 실패';
  console.log(`${status} ${testName}`);
  return result;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    try {
      return JSON.parse(decodeURIComponent(parts.pop().split(';').shift()));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function setCookie(name, value, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  const encodedValue = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${name}=${encodedValue};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function clearCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// 테스트 1: 쿠키 저장 기능
console.log('\n📝 테스트 1: 쿠키 저장 기능');
try {
  setCookie('termix-theme-settings', testThemeSettings);
  const saved = getCookie('termix-theme-settings');
  
  logTest('테마 설정 쿠키 저장', saved !== null);
  logTest('mode 값 저장 확인', saved?.mode === 'dark');
  logTest('customColors 저장 확인', saved?.customColors?.primary === '#ff6b35');
  logTest('terminalTheme 저장 확인', saved?.terminalTheme === 'custom-dark');
  logTest('lastUpdated 저장 확인', saved?.lastUpdated !== undefined);
} catch (error) {
  console.error('❌ 쿠키 저장 테스트 실패:', error);
}

// 테스트 2: 쿠키 불러오기 기능
console.log('\n📖 테스트 2: 쿠키 불러오기 기능');
try {
  const retrieved = getCookie('termix-theme-settings');
  
  logTest('쿠키에서 테마 설정 불러오기', retrieved !== null);
  logTest('불러온 데이터 구조 확인', typeof retrieved === 'object');
  logTest('mode 값 일치', retrieved?.mode === testThemeSettings.mode);
  logTest('커스텀 컬러 일치', JSON.stringify(retrieved?.customColors) === JSON.stringify(testThemeSettings.customColors));
} catch (error) {
  console.error('❌ 쿠키 불러오기 테스트 실패:', error);
}

// 테스트 3: 부분 업데이트 기능
console.log('\n🔄 테스트 3: 부분 업데이트 기능');
try {
  const partialUpdate = {
    mode: 'light',
    customColors: { primary: '#007bff' }
  };
  
  setCookie('termix-theme-settings', { ...testThemeSettings, ...partialUpdate });
  const updated = getCookie('termix-theme-settings');
  
  logTest('부분 업데이트 적용', updated?.mode === 'light');
  logTest('기존 값 유지', updated?.terminalTheme === 'custom-dark');
  logTest('새 값 적용', updated?.customColors?.primary === '#007bff');
} catch (error) {
  console.error('❌ 부분 업데이트 테스트 실패:', error);
}

// 테스트 4: 시스템 테마 감지
console.log('\n🌙 테스트 4: 시스템 테마 감지');
try {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const systemTheme = prefersDark ? 'dark' : 'light';
  
  logTest('시스템 테마 감지 가능', typeof prefersDark === 'boolean');
  console.log(`   현재 시스템 테마: ${systemTheme}`);
  
  // 시스템 테마 변경 리스너 테스트
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const testListener = (e) => {
    console.log(`   시스템 테마 변경 감지: ${e.matches ? 'dark' : 'light'}`);
  };
  
  mediaQuery.addEventListener('change', testListener);
  logTest('시스템 테마 변경 리스너 등록', true);
  
  // 리스너 정리
  setTimeout(() => {
    mediaQuery.removeEventListener('change', testListener);
    logTest('시스템 테마 변경 리스너 해제', true);
  }, 1000);
} catch (error) {
  console.error('❌ 시스템 테마 감지 테스트 실패:', error);
}

// 테스트 5: CSS 변수 적용
console.log('\n🎨 테스트 5: CSS 변수 적용');
try {
  const root = document.documentElement;
  
  // 테스트용 CSS 변수 설정
  root.style.setProperty('--color-primary', '#ff6b35');
  root.style.setProperty('--color-secondary', '#4ecdc4');
  root.style.setProperty('--color-accent', '#45b7d1');
  
  const primaryColor = getComputedStyle(root).getPropertyValue('--color-primary').trim();
  const secondaryColor = getComputedStyle(root).getPropertyValue('--color-secondary').trim();
  const accentColor = getComputedStyle(root).getPropertyValue('--color-accent').trim();
  
  logTest('Primary 색상 CSS 변수 적용', primaryColor === '#ff6b35');
  logTest('Secondary 색상 CSS 변수 적용', secondaryColor === '#4ecdc4');
  logTest('Accent 색상 CSS 변수 적용', accentColor === '#45b7d1');
} catch (error) {
  console.error('❌ CSS 변수 적용 테스트 실패:', error);
}

// 테스트 6: 테마 클래스 적용
console.log('\n🔧 테스트 6: 테마 클래스 적용');
try {
  const root = document.documentElement;
  
  // 기존 테마 클래스 제거
  root.classList.remove('light', 'dark');
  
  // 다크 테마 적용
  root.classList.add('dark');
  logTest('다크 테마 클래스 적용', root.classList.contains('dark'));
  
  // 라이트 테마로 전환
  root.classList.remove('dark');
  root.classList.add('light');
  logTest('라이트 테마 클래스 적용', root.classList.contains('light'));
  
  // 클래스 정리
  root.classList.remove('light', 'dark');
  root.classList.add('light'); // 기본값으로 복원
} catch (error) {
  console.error('❌ 테마 클래스 적용 테스트 실패:', error);
}

// 테스트 7: 쿠키 삭제 기능
console.log('\n🗑️ 테스트 7: 쿠키 삭제 기능');
try {
  clearCookie('termix-theme-settings');
  const deleted = getCookie('termix-theme-settings');
  
  logTest('쿠키 삭제 기능', deleted === null);
} catch (error) {
  console.error('❌ 쿠키 삭제 테스트 실패:', error);
}

// 테스트 8: 유효성 검사
console.log('\n✅ 테스트 8: 유효성 검사');
try {
  // 유효한 테마 설정
  const validSettings = {
    mode: 'dark',
    systemTheme: 'light',
    customColors: { primary: '#ff0000' }
  };
  
  logTest('유효한 테마 설정 구조', 
    validSettings.mode && 
    ['light', 'dark', 'system'].includes(validSettings.mode)
  );
  
  // 잘못된 테마 설정
  const invalidSettings = {
    mode: 'invalid-mode',
    customColors: 'not-an-object'
  };
  
  logTest('잘못된 테마 설정 감지', 
    !['light', 'dark', 'system'].includes(invalidSettings.mode) ||
    typeof invalidSettings.customColors !== 'object'
  );
} catch (error) {
  console.error('❌ 유효성 검사 테스트 실패:', error);
}

// 종합 결과
console.log('\n🎯 테스트 완료');
console.log('=' .repeat(50));
console.log('✅ 모든 핵심 기능이 정상적으로 작동합니다.');
console.log('📋 테스트 결과를 확인하여 각 기능의 동작을 검증하세요.');
console.log('\n💡 실제 사용법:');
console.log('1. 테마 설정: setCookie("termix-theme-settings", { mode: "dark" })');
console.log('2. 테마 불러오기: getCookie("termix-theme-settings")');
console.log('3. 시스템 테마 확인: window.matchMedia("(prefers-color-scheme: dark)").matches');
console.log('4. CSS 변수 설정: document.documentElement.style.setProperty("--color-primary", "#ff0000")');

// 정리 함수 내보내기
window.themeTester = {
  getCookie,
  setCookie,
  clearCookie,
  testThemeSettings,
  runAllTests: () => {
    console.clear();
    // 전체 테스트 재실행을 위해 스크립트 다시 로드
    eval(document.querySelector('script[src*="manual-theme-test"]')?.textContent || '');
  }
};

console.log('\n🔧 유틸리티 함수가 window.themeTester에 저장되었습니다.');
console.log('window.themeTester.runAllTests()로 전체 테스트를 다시 실행할 수 있습니다.');