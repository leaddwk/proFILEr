# proFILEr v1.2.0

Windows, macOS, Linux에서 ZIP을 풀고 실행 스크립트로 사용할 수 있는 배포판입니다.

- 공식 Node.js 22.23.3 자동 준비, 관리자 권한·시스템 설치 불필요
- Windows x64 / ARM64 / x86 자동 구분 및 SHA-256 검증
- macOS Apple Silicon / Intel 자동 구분, `start.command` 더블 클릭 실행
- Linux x64 / ARM64 / ARMv7 자동 구분, `bash start.sh` 실행
- macOS·Linux 런타임 다운로드 검증, 오프라인 재사용, 변조된 실행 파일 차단
- Linux 그래픽 환경에서 브라우저 열기, 서버 환경에서는 접속 주소 표시
- Unix 실행 권한과 줄바꿈을 유지하는 운영체제별 ZIP
- 서버 준비 후 브라우저 자동 열기, 다음 실행부터 오프라인 런타임 재사용
- 파일·텍스트·링크 공유, 기기 유형·공유 시각 기록
- 윈도우·트리 탐색과 폴더 우선 정렬
- 전체 기록 삭제 시 실제 공유 파일과 탐색 정보 유지

| 다운로드 | 실행 |
| --- | --- |
| `proFILEr-v1.2.0-windows.zip` | `start.bat` 더블 클릭 |
| `proFILEr-v1.2.0-macos.zip` | `start.command` 더블 클릭 |
| `proFILEr-v1.2.0-linux.zip` | 압축을 푼 폴더에서 `bash start.sh` |

첫 실행에는 인터넷이 필요합니다. 같은 네트워크에서 사용하는 개인용 앱입니다. macOS 11 이상, 일반 Linux는 커널 4.18·glibc 2.28 이상을 대상으로 합니다. musl x64는 자동 준비를 지원하며 ARM musl은 Node.js를 직접 준비해야 합니다.

Windows와 macOS Intel·Apple Silicon, Linux x64·ARM64에서 공유 기능과 자동 준비를 검증합니다. Unix 실행 도우미 테스트는 한글·공백 경로, 오프라인 재사용, 실제 서버 응답, 종료 후 서버 정리, 런타임 변조 차단을 확인합니다.

공유 데이터·개인 기록·환경 파일은 배포 ZIP에 포함하지 않습니다. 기존 데이터는 `shared/`와 `.profiler/`를 함께 옮겨 유지하세요.
