# PureTrace

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![npm version](https://badge.fury.io/js/%40gilles-coudert%2Fpure-trace.svg)](https://www.npmjs.com/package/@gilles-coudert/pure-trace)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

> A TypeScript library providing standardized, localizable, and traceable error handling by design, with observability built-in.

## 📋 Table of Contents

- [About](#about)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Advanced Examples](#advanced-examples)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🎯 About

**PureTrace** is a TypeScript library that applies functional programming principles to error handling using the Result pattern instead of traditional exceptions. Each operation explicitly returns either a success or failure result, with a complete trace of its execution.

### Why PureTrace?

- **Explicit error handling**: No more scattered `try/catch` blocks - every function clearly declares its success and failure cases
- **Complete traceability**: Every operation accumulates traces that let you understand exactly what happened
- **Maximum type-safety**: Full exploitation of TypeScript's type system with Zod
- **Internationalization ready**: Message structure designed to facilitate localization
- **Native observability**: Traces, metrics, and context built-in from the ground up

## ✨ Key Features

### 🔒 Type-Safety with Result Pattern

Handle success and failure explicitly without throwing exceptions:

```typescript
function divide(a: number, b: number): Result<number> {
    if (b === 0) {
        return generateFailure('processError', 'divisionByZero', { a, b });
    }
    return new Success(a / b);
}
```

### 📊 Built-in Observability

Every operation carries a trace of its execution path:

```typescript
const result = validateUser(userData)
    .tap((r) =>
        r.addTraces(
            generateMessage(
                'metric',
                'start',
                'userValidationStart',
                new Date().toISOString(),
            ),
        ),
    )
    .mapSuccess((user) => enrichUser(user))
    .tap((r) =>
        r.addTraces(
            generateMessage(
                'metric',
                'stop',
                'userValidationEnd',
                new Date().toISOString(),
            ),
        ),
    );

// Analyze the complete execution path
console.log(result.getTraces());
```

### 🌍 Native Localization

Structured messages with codes to facilitate translation:

```typescript
const failure = generateFailure(
    'processError',
    'userNotFound', // Translation key
    { userId: '123' }, // Context for translation
);

// In your translation system:
// en: "User {userId} not found"
// fr: "L'utilisateur {userId} n'a pas été trouvé"
```

### 🔗 Chainable API

Fluent interface for composing operations with automatic trace propagation:

```typescript
const result = await fetchUser(id)
    .mapSuccess((user) => new Success(user.profile))
    .chainSuccess((profile) => validateProfile(profile))
    .tap((r) => {
        if (r.isSuccess()) {
            console.log('Valid profile:', r.value);
        }
    })
    .mapFailure((errors) => enrichError(errors));
```

### ⚡ Full Async Support

First-class support for asynchronous operations:

```typescript
const userResult = await ResultAsync.fromPromise(
    () => fetch('/api/user'),
    (error) => generateFailure('technicalIssue', 'networkError', { error }),
).chainSuccess((response) =>
    ResultAsync.fromPromise(
        () => response.json(),
        (error) =>
            generateFailure('technicalIssue', 'jsonParseError', { error }),
    ),
);
```

### 🔧 Zod Integration

Runtime validation with Zod schemas:

```typescript
const userSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    age: z.number().positive(),
});

const result = GetResult.fromThrowable(
    () => userSchema.parse(userData),
    (error) => generateFailure('technicalIssue', 'validationError', { error }),
);
```

## 📦 Installation

```bash
npm install @gilles-coudert/pure-trace
```

## 🚀 Quick Start

### Basic Example

```typescript
import {
    GetResult,
    Result,
    Success,
    generateFailure,
    generateMessage,
} from '@gilles-coudert/pure-trace';

// Function that can fail
function parseAge(input: string): Result<number> {
    const age = parseInt(input);

    if (isNaN(age)) {
        return generateFailure('processError', 'invalidAgeFormat', { input });
    }

    if (age < 0 || age > 150) {
        return generateFailure('processError', 'ageOutOfRange', { age });
    }

    return new Success(age);
}

// Usage
const result = parseAge('25');

if (result.isSuccess()) {
    console.log('Age:', result.value); // 25
} else {
    console.error('Error:', result.getErrors());
}
```

### Chaining Operations

```typescript
const processUserAge = (ageStr: string) =>
    parseAge(ageStr)
        .mapSuccess((age) => new Success(age * 12)) // Convert to months
        .tap((r) =>
            r.addTraces(
                generateMessage(
                    'information',
                    'information',
                    'ageProcessed',
                    {},
                ),
            ),
        )
        .chainSuccess((months) => {
            if (months > 1800) {
                return generateFailure('processError', 'tooOld', { months });
            }
            return new Success(months);
        });

const result = processUserAge('25');
// Result with age in months or error with complete traces
```

## 📚 Core Concepts

### The Result Type

PureTrace is based on the `Result<S>` type which represents an operation that can either succeed with a value of type `S`, or fail with error traces:

```typescript
type Result<S> = Success<S> | Failure;
```

### Success et Failure

**`Success<S>`**: Represents a successful operation containing:

- A value of type `S`
- A list of traces (for audit, metrics, etc.)
- Methods to transform the result

**`Failure`**: Represents a failed operation containing:

- One or more error traces
- The complete context of the failure
- Methods to enrich or transform the error

```typescript
// Success
const success = new Success(42);
console.log(success.value); // 42

// Failure
const failure = generateFailure('processError', 'notFound', {});
console.log(failure.getErrors()); // [{ kind: 'error', ... }]
```

### Messages and Traces

Each trace in PureTrace is a `Message` with the following structure:

```typescript
type Message = {
    kind: string; // Message type: 'error', 'information', 'metric'
    type: string; // Subtype: 'processError', 'technicalIssue', etc.
    code: string; // Unique identifier for localization
    data?: unknown; // Additional contextual data
};
```

**Native message types**:

These messages can be used through `generateError` and `generateMessage` functions.

- **Errors** (`kind: 'error'`):
    - `processError`: Business/validation error
    - `technicalIssue`: Technical system error
    - `pureTraceInternalError`: PureTrace internal error

- **Information** (`kind: 'information'`):
    - `information`: Informational message
    - `warning`: Warning

- **Metrics** (`kind: 'metric'`):
    - `start`: Operation start
    - `stop`: Operation end

## 📖 Usage Guide

### Creating Results

#### Simple Success

```typescript
const result = new Success(42);
```

#### Failure with trace

```typescript
const failure = generateFailure('processError', 'invalidInput', {
    input: 'abc',
});
```

#### From a Promise

```typescript
const result = await ResultAsync.fromPromise(
    () => fetch('/api/data'),
    (error) => generateFailure('technicalIssue', 'networkError', { error }),
);
```

#### Using GetResult.fromThrowable

```typescript
const result = GetResult.fromThrowable(
    () => {
        const schema = z.object({
            name: z.string(),
            age: z.number(),
        });
        return schema.parse(data);
    },
    (error) => generateFailure('technicalIssue', 'validationError', { error }),
);
```

### Transforming Results

#### mapSuccess - Transform success value

```typescript
const result = new Success(10).mapSuccess((n) => new Success(n * 2)); // Result<number> with value 20
```

#### chainSuccess - Chain operations returning a Result

```typescript
const result = parseAge('25').chainSuccess((age) => {
    if (age < 18) {
        return generateFailure('processError', 'tooYoung', { age });
    }
    return new Success(age);
});
```

#### tap - Side effect without modifying the Result

```typescript
const result = new Success(42).tap((r) => {
    if (r.isSuccess()) {
        console.log('Value:', r.value);
    }
    r.addTraces(
        generateMessage('information', 'information', 'valueLogged', {}),
    );
});
```

### Handling Failures

#### mapFailure - Transform a failure

```typescript
const result = validateUser(data).mapFailure((errors) => {
    // Filter only business errors (processError), excluding technical issues
    const processErrors = errors.filter(
        (error) => error.type === 'processError',
    );

    if (processErrors.length === 0) {
        // If no process errors, keep all errors
        return new Failure(...errors);
    }

    // Create a new failure with only filtered errors
    return new Failure(...processErrors);
});
```

#### tap on failure - Side effect on failure

```typescript
const result = processData(input).tap((r) => {
    if (r.isFailure()) {
        // Log the error
        console.error('Failure:', r.getErrors());
        // Notify a monitoring service
        notifyError(r);
    }
});
```

### Pattern Matching

```typescript
const result = divide(10, 2).chainBoth(
    (value) => {
        console.log('Result:', value);
        return new Success(value * 2);
    },
    (errors) => {
        console.error('Error:', errors);
        return new Success(0);
    },
);
```

### Asynchronous Operations

```typescript
// Sequence of async operations
const result = await ResultAsync.fromPromise(() => fetchUser(id), handleError)
    .chainSuccess((user) =>
        ResultAsync.fromPromise(() => fetchUserPosts(user.id), handleError),
    )
    .mapSuccess((posts) => new Success(posts.filter((p) => p.published)))
    .tap((r) => {
        if (r.isSuccess()) {
            console.log(`${r.value.length} published posts`);
        }
    });

if (result.isSuccess()) {
    const posts = result.value;
    // Process posts
} else {
    const errors = result.getErrors();
    const traces = result.getTraces();
    // Handle error with complete context
}
```

## 📖 API Reference

### Result\<S\>

#### Introspection Methods

- **`isSuccess(): boolean`** - Checks if the result is a success
- **`isFailure(): boolean`** - Checks if the result is a failure
- **`value: S`** (Success only) - The success value
- **`getErrors(): Message[]`** (Failure only) - Retrieves error messages
- **`getTraces(): Message[]`** - Retrieves all traces

#### Transformations (Functors)

- **`mapSuccess<S2>(fn: (value: S) => Success<S2>): Result<S2>`** - Transforms the success value
- **`mapFailure(fn: (errors: Message[]) => Failure): Result<S>`** - Transforms the failure
- **`mapBoth<S2>(onSuccess: (value: S) => Success<S2>, onFailure: (errors: Message[]) => Failure): Result<S2>`** - Transforms both cases

#### Chaining (Monads)

- **`chainSuccess<S2>(fn: (value: S) => Result<S2>): Result<S2>`** - Chains Result operations on success
- **`chainFailure<S2>(fn: (errors: Message[]) => Result<S2>): Result<S | S2>`** - Chains operations on failure
- **`chainBoth<S2, S3>(onSuccess: (value: S) => Result<S2>, onFailure: (errors: Message[]) => Result<S3>): Result<S2 | S3>`** - Pattern matching with chaining
- **`convertFailureToSuccess(defaultValue: S): Success<S>`** - Converts failure to success with default value
- **`chain<S2>(fn: (result: Result<S>) => Result<S2>): Result<S2>`** - Chains with access to the full result

#### Side Effects

- **`tap(fn: (result: Result<S>) => void): Result<S>`** - Executes a function without modifying the Result

#### Trace Management

- **`addTraces(...traces: Message[]): this`** - Adds traces to the result
- **`addErrors(...errors: Message[]): this`** (Failure only) - Adds error messages

### GetResult

Static utilities to work with Results:

- **`fromThrowable<X>(fn: () => X, onFailure: (error: unknown) => Failure): Result<X>`** - Wraps a function that might throw
- **`fromResultArray<X>(results: Result<X>[], firstFailureOnly?: boolean): Result<X[]>`** - Combines an array of Results
- **`fromResultArrayAsSuccess<X>(results: Result<X>[]): Success<X[]>`** - Combines Results, treating failures as traces

### generateError

Utility function to create error with native types:

- **`generateMessage<K, T>(kind: K, type: T, code: string, data: NativeMessageData<K, T>): Message`** - Creates a typed message for traces

### generateFailure

Utility function to create failures with native errors:

- **`generateFailure<T>(type: NativeErrorType, code: string, data: NativeErrorData<T>): Failure`** - Creates a failure with proper typing

### generateMessage

Utility function to create messages with native types:

- **`generateMessage<K, T>(kind: K, type: T, code: string, data: NativeMessageData<K, T>): Message`** - Creates a typed message for traces

### ResultAsync\<S\>

Asynchronous version of Result:

- **`fromPromise<S>(promiseFn: () => Promise<S>, errorHandler: (error: unknown) => Failure): ResultAsync<S>`** - Creates from a Promise
- All Result methods with async/await support

### Success\<S\>

Class representing a success:

```typescript
const success = new Success(value);
// Or with optional trace:
const trace = generateMessage('information', 'information', 'created', {});
const success = new Success(value, trace);
```

- **`value: S`** - The success value (readonly)
- Inherits all Result methods

### Failure

Class representing a failure:

```typescript
// Using generateFailure (recommended):
const failure = generateFailure('processError', 'myErrorCode', { data });

// Or with custom types:
const error = {
    kind: 'error',
    type: 'myCustomErrorType',
    code: 'myCustomErrorCode',
};
const failure = new Failure(error);
```

- **`getErrors(): Message[]`** - Retrieves error messages
- **`addErrors(errors: Message[]): this`** - Adds error messages
- Inherits all Result methods (except value)

## 🔥 Advanced Examples

### Complex Processing Pipeline

```typescript
interface User {
    id: string;
    email: string;
    age: number;
}

interface EnrichedUser extends User {
    preferences: UserPreferences;
    subscriptions: Subscription[];
}

async function processUserRegistration(
    rawData: unknown,
): Promise<Result<EnrichedUser>> {
    const userSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        age: z.number().min(18).max(120),
    });

    return (
        GetResult.fromThrowable(
            () => userSchema.parse(rawData),
            (error) =>
                generateFailure('technicalIssue', 'zodValidationError', {
                    error,
                }),
        )
            // Business validation
            .chainSuccess((user) => validateBusinessRules(user))
            // Enrichment with external data
            .chainSuccess((user) =>
                ResultAsync.fromPromise(
                    () => fetchUserPreferences(user.id),
                    (error) =>
                        generateFailure(
                            'technicalIssue',
                            'preferencesFetchFailed',
                            {
                                userId: user.id,
                                error,
                            },
                        ),
                ).mapSuccess(
                    (preferences) => new Success({ ...user, preferences }),
                ),
            )
            .chainSuccess((user) =>
                ResultAsync.fromPromise(
                    () => fetchUserSubscriptions(user.id),
                    (error) =>
                        generateFailure(
                            'technicalIssue',
                            'subscriptionsFetchFailed',
                            {
                                userId: user.id,
                                error,
                            },
                        ),
                ).mapSuccess(
                    (subscriptions) => new Success({ ...user, subscriptions }),
                ),
            )
            // Audit trail
            .tap((result) => {
                if (result.isSuccess()) {
                    result.addTraces(
                        generateMessage(
                            'information',
                            'information',
                            'userRegistered',
                            {
                                userId: result.value.id,
                                action: 'registration',
                                timestamp: new Date().toISOString(),
                            },
                        ),
                    );
                }
            })
            // Logging
            .tap((result) => {
                if (result.isSuccess()) {
                    console.log('User registered:', result.value.id);
                } else {
                    console.error('Registration failed:', result.getErrors());
                }
            })
    );
}
```

### Error Handling with Retry

```typescript
async function fetchWithRetry<T>(
    url: string,
    maxRetries: number = 3,
): Promise<Result<T>> {
    let lastFailure: Failure | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await ResultAsync.fromPromise(
            () => fetch(url).then((r) => r.json()),
            (error) =>
                generateFailure('technicalIssue', 'networkError', {
                    url,
                    attempt,
                    error,
                }),
        );

        if (result.isSuccess()) {
            return result.tap((r) =>
                r.addTraces(
                    generateMessage(
                        'information',
                        'information',
                        'fetchSucceeded',
                        {
                            url,
                            attempts: attempt,
                        },
                    ),
                ),
            );
        }

        lastFailure = result as Failure;

        if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
    }

    return lastFailure!.addTraces(
        generateMessage('information', 'information', 'maxRetriesExceeded', {
            url,
            maxRetries,
        }),
    );
}
```

### Validation Composition

```typescript
type ValidationRule<T> = (value: T) => Result<T>;

function composeValidations<T>(
    ...validators: ValidationRule<T>[]
): ValidationRule<T> {
    return (value: T) => {
        return validators.reduce(
            (result, validator) => result.chainSuccess((v) => validator(v)),
            new Success(value) as Result<T>,
        );
    };
}

// Define validation rules
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

// Compose validations
const validateUsername = composeValidations(
    notEmpty,
    minLength(3),
    maxLength(20),
);

const result = validateUsername('john_doe');
```

## 🧪 Testing

PureTrace uses Jest with Jest-Cucumber for BDD (Behavior-Driven Development) testing.

### Running Tests

```bash
# All tests
npm test

# Tests in watch mode
npm test -- --watch

# Tests with coverage
npm test -- --coverage
```

### Test Structure

```
tests/
├── features/           # Cucumber scenarios
│   ├── native_message.feature
│   └── native_success.feature
└── steps/             # Step implementations
    ├── native_message.steps.ts
    └── native_success.steps.ts
```

### Test Example

```typescript
import { defineFeature, loadFeature } from 'jest-cucumber';
import { GetResult, Failure } from '../src';

const feature = loadFeature('./tests/features/validation.feature');

defineFeature(feature, (test) => {
    test('Successful validation', ({ given, when, then }) => {
        let input: string;
        let result: Result<number>;

        given('a valid input', () => {
            input = '42';
        });

        when('I validate the input', () => {
            result = parseAge(input);
        });

        then('the result must be a success', () => {
            expect(result.isSuccess()).toBe(true);
            expect(result.value).toBe(42);
        });
    });
});
```

## 🔨 Build

### Compiling the Project

```bash
npm run build
```

The compiled JavaScript code will be generated in the `lib/` directory.

### Build Structure

```
lib/
├── pure_message.js       # Messages and traces
├── pure_result.js        # Synchronous Result
├── pure_result_async.js  # Asynchronous Result
├── pure_message.d.ts     # TypeScript definitions
├── pure_result.d.ts
└── pure_result_async.d.ts
```

## 🤝 Contributing

Contributions are welcome! Feel free to submit a Pull Request.

### Contribution Process

1. **Fork** the repository
2. **Create** your feature branch with the appropriate prefix:
    - `upgrade/feature-name` for breaking changes (major version)
    - `us/feature-name` for new features (minor version)
    - `fix/bug-name` for bug fixes (patch version)
3. **Commit** your changes regularly with clear, descriptive messages
4. **Push** to the branch (`git push origin us/amazing-feature`)
5. **Open** a Pull Request

### Conventions

- **Branch naming**: The branch prefix determines the version increment
    - `upgrade/` → Breaking changes (1.0.0 → 2.0.0)
    - `us/` → New features (1.0.0 → 1.1.0)
    - `fix/` → Bug fixes (1.0.0 → 1.0.1)
    - **Why not Conventional Commits?** Version information belongs to the branch, not individual commits. Branches represent the nature of the change, while commits should be frequent and descriptive without artificial prefixes that often devolve into `wip:` or `chore:`.

- **Code**:
    - TypeScript strict mode
    - ESLint + Prettier
    - Tests for any new feature

- **Pull Requests**:
    - Clear description of the change
    - Passing tests
    - Updated documentation

## 📄 License

This project is licensed under the **Mozilla Public License 2.0** (MPL-2.0).

The MPL-2.0 is a moderate copyleft license that:

- ✅ Allows commercial use
- ✅ Allows modification
- ✅ Allows distribution
- ✅ Allows private use
- ⚠️ Requires disclosure of source code for modified files
- ⚠️ Requires license preservation

See the [LICENSE](LICENSE) file for complete details.

## 👤 Author

**Gilles Coudert**

- Email: [pure.framework@gmail.com](mailto:pure.framework@gmail.com)
- GitHub: [@GillesCoudert](https://github.com/GillesCoudert)

## 🔗 Links

- [📦 NPM Package](https://www.npmjs.com/package/@gilles-coudert/pure-trace)
- [📂 GitHub Repository](https://github.com/GillesCoudert/PureTrace)
- [🐛 Issue Tracker](https://github.com/GillesCoudert/PureTrace/issues)
- [📖 Documentation](https://github.com/GillesCoudert/PureTrace#readme)

## 🌟 Part of PureFramework

PureTrace is part of the **PureFramework** ecosystem, a collection of TypeScript libraries designed to build robust, type-safe applications with excellent observability and error handling.

### PureFramework Philosophy

- **Functional purity**: Pure functions, immutability, no hidden side effects
- **Maximum type-safety**: Full exploitation of TypeScript and Zod
- **Native observability**: Traces, metrics, and context built-in
- **Design by contract**: Clear interfaces, predictable behaviors
- **Developer Experience**: Intuitive API, clear error messages

---

**Built with ❤️ for robust and maintainable TypeScript applications**
