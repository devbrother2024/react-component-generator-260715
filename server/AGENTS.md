# AGENTS.md (server/)

## Module Context

Bun 런타임으로 직접 구동되는 AI API 프록시 서버(`Bun.serve`, `server/index.ts`). Vite 프론트엔드와 별도 프로세스로 실행되며, `vite.config.ts`의 프록시 설정을 통해서만 연결된다. `tsc -b && vite build` 빌드 파이프라인의 대상이 아니라 `bun --watch run server/index.ts`로 직접 실행된다.

## Tech Stack & Constraints

- `Bun.serve`만 사용한다. Express/Fastify 등 별도 HTTP 프레임워크를 추가하지 않는다.
- 포트는 `3002`로 고정(`server/index.ts`의 `Bun.serve({ port: 3002 })`). 변경 시 `vite.config.ts`의 프록시 target도 함께 수정해야 한다.
- 외부 AI 호출은 `fetch`만 사용한다. Anthropic/Google 공식 SDK를 추가로 도입하지 않는다(현재 raw REST 호출로 통일되어 있음).

## Implementation Patterns

- 라우팅은 `server/index.ts`의 `fetch` 핸들러 안에서 `url.pathname` 분기로 처리한다(현재 `/api/config`, `/api/generate` 2개). 별도 라우터 라이브러리를 도입하지 않는다.
- 모든 응답에 `CORS_HEADERS`를 포함한다. 새 엔드포인트 추가 시 누락하지 않는다.
- Google 프로바이더는 `GOOGLE_MODELS` 배열(우선순위 순)과 `withModelFallback`(`server/fallback.ts`)으로 모델 단위 폴백을 구현한다. 모델 추가/순서 변경은 이 배열만 수정하면 된다.
- 에러 분기는 메시지에 HTTP 상태 코드 문자열(`'503'`, `'429'`)이 포함되는지로 판단한다(`server/index.ts`의 catch 블록). 새 에러 케이스도 이 패턴을 따른다.
- AI 응답 후처리(`stripCodeFences`, `ensureRenderCall`)는 `server/generator.ts`에 순수 함수로 둔다. `Bun.serve` 핸들러의 부수효과 있는 로직과 섞지 않는다.

## Testing Strategy

- 테스트 명령: `bun run test`(루트에서 실행, `server/**/*.test.ts` 포함).
- `server/generator.test.ts`, `server/fallback.test.ts`처럼 순수 함수만 단위 테스트한다. `Bun.serve` 자체나 실제 네트워크 호출은 테스트하지 않는다(모킹 없이 순수 로직만 검증하는 현재 패턴 유지).

## Local Golden Rules

- `resolveApiKey`의 우선순위(클라이언트 입력 > 서버 `.env`)를 바꾸지 않는다. 사용자가 직접 입력한 키로 서버 키를 덮어쓸 수 있어야 하는 것이 의도된 동작이다(프론트엔드의 ".env 키가 연결되어 있습니다" 안내와 짝을 이룸).
- 시스템 프롬프트(`SYSTEM_PROMPT`)는 "TypeScript 문법 금지, plain JavaScript만" 규칙을 명시한다. `react-live`의 `noInline` 모드가 트랜스파일 없이 코드를 실행하기 때문이며, 이 제약을 제거하지 않는다.
