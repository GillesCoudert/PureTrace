Best Practices

---

## General principles

- Always treat errors as data, never as control flow (no exceptions in business logic).
- Use the Result pattern for all operations that may fail.
- Prefer small, pure functions returning Result or ResultAsync.

---

## Error handling

- Use `generateFailure` to create domain or technical errors.
- Never throw exceptions except at boundaries (interop, IO, etc.).
- Use `GetResult.fromThrowable` to capture exceptions at boundaries.

---

## Tracing & observability

- Add business or technical traces with `addTraces` or `tap` for observability.
- Use native helpers (`generateMessage`, `generateError`, `generateFailure`) to ensure structure and localizability of messages.

---

## Zod integration

- Always validate external inputs with Zod and `pureZodParse`.
- Use `convertZodParseResultToPureResult` to manually transform a Zod result if needed.

---

## Composition

- Compose business rules and validations via `chainSuccess` and `mapFailure`.
- Aggregate multiple results with `GetResult.fromResultArray` or `GetResult.fromResultArrayAsSuccess`.

---

## Async

- Use `ResultAsync.fromPromise` to integrate promises into the Result model.
- Chain async operations with `chainSuccess`, `chainFailure`, etc.

---

## Anti-patterns

- Never use try/catch in business logic.
- Do not handle errors as plain strings or loose objects.
- Do not create wrapper functions that add no value (e.g., a function that just calls `GetResult.fromResultArray` on a local list).
- Do not use identity transformations: `mapSuccess(() => value)` or `mapSuccess(() => new Success(value))` are no-ops and should be removed.
- Do not over-abstract: prefer direct usage of combinators (`GetResult.fromResultArray`, `chainSuccess`, etc.) over creating intermediate utility functions, unless they encapsulate domain logic or are reused in multiple places.
- Avoid builder functions that only delegate to a single combinator without adding domain semantics.

---

## Code simplification

- Use the simplest combinator that solves the problem. Don't layer on extra functions or transformations.
- If a transformation is the identity (returns input unchanged), remove it.
- When composing validations or results, use `GetResult.fromResultArray` directly—do not wrap it in a function unless that function adds domain meaning.
- Prefer data-driven composition (arrays/lists passed to combinators) over factory functions when possible.

---

## For AI agents

- Always respect the project's naming and structure conventions.
- Never modify ESLint rules or conventions without explicit validation.
- **Consult `best_practices.md` early**, especially sections on "Anti-patterns" and "Code simplification", to avoid creating unnecessary wrapper functions or identity transformations.
- Remove dead code and unnecessary abstractions immediately when identified.
