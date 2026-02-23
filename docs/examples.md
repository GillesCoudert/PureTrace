# Examples

This document presents common PureTrace usage patterns, focusing on composition, trace propagation, and error semantics. Each example illustrates a best practice described in [best_practices.md](best_practices.md).

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

const validateUsername = (value: string) =>
    GetResult.fromResultArray([
        notEmpty(value),
        minLength(3)(value),
        maxLength(20)(value),
    ]);
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
            return result.mapSuccess((value) =>
                new Success(value).addTraces(
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

## Zod validation with custom errors

```ts
import { pureZodParse } from '@gilles-coudert/pure-trace';
import z from 'zod';

const registrationSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    age: z.number().refine((val) => val >= 18, {
        message: 'userTooYoung',
        params: { minAge: 18 },
    }),
});

function registerUser(
    data: unknown,
): Result<{ username: string; email: string; age: number }> {
    return pureZodParse(data, registrationSchema).mapFailure((errors) =>
        new Failure(...errors).addTraces(
            generateMessage({
                kind: 'information',
                type: 'warning',
                code: 'registrationValidationFailed',
                data: { timestamp: Date.now() },
                issuer: 'userService',
            }),
        ),
    );
}

const result = registerUser({ username: 'ab', email: 'bad', age: 15 });

if (result.isFailure()) {
    const errors = result.getErrors();
    // Error codes include: 'userTooYoung', 'zodParseFailed'
    // Generic validation errors are aggregated
}
```

---

## Combining Zod validation with business rules

```ts
import { pureZodParse } from '@gilles-coudert/pure-trace';
import z from 'zod';

const userSchema = z.object({
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    role: z.enum(['admin', 'user', 'guest']),
});

function checkEmailDomain(email: string): Result<string> {
    const allowedDomains = ['company.com', 'partner.com'];
    const domain = email.split('@')[1];

    return allowedDomains.includes(domain)
        ? new Success(email)
        : generateFailure('processError', 'invalidEmailDomain', {
              email,
              domain,
              allowedDomains,
          });
}

function checkRolePermission(role: string): Result<string> {
    return role === 'guest'
        ? generateFailure('processError', 'guestRegistrationDisabled', {
              role,
          })
        : new Success(role);
}

function validateRegistration(
    data: unknown,
): Result<{ email: string; role: string }> {
    return pureZodParse(data, userSchema).chainSuccess((user) =>
        checkEmailDomain(user.email)
            .chainSuccess(() => checkRolePermission(user.role))
            .mapSuccess(() => new Success(user)),
    );
}

const result = validateRegistration({
    email: 'user@external.com',
    role: 'user',
});

if (result.isFailure()) {
    // Could fail at schema validation, domain check, or role check
    console.log(result.getErrors());
}
```

---

## Transforming Zod results for API responses

```ts
import { pureZodParse } from '@gilles-coudert/pure-trace';
import z from 'zod';

const apiRequestSchema = z.object({
    action: z.enum(['create', 'update', 'delete']),
    payload: z.record(z.unknown()),
});

function handleApiRequest(
    rawData: unknown,
): Result<{ action: string; payload: Record<string, unknown> }> {
    return pureZodParse(rawData, apiRequestSchema)
        .mapFailure((errors) => {
            // Transform validation errors for API response
            const apiErrors = errors.map((err) =>
                generateError({
                    type: 'processError',
                    code: 'invalidRequest',
                    data: {
                        originalCode: err.code,
                        originalData: err.data,
                    },
                    localizedMessage: 'The request format is invalid.',
                }),
            );
            return new Failure(...apiErrors);
        })
        .mapSuccess((value) =>
            new Success(value).addTraces(
                generateMessage({
                    kind: 'metric',
                    type: 'start',
                    code: 'requestValidated',
                    data: { timestamp: Date.now() },
                }),
            ),
        );
}

const result = handleApiRequest({ action: 'invalid', payload: {} });

if (result.isFailure()) {
    const errors = result.getErrors();
    // All errors have code 'invalidRequest' with original error details in data
}
```

---

## Design guidance

- Prefer small Result-returning functions
- Use `generateFailure` for domain and technical errors
- Use `tap` for observability
- Convert thrown errors only at boundaries
- Treat errors as part of the domain model
