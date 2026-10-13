# proFILEr 빠른 시작

1. Release에서 운영체제에 맞는 **proFILEr-v1.2.0-운영체제.zip**을 내려받습니다. GitHub의 Source code ZIP 대신 첨부된 배포 ZIP을 사용하세요.
2. 압축을 완전히 풀고 아래 방법으로 실행합니다.
3. 처음 실행하면 공식 Node.js를 내려받아 준비하고 브라우저를 엽니다. 첫 실행에는 인터넷 연결이 필요합니다.

| 운영체제 | ZIP 이름 끝부분 | 실행 방법 |
| --- | --- | --- |
| Windows | `-windows.zip` | `start.bat` 더블 클릭 |
| macOS | `-macos.zip` | `start.command` 더블 클릭 |
| Linux | `-linux.zip` | 압축을 푼 폴더에서 터미널을 열고 `bash start.sh` |

macOS에서도 터미널에서 `bash start.sh`로 실행할 수 있습니다. 실행 권한이 유지되지 않은 압축 해제 도구를 사용했다면 이 방법을 사용하세요.

Node.js는 앱 폴더의 `.runtime/`에 저장됩니다. 관리자 권한이나 별도 설치 없이 다음 실행부터 재사용합니다. 다운로드와 저장된 실행 파일의 SHA-256을 확인합니다.

- **Windows:** Windows 10 이상, x64·ARM64·x86 자동 구분
- **macOS:** macOS 11 이상, Apple Silicon·Intel 자동 구분
- **Linux:** x64·ARM64·ARMv7, 커널 4.18 이상·glibc 2.28 이상. Bash, curl, tar, sha256sum 또는 shasum 필요
- **Alpine 등 musl Linux:** x64 자동 준비를 지원하지만 일반 Linux와 별도 환경입니다. ARM musl에서는 배포판의 Node.js 22 이상을 설치하고 `node server.mjs`로 실행하세요.

운영체제별 요구 사항은 [Node.js 지원 플랫폼](https://github.com/nodejs/node/blob/v22.23.3/BUILDING.md#supported-platforms)을 따릅니다. 그래픽 환경이 없는 Linux는 브라우저를 열지 않고 접속 주소를 표시합니다. 자동 브라우저 열기가 필요 없다면 `bash start.sh --no-browser`를 사용하세요.

열린 실행 창을 유지하세요. `Ctrl+C`로 종료할 수 있습니다. 같은 네트워크의 휴대폰은 앱의 **다른 기기 연결**에 나오는 주소로 접속합니다. 방화벽에서 요청하면 **개인 네트워크** 접근을 허용하세요.

공유 파일은 `shared/`, 기록은 `.profiler/`에 저장됩니다. 새 버전으로 옮길 때 두 폴더를 함께 복사하면 데이터를 유지할 수 있습니다. 압축 파일 안에서 직접 실행하지 마세요.

## 문제가 생기면

- **다운로드 실패:** 인터넷 연결, 보안 프로그램, 폴더 쓰기 권한을 확인하고 다시 실행하세요.
- **체크섬 불일치:** 앱을 종료하고 `.runtime/` 폴더를 지운 다음 다시 실행하세요.
- **포트 사용 중:** 이미 열려 있는 proFILEr 실행 창을 확인하세요.
- **휴대폰 접속 실패:** 같은 Wi-Fi인지, PC가 켜져 있는지, 개인 네트워크 방화벽 허용 여부를 확인하세요.

## 저장 위치나 포트 바꾸기

macOS·Linux 터미널 예시:

```sh
PORT=4320 SHARED_DIR="$HOME/proFILEr-shared" DATA_DIR="$HOME/proFILEr-data" bash start.sh
```

Windows 설정 예시는 README에 있습니다. `DATA_DIR`는 공유 폴더 밖에 지정하세요. 데이터가 없는 새 ZIP에 `shared/`와 `.profiler/`를 복사하고 실행하면 이전 버전에서 이어서 사용할 수 있습니다.
