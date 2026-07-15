# AGENTS.md

## Operational Commands

- Package manager: `bun` 고정. `npm`/`yarn`/`pnpm` 사용 금지 (`bun.lock`만 유지한다).
- 설치: `bun install`
- 개발 서버(API + Vite 동시 실행): `bun run dev`
- API 서버만: `bun run server` (`bun --watch run server/index.ts`, port 3002)
- 빌드: `bun run build` (`tsc -b && vite build`)
- 테스트: `bun run test` (`vitest run`) / 워치 모드: `bun run test:watch`
- 린트: `bun run lint`

## Golden Rules

- API 키를 코드에 하드코딩하지 않는다. `.env`(`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`) 또는 클라이언트 입력으로만 전달한다.
- `.env`는 절대 커밋하지 않는다(`.gitignore`에 등록됨).
- 프론트엔드는 `/api/*`를 통해서만 백엔드와 통신한다(Vite 프록시가 `http://localhost:3002`로 전달, `vite.config.ts` 참고). 프론트엔드 코드에서 외부 AI API 엔드포인트를 직접 호출하지 않는다.
- 새 AI 프로바이더를 추가할 때는 `src/types/index.ts`의 `Provider` 유니온, `src/App.tsx`의 `PROVIDER_CONFIG`, `server/index.ts`의 `ENV_KEYS`/`Provider` 타입을 함께 갱신한다. 셋 중 하나만 바꾸면 프로바이더 선택 UI와 서버 라우팅이 어긋난다.
- `server/generator.ts`, `server/fallback.ts`의 함수는 부수효과 없는 순수 함수로 유지한다(부수효과는 `server/index.ts`의 `Bun.serve` 핸들러 안에서만 다룬다). 단위 테스트 가능성을 위한 의도적 분리다.

## Project Context

프롬프트를 입력하면 AI(Anthropic Claude 또는 Google Gemini 중 선택)가 React 컴포넌트를 생성하고, `react-live`로 즉시 렌더링 미리보기와 코드를 함께 보여주는 도구.

Tech Stack: React 19, TypeScript, Vite, react-live, Bun(백엔드 런타임), Vitest, Testing Library, ESLint.

## Standards & References

- 커밋 메시지 컨벤션과 절차는 `.claude/skills/commit/SKILL.md`를 따른다(`{type}: {한국어 요약}` 형식, 사용자 승인 후 커밋).
- 코딩 컨벤션 상세는 `eslint.config.js`를 따른다.
- 실행 방법은 `README.md`에 있으므로 여기서 반복하지 않는다.
- Maintenance Policy: 이 문서와 실제 코드가 어긋나면(포트 번호, 스크립트 이름 변경 등) 코드 수정과 함께 이 문서 갱신을 제안한다.

## Context Map

- **[백엔드 API 서버 작업](./server/AGENTS.md)** — `server/` 이하 AI 프록시, 프로바이더 연동, 폴백 로직 수정 시.
- **[프론트엔드 작업](./src/AGENTS.md)** — `src/` 이하 컴포넌트, 훅, 디자인 시스템 수정 시.
