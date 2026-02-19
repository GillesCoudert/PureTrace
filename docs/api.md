# API Reference

This document describes the public API of PureTrace.  
It focuses on types, responsibilities, and composition rules.

---

## Result<S>

Represents the outcome of an operation.

```ts
type Result<S> = Success<S> | Failure;
```

A Result:

- is explicit (success or failure)
- propagates traces automatically
- accumulates traces through transformations

---

### Introspection

```ts
isSuccess(): boolean
isFailure(): boolean
```

```ts
getTraces(): Message[]
```

Returns all trace messages (errors included), in order.

```ts
getErrors(): Message[] // Failure only
```

Returns messages with `kind: 'error'`.

---

### Transformations

```ts
mapSuccess<S2>(fn: (value: S) => Success<S2>): Result<S2>
```

```ts
mapFailure(fn: (errors: Message[]) => Failure): Result<S>
```

```ts
mapBoth<S2>(
  onSuccess: (value: S) => Success<S2>,
  onFailure: (errors: Message[]) => Failure,
): Result<S2>
```

---

### Chaining

```ts
chainSuccess<S2>(fn: (value: S) => Result<S2>): Result<S2>
```

```ts
chainFailure<S2>(fn: (errors: Message[]) => Result<S2>): Result<S | S2>
```

```ts
chainBoth<S2, S3>(
  onSuccess: (value: S) => Result<S2>,
  onFailure: (errors: Message[]) => Result<S3>,
): Result<S2 | S3>
```

```ts
chain<S2>(fn: (result: Result<S>) => Result<S2>): Result<S2>
```

---

### Side effects

```ts
tap(fn: (result: Result<S>) => void): Result<S>
```

---

### Trace management

```ts
addTraces(...traces: Message[]): this
```

```ts
addErrors(...errors: Message[]): this // Failure only
```

---

## Success<S>

```ts
class Success<S> {
    readonly value: S;
}
```

Constructors:

```ts
new Success(value: S)
new Success(value: S, initialTrace: Message)
```

---

## Failure

```ts
class Failure
```

Constructors:

```ts
new Failure(...errors: Message[])
```

---

## ResultAsync<S>

Asynchronous counterpart of Result.

```ts
class ResultAsync<S>
```

---

### Creation

```ts
ResultAsync.fromPromise<S>(
  promiseFn: () => Promise<S>,
  onError: (error: unknown) => Failure,
): ResultAsync<S>
```

---

### Composition

All Result methods are available (`mapSuccess`, `chainSuccess`, `tap`, etc.).

---

## GetResult

Utilities for integrating unsafe or external code.

---

### fromThrowable

```ts
GetResult.fromThrowable<X>(
  fn: () => X,
  onFailure: (error: unknown) => Failure,
): Result<X>
```

---

### fromResultArray

```ts
GetResult.fromResultArray<X>(
  results: Result<X>[],
  firstFailureOnly?: boolean,
): Result<X[]>
```

---

### fromResultArrayAsSuccess

```ts
GetResult.fromResultArrayAsSuccess<X>(
  results: Result<X>[],
): Success<X[]>
```

---

## Message

```ts
type Message = {
    kind: string;
    type: string;
    code: string;
    data?: unknown;
    issuer?: string; // (optionnel) Qui a émis le message
    localizedMessage?: string; // (optionnel) Message localisé pour l'utilisateur
};
```

---

## Native message helpers

The following helpers are **recommended** when using PureTrace native message types.

---

### generateMessage

Creates a native non-error Message (trace, information, metric) with optional issuer and localizedMessage.

```ts
generateMessage<K, T>(options: {
  kind: K;
  type: T;
  code: string;
  data?: NativeMessageData<K, T>;
  issuer?: string;
  localizedMessage?: string;
}): Message
```

---

### generateError

Creates a native error Message without wrapping it in a Failure, with optional issuer and localizedMessage.

```ts
generateError<T>(options: {
  type: NativeErrorType;
  code: string;
  data?: NativeErrorData<T>;
  issuer?: string;
  localizedMessage?: string;
}): Message
```

Intended for advanced use cases where errors are assembled manually.

---

### generateFailure

Creates a Failure containing a native error Message.

```ts
generateFailure<T>(
  type: NativeErrorType,
  code: string,
  data?: NativeErrorData<T>,
  issuer?: string,
  localizedMessage?: string,
): Failure
```

Preferred way to create Failures when using native error types.

---

## Native message kinds

### Errors (`kind: 'error'`)

- `processError`
- `technicalIssue`
- `pureTraceInternalError`

### Information (`kind: 'information'`)

- `information`
- `warning`

### Metrics (`kind: 'metric'`)

- `start`
- `stop`

---

## Zod integration helpers

PureTrace integrates with [Zod](https://zod.dev/) v4 to convert validation results into the Result pattern.

---

### pureZodParse

Parses data with a Zod schema and returns a Result.

```ts
pureZodParse<T extends z.ZodObject<any>>(
  data: unknown,
  contract: T,
): Result<z.infer<T>>
```

**Behavior:**

- On **success**: returns `Success<T>` with validated data
- On **failure**: returns `Failure` with structured errors

**Error handling:**

- **Generic Zod errors** (type mismatch, missing fields, etc.) are aggregated into a single error with code `zodParseFailed` and type `processError`. The error data contains:
  - `count`: number of issues
  - `zodError`: stack trace for debugging

- **Custom errors** (from `.refine()` or `.superRefine()`) preserve their `message` as the error `code` and `params` as the error `data`

**Example:**

```ts
import { pureZodParse } from '@gilles-coudert/pure-trace';
import z from 'zod';

const schema = z.object({
    username: z.string().min(3),
    age: z.number().refine((val) => val >= 18, {
        message: 'USER_TOO_YOUNG',
        params: { minAge: 18 },
    }),
});

const result = pureZodParse({ username: 'ab', age: 15 }, schema);

if (result.isFailure()) {
    const errors = result.getErrors();
    // errors[0]: { code: 'USER_TOO_YOUNG', type: 'processError', data: { minAge: 18 } }
    // errors[1]: { code: 'zodParseFailed', type: 'processError', data: { count: '1', zodError: '...' } }
}
```

---

### convertZodParseResultToPureResult

Advanced helper for converting a Zod `SafeParseResult` into a PureTrace `Result`.

```ts
convertZodParseResultToPureResult<TOutput>(
  result: z.ZodSafeParseResult<TOutput>,
): Result<TOutput>
```

**Use case:** When you need to process Zod results manually before converting them.

**Example:**

```ts
import { convertZodParseResultToPureResult } from '@gilles-coudert/pure-trace';
import z from 'zod';

const schema = z.object({ name: z.string() });
const zodResult = schema.safeParse({ name: 'Alice' });

const result = convertZodParseResultToPureResult(zodResult);

if (result.isSuccess()) {
    console.log(result.value); // { name: 'Alice' }
}
```

---

## Design notes

- No exceptions in business logic
- Errors are data, not control flow
- Traces are part of the Result
- Localization is enforced by structure
