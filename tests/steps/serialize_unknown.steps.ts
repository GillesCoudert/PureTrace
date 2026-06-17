import { defineFeature, loadFeature } from 'jest-cucumber';
import { serializeUnknown } from '../../src/pure_helpers';
import { Json, JsonObject } from '../../src/pure_message';

const feature = loadFeature('tests/features/serialize_unknown.feature');

function asObject(value: Json): JsonObject {
    expect(typeof value).toBe('object');
    expect(value).not.toBeNull();
    expect(Array.isArray(value)).toBe(false);
    return value as JsonObject;
}

defineFeature(feature, (test) => {
    let input: unknown;
    let output: Json;
    let maxDepth: number | undefined;

    test('a circular reference is replaced by a marker', ({
        given,
        when,
        then,
    }) => {
        given(
            /^an object that references itself through "(.*)"$/,
            (key: string) => {
                const cyclic: Record<string, unknown> = { a: 1 };
                cyclic[key] = cyclic;
                input = cyclic;
            },
        );
        when(/^I serialize it$/, () => {
            output = serializeUnknown(input);
        });
        then(
            /^the serialized "(.*)" property is "(.*)"$/,
            (key: string, expected: string) => {
                expect(asObject(output)[key]).toBe(expected);
            },
        );
    });

    test('recursion beyond the max depth is truncated', ({
        given,
        when,
        then,
    }) => {
        given(/^a nested object (\d+) levels deep$/, () => {
            input = { a: { b: { c: 1 } } };
        });
        when(/^I serialize it with a max depth of (\d+)$/, (depth: string) => {
            maxDepth = Number(depth);
            output = serializeUnknown(input, { maxDepth });
        });
        then(
            /^the serialized "(.*)" property is "(.*)"$/,
            (key: string, expected: string) => {
                expect(asObject(output)[key]).toBe(expected);
            },
        );
    });

    test('a throwing accessor does not break the rest of the object', ({
        given,
        when,
        then,
        and,
    }) => {
        given(
            /^an object with a throwing getter "(.*)" and a plain property "(.*)"$/,
            (throwingKey: string, plainKey: string) => {
                const target: Record<string, unknown> = { [plainKey]: 1 };
                Object.defineProperty(target, throwingKey, {
                    enumerable: true,
                    get: () => {
                        throw new Error('nope');
                    },
                });
                input = target;
            },
        );
        when(/^I serialize it$/, () => {
            output = serializeUnknown(input);
        });
        then(
            /^the serialized "(.*)" property is "(.*)"$/,
            (key: string, expected: string) => {
                expect(asObject(output)[key]).toBe(expected);
            },
        );
        and(
            /^the serialized "(.*)" property equals the number (\d+)$/,
            (key: string, expected: string) => {
                expect(asObject(output)[key]).toBe(Number(expected));
            },
        );
    });

    test('an Error preserves its name and message', ({
        given,
        when,
        then,
        and,
    }) => {
        given(/^an Error with the message "(.*)"$/, (message: string) => {
            input = new Error(message);
        });
        when(/^I serialize it$/, () => {
            output = serializeUnknown(input);
        });
        then(
            /^the serialized "(.*)" property is "(.*)"$/,
            (key: string, expected: string) => {
                expect(asObject(output)[key]).toBe(expected);
            },
        );
        and(
            /^the serialized "(.*)" property is "(.*)"$/,
            (key: string, expected: string) => {
                expect(asObject(output)[key]).toBe(expected);
            },
        );
    });

    test('an AggregateError serializes its aggregated errors', ({
        given,
        when,
        then,
    }) => {
        given(
            /^an AggregateError aggregating (\d+) errors$/,
            (count: string) => {
                const errors = Array.from(
                    { length: Number(count) },
                    (_unused, index) => new Error('error-' + String(index)),
                );
                input = new AggregateError(errors, 'multi');
            },
        );
        when(/^I serialize it$/, () => {
            output = serializeUnknown(input);
        });
        then(
            /^the serialized "(.*)" property is an array of length (\d+)$/,
            (key: string, length: string) => {
                const property = asObject(output)[key];
                expect(Array.isArray(property)).toBe(true);
                expect(property as Json[]).toHaveLength(Number(length));
            },
        );
    });

    test('a Map becomes an array of entry pairs', ({ given, when, then }) => {
        given(
            /^a Map with the single entry "(.*)" mapped to (\d+)$/,
            (key: string, value: string) => {
                input = new Map<string, number>([[key, Number(value)]]);
            },
        );
        when(/^I serialize it$/, () => {
            output = serializeUnknown(input);
        });
        then(/^the serialized value equals the entry pairs$/, () => {
            expect(output).toEqual([['k', 1]]);
        });
    });

    test('exotic primitives become their string form', ({
        given,
        when,
        then,
    }) => {
        given(/^the bigint (\d+)$/, (value: string) => {
            input = BigInt(value);
        });
        when(/^I serialize it$/, () => {
            output = serializeUnknown(input);
        });
        then(
            /^the serialized value is the string "(.*)"$/,
            (expected: string) => {
                expect(output).toBe(expected);
            },
        );
    });

    test('an object with unreadable keys never throws', ({
        given,
        when,
        then,
    }) => {
        given(/^a proxy that throws when its keys are read$/, () => {
            input = new Proxy(
                {},
                {
                    ownKeys: () => {
                        throw new Error('nope');
                    },
                },
            );
        });
        when(/^I serialize it$/, () => {
            //>
            //> Must not throw: the call itself is the assertion.
            //>
            output = serializeUnknown(input);
        });
        then(/^the serialized "(.*)" property equals true$/, (key: string) => {
            expect(asObject(output)[key]).toBe(true);
        });
    });
});
