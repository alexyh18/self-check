# 안드로이드에서 실행하기

이 앱은 **PWA(설치형 웹앱)** 로 만들어져 있어, 안드로이드에서 두 가지 방법으로 실행할 수 있습니다.

---

## 방법 1 — 지금 바로: PWA로 설치 (가장 빠름, 빌드 불필요)

안드로이드 폰의 **Chrome**에서 앱을 열고 홈 화면에 설치하면 네이티브 앱처럼 전체화면으로 실행됩니다.

### 1) 앱을 HTTPS로 호스팅

PWA 설치는 **HTTPS**(또는 localhost)에서만 됩니다. 아래 중 아무거나 사용하세요.

- **GitHub Pages** (무료, 추천)
  ```bash
  # scalp-check 폴더 내용을 저장소 루트(또는 /docs)에 올리고 Pages 활성화
  # 예: https://<user>.github.io/<repo>/
  ```
- **Netlify / Vercel / Cloudflare Pages**: 폴더를 드래그&드롭하면 끝
- **같은 와이파이에서 임시 테스트**: PC에서 `python3 -m http.server` 후
  `ngrok http 8099` 로 HTTPS 터널을 열어 폰에서 접속

### 2) 폰에서 설치

1. 안드로이드 **Chrome**으로 위 HTTPS 주소 접속
2. 주소창 오른쪽 **⋮ 메뉴 → "앱 설치"** (또는 하단에 뜨는 "홈 화면에 추가")
   - 앱 안의 **"⬇️ 홈 화면에 앱 설치"** 버튼으로도 설치 가능
3. 홈 화면 아이콘으로 실행 → 주소창 없는 전체화면 앱으로 동작, **오프라인에서도 실행**

> 📷 카메라/사진 선택은 설치형에서도 그대로 동작합니다
> (`<input type="file" accept="image/*" capture="environment">`).

---

## 방법 2 — Play 스토어용 APK/AAB 만들기 (TWA)

PWA를 **Trusted Web Activity**로 감싸 실제 설치 파일(APK/AAB)을 만듭니다.
> ⚠️ 이 과정은 **인터넷 + Android SDK/JDK**가 필요하므로, 네트워크가 열린 PC에서 진행하세요.
> (현재 개발 샌드박스는 외부 네트워크가 차단되어 여기서는 빌드할 수 없습니다.)

### 사전 준비

- Node.js 18+ , JDK 17+
- 앱이 **HTTPS 도메인에 배포**되어 있어야 함 (방법 1의 호스팅)

### Bubblewrap으로 빌드

```bash
# 1) Bubblewrap 설치
npm i -g @bubblewrap/cli

# 2) 이 폴더의 템플릿을 복사해 실제 도메인으로 수정
#    android/twa-manifest.json 안의 "example.com" 을 배포 도메인으로 전부 교체
cp android/twa-manifest.json ./twa-manifest.json

# 3) 프로젝트 초기화 (배포한 manifest URL 사용)
bubblewrap init --manifest https://<your-domain>/manifest.webmanifest

# 4) 빌드 → app-release-signed.apk / .aab 생성
bubblewrap build
```

### Digital Asset Links (설치 후 주소창 숨김에 필수)

`bubblewrap build` 가 출력하는 서명 지문(SHA-256)을 아래 파일로 만들어
**배포 도메인의 `/.well-known/assetlinks.json`** 에 올려야 TWA가 "신뢰된" 상태로 전체화면 실행됩니다.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.scalpcheck.app",
      "sha256_cert_fingerprints": ["<빌드 시 출력된 SHA-256 지문>"]
    }
  }
]
```

### 폰에 설치

```bash
# USB 디버깅 켠 폰 연결 후
adb install app-release-signed.apk
```

---

## 방법 3 — Capacitor로 네이티브 래핑 (대안)

플러그인(네이티브 카메라 등)이 더 필요하면 Capacitor도 가능합니다. (역시 네트워크/SDK 필요)

```bash
npm i -g @capacitor/cli
npm init -y
npm i @capacitor/core @capacitor/android
npx cap init "정수리 체크" com.scalpcheck.app --web-dir .
npx cap add android
npx cap open android   # Android Studio에서 Run/Build APK
```

---

## 요약

| 원하는 것 | 방법 |
|---|---|
| 지금 바로 폰에서 쓰기 | **방법 1 (PWA 설치)** — 빌드 불필요 |
| Play 스토어 배포 | 방법 2 (TWA/Bubblewrap) |
| 네이티브 기능 확장 | 방법 3 (Capacitor) |

세 방법 모두 **동일한 웹 코드**(`index.html`·`app.js`·`analysis.js`·`styles.css`)를 그대로 사용합니다.
