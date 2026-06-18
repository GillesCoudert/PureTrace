# API Reference

This document describes the public API of PureTrace.
It focuses on types, responsibilities, and composition rules.

## Table of Contents

- [Result&lt;S&gt;](#results)
- [Success&lt;S&gt;](#successs)
- [Failure](#failure)
- [ResultAsync&lt;S&gt;](#resultasyncs)
- [GetResult](#getresult)
- [PureMessage](#puremessage)
- [Native pure message helpers](#native-pure-message-helpers)
- [Native pure message kinds](#native-pure-message-kinds)
- [Extending the taxonomy](#extending-the-taxonomy)
- [Zod integration helpers](#zod-integration-helpers)
- [Result serialization](#result-serialization)

## Result&lt;S&gt;

Represents the outcome of an operation.

```ts
type Result<S> = Success<S> | Failure;
```

A Result:

- is explicit (success or failure)
- propagates traces automatically
- accumulates traces through transformations

### Introspection

```ts
isSuccess(): boolean
isFailure(): boolean
```

```ts
getTraces(): PureMessage[]
```

Returns the trace messages, in order. A shallow copy — the messages themselves are immutable.

```ts
getErrors(): PureError[] // Failure only
```

Returns the errors (`kind: 'error'`). A shallow copy — the errors themselves are immutable.

### Transformations

```ts
mapSuccess<S2>(fn: (value: S) => Success<S2>): Result<S2>
```

```ts
mapFailure(fn: (errors: PureError[]) => Failure): Result<S>
```

```ts
mapBoth<S2>(
  onSuccess: (value: S) => Success<S2>,
  onFailure: (errors: PureError[]) => Failure,
): Result<S2>
```

### Chaining

```ts
chainSuccess<S2>(fn: (value: S) => Result<S2>): Result<S2>
```

```ts
chainFailure<S2>(fn: (errors: PureError[]) => Result<S2>): Result<S | S2>
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

### Side effects

```ts
tap(fn: (result: Result<S>) => void): Result<S>
```

Executes a function with the result for side effects (logging, debugging, etc.) without transforming it.

```ts
tapSuccess(fn: (success: Success<S>) => void): Result<S>
```

Executes a function with the success instance only if the result is a success. No-op for failures.

```ts
tapFailure(fn: (failure: Failure) => void): Result<S>
```

Executes a function with the failure instance only if the result is a failure. No-op for successes.

```ts
tapBoth(
  onSuccess: (success: Success<S>) => void,
  onFailure: (failure: Failure) => void,
): Result<S>
```

Executes the appropriate function depending on the result type without transforming it.

### Trace management

```ts
addTraces(traces: readonly PureMessage[]): void
```

```ts
addErrors(errors: readonly PureError[]): void // Failure only
```

`addTraces` and `addErrors` mutate the current instance in place (non-fluent) and perform **no runtime validation**: callers are trusted through the types. They are meant for the build phase, while you still own the result and have not handed it to the library. Validate untrusted or external input at the boundary with `pureZodParse` instead.

```ts
cloneWithTraces(ambient: readonly PureMessage[]): Result<S>
```

Returns a **new** result of the same variant, carrying this result's own messages followed by the given ambient traces. Never mutates the source — this is how the library propagates traces across combinators without touching results it receives.

## Success&lt;S&gt;

```ts
class Success<S> {
    readonly value: S;
}
```

Constructors:

```ts
new Success(value: S)
new Success(value: S, traces?: readonly PureMessage[])
```

## Failure

```ts
class Failure
```

Constructors:

```ts
new Failure(errors?: readonly PureError[], traces?: readonly PureMessage[])
```

## ResultAsync&lt;S&gt;

Asynchronous counterpart of Result.

```ts
class ResultAsync<S>
```

### Creation

```ts
ResultAsync.fromPromise<S>(
  promiseFn: () => Promise<S>,
  onError: (error: unknown) => Failure,
): ResultAsync<S>
```

```ts
ResultAsync.fromResultPromise<S>(
  promiseFn: () => Promise<Result<S>>,
): ResultAsync<S>
```

### Lifting helpers

```ts
ResultAsync.liftResult<S>(result: Result<S>): ResultAsync<S>
```

Lifts a Result into a ResultAsync.

**Important:** Do NOT use `liftResult(new Success(...))`, use `liftSuccess` instead.
**Important:** Do NOT use `liftResult(generateFailure(...))`, use `liftFailure` instead.

```ts
ResultAsync.liftSuccess<S>(value: S): ResultAsync<S>
```

Lifts a value into a ResultAsync as a Success. Prefer this over `liftResult(new Success(...))`.

```ts
ResultAsync.liftFailure<T extends NativeErrorType>(parameters: PureErrorParameters<T>): ResultAsync<never>
```

Lifts a Failure into a ResultAsync from PureError parameters. Prefer this over `liftResult(generateFailure(...))`.

### Composition

All Result methods are available (`mapSuccess`, `chainSuccess`, `tap`, etc.).

## GetResult

Utilities for integrating unsafe or external code.

### fromThrowable

```ts
GetResult.fromThrowable<X>(
  fn: () => X,
  onFailure: (error: unknown) => Failure,
): Result<X>
```

### fromResultArray

```ts
GetResult.fromResultArray<X>(
  results: Result<X>[],
  firstFailureOnly?: boolean,
): Result<X[]>
```

### fromResultArrayAsSuccess

```ts
GetResult.fromResultArrayAsSuccess<X>(
  results: Result<X>[],
): Success<X[]>
```

## Message

```ts
type Locale = string; // BCP 47 format: 'fr', 'en-US', 'ja-JP', etc.
// Pattern: /^[a-z]{2}(-[A-Z]{2})?$/

type LocalizedMessage = {
    locale?: Locale;
    message: string;
};

type PureMessage = {
    kind: string;
    type: string;
    code: string;
    data?: Json;
    issuer?: string;
    localizedMessage?: LocalizedMessage;
};
```

**Note:** Both `Locale` and `LocalizedMessage` are exported separately and can be used independently.

````

## Native pure message helpers

The following helpers are **recommended** when using PureTrace native pure message types.

### generateMessage

Creates a native non-error PureMessage (trace, information, metric) with optional issuer and localizedMessage.

```ts
generateMessage<K, T>(options: {
  kind: K;
  type: T;
  code: string;
  data?: MessageData<K, T>;
  issuer?: string;
  localizedMessage?: LocalizedMessage;
}): PureMessage
````

### generateError

Creates a native PureError without wrapping it in a Failure, with optional issuer and localizedMessage.

```ts
generateError<T>(options: {
  type: NativeErrorType;
  code: string;
  data?: NativeErrorData<T>;
  issuer?: string;
  localizedMessage?: LocalizedMessage;
}): PureError
```

Intended for advanced use cases where errors are assembled manually.

### generateFailure

Creates a Failure containing a native PureError.

```ts
generateFailure<T extends NativeErrorType>(parameters: {
  type: T;
  code: string;
  data?: NativeErrorData<T>;
  issuer?: string;
  localizedMessage?: LocalizedMessage;
}): Failure
```

Preferred way to create Failures when using native PureError types.

## Native pure message kinds

These are the **default** kinds and types, described by the augmentable `MessageRegistry` interface (see [Extending the taxonomy](#extending-the-taxonomy)). They are proposed, not imposed.

### PureErrors (`kind: 'error'`)

- `processError`
- `technicalIssue`
- `pureTraceInternalError`

### Information (`kind: 'information'`)

- `information`
- `warning`

### Metrics (`kind: 'metric'`)

- `start`
- `stop`

## Extending the taxonomy

The set of kinds, their types, and the `data` each carries is described by the augmentable `MessageRegistry` interface:

```ts
interface MessageRegistry {
    error: {
        processError: Json | undefined;
        technicalIssue: Json | undefined;
        pureTraceInternalError: Json | undefined;
    };
    information: { warning: Json | undefined; information: Json | undefined };
    metric: { start: string; stop: string };
}

type MessageKind = keyof MessageRegistry;
type MessageType<K extends MessageKind> = keyof MessageRegistry[K] & string;
type MessageData<K extends MessageKind, T extends MessageType<K>> = MessageRegistry[K][T];
```

Add a custom kind through module augmentation; `generateMessage` / `generateError` then become strict on it at compile time:

```ts
declare module '@gilles-coudert/pure-trace' {
    interface MessageRegistry {
        audit: { login: { userId: string }; logout: { userId: string } };
    }
}
```

This is a compile-time constraint only — a raw `PureMessage` keeps `kind: string`, and nothing is validated at runtime.

## Zod integration helpers

PureTrace integrates with [Zod](https://zod.dev/) v4 to convert validation results into the Result pattern.

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

**PureError handling:** each Zod issue maps to one structured `PureError` of type `processError`.

- **Standard Zod issues** (type mismatch, `min`/`max`, format, missing fields…) use the Zod issue `code` as the PureError `code` (e.g. `invalid_type`, `too_small`, `invalid_format`). The `data` preserves the issue context — `path`, `message`, and code-specific fields such as `expected`, `minimum`, or `format` — but never the rejected `input` (which may carry secrets/PII).

- **Custom errors** (from `.refine()` or `.superRefine()`) preserve their `message` as the PureError `code` and `params` as the PureError `data`

**Example:**

```ts
import { pureZodParse } from '@gilles-coudert/pure-trace';
import z from 'zod';

const schema = z.object({
    username: z.string().min(3),
    age: z.number().refine((val) => val >= 18, {
        message: 'userTooYoung',
        params: { minAge: 18 },
    }),
});

const result = pureZodParse({ username: 'ab', age: 15 }, schema);

if (result.isFailure()) {
    const errors = result.getErrors();
    // errors[0]: { code: 'too_small', type: 'processError',
    //             data: { origin: 'string', minimum: 3, inclusive: true,
    //                     path: ['username'], message: 'Too small: ...' } } // PureError
    // errors[1]: { code: 'userTooYoung', type: 'processError', data: { minAge: 18 } } // PureError
}
```

### convertZodParseResultToPureResult

Advanced helper for converting a Zod `SafeParseResult` into a PureTrace `Result` (with PureError).

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

const result = convertZodParseResultToPureResult(zodResult).tap((r) => {
    if (r.isSuccess()) {
        r.addTraces([
            generateMessage({
                kind: 'information',
                type: 'information',
                code: 'userValidated',
                data: { name: r.value.name },
            }),
        ]);
    }
});

// Access validated data and traces
if (result.isSuccess()) {
    const traces = result.getTraces();
    // traces contain validation success information
}
```

## Result serialization

For distributed systems that exchange serialized results between processes (queues, RPC, event stores).

### serializeResult

```ts
serializeResult<S extends Json>(result: Result<S>): SerializedResult
```

Produces a JSON-safe envelope. The success value must already be `Json`.

```ts
type SerializedResult =
  | { outcome: 'success'; value: Json; traces: PureMessage[] }
  | { outcome: 'failure'; errors: PureError[]; traces: PureMessage[] };
```

### deserializeResult

```ts
deserializeResult(input: unknown): Result<Json>
```

Rebuilds a Result from an untrusted envelope. Validates the envelope **structure** (well-formed messages), **not** the taxonomy — an unregistered `kind` is accepted on purpose. A malformed envelope yields a `Failure` with code `invalidResultEnvelope`; it never throws.

## Design notes

- No exceptions in business logic
- Errors are data, not control flow
- Traces are part of the Result
- Localization is enforced by structure
