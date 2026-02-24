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
- **Seamless Zod integration** for schema validation

PureTrace is designed for applications where errors are part of the domain, not just technical failures.

## Quick Start

### Installation

```bash
npm install @gilles-coudert/pure-trace
```

### Minimal usage example

```typescript
import {
    Success,
    Failure,
    generateFailure,
    generateMessage,
    Result,
} from '@gilles-coudert/pure-trace';

function parseAge(input: string): Result<number> {
    const age = Number(input);
    if (Number.isNaN(age) || age < 0) {
        return generateFailure({
            type: 'processError',
            code: 'invalidAge',
            data: { input },
        });
    }
    return new Success(age);
}

const result = parseAge('42').tapSuccess((success) => {
    success.addTraces(
        generateMessage({
            kind: 'information',
            type: 'information',
            code: 'ageValidated',
            data: { age: success.value },
        }),
    );
});

if (result.isSuccess()) {
    const traces = result.getTraces();
    // traces contain validation success information (PureMessage)
    // result.value contains: 42
} else {
    const errors = result.getErrors();
    // errors contain structured error information (PureError)
}
```

> This example demonstrates explicit error handling, typed outcomes, and traceability. See the [API documentation](docs/api.md) for advanced usage.

## Advanced documentation

- [API](docs/api.md)
- [Best practices](docs/best_practices.md)
- [Examples](docs/examples.md)

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
