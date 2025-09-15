# SolTerm 개발 태스크 체크리스트

> PRD를 바탕으로 작성된 상세 개발 태스크 목록입니다. 각 태스크는 완료 시 체크박스를 선택하여 진행상황을 추적할 수 있습니다.

---

## 🎨 Phase 0: UI/UX 기반 기능 강화 (우선순위: 높음)

### 🎭 0.1 테마 시스템 구현

#### 클라이언트 사이드 저장 설계
- [x] 테마 설정 쿠키 스키마 설계 (키: `termix-theme`, 값: JSON)
- [x] 테마 기본값 설정 (Light, Dark, System)
- [x] 쿠키 만료 기간 설정 (1년)
- [x] **테스트**: 쿠키 저장/불러오기 테스트 수행
- [x] **커밋**: `feat: add theme system cookie storage schema`

#### 백엔드 API 개발 (선택적)
- [x] 시스템 기본 테마 설정 API (관리자용)
- [x] 테마 프리셋 조회 API (`GET /api/themes/presets`)
- [x] **테스트**: 테마 프리셋 API 테스트 작성 및 실행  
- [x] **커밋**: `feat: implement optional theme preset APIs`

#### 프론트엔드 테마 시스템
- [x] Shadcn/ui 테마 시스템 확장 (`theme-provider.tsx` 개선)
- [x] CSS 변수 기반 다크/라이트 테마 정의
- [x] 테마 컨텍스트 및 훅 구현 (`useTheme`)
- [x] 쿠키 기반 테마 상태 관리 구현 (`getCookie`, `setCookie` 활용)
- [x] 시스템 테마 자동 감지 기능 (`prefers-color-scheme`)
- [x] 테마 전환 애니메이션 구현
- [x] 초기 로딩 시 쿠키에서 테마 설정 복원
- [x] **테스트**: 테마 전환 및 쿠키 저장 기능 테스트
- [x] **커밋**: `feat: implement theme system with cookie storage`

#### 테마 설정 UI
- [x] 테마 설정 페이지 컴포넌트 (`ThemeSettings.tsx`)
- [x] 테마 선택 드롭다운/토글 컴포넌트
- [x] 실시간 테마 미리보기 기능
- [x] 커스텀 색상 팔레트 편집기 (고급 기능 - 쿠키에 JSON 저장)
- [x] 테마별 아이콘 및 색상 시스템 적용
- [x] TopNavbar에 테마 전환 버튼 추가
- [x] 테마 변경 시 즉시 쿠키 업데이트 구현
- [x] **테스트**: 테마 UI 컴포넌트 및 쿠키 연동 테스트
- [x] **커밋**: `feat: add theme settings UI with cookie integration`

#### 테마 적용 범위
- [x] 모든 기존 컴포넌트에 테마 변수 적용
- [x] 터미널 테마 연동 (xterm.js 테마)
- [x] 코드 에디터 테마 연동 (CodeMirror 테마)
- [x] 차트 및 시각화 컴포넌트 테마 적용
- [x] 로딩 스피너 및 아이콘 테마 적용
- [x] **테스트**: 전체 애플리케이션 테마 적용 확인
- [x] **커밋**: `feat: apply theme system to all components`

#### 성능 최적화
- [x] 테마 변경 시 깜빡임 방지 최적화
- [x] CSS 변수 캐싱 및 최적화
- [x] 테마 관련 번들 크기 최적화
- [x] **테스트**: 테마 성능 테스트
- [x] **커밋**: `perf: optimize theme system performance`

---

## 🚀 Phase 1: 핵심 모니터링 강화 (우선순위: 높음)

### 📊 1.1 프로세스 모니터링

#### 백엔드 API 개발
- [x] SSH 명령어 실행을 위한 공통 유틸리티 함수 작성
- [x] 프로세스 목록 조회 API 엔드포인트 구현 (`GET /api/monitoring/processes/:hostId`)@DE
- [x] `ps aux` 명령어 결과 파싱 함수 구현
- [x] 프로세스 정보 타입 정의 (TypeScript 인터페이스)
- [x] **테스트**: 기본 프로세스 API 테스트 수행
- [x] **커밋**: `feat: implement basic process monitoring API`
- [x] 프로세스 종료 API 엔드포인트 구현 (`DELETE /api/monitoring/processes/:hostId/:pid`)
- [x] 프로세스 우선순위 변경 API 구현 (`PATCH /api/monitoring/processes/:hostId/:pid/priority`)
- [x] API 에러 핸들링 및 유효성 검사 구현
- [x] 프로세스 모니터링 API 단위 테스트 작성
- [x] **테스트**: 프로세스 제어 API 통합 테스트
- [x] **커밋**: `feat: add process control APIs with error handling`

#### 프론트엔드 UI 개발
- [x] 프로세스 모니터링 페이지 컴포넌트 생성 (`ProcessMonitor.tsx`)
- [x] 프로세스 테이블 컴포넌트 구현 (`ProcessTable.tsx`)
- [x] 프로세스 정보 표시를 위한 데이터 타입 정의
- [x] 실시간 업데이트를 위한 상태 관리 (React 상태)
- [x] **테스트**: 기본 프로세스 UI 컴포넌트 테스트
- [x] **커밋**: `feat: implement process monitoring frontend UI`
- [x] 프로세스 정렬 기능 구현 (CPU, 메모리, 시간별)
- [x] 프로세스 검색 및 필터 기능 구현
- [x] 새로고침 간격 설정 UI 구현 (1초, 2초, 5초, 10초, 30초)
- [x] **테스트**: 프로세스 필터링 및 정렬 기능 테스트
- [x] **커밋**: `feat: implement process filtering and sorting features`
- [x] 프로세스 제어 버튼 (종료, 우선순위 변경) UI
- [x] 로딩 상태 및 에러 상태 처리 UI
- [x] 프로세스 모니터링 반응형 디자인 적용
- [x] **테스트**: 프로세스 제어 UI 및 반응형 디자인 테스트
- [x] **커밋**: `feat: complete process monitoring UI with controls`

#### WebSocket 실시간 통신
- [x] 프로세스 정보 실시간 스트리밍을 위한 WebSocket 서버 구현
- [x] 클라이언트 WebSocket 연결 및 메시지 처리
- [x] 연결 끊김 시 자동 재연결 로직 구현
- [x] WebSocket 성능 최적화 (필요시에만 업데이트)
- [x] **테스트**: WebSocket 실시간 통신 테스트
- [x] **커밋**: `feat: implement real-time process monitoring with WebSocket`

#### 통합 테스트 및 마무리
- [x] **테스트**: 프로세스 모니터링 전체 기능 E2E 테스트
- [x] **커밋**: `test: add comprehensive process monitoring tests`
- [x] **푸시**: Phase 1.1 완료된 기능 원격 저장소로 푸시

### ⚙️ 1.2 서비스 상태 관리

#### 백엔드 API 개발
- [x] systemd 서비스 목록 조회 API 구현 (`GET /api/services/:hostId`)
- [x] `systemctl list-units` 명령어 결과 파싱 함수
- [x] 서비스 정보 타입 정의 (이름, 상태, 설명)
- [x] 서비스 제어 API 구현 (`POST /api/services/:hostId/:serviceName/action`)
- [x] 서비스 상태 조회 API 구현 (`GET /api/services/:hostId/:serviceName/status`)
- [x] 서비스 로그 조회 API 구현 (`GET /api/services/:hostId/:serviceName/logs`)
- [x] systemctl 명령어 실행 권한 검사 구현
- [x] 서비스 관리 API 단위 테스트 작성
- [x] SSH API 호환성 수정 및 CommandResult 객체 처리
- [x] 에러 핸들링 및 구조화된 에러 코드 시스템 구현
- [x] **테스트**: 서비스 API 엔드포인트 실제 동작 검증 완료
- [x] **커밋**: `feat: implement systemd service management backend API`

#### 프론트엔드 UI 개발
- [x] 서비스 관리 페이지 컴포넌트 생성 (`ServiceManager.tsx`)
- [x] 서비스 상태별 분류 UI (활성, 비활성, 실패)
- [x] 서비스 카드 컴포넌트 구현 (`ServiceCard.tsx`)
- [x] 서비스 제어 버튼 UI (시작, 중지, 재시작)
- [x] 서비스 상태 표시 아이콘 및 색상 시스템
- [x] 서비스 검색 및 필터링 기능
- [x] 서비스 로그 뷰어 모달 구현
- [x] 서비스 관리 권한 확인 UI

### 🌐 1.3 네트워크 연결 모니터링

#### 백엔드 API 개발
- [x] 네트워크 연결 조회 API 구현 (`GET /api/monitoring/network/:hostId`)
- [x] `netstat -tulpn` 명령어 결과 파싱
- [x] 리스닝 포트 정보 조회 API 구현
- [x] 네트워크 통계 정보 수집 API 구현
- [x] 방화벽 상태 조회 기능 구현
- [x] 네트워크 모니터링 데이터 타입 정의
- [x] 네트워크 API 단위 테스트 작성

#### 프론트엔드 UI 개발
- [x] 네트워크 모니터링 컴포넌트 생성 (`NetworkMonitor.tsx`)
- [x] 활성 연결 테이블 UI 구현
- [x] 리스닝 포트 표시 UI 구현
- [x] 네트워크 통계 대시보드 UI
- [x] 포트 상태 시각화 (열림/닫힘)
- [x] 네트워크 정보 실시간 업데이트

### 💾 1.4 디스크 사용량 시각화

#### 백엔드 API 개발
- [x] 디스크 사용량 조회 API 구현 (`GET /api/monitoring/disk/:hostId`)
- [x] `du -sh` 명령어 결과 파싱 함수
- [x] 디렉토리 크기 정보 수집 함수
- [x] 파일시스템 정보 조회 API
- [x] 큰 파일 검색 API 구현
- [x] 디스크 모니터링 데이터 캐싱 구현

#### 프론트엔드 UI 개발
- [x] 디스크 사용량 페이지 컴포넌트 생성
- [x] 트리맵 시각화 라이브러리 선택 및 적용
- [x] 파일시스템별 사용률 차트 구현
- [x] 디렉토리 드릴다운 기능 구현
- [x] 큰 파일 목록 표시 UI

### 📖 1.5 로그 관리 시스템

#### 백엔드 개발
- [ ] 로그 파일 목록 조회 API 구현 (`GET /api/logs/:hostId`)
- [ ] 실시간 로그 스트리밍 WebSocket 구현
- [ ] `tail -f` 명령어 래핑 및 스트리밍
- [ ] 로그 검색 API 구현 (`POST /api/logs/:hostId/search`)
- [ ] 로그 레벨별 필터링 기능
- [ ] 로그 북마크 저장 API 구현
- [ ] 로그 데이터 압축 및 최적화

#### 프론트엔드 개발
- [ ] 로그 뷰어 컴포넌트 생성 (`LogViewer.tsx`)
- [ ] 실시간 로그 스트리밍 UI 구현
- [ ] 멀티 로그 파일 탭 시스템
- [ ] 로그 레벨별 색상 하이라이트
- [ ] 로그 검색 인터페이스 구현
- [ ] 자동 스크롤 제어 기능
- [ ] 로그 북마크 기능 UI
- [ ] 로그 필터 사이드바 구현

#### 데이터베이스 스키마
- [ ] 로그 북마크 테이블 설계 및 마이그레이션
- [ ] 로그 검색 히스토리 테이블 설계
- [ ] 로그 관련 인덱스 최적화

---

## 🤖 Phase 2: 자동화 및 스크립트 관리

### 📂 2.1 스크립트 저장소 시스템

#### 데이터베이스 설계
- [ ] 스크립트 라이브러리 테이블 설계 및 생성
- [ ] 스크립트 카테고리 시스템 설계
- [ ] 스크립트 버전 관리 테이블 설계
- [ ] 스크립트 권한 및 공유 설정 스키마

#### 백엔드 API 개발
- [ ] 스크립트 CRUD API 구현 (`/api/scripts/`)
- [ ] 스크립트 실행 API 구현 (`POST /api/scripts/:id/execute`)
- [ ] 스크립트 카테고리 관리 API
- [ ] 스크립트 검색 및 태그 필터링 API
- [ ] 스크립트 공유 및 권한 관리 API
- [ ] 스크립트 버전 관리 기능
- [ ] 스크립트 실행 로그 저장 기능

#### 프론트엔드 개발
- [ ] 스크립트 라이브러리 메인 페이지 (`ScriptLibrary.tsx`)
- [ ] 스크립트 에디터 컴포넌트 (CodeMirror 기반)
- [ ] 스크립트 카테고리 트리 네비게이션
- [ ] 스크립트 검색 및 필터 인터페이스
- [ ] 스크립트 실행 결과 표시 UI
- [ ] 스크립트 공유 설정 UI
- [ ] 스크립트 즐겨찾기 기능
- [ ] 스크립트 템플릿 갤러리

### 🚀 2.2 배치 명령 실행

#### 백엔드 개발
- [ ] 배치 실행을 위한 서버 그룹 관리 API
- [ ] 다중 SSH 연결 관리 시스템
- [ ] 병렬 명령 실행 엔진 구현
- [ ] 배치 실행 결과 집계 기능
- [ ] 실행 실패 시 재시도 로직
- [ ] 배치 실행 히스토리 저장

#### 프론트엔드 개발
- [ ] 배치 실행 인터페이스 (`BatchExecution.tsx`)
- [ ] 서버 선택 UI (체크박스, 그룹 선택)
- [ ] 명령어 입력 및 검증 UI
- [ ] 실행 진행상황 표시 (프로그레스 바)
- [ ] 서버별 실행 결과 표시
- [ ] 실패한 작업 재시도 UI
- [ ] 배치 실행 템플릿 저장 기능

### ⏰ 2.3 크론잡 관리

#### 백엔드 개발
- [ ] 크론잡 조회 API 구현 (`GET /api/cron/:hostId`)
- [ ] `crontab -l` 명령어 파싱 함수
- [ ] 크론잡 생성/수정/삭제 API
- [ ] 크론 표현식 유효성 검사 함수
- [ ] 크론잡 실행 히스토리 추적
- [ ] 크론잡 실행 알림 시스템

#### 프론트엔드 개발
- [ ] 크론잡 관리 페이지 (`CronManager.tsx`)
- [ ] 크론잡 에디터 컴포넌트
- [ ] 시각적 크론 표현식 빌더
- [ ] 다음 실행 시간 미리보기
- [ ] 크론잡 실행 히스토리 표시
- [ ] 크론잡 활성화/비활성화 토글

---

## 🛠️ Phase 3: 개발자 도구 및 DevOps

### 🐳 3.1 Docker 컨테이너 관리

#### 백엔드 개발
- [ ] Docker API 연동을 위한 래퍼 함수 구현
- [ ] 컨테이너 목록 조회 API (`GET /api/docker/:hostId/containers`)
- [ ] 컨테이너 제어 API (시작, 중지, 재시작)
- [ ] 컨테이너 로그 스트리밍 API
- [ ] Docker 이미지 관리 API
- [ ] 컨테이너 리소스 사용량 모니터링
- [ ] Docker 서비스 연결 확인 기능

#### 프론트엔드 개발
- [ ] Docker 대시보드 컴포넌트 (`DockerDashboard.tsx`)
- [ ] 컨테이너 카드 UI 컴포넌트
- [ ] 컨테이너 상태별 분류 (실행중, 중지됨, 오류)
- [ ] 컨테이너 제어 버튼 UI
- [ ] 컨테이너 리소스 사용량 차트
- [ ] 컨테이너 로그 뷰어
- [ ] Docker 이미지 관리 UI

### 📝 3.2 Git 저장소 인터페이스

#### 백엔드 개발
- [ ] Git 명령어 실행을 위한 유틸리티 함수
- [ ] Git 저장소 상태 조회 API (`GET /api/git/:hostId/status`)
- [ ] Git 기본 작업 API (add, commit, push, pull)
- [ ] 브랜치 관리 API
- [ ] Git 히스토리 조회 API
- [ ] 파일 변경사항 diff API

#### 프론트엔드 개발
- [ ] Git 인터페이스 컴포넌트 (`GitInterface.tsx`)
- [ ] 저장소 상태 표시 UI
- [ ] 파일 변경사항 리스트
- [ ] 커밋 메시지 입력 인터페이스
- [ ] 브랜치 선택 드롭다운
- [ ] Git 작업 버튼 UI
- [ ] 변경사항 diff 뷰어

---

## 🚨 Phase 4: 알림 및 모니터링 시스템

### 🔔 4.1 임계값 기반 알림 시스템

#### 데이터베이스 설계
- [ ] 알림 규칙 테이블 설계 및 생성
- [ ] 알림 히스토리 테이블 설계
- [ ] 사용자별 알림 설정 테이블
- [ ] 알림 채널 설정 테이블

#### 백엔드 개발
- [ ] 시스템 메트릭 수집 스케줄러 구현
- [ ] 임계값 검사 엔진 구현
- [ ] 알림 발송 시스템 구현
- [ ] 알림 규칙 CRUD API
- [ ] 알림 히스토리 API
- [ ] 알림 에스컬레이션 로직
- [ ] 중복 알림 방지 시스템

#### 프론트엔드 개발
- [ ] 알림 설정 페이지 (`AlertSettings.tsx`)
- [ ] 임계값 설정 UI
- [ ] 알림 규칙 편집기
- [ ] 알림 히스토리 표시
- [ ] 알림 테스트 기능 UI
- [ ] 알림 상태 대시보드

### 📢 4.2 외부 서비스 통합

#### 백엔드 개발
- [ ] Slack Webhook 통합 구현
- [ ] Discord Webhook 통합 구현
- [ ] 이메일 발송 시스템 구현
- [ ] 외부 서비스 연결 테스트 API
- [ ] 알림 템플릿 시스템
- [ ] 알림 발송 재시도 로직

#### 프론트엔드 개발
- [ ] 외부 서비스 연동 설정 UI
- [ ] Webhook URL 설정 인터페이스
- [ ] 알림 템플릿 편집기
- [ ] 연동 테스트 버튼 UI
- [ ] 발송 실패 알림 표시

---

## 🎨 Phase 5: 사용자 경험 개선

### 📊 5.1 통합 대시보드

#### 백엔드 개발
- [ ] 대시보드 데이터 집계 API
- [ ] 서버 상태 요약 API
- [ ] 최근 알림 조회 API
- [ ] 리소스 사용량 트렌드 데이터 API
- [ ] 대시보드 위젯 설정 API

#### 프론트엔드 개발
- [ ] 메인 대시보드 컴포넌트 (`MainDashboard.tsx`)
- [ ] 서버 상태 카드 위젯
- [ ] 리소스 사용량 차트 위젯
- [ ] 최근 알림 위젯
- [ ] 빠른 액션 버튼 모음
- [ ] 위젯 배치 커스터마이징 기능
- [ ] 대시보드 반응형 레이아웃
- [ ] **테스트**: 대시보드 위젯 및 레이아웃 테스트
- [ ] **커밋**: `feat: implement customizable dashboard with widgets`

### 🔍 5.2 통합 검색 시스템

#### 백엔드 개발
- [ ] 전역 검색 인덱싱 시스템
- [ ] 파일 내용 검색 API
- [ ] 로그 검색 통합 API
- [ ] 스크립트 검색 API
- [ ] 검색 결과 랭킹 시스템
- [ ] 검색 히스토리 저장

#### 프론트엔드 개발
- [ ] 전역 검색 컴포넌트 (`GlobalSearch.tsx`)
- [ ] 검색 결과 페이지
- [ ] 검색 필터 및 정렬 UI
- [ ] 검색어 자동완성 기능
- [ ] 최근 검색어 표시
- [ ] 검색 결과 하이라이트
- [ ] **테스트**: 통합 검색 기능 E2E 테스트
- [ ] **커밋**: `feat: implement global search system`
- [ ] **푸시**: Phase 5 완료된 기능 원격 저장소로 푸시

---

## 🔧 인프라 및 공통 기능

### 📡 WebSocket 통신 인프라
- [ ] WebSocket 서버 기본 구조 설정
- [ ] 클라이언트 연결 관리 시스템
- [ ] 메시지 브로드캐스팅 시스템
- [ ] 연결 인증 및 권한 검사
- [ ] 연결 상태 모니터링
- [ ] WebSocket 재연결 로직
- [ ] 메시지 큐잉 시스템

### 🔒 보안 및 권한 관리
- [ ] API 엔드포인트 권한 미들웨어 강화
- [ ] SSH 연결 보안 검증
- [ ] 민감한 데이터 마스킹 구현
- [ ] 감사 로그 시스템 구현
- [ ] 역할 기반 권한 확장
- [ ] API 요청 제한(Rate Limiting) 구현

### 🚀 성능 최적화
- [ ] API 응답 캐싱 시스템
- [ ] 데이터베이스 쿼리 최적화
- [ ] 프론트엔드 번들 크기 최적화
- [ ] 이미지 및 정적 자원 최적화
- [ ] 메모리 사용량 모니터링 및 최적화
- [ ] API 응답 시간 모니터링

### 🧪 테스트 및 품질 관리
- [ ] 백엔드 API 단위 테스트 완성
- [ ] 프론트엔드 컴포넌트 테스트 작성
- [ ] E2E 테스트 시나리오 구현
- [ ] 성능 테스트 자동화
- [ ] 보안 테스트 자동화
- [ ] 코드 커버리지 측정 및 개선

### 📚 문서화 및 배포
- [ ] API 문서 자동 생성 (OpenAPI/Swagger)
- [ ] 컴포넌트 스토리북 작성
- [ ] 설치 및 배포 가이드 업데이트
- [ ] 기능별 사용자 매뉴얼 작성
- [ ] 개발자 기여 가이드 업데이트
- [ ] Docker 이미지 최적화

---

## 📅 마일스톤 체크포인트

### 🎯 Phase 1 완료 기준
- [ ] 모든 모니터링 기능이 정상 동작
- [ ] 실시간 데이터 업데이트 확인
- [ ] 로그 시스템 성능 테스트 통과
- [ ] 모니터링 UI 반응형 디자인 완료
- [ ] Phase 1 기능 통합 테스트 완료

### 🎯 Phase 2 완료 기준
- [ ] 스크립트 저장소 기본 기능 완료
- [ ] 배치 실행 시스템 안정성 확인
- [ ] 크론잡 관리 기능 검증
- [ ] 자동화 기능 보안 테스트 통과
- [ ] Phase 2 기능 통합 테스트 완료

### 🎯 Phase 3 완료 기준
- [ ] Docker 관리 기능 완전 동작
- [ ] Git 인터페이스 기본 기능 완료
- [ ] DevOps 도구 연동 테스트 완료
- [ ] 개발자 워크플로우 검증
- [ ] Phase 3 기능 통합 테스트 완료

### 🎯 Phase 4 완료 기준
- [ ] 알림 시스템 24시간 안정성 테스트
- [ ] 외부 서비스 통합 테스트 완료
- [ ] 임계값 알림 정확도 검증
- [ ] 알림 발송 성능 테스트 통과
- [ ] Phase 4 기능 통합 테스트 완료

### 🎯 Phase 5 완료 기준
- [ ] 대시보드 성능 최적화 완료
- [ ] 통합 검색 정확도 검증
- [ ] 전체 시스템 UX 테스트 완료
- [ ] 접근성 가이드라인 준수 확인
- [ ] 최종 통합 테스트 및 배포 준비 완료

---

## 🔄 Git 워크플로우 가이드

### 📋 커밋 메시지 컨벤션
```
<type>: <description>

feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 변경
style: 코드 포맷팅, 세미콜론 누락 등
refactor: 코드 리팩토링
test: 테스트 코드 추가/수정
perf: 성능 개선
chore: 빌드 과정, 보조 도구 변경
```

### 🌿 브랜치 전략
```bash
# 기능별 브랜치 생성
git checkout -b feature/process-monitoring
git checkout -b feature/theme-system
git checkout -b feature/log-viewer

# Phase별 메인 브랜치
git checkout -b phase-1/monitoring
git checkout -b phase-2/automation
```

### ✅ 체크포인트 워크플로우
각 **테스트** 및 **커밋** 항목 완료 시:

1. **테스트 단계**:
```bash
# 기능 테스트 실행
npm test
npm run test:e2e  # E2E 테스트 (해당하는 경우)
npm run lint      # 코드 품질 검사
npm run build     # 빌드 테스트
```

2. **커밋 단계**:
```bash
# 변경사항 스테이징
git add .

# 컨벤션에 따른 커밋
git commit -m "feat: implement basic process monitoring API"

# 로컬 테스트 한번 더 수행
npm test

# 문제없으면 푸시 (선택적)
git push origin feature/process-monitoring
```

3. **마일스톤 푸시**:
```bash
# Phase 또는 주요 기능 완료 시
git push origin feature/process-monitoring
git push origin main  # 메인 브랜치에 머지 후
```

### 🚨 롤백 가이드
작업이 잘못되었을 때:

```bash
# 마지막 커밋으로 되돌리기
git reset --hard HEAD~1

# 특정 커밋으로 되돌리기
git reset --hard <commit-hash>

# 원격에서 특정 브랜치 가져오기
git checkout -b rollback-branch origin/feature/working-version
```

### 📊 진행상황 추적
- [ ] **Phase 0 완료**: 테마 시스템 구현 완료
- [ ] **Phase 1.1 완료**: 프로세스 모니터링 구현 완료
- [ ] **Phase 1.2 완료**: 서비스 상태 관리 구현 완료
- [ ] **Phase 1.3 완료**: 네트워크 모니터링 구현 완료
- [ ] **Phase 1.4 완료**: 디스크 사용량 시각화 완료
- [ ] **Phase 1.5 완료**: 로그 관리 시스템 완료

---

## 📝 참고사항

**우선순위 가이드**:
- 🔴 **높음**: 핵심 기능, 사용자 요청 다수
- 🟡 **중간**: 유용한 기능, 개발 효율성 향상
- 🟢 **낮음**: 추가 개선, 장기적 가치

**예상 소요시간**:
- 각 Phase당 1-2개월 예상
- 개발자 1-2명 기준
- 테스트 및 검증 시간 포함

**의존성 주의사항**:
- WebSocket 인프라는 모든 실시간 기능의 전제조건
- 보안 기능은 모든 Phase에 공통 적용
- 데이터베이스 스키마 변경은 신중히 계획

---

> ✅ 완료된 태스크는 체크박스를 선택하여 진행상황을 추적하세요.  
> 🔄 각 태스크 완료 후 관련 테스트도 함께 진행하세요.  
> 📋 정기적으로 팀 리뷰를 통해 우선순위를 조정하세요.