# Velog MCP

Codex, Claude 등 MCP 클라이언트에서 Velog 글을 조회하고, 안전하게 초안·비공개 글을 작성하며, 로컬 검색·Markdown 내보내기를 제공하는 stdio MCP 서버입니다.

## 기능

| 구분 | 내용 |
| --- | --- |
| 조회 | 공개 글 목록, 본문, 키워드 검색 |
| 작성 | 초안 생성, 비공개 글 발행 |
| Markdown 검사 | 제목 구조, 코드 펜스, 링크·이미지 접근성, 시크릿 패턴 검사 |
| 로컬 아카이브 | 공개 글 동기화, 키워드 검색, Markdown 내보내기 |

공개 발행은 기본으로 제공하지 않습니다. 서버를 시작할 때 `VELOG_ALLOW_PUBLIC=1`을 명시해야만 활성화됩니다.

## 설치

Windows와 Node.js 26.12.1 이상이 필요합니다.

```powershell
npm install -g @emprimula/velog-mcp
```

## Velog 계정 연결

```powershell
velog-auth setup
```

명령을 실행하면 Velog 로그인 페이지가 열립니다. 로그인한 다음 개발자 도구에서 아래 위치의 `refresh_token` 값을 복사해 숨김 입력창에 붙여넣으세요.

```text
F12 → Application → Cookies → https://velog.io → refresh_token
```

토큰은 현재 Windows 사용자에게만 복호화 가능한 DPAPI 형식으로 저장됩니다. 채팅이나 MCP 설정 파일에 토큰을 넣지 마세요.

```powershell
velog-auth status
velog-auth logout
```

## MCP 클라이언트 연결

### Codex

```powershell
codex mcp add velog -- velog-mcp
```

등록 후 Codex를 다시 시작하거나 새 채팅을 열면 됩니다.

### Claude Desktop 등

MCP 설정에 아래 stdio 서버를 추가한 뒤 클라이언트를 다시 시작하세요.

```json
{
  "mcpServers": {
    "velog": {
      "command": "velog-mcp",
      "args": []
    }
  }
}
```

이 서버는 PC에서 실행됩니다. 원격 MCP 서버나 Claude 웹 커넥터에는 바로 연결할 수 없습니다.

## 사용 예시

MCP 클라이언트에 다음처럼 요청합니다.

```text
내 Velog 공개 글을 로컬에 동기화하고, database 키워드가 포함된 글을 찾아줘.
```

도구를 직접 호출한다면 다음 순서입니다.

```json
velog_sync_local_index
{ "username": "내-velog-사용자명" }
```

```json
velog_search_local_index
{ "username": "내-velog-사용자명", "query": "database", "limit": 10 }
```

동기화한 글을 Markdown 파일로 내보낼 수도 있습니다.

```json
velog_export_local_posts
{ "username": "내-velog-사용자명" }
```

인덱스와 내보낸 파일은 `%LOCALAPPDATA%\velog-mcp` 아래에 저장됩니다. 직접 수정한 Markdown 파일은 다음 내보내기에서 덮어쓰지 않고 충돌로 표시합니다.

## 도구

| 도구 | 설명 | 변경 사항 |
| --- | --- | --- |
| `velog_list_posts` | 공개 글 목록 조회 | 없음 |
| `velog_get_post` | 글 본문 조회 | 없음 |
| `velog_search_posts` | Velog 공개 글 검색 | 없음 |
| `velog_format_markdown` | 발행 전 Markdown 검사 | 없음 |
| `velog_create_draft` | 초안 미리보기·생성 | `confirm: true`일 때 초안 생성 |
| `velog_publish_post` | 글 미리보기·발행 | 기본 비공개, `confirm: true` 필요 |
| `velog_sync_local_index` | 공개 글을 로컬 인덱스에 동기화 | 로컬 파일 생성·갱신 |
| `velog_search_local_index` | 로컬 인덱스 키워드 검색 | 없음 |
| `velog_export_local_posts` | 동기화된 글을 Markdown으로 내보내기 | 로컬 파일 생성·갱신 |

## 안전 장치

- 쓰기 작업은 `confirm: true`가 없으면 미리보기만 반환합니다.
- 시크릿처럼 보이는 값이 본문에 있으면 쓰기 전에 차단합니다.
- 뮤테이션 요청은 자동 재시도하지 않습니다.
- Velog가 갱신한 `refresh_token`을 보내면 암호화 저장소도 갱신합니다.
- 로컬 인덱스에는 Velog가 비공개로 표시한 글을 넣지 않습니다.

자동화 환경에서는 `VELOG_REFRESH_TOKEN` 환경 변수를 사용할 수 있습니다. 이 값은 암호화 저장소보다 우선하지만, 서버가 로컬에 저장하지는 않습니다.

## 개발

```powershell
pnpm install
pnpm run typecheck
pnpm run build
pnpm test
```

실제 비공개 발행과 읽기 검증은 테스트 계정에서만 실행하세요.

```powershell
pnpm run smoke:velog -- --confirm
```

이 명령은 고유한 비공개 테스트 글 하나를 만들고, 다시 읽어 검증합니다.

## 제한 사항

- Velog GraphQL API는 공식 문서가 없는 내부 API이므로 예고 없이 변경될 수 있습니다.
- 현재 계정 연결 도우미는 Windows만 지원합니다.
- 시맨틱 검색은 제공하지 않습니다.
- 이 프로젝트는 Velog 또는 Chaf Inc.와 관련이 없습니다.

## 라이선스

[MIT](./LICENSE)
