# 로드맵: Markdown 템플릿, 멀티플랫폼 인증, 후속 기능

## 목표

Velog MCP를 단순한 API 연결 도구가 아니라, 글을 작성하고 쌓아 두며 다시 활용하는 로컬 글쓰기 공간으로 발전시킵니다.

## P0 — 일관된 Markdown 템플릿 생성

- [ ] `velog_format_markdown`을 검사 전용 도구에서 완성된 글 구조 생성 도구로 확장
- [ ] 제목, 요약, 본문 섹션, 코드 예제, 참고 자료, 태그 입력 규격 정의
- [ ] 제목 단계, 줄바꿈, 코드 펜스 언어, 링크, 이미지 alt, `## References`를 일관되게 생성
- [ ] 사용자가 작성한 문장은 가능한 한 보존하고, 기술적 주장을 임의로 만들지 않기
- [ ] `formattedBody`, `warnings`, `errors`, 미리보기 반환
- [ ] 시크릿, 닫히지 않은 코드 펜스, 잘못된 링크가 남아 있으면 발행 차단
- [ ] 한국어, 목록, 코드 펜스, 링크, 이미지, 참고 자료 테스트 추가

### 완료 조건

같은 입력에는 언제나 같은 Markdown이 반환되어야 합니다. 사용자는 결과를 그대로 비공개 초안에 넣어도 제목 구조와 코드 블록을 다시 손볼 필요가 없어야 합니다.

## P1 — macOS/Linux 인증 저장소

- [ ] Windows DPAPI 구현 유지
- [ ] macOS Keychain 지원
- [ ] Linux Secret Service/libsecret 지원
- [ ] 세 운영체제에서 `setup`, `status`, `logout` 동작 통일
- [ ] 브라우저 쿠키 데이터베이스 자동 추출 금지
- [ ] 갱신된 `refresh_token`을 각 운영체제 저장소에 반영
- [ ] 토큰을 출력하지 않는 운영체제별 테스트 또는 안전한 통합 점검 추가

### 완료 조건

같은 npm 패키지를 Windows, macOS, Linux에 설치할 수 있어야 합니다. 인증 정보는 운영체제 사용자 전용 비밀 저장소에만 보관하고, MCP JSON이나 프로젝트의 평문 파일에는 저장하지 않습니다.

## P2 — 후속 기능

- [ ] 연결된 계정의 사용자명을 보여 주는 `velog_get_current_user` 또는 setup 상태 기능
- [ ] 로컬 인덱스 동기화 전 미리보기와 삭제·보관 대상 보고
- [ ] Markdown export 경로와 front matter 사용자 설정
- [ ] 미리보기·확인 절차를 적용한 기존 글 수정 기능
- [ ] 뮤테이션을 재시도하지 않으면서 네트워크·rate limit 오류 안내 개선
- [ ] typecheck, build, test, package dry-run을 수행하는 release workflow 추가
- [ ] 키워드 검색과 Markdown 스냅샷이 안정화된 뒤 semantic search 검토

## 명시적 비목표

- 브라우저 쿠키 자동 추출이나 Velog 비밀번호 자동 입력
- 기본 공개 발행
- 여러 사용자의 토큰을 보관하는 호스팅 서비스
- 안정적인 로컬 스냅샷 이전의 semantic search
