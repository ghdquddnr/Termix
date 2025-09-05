# 저장소 통계
<p align="center">
  <img src="https://flagcdn.com/kr.svg" alt="한국어" width="24" height="16"> 한국어 | 
  <a href="README-CN.md"><img src="https://flagcdn.com/cn.svg" alt="中文" width="24" height="16"> 中文</a>
</p>


![GitHub Repo stars](https://img.shields.io/github/stars/LukeGus/Termix?style=flat&label=Stars)
![GitHub forks](https://img.shields.io/github/forks/LukeGus/Termix?style=flat&label=Forks)
![GitHub Release](https://img.shields.io/github/v/release/LukeGus/Termix?style=flat&label=Release)
<a href="https://discord.gg/jVQGdvHDrf"><img alt="Discord" src="https://img.shields.io/discord/1347374268253470720"></a>
#### Top Technologies
[![React Badge](https://img.shields.io/badge/-React-61DBFB?style=flat-square&labelColor=black&logo=react&logoColor=61DBFB)](#)
[![TypeScript Badge](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&labelColor=black&logo=typescript&logoColor=3178C6)](#)
[![Node.js Badge](https://img.shields.io/badge/-Node.js-3C873A?style=flat-square&labelColor=black&logo=node.js&logoColor=3C873A)](#)
[![Vite Badge](https://img.shields.io/badge/-Vite-646CFF?style=flat-square&labelColor=black&logo=vite&logoColor=646CFF)](#)
[![Tailwind CSS Badge](https://img.shields.io/badge/-TailwindCSS-38B2AC?style=flat-square&labelColor=black&logo=tailwindcss&logoColor=38B2AC)](#)
[![Docker Badge](https://img.shields.io/badge/-Docker-2496ED?style=flat-square&labelColor=black&logo=docker&logoColor=2496ED)](#)
[![SQLite Badge](https://img.shields.io/badge/-SQLite-003B57?style=flat-square&labelColor=black&logo=sqlite&logoColor=003B57)](#)
[![Radix UI Badge](https://img.shields.io/badge/-Radix%20UI-161618?style=flat-square&labelColor=black&logo=radixui&logoColor=161618)](#)

<br />
<p align="center">
  <a href="https://github.com/LukeGus/Termix">
    <img alt="Termix Banner" src=./repo-images/HeaderImage.png style="width: auto; height: auto;">  </a>
</p>

프로젝트가 마음에 드신다면 여기에서 후원하실 수 있어요!\
[![GitHub Sponsor](https://img.shields.io/badge/Sponsor-LukeGus-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/LukeGus)

# 개요

<p align="center">
  <a href="https://github.com/LukeGus/Termix">
    <img alt="Termix Banner" src=./public/icon.svg style="width: 250px; height: 250px;">  </a>
</p>

Termix는 오픈 소스이자 영구 무료로 제공되는 자체 호스팅 올인원 서버 관리 플랫폼입니다. 하나의 직관적인 웹 인터페이스를 통해 서버와 인프라를 관리할 수 있는 솔루션을 제공합니다. Termix는 SSH 터미널 접속, SSH 터널링, 원격 파일 편집 기능을 제공하며, 앞으로 더 많은 도구들이 추가될 예정입니다.

# 기능
- **SSH 터미널 접속** - 최대 4분할 스플릿 화면과 탭 시스템을 갖춘 완전한 기능의 터미널
- **SSH 터널 관리** - 자동 재연결 및 상태 모니터링을 포함한 SSH 터널 생성·관리
- **원격 파일 편집기** - 구문 하이라이트 및 파일 업로드/이동/이름변경/삭제 등 파일 관리 기능과 함께 원격 서버의 파일을 직접 편집
- **SSH 호스트 관리자** - 태그와 폴더로 SSH 연결을 저장, 구성, 관리
- **서버 상태** - 어떤 SSH 서버든 CPU, 메모리, 디스크 사용량 확인
- **사용자 인증** - 관리자 제어, OIDC, 2FA(TOTP)를 지원하는 보안 사용자 관리
- **모던 UI** - React, Tailwind CSS, Shadcn으로 구축된 깔끔한 인터페이스
- **언어** - 영어와 중국어 기본 지원

# 예정된 기능
- **향상된 관리자 제어** - 사용자/관리자 권한에 대한 더 세밀한 제어, 호스트 공유 등
- **테마 지원** - 모든 도구에 대해 테마 커스터마이징
- **향상된 터미널 지원** - VNC, RDP 등 추가 프로토콜 지원(Guacamole 유사 웹 앱에 RDP 통합 경험이 있으시다면 이슈를 통해 연락 부탁드립니다)
- **모바일 지원** - 휴대폰에서 서버를 관리할 수 있도록 모바일 앱 또는 Termix 웹사이트의 모바일 버전 지원

# 설치
설치 방법은 Termix [문서](https://docs.termix.site/install)에서 확인하실 수 있습니다. 아래는 샘플 docker-compose 파일입니다:
```yaml
services:
  termix:
    image: ghcr.io/lukegus/termix:latest
    container_name: termix
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - termix-data:/app/data
    environment:
      PORT: "8080"

volumes:
  termix-data:
    driver: local 
```

# 지원
Termix 사용 중 도움이 필요하시면 [Discord](https://discord.gg/jVQGdvHDrf) 서버의 지원 채널에 참여해 주세요. 또한 [GitHub](https://github.com/LukeGus/Termix/issues) 저장소에서 이슈를 생성하거나 Pull Request를 보내실 수도 있습니다.

# 데모

<p align="center">
  <img src="./repo-images/Image 1.png" width="400" alt="Termix Demo 1"/>
  <img src="./repo-images/Image 2.png" width="400" alt="Termix Demo 2"/>
</p>

<p align="center">
  <img src="./repo-images/Image 3.png" width="250" alt="Termix Demo 3"/>
  <img src="./repo-images/Image 4.png" width="250" alt="Termix Demo 4"/>
  <img src="./repo-images/Image 5.png" width="250" alt="Termix Demo 5"/>
</p>

<p align="center">
  <video src="https://github.com/user-attachments/assets/f9caa061-10dc-4173-ae7d-c6d42f05cf56" width="800" controls>
    Your browser does not support the video tag.
  </video>
</p>

# 라이선스
Apache License Version 2.0 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.
