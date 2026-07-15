# AGENTS.md (src/)

## Module Context

Vite로 빌드되는 React 19 + TypeScript 프론트엔드. `App.tsx`가 상태(프로바이더, API 키, 생성된 컴포넌트 목록)를 소유하고, `useComponentGenerator` 훅에 백엔드(`/api/generate`) 호출을 위임한다.

## Tech Stack & Constraints

- 스타일은 일반 CSS 파일(`App.css`, `index.css`)과 CSS 커스텀 프로퍼티로 관리한다. CSS-in-JS, Tailwind, CSS 모듈을 추가로 도입하지 않는다.
- 미리보기 렌더링은 `react-live`(`LiveProvider`/`LivePreview`/`LiveError`, `noInline` 모드)만 사용한다. `iframe` 샌드박스나 다른 라이브 렌더링 라이브러리로 교체하지 않는다.
- 테스트는 Vitest + Testing Library + jsdom(`src/test/setup.ts`)으로 고정.

## Implementation Patterns

- 디자인 토큰은 `src/App.css`의 `:root` CSS 변수(`--primary`, `--accent`, `--mono` 등)로만 관리한다. 색상을 `#hex`로 직접 하드코딩하지 않고 변수를 사용한다.
- 헤드라인/키커(`.eyebrow`, `.panel-kicker`, `h1`, 탭, 타임스탬프 등)에는 `var(--mono)`를 적용해 "코드 생성 도구" 정체성을 유지한다. 본문 텍스트(`h2`, 단락)는 기본 sans-serif를 유지해 대비를 준다 — 전체를 모노스페이스로 바꾸지 않는다.
- `.panel-kicker`/`.eyebrow`는 `::before { content: '// ' }`로 주석 스타일 접두사를 자동 표시한다. 컴포넌트 JSX에 `// `를 직접 문자열로 넣지 않는다.
- 주요 패널(`composer-panel`, `settings-panel`, `component-card`)의 모서리 브래킷(registration mark, `::before`/`::after`)은 이 앱의 시그니처 디자인 요소다. 새 패널 타입을 추가할 때도 이 세 클래스 중 하나를 재사용하거나 동일 패턴을 따른다.
- 새 AI 프로바이더 추가 시 `PROVIDER_CONFIG`(`src/App.tsx`)에 `label`/`placeholder`를 추가한다(백엔드 쪽 갱신 대상은 루트 `AGENTS.md`의 Golden Rules 참고).
- 컴포넌트 생성 상태는 `useComponentGenerator` 훅에서만 관리한다. `App.tsx`나 `ComponentCard.tsx`에 fetch 로직을 직접 추가하지 않는다.

## Testing Strategy

- 테스트 명령: `bun run test`(루트에서 실행, `src/**/*.test.tsx` 포함).
- 컴포넌트 테스트는 `@testing-library/react` + `@testing-library/user-event`로 사용자 상호작용 기준으로 작성한다(`src/components/PromptInput.test.tsx` 참고). 내부 state 값 같은 구현 세부사항 대신 렌더링된 텍스트/역할로 단언한다.

## Local Golden Rules

- `react-live`용 생성 코드는 TypeScript 문법이 없는 plain JS다(백엔드 시스템 프롬프트 제약과 동일). 프론트엔드에서 이 코드에 TS 트랜스파일이 필요하다고 가정하지 않는다.
- API 키 입력 필드는 기본적으로 `password` 타입이며 `showKey` 토글로만 평문 노출한다. 민감정보 화면 노출을 최소화하는 것이므로 이 기본값을 바꾸지 않는다.
