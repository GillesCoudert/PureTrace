# PureTrace

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![npm version](https://badge.fury.io/js/%40gilles-coudert%2Fpure-trace.svg)](https://www.npmjs.com/package/@gilles-coudert/pure-trace)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

> A TypeScript library for standardized, localizable, and traceable error handling by design, using the Result pattern (no exceptions), with observability built-in.

## Why PureTrace?

Use PureTrace if you want:

- **Explicit error handling** instead of scattered `try/catch`
- **Typed outcomes** with the Result pattern
- **End-to-end traceability** carried by the Result itself
- **i18n-ready errors** (codes + structured data)
- **One mental model** for sync and async flows

PureTrace is designed for applications where errors are part of the domain, not just technical failures.

## Installation

```bash
npm install @gilles-coudert/pure-trace
```

## Quick start

```ts
import { Result, Success, generateFailure } from '@gilles-coudert/pure-trace';

function parseAge(input: string): Result<number> {
    const age = Number.parseInt(input, 10);

    if (Number.isNaN(age)) {
        return generateFailure('processError', 'invalidAgeFormat', { input });
    }

    if (age < 0 || age > 150) {
        return generateFailure('processError', 'ageOutOfRange', { age });
    }

    return new Success(age);
}

const result = parseAge('25');

if (result.isSuccess()) {
    console.log(result.value);
} else {
    console.error(result.getErrors());
    console.log(result.getTraces());
}
```

## Mental model

- A **Result** is either `Success<S>` or `Failure`
- A **Failure** contains **error messages**
- Both Success and Failure can accumulate **trace messages**
- Errors are just messages with `kind: "error"`

```ts
type Result<S> = Success<S> | Failure;

type Message = {
    kind: 'error' | 'information' | 'metric' | string;
    type: string;
    code: string;
    data?: unknown;
};
```

## Core API

### Create results

```ts
const ok = new Success(42);

const ko = generateFailure('processError', 'notFound', { id: '123' });
```

### Compose (sync)

```ts
const result = parseAge('25')
    .mapSuccess((age) => new Success(age * 12))
    .chainSuccess((months) =>
        months > 1800
            ? generateFailure('processError', 'tooOld', { months })
            : new Success(months),
    );
```

### Side effects & traces

```ts
import { generateMessage } from '@gilles-coudert/pure-trace';

const traced = parseAge('25').tap((r) => {
    r.addTraces(
        generateMessage('information', 'information', 'ageParsed', {
            input: '25',
        }),
    );
});
```

### Async flows

```ts
import { ResultAsync } from '@gilles-coudert/pure-trace';

const userResult = await ResultAsync.fromPromise(
    () => fetch('/api/user'),
    (error) => generateFailure('technicalIssue', 'networkError', { error }),
).chainSuccess((res) =>
    ResultAsync.fromPromise(
        () => res.json(),
        (error) =>
            generateFailure('technicalIssue', 'jsonParseError', { error }),
    ),
);
```

## Localization-first errors

Errors are designed for translation:

- `code` is the translation key
- `data` is the interpolation context

```ts
generateFailure('processError', 'userNotFound', { userId: '123' });

// en: "User {userId} not found"
// fr: "L'utilisateur {userId} n'a pas été trouvé"
```

## What makes PureTrace different?

- Traces propagate automatically with the Result
- Errors are designed to be user-facing and localizable
- Observability is built-in, not bolted on
- No exceptions in business code

## Contributing

Contributions are welcome.

### Mandatory branch naming

Branch prefixes are **required** and define the semantic impact of the change:

- `upgrade/` → breaking changes (major version)
- `us/` → new features (minor version)
- `fix/` → bug fixes (patch version)

### Why not Conventional Commits?

Versioning information belongs to the **branch**, not individual commits.

Branches express intent and scope.
Commits should stay frequent, descriptive, and free of artificial prefixes that often degrade into `wip:` or `chore:` without semantic value.

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.

## Author

**Gilles Coudert**

- Email: [pure.framework@gmail.com](mailto:pure.framework@gmail.com)
- GitHub: [https://github.com/GillesCoudert](https://github.com/GillesCoudert)

## Links

- NPM: [https://www.npmjs.com/package/@gilles-coudert/pure-trace](https://www.npmjs.com/package/@gilles-coudert/pure-trace)
- Repository: [https://github.com/GillesCoudert/PureTrace](https://github.com/GillesCoudert/PureTrace)
- Issues: [https://github.com/GillesCoudert/PureTrace/issues](https://github.com/GillesCoudert/PureTrace/issues)
