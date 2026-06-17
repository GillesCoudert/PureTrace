import { defineFeature, loadFeature } from 'jest-cucumber';
import { Result, Success, generateFailure } from '../../src/pure_result';
import { generateMessage, Json } from '../../src/pure_message';
import {
    deserializeResult,
    serializeResult,
    SerializedResult,
} from '../../src/pure_helpers';

const feature = loadFeature('tests/features/result_serialization.feature');

//>
//> > fr: Round-trip reel : on passe par JSON.stringify / JSON.parse.
//> > en: Real round-trip: go through JSON.stringify / JSON.parse.
//>
function roundTrip(result: Result<Json>): Result<Json> {
    const wire = JSON.stringify(serializeResult(result));
    return deserializeResult(JSON.parse(wire));
}

function traceCodes(result: Result<Json>): string[] {
    return result.getTraces().map((trace) => trace.code);
}

defineFeature(feature, (test) => {
    test('A success round-trips with its value and traces', ({
        given,
        when,
        then,
        and,
    }) => {
        let source: Result<Json>;
        let restored: Result<Json>;

        given(
            /^a success carrying the value (.*) and the trace "(.*)"$/,
            (value: string, code: string) => {
                source = new Success<Json>(Number(value)).addTraces(
                    generateMessage({
                        kind: 'information',
                        type: 'information',
                        code,
                    }),
                );
            },
        );

        when('I serialize and restore it', () => {
            restored = roundTrip(source);
        });

        then(
            /^the restored result is a success with the value (.*)$/,
            (value: string) => {
                expect(restored.isSuccess()).toBe(true);
                if (restored.isSuccess()) {
                    expect(restored.value).toBe(Number(value));
                }
            },
        );

        and(/^the restored traces are exactly "(.*)"$/, (codes: string) => {
            expect(traceCodes(restored).sort()).toEqual(codes.split(',').sort());
        });
    });

    test('A failure round-trips with its error and traces', ({
        given,
        when,
        then,
        and,
    }) => {
        let source: Result<Json>;
        let restored: Result<Json>;

        given(
            /^a failure carrying the error code "(.*)" and the trace "(.*)"$/,
            (errorCode: string, traceCode: string) => {
                source = generateFailure({
                    type: 'processError',
                    code: errorCode,
                }).addTraces(
                    generateMessage({
                        kind: 'information',
                        type: 'information',
                        code: traceCode,
                    }),
                );
            },
        );

        when('I serialize and restore it', () => {
            restored = roundTrip(source);
        });

        then(
            /^the restored result is a failure with the error code "(.*)"$/,
            (errorCode: string) => {
                expect(restored.isFailure()).toBe(true);
                if (restored.isFailure()) {
                    expect(restored.getErrors().map((e) => e.code)).toContain(
                        errorCode,
                    );
                }
            },
        );

        and(/^the restored traces are exactly "(.*)"$/, (codes: string) => {
            expect(traceCodes(restored).sort()).toEqual(codes.split(',').sort());
        });
    });

    test('A malformed envelope is rejected as a failure', ({
        given,
        when,
        then,
    }) => {
        let malformed: unknown;
        let restored: Result<Json>;

        given('a malformed serialized envelope', () => {
            malformed = { outcome: 'banana', value: 1 };
        });

        when('I restore it', () => {
            restored = deserializeResult(malformed);
        });

        then(
            /^the restored result is a failure with the error code "(.*)"$/,
            (errorCode: string) => {
                expect(restored.isFailure()).toBe(true);
                if (restored.isFailure()) {
                    expect(restored.getErrors().map((e) => e.code)).toContain(
                        errorCode,
                    );
                }
            },
        );
    });

    test('An unregistered message kind is accepted on restore', ({
        given,
        when,
        then,
        and,
    }) => {
        let envelope: unknown;
        let restored: Result<Json>;

        given(
            /^a serialized success whose only trace has the unregistered kind "(.*)" and code "(.*)"$/,
            (kind: string, code: string) => {
                const wire: SerializedResult = {
                    outcome: 'success',
                    value: 1,
                    traces: [{ kind, type: 'event', code }],
                };
                envelope = JSON.parse(JSON.stringify(wire));
            },
        );

        when('I restore it', () => {
            restored = deserializeResult(envelope);
        });

        then('the restored result is a success', () => {
            expect(restored.isSuccess()).toBe(true);
        });

        and(/^the restored traces are exactly "(.*)"$/, (codes: string) => {
            expect(traceCodes(restored).sort()).toEqual(codes.split(',').sort());
        });
    });
});
