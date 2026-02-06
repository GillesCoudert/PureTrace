# Examples

This document presents common PureTrace usage patterns.
Examples focus on composition, trace propagation, and error semantics.

---

## Validation pipeline

```ts
type ValidationRule<T> = (value: T) => Result<T>;

const notEmpty: ValidationRule<string> = (value) =>
    value.trim().length > 0
        ? new Success(value)
        : generateFailure('processError', 'emptyString', { value });

const minLength =
    (min: number): ValidationRule<string> =>
    (value) =>
        value.length >= min
            ? new Success(value)
            : generateFailure('processError', 'stringTooShort', {
                  min,
                  actual: value.length,
              });

const maxLength =
    (max: number): ValidationRule<string> =>
    (value) =>
        value.length <= max
            ? new Success(value)
            : generateFailure('processError', 'stringTooLong', {
                  max,
                  actual: value.length,
              });

function composeValidations<T>(
    ...rules: ValidationRule<T>[]
): ValidationRule<T> {
    return (value) =>
        rules.reduce(
            (result, rule) => result.chainSuccess(rule),
            new Success(value) as Result<T>,
        );
}

const validateUsername = composeValidations(
    notEmpty,
    minLength(3),
    maxLength(20),
);
```

---

## Business rule composition

```ts
function validateAge(age: number): Result<number> {
    if (age < 18) {
        return generateFailure('processError', 'tooYoung', { age });
    }

    if (age > 120) {
        return generateFailure('processError', 'tooOld', { age });
    }

    return new Success(age);
}

function registerUser(ageInput: string): Result<number> {
    return parseAge(ageInput).chainSuccess(validateAge);
}
```

---

## Error filtering and mapping

```ts
const result = processUser(data).mapFailure((errors) => {
    const processErrors = errors.filter(
        (error) => error.type === 'processError',
    );

    return processErrors.length > 0
        ? new Failure(...processErrors)
        : new Failure(...errors);
});
```

---

## Async orchestration

```ts
const result = await ResultAsync.fromPromise(
    () => fetchUser(id),
    (error) =>
        generateFailure('technicalIssue', 'userFetchFailed', { id, error }),
)
    .chainSuccess((user) =>
        ResultAsync.fromPromise(
            () => fetchUserProfile(user.id),
            (error) =>
                generateFailure('technicalIssue', 'profileFetchFailed', {
                    userId: user.id,
                    error,
                }),
        ).mapSuccess((profile) => new Success({ ...user, profile })),
    )
    .chainSuccess((user) =>
        ResultAsync.fromPromise(
            () => fetchPermissions(user.id),
            (error) =>
                generateFailure('technicalIssue', 'permissionsFetchFailed', {
                    userId: user.id,
                    error,
                }),
        ).mapSuccess((permissions) => new Success({ ...user, permissions })),
    );
```

---

## Tracing and metrics

```ts
const result = processOrder(order).tap((r) => {
    r.addTraces(
        generateMessage({
            kind: 'metric',
            type: 'start',
            code: 'orderProcessingStarted',
            data: { orderId: order.id, timestamp: Date.now() },
        }),
    );
});
```

```ts
const result = processOrder(order).tap((r) => {
    r.addTraces(
        generateMessage({
            kind: 'metric',
            type: 'stop',
            code: 'orderProcessingFinished',
            data: { orderId: order.id, timestamp: Date.now() },
        }),
    );
});
```

---

## Retry with trace accumulation

```ts
async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    retries: number,
): Promise<Result<T>> {
    let lastFailure: Failure | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        const result = await ResultAsync.fromPromise(fn, (error) =>
            generateFailure('technicalIssue', 'networkError', {
                attempt,
                error,
            }),
        );

        if (result.isSuccess()) {
            return result.tap((r) =>
                r.addTraces(
                    generateMessage({
                        kind: 'information',
                        type: 'information',
                        code: 'retrySucceeded',
                        data: { attempt },
                    }),
                ),
            );
        }

        lastFailure = result as Failure;
    }

    return lastFailure!.addTraces(
        generateMessage({
            kind: 'information',
            type: 'information',
            code: 'retryExhausted',
            data: { retries },
        }),
    );
}
```

---

## Boundary protection (throwable code)

```ts
const result = GetResult.fromThrowable(
    () => JSON.parse(payload),
    (error) =>
        generateFailure('technicalIssue', 'jsonParseError', {
            payload,
            error,
        }),
);
```

---

## Pattern matching with recovery

```ts
const result = divide(10, 0).chainBoth(
    (value) => new Success(value),
    (errors) => {
        log(errors);
        return new Success(0);
    },
);
```

---

## Aggregating results

```ts
const results: Result<number>[] = inputs.map(parseAge);

const aggregated = GetResult.fromResultArray(results);
```

```ts
const tolerant = GetResult.fromResultArrayAsSuccess(results);
```

---

## Design guidance

- Prefer small Result-returning functions
- Use `generateFailure` for domain and technical errors
- Use `tap` for observability
- Convert thrown errors only at boundaries
- Treat errors as part of the domain model
