# Termix 프로젝트 개선 PRD (Product Requirements Document)

## 📋 문서 개요

**문서 버전**: 1.0  
**작성일**: 2024년 9월  
**대상 독자**: 개발자, 프로젝트 관리자  
**목적**: Termix 웹 기반 SSH 관리 플랫폼의 기능 확장 및 사용자 경험 개선

---

## 🎯 프로젝트 목표

### 현재 상태 (AS-IS)
Termix는 웹 기반 SSH 관리 플랫폼으로 다음 기능을 제공합니다:
- SSH 터미널 접속 (4분할 화면, 탭 시스템)
- SSH 터널 관리 (자동 재연결, 상태 모니터링)
- 원격 파일 관리 (에디터, 파일 작업)
- SSH 호스트 관리 (태그, 폴더 분류)
- 기본 서버 모니터링 (CPU, 메모리, 디스크)
- 사용자 인증 (로컬, OIDC, 2FA)

### 목표 상태 (TO-BE)
- **확장된 모니터링**: 프로세스, 서비스, 로그 모니터링
- **자동화 도구**: 스크립트 관리, 배치 실행, 크론잡 관리
- **개발자 도구**: Docker 관리, Git 인터페이스
- **알림 시스템**: 임계값 기반 알림, 외부 통합
- **향상된 UX**: 대시보드, 통합 검색, 바로가기

---

## 🚀 기능 요구사항

## Phase 1: 핵심 모니터링 강화 (우선순위: 높음)

### 1.1 향상된 시스템 모니터링

#### 📊 프로세스 모니터링
**사용자 스토리**: "시스템 관리자로서 서버의 실행 중인 프로세스를 실시간으로 모니터링하고 싶습니다."

**기능 상세**:
- **실시간 프로세스 목록**: `htop` 스타일의 웹 인터페이스
- **프로세스 정렬**: CPU, 메모리, 실행시간별 정렬
- **프로세스 제어**: 프로세스 종료(kill), 우선순위 변경
- **프로세스 검색**: 프로세스 이름, PID로 검색
- **자동 새로고침**: 1초, 5초, 10초 간격 선택

**기술적 구현**:
```bash
# 백엔드에서 실행할 명령어 예시
ps aux --sort=-%cpu | head -20  # CPU 사용률 순 정렬
top -b -n1 | head -20          # top 명령어 결과
```

**UI 컴포넌트**:
- 테이블 형태의 프로세스 리스트
- 실시간 업데이트 토글 버튼
- 프로세스 제어 액션 버튼
- 검색 필터 입력창

#### ⚙️ 서비스 상태 관리
**사용자 스토리**: "개발자로서 systemd 서비스의 상태를 확인하고 재시작할 수 있어야 합니다."

**기능 상세**:
- **서비스 목록**: 활성, 비활성, 실패 상태별 분류
- **서비스 제어**: 시작, 중지, 재시작, 활성화, 비활성화
- **로그 보기**: 서비스 로그 실시간 확인
- **상태 알림**: 서비스 실패 시 알림

**기술적 구현**:
```bash
# systemd 서비스 관리 명령어
systemctl list-units --type=service
systemctl status nginx
systemctl start|stop|restart nginx
journalctl -u nginx -f  # 실시간 로그
```

#### 🌐 네트워크 연결 모니터링
**사용자 스토리**: "네트워크 관리자로서 서버의 네트워크 연결 상태를 모니터링하고 싶습니다."

**기능 상세**:
- **활성 연결**: 현재 열린 네트워크 연결 목록
- **리스닝 포트**: 대기 중인 포트와 서비스
- **네트워크 통계**: 송수신 데이터량, 연결 수
- **방화벽 상태**: 열린 포트, 차단된 연결

**기술적 구현**:
```bash
# 네트워크 모니터링 명령어
netstat -tulpn  # 리스닝 포트
ss -tulpn       # 소켓 상태
iftop -t        # 실시간 트래픽
```

#### 💾 디스크 사용량 시각화
**사용자 스토리**: "시스템 관리자로서 디스크 사용량을 시각적으로 파악하고 싶습니다."

**기능 상세**:
- **트리맵 시각화**: 디렉토리별 크기를 면적으로 표시
- **사용량 차트**: 파일시스템별 사용률 차트
- **큰 파일 탐지**: 지정된 크기 이상의 파일 찾기
- **사용량 추이**: 시간별 디스크 사용량 변화

**기술적 구현**:
```bash
# 디스크 분석 명령어
du -sh /* | sort -hr  # 디렉토리별 크기
df -h                 # 파일시스템 사용량
find / -size +100M    # 큰 파일 찾기
```

### 1.2 로그 관리 시스템

#### 📖 실시간 로그 뷰어
**사용자 스토리**: "개발자로서 여러 로그 파일을 동시에 모니터링하고 싶습니다."

**기능 상세**:
- **멀티 로그 뷰**: 여러 로그 파일 동시 표시
- **실시간 스트리밍**: WebSocket을 통한 실시간 로그 전송
- **색상 하이라이트**: ERROR, WARN, INFO 레벨별 색상 구분
- **자동 스크롤**: 새 로그 자동 스크롤, 수동 제어 가능

**기술적 구현**:
```javascript
// WebSocket을 통한 실시간 로그 스트리밍
const logSocket = new WebSocket('ws://localhost:8080/logs');
logSocket.onmessage = (event) => {
  const logData = JSON.parse(event.data);
  appendLogToUI(logData);
};

// 백엔드: tail -f 명령어 실행
const tail = spawn('tail', ['-f', logFilePath]);
tail.stdout.on('data', (data) => {
  ws.send(JSON.stringify({
    file: logFilePath,
    content: data.toString(),
    timestamp: new Date().toISOString()
  }));
});
```

#### 🔍 로그 검색 & 필터링
**사용자 스토리**: "운영팀으로서 특정 시간대나 키워드로 로그를 검색하고 싶습니다."

**기능 상세**:
- **키워드 검색**: 정규식 지원 텍스트 검색
- **시간 범위**: 날짜/시간 범위로 필터링
- **로그 레벨**: ERROR, WARN, INFO, DEBUG 레벨별 필터
- **검색 결과 하이라이트**: 검색어 강조 표시
- **검색 히스토리**: 최근 검색어 저장

**기술적 구현**:
```bash
# 로그 검색 명령어
grep -n "ERROR" /var/log/nginx/error.log
journalctl --since "2024-01-01" --until "2024-01-02" -u nginx
awk '/ERROR/ && /2024-01-01/' /var/log/application.log
```

#### 🏷️ 로그 북마크 & 메모
**사용자 스토리**: "디버깅 중인 개발자로서 중요한 로그 라인에 메모를 남기고 싶습니다."

**기능 상세**:
- **라인 북마크**: 특정 로그 라인 북마크 저장
- **메모 추가**: 북마크된 라인에 개인 메모 작성
- **태그 분류**: 북마크를 카테고리별로 분류
- **팀 공유**: 북마크와 메모를 팀원과 공유

**데이터베이스 스키마**:
```sql
CREATE TABLE log_bookmarks (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  host_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  memo TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Phase 2: 자동화 및 스크립트 관리 (우선순위: 높음)

### 2.1 스크립트 저장소 시스템

#### 📂 스크립트 라이브러리
**사용자 스토리**: "시스템 관리자로서 자주 사용하는 명령어와 스크립트를 저장하고 재사용하고 싶습니다."

**기능 상세**:
- **스크립트 저장**: Bash, Python, SQL 등 다양한 스크립트 저장
- **카테고리 분류**: 시스템, 데이터베이스, 네트워크 등으로 분류
- **태그 시스템**: 검색을 위한 태그 기능
- **버전 관리**: 스크립트 수정 히스토리 추적
- **공개/비공개**: 개인용/팀 공유 설정

**UI 구성요소**:
- 스크립트 에디터 (CodeMirror 활용)
- 카테고리 트리 메뉴
- 검색 및 필터 기능
- 실행 버튼과 결과 표시 영역

**데이터베이스 스키마**:
```sql
CREATE TABLE script_library (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'bash',
  category TEXT,
  tags TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 🚀 배치 명령 실행
**사용자 스토리**: "여러 서버를 관리하는 관리자로서 동일한 명령을 여러 서버에서 동시에 실행하고 싶습니다."

**기능 상세**:
- **서버 그룹 선택**: 태그나 폴더별로 서버 그룹 선택
- **동시 실행**: 선택된 서버들에 명령 병렬 실행
- **실행 결과 집계**: 각 서버별 실행 결과 표시
- **실패 처리**: 실패한 서버에 대한 재시도 기능
- **실행 로그**: 배치 실행 히스토리 저장

**기술적 구현**:
```javascript
// 배치 실행 로직
async function executeBatchCommand(servers, command) {
  const promises = servers.map(server => 
    executeSSHCommand(server, command)
      .then(result => ({ server, status: 'success', output: result }))
      .catch(error => ({ server, status: 'error', error: error.message }))
  );
  
  const results = await Promise.allSettled(promises);
  return results;
}
```

### 2.2 크론잡 관리 인터페이스

#### ⏰ 크론잡 편집기
**사용자 스토리**: "시스템 관리자로서 크론잡을 GUI로 편집하고 관리하고 싶습니다."

**기능 상세**:
- **시각적 스케줄러**: 시간 설정을 위한 GUI 인터페이스
- **크론 표현식 생성**: 복잡한 크론 표현식 자동 생성
- **실행 예측**: 다음 실행 시간 미리보기
- **크론잡 목록**: 현재 설정된 모든 크론잡 표시
- **실행 로그**: 크론잡 실행 결과 로그 확인

**UI 구성요소**:
```jsx
// 크론잡 편집 컴포넌트 예시
function CronJobEditor({ cronJob, onSave }) {
  const [schedule, setSchedule] = useState('0 0 * * *');
  const [command, setCommand] = useState('');
  const [enabled, setEnabled] = useState(true);
  
  return (
    <div className="cron-editor">
      <CronScheduleBuilder 
        value={schedule} 
        onChange={setSchedule} 
      />
      <CommandEditor 
        value={command} 
        onChange={setCommand} 
      />
      <NextRunPreview schedule={schedule} />
    </div>
  );
}
```

#### 📈 크론잡 모니터링
**사용자 스토리**: "운영팀으로서 크론잡의 실행 상태와 실패 알림을 받고 싶습니다."

**기능 상세**:
- **실행 상태**: 성공, 실패, 실행 중 상태 표시
- **실행 시간**: 각 크론잡의 실행 시간 기록
- **실패 알림**: 크론잡 실패 시 이메일/Slack 알림
- **성능 통계**: 실행 시간 통계, 성공률

---

## Phase 3: 개발자 도구 및 DevOps (우선순위: 중간)

### 3.1 Docker 컨테이너 관리

#### 🐳 컨테이너 대시보드
**사용자 스토리**: "DevOps 엔지니어로서 서버의 Docker 컨테이너를 웹에서 관리하고 싶습니다."

**기능 상세**:
- **컨테이너 목록**: 실행 중, 중지됨, 오류 상태별 분류
- **컨테이너 제어**: 시작, 중지, 재시작, 삭제
- **리소스 사용량**: CPU, 메모리 사용량 실시간 모니터링
- **로그 보기**: 컨테이너 로그 실시간 스트리밍
- **이미지 관리**: Docker 이미지 목록 및 관리

**기술적 구현**:
```bash
# Docker 관리 명령어
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
docker logs -f container_name
```

### 3.2 Git 저장소 인터페이스

#### 📝 간단한 Git 작업
**사용자 스토리**: "개발자로서 기본적인 Git 작업을 웹 인터페이스에서 수행하고 싶습니다."

**기능 상세**:
- **저장소 상태**: Git 상태, 브랜치, 변경사항 표시
- **기본 Git 작업**: add, commit, pull, push
- **브랜치 관리**: 브랜치 목록, 생성, 전환
- **변경사항 비교**: diff 보기, 파일별 변경사항

---

## Phase 4: 알림 및 모니터링 시스템 (우선순위: 중간)

### 4.1 임계값 기반 알림 시스템

#### 🚨 리소스 알림
**사용자 스토리**: "시스템 관리자로서 서버 리소스가 임계값을 초과하면 즉시 알림을 받고 싶습니다."

**기능 상세**:
- **임계값 설정**: CPU, 메모리, 디스크 사용률 임계값
- **알림 채널**: 이메일, Slack, Discord 통합
- **에스컬레이션**: 단계적 알림 (경고 → 위험 → 심각)
- **알림 기록**: 발생한 알림의 히스토리 추적

**설정 인터페이스**:
```yaml
# 알림 설정 예시
alerts:
  cpu_usage:
    warning: 70%
    critical: 85%
    duration: 5m  # 5분 이상 지속시 알림
  memory_usage:
    warning: 80%
    critical: 90%
  disk_usage:
    warning: 85%
    critical: 95%
```

### 4.2 외부 서비스 통합

#### 📢 Slack/Discord 통합
**기능 상세**:
- **Webhook 설정**: Slack/Discord Webhook URL 설정
- **메시지 템플릿**: 알림 메시지 커스터마이징
- **채널별 알림**: 알림 유형별 다른 채널 전송

---

## Phase 5: 사용자 경험 개선 (우선순위: 중간)

### 5.1 통합 대시보드

#### 📊 메인 대시보드
**사용자 스토리**: "관리자로서 모든 서버의 상태를 한 눈에 파악할 수 있는 대시보드가 필요합니다."

**기능 상세**:
- **서버 상태 카드**: 각 서버의 핵심 지표 표시
- **알림 센터**: 최근 알림 및 경고 표시
- **리소스 차트**: 시간별 리소스 사용량 그래프
- **빠른 액션**: 자주 사용하는 작업 바로가기

### 5.2 검색 및 네비게이션

#### 🔍 전역 검색
**사용자 스토리**: "사용자로서 파일, 명령어, 로그 등을 통합적으로 검색하고 싶습니다."

**기능 상세**:
- **통합 검색**: 파일명, 로그 내용, 스크립트, 호스트명 검색
- **검색 필터**: 타입별, 시간별, 서버별 필터링
- **최근 검색**: 검색 히스토리 저장 및 재사용

---

## 🛠️ 기술적 구현 가이드

### 백엔드 구조

#### API 엔드포인트 설계
```typescript
// 프로세스 모니터링 API 예시
interface ProcessInfo {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  user: string;
  runTime: string;
}

// GET /api/monitoring/processes/:hostId
app.get('/api/monitoring/processes/:hostId', async (req, res) => {
  const { hostId } = req.params;
  const sshConnection = await getSSHConnection(hostId);
  
  const command = 'ps aux --sort=-%cpu';
  const result = await executeCommand(sshConnection, command);
  const processes = parseProcessOutput(result);
  
  res.json(processes);
});
```

#### WebSocket 실시간 데이터
```typescript
// 실시간 로그 스트리밍
io.on('connection', (socket) => {
  socket.on('subscribe-logs', ({ hostId, logFile }) => {
    const tail = spawn('ssh', [
      `user@${hostAddress}`,
      `tail -f ${logFile}`
    ]);
    
    tail.stdout.on('data', (data) => {
      socket.emit('log-data', {
        hostId,
        logFile,
        content: data.toString(),
        timestamp: new Date().toISOString()
      });
    });
  });
});
```

### 프론트엔드 구조

#### 상태 관리
```typescript
// 모니터링 상태 관리 (Zustand 예시)
interface MonitoringStore {
  processes: ProcessInfo[];
  isLoading: boolean;
  refreshInterval: number;
  fetchProcesses: (hostId: string) => Promise<void>;
  setRefreshInterval: (interval: number) => void;
}

const useMonitoringStore = create<MonitoringStore>((set, get) => ({
  processes: [],
  isLoading: false,
  refreshInterval: 5000,
  
  fetchProcesses: async (hostId) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/monitoring/processes/${hostId}`);
      const processes = await response.json();
      set({ processes, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch processes:', error);
    }
  }
}));
```

#### 컴포넌트 구조
```
src/ui/Apps/Monitoring/
├── MonitoringDashboard.tsx     # 메인 모니터링 대시보드
├── ProcessMonitor.tsx          # 프로세스 모니터링
├── ServiceManager.tsx          # 서비스 관리
├── LogViewer.tsx              # 로그 뷰어
├── NetworkMonitor.tsx         # 네트워크 모니터링
└── components/
    ├── ProcessTable.tsx       # 프로세스 테이블
    ├── ServiceCard.tsx        # 서비스 카드
    └── LogStream.tsx          # 로그 스트리밍
```

---

## 📅 구현 로드맵

### Phase 1 (1-2개월): 핵심 모니터링
1. **Week 1-2**: 프로세스 모니터링 UI/API 구현
2. **Week 3-4**: 서비스 상태 관리 기능
3. **Week 5-6**: 실시간 로그 뷰어 구현
4. **Week 7-8**: 로그 검색 및 필터링

### Phase 2 (1-2개월): 자동화 도구
1. **Week 1-2**: 스크립트 저장소 시스템
2. **Week 3-4**: 배치 명령 실행 기능
3. **Week 5-6**: 크론잡 관리 인터페이스
4. **Week 7-8**: 크론잡 모니터링

### Phase 3 (1-2개월): DevOps 도구
1. **Week 1-3**: Docker 컨테이너 관리
2. **Week 4-6**: Git 저장소 인터페이스
3. **Week 7-8**: 환경 변수 관리

### Phase 4 (1-2개월): 알림 시스템
1. **Week 1-3**: 임계값 알림 시스템
2. **Week 4-6**: 외부 서비스 통합 (Slack, Discord)
3. **Week 7-8**: 알림 히스토리 및 관리

### Phase 5 (1-2개월): UX 개선
1. **Week 1-3**: 통합 대시보드 구현
2. **Week 4-6**: 전역 검색 기능
3. **Week 7-8**: 성능 최적화 및 테스트

---

## 🧪 테스트 계획

### 단위 테스트
- API 엔드포인트 테스트
- 컴포넌트 렌더링 테스트
- 상태 관리 로직 테스트

### 통합 테스트
- SSH 연결 및 명령 실행 테스트
- WebSocket 통신 테스트
- 데이터베이스 CRUD 테스트

### E2E 테스트
- 주요 사용자 플로우 테스트
- 크로스 브라우저 테스트
- 성능 테스트

---

## 📊 성공 지표

### 기능별 KPI
- **모니터링**: 시스템 이상 감지 시간 < 1분
- **자동화**: 배치 작업 실행 성공률 > 95%
- **알림**: 알림 전송 지연 시간 < 10초
- **UX**: 페이지 로딩 시간 < 2초

### 사용자 만족도
- 기능 사용률 측정
- 사용자 피드백 수집
- 버그 리포트 빈도 모니터링

---

## 🔒 보안 고려사항

### 데이터 보안
- SSH 키 및 비밀번호 암호화 저장
- API 요청 인증 및 권한 확인
- 로그 데이터 마스킹 (민감 정보 보호)

### 네트워크 보안
- HTTPS 강제 사용
- WebSocket 연결 보안
- 외부 API 호출 보안 (Webhook 검증)

### 접근 제어
- 역할 기반 권한 관리 (RBAC)
- 서버별 접근 권한 설정
- 민감한 작업에 대한 추가 인증

---

## 📚 참고 자료

### 기술 문서
- [SSH2 라이브러리 문서](https://github.com/mscdex/ssh2)
- [WebSocket API 문서](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Drizzle ORM 문서](https://orm.drizzle.team/)

### UI/UX 참고
- [htop](https://htop.dev/) - 프로세스 모니터링 UI 참고
- [Portainer](https://www.portainer.io/) - Docker 관리 UI 참고
- [Grafana](https://grafana.com/) - 대시보드 UI 참고

### 모범 사례
- [12 Factor App](https://12factor.net/) - 애플리케이션 설계 원칙
- [REST API 설계 가이드](https://restfulapi.net/)
- [React 컴포넌트 설계 패턴](https://reactpatterns.com/)

---

## 🤝 기여 가이드

### 개발 환경 설정
1. Node.js 18+ 설치
2. 프로젝트 클론 및 의존성 설치
3. 개발용 SSH 서버 설정 (테스트용)
4. 환경 변수 설정

### 코드 기여 프로세스
1. Issue 생성 및 논의
2. Feature 브랜치 생성
3. 코드 구현 및 테스트
4. Pull Request 생성
5. 코드 리뷰 및 머지

### 코딩 컨벤션
- TypeScript 사용 (엄격한 타입 체크)
- ESLint/Prettier 설정 준수
- 컴포넌트별 테스트 코드 작성
- 의미있는 커밋 메시지 작성

---

**문서 끝**

> 이 PRD는 Termix 프로젝트의 기능 확장을 위한 가이드라인입니다. 각 Phase는 독립적으로 구현 가능하며, 팀의 우선순위에 따라 순서를 조정할 수 있습니다. 구현 과정에서 기술적 제약이나 사용자 피드백에 따라 요구사항을 조정할 수 있습니다.