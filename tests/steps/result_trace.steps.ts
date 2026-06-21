import { defineFeature, loadFeature, DefineStepFunction } from 'jest-cucumber';
import { Result, Success, generateFailure } from '../../src/pure_result';
import { ResultAsync } from '../../src/pure_result_async';
import { PureMessage } from '../../src/pure_message';

const feature = loadFeature('tests/features/result_trace.feature');

function trace(code: string): PureMessage {
    return { kind: 'information', type: 'information', code };
}

function traces(codes: string): PureMessage[] {
    return codes.split(',').map(trace);
}

function traceCodes(result: Result<unknown>): string[] {
    return result.getTraces().map((message) => message.code);
}

defineFeature(feature, (test) => {
    let result: Result<number>;
    let original: Result<number>;
    let enriched: Result<number>;
    let resultAsync: ResultAsync<number>;
    let resolved: Result<number>;

    const givenSuccess = (given: DefineStepFunction): void => {
        given(/^a success with the value (\d+)$/, (value: string) => {
            result = new Success(Number(value));
        });
    };

    const givenFailure = (given: DefineStepFunction): void => {
        given(/^a failure with the error code "(.*)"$/, (code: string) => {
            result = generateFailure({ type: 'processError', code });
        });
    };

    const thenTracesExactly = (step: DefineStepFunction): void => {
        step(
            /^the result traces are exactly "(.*)"$/,
            (expected: string) => {
                expect(traceCodes(result).join(',')).toBe(expected);
            },
        );
    };

    test('trace enriches a success unconditionally', ({
        given,
        when,
        then,
        and,
    }) => {
        givenSuccess(given);
        when(/^I trace with the message "(.*)"$/, (code: string) => {
            result = result.trace(trace(code));
        });
        then(/^the result is a success$/, () => {
            expect(result.isSuccess()).toBe(true);
        });
        thenTracesExactly(and);
    });

    test('trace enriches a failure unconditionally', ({
        given,
        when,
        then,
        and,
    }) => {
        givenFailure(given);
        when(/^I trace with the message "(.*)"$/, (code: string) => {
            result = result.trace(trace(code));
        });
        then(/^the result is a failure$/, () => {
            expect(result.isFailure()).toBe(true);
        });
        thenTracesExactly(and);
    });

    test('traceSuccess enriches only a success', ({ given, when, then }) => {
        givenSuccess(given);
        when(/^I traceSuccess with the message "(.*)"$/, (code: string) => {
            result = result.traceSuccess(trace(code));
        });
        thenTracesExactly(then);
    });

    test('traceSuccess is skipped on a failure', ({ given, when, then }) => {
        givenFailure(given);
        when(/^I traceSuccess with the message "(.*)"$/, (code: string) => {
            result = result.traceSuccess(trace(code));
        });
        thenTracesExactly(then);
    });

    test('traceFailure enriches only a failure', ({ given, when, then }) => {
        givenFailure(given);
        when(/^I traceFailure with the message "(.*)"$/, (code: string) => {
            result = result.traceFailure(trace(code));
        });
        thenTracesExactly(then);
    });

    test('traceFailure is skipped on a success', ({ given, when, then }) => {
        givenSuccess(given);
        when(/^I traceFailure with the message "(.*)"$/, (code: string) => {
            result = result.traceFailure(trace(code));
        });
        thenTracesExactly(then);
    });

    test('trace accepts a list of messages', ({ given, when, then }) => {
        givenSuccess(given);
        when(/^I trace with the messages "(.*)"$/, (codes: string) => {
            result = result.trace(traces(codes));
        });
        thenTracesExactly(then);
    });

    test('trace does not mutate the original result', ({
        given,
        when,
        then,
        and,
    }) => {
        given(
            /^a success with the value (\d+) carrying the trace "(.*)"$/,
            (value: string, code: string) => {
                original = new Success(Number(value), [trace(code)]);
            },
        );
        when(
            /^I trace it into a new result with the message "(.*)"$/,
            (code: string) => {
                enriched = original.trace(trace(code));
            },
        );
        then(
            /^the new result traces are exactly "(.*)"$/,
            (expected: string) => {
                expect(traceCodes(enriched).join(',')).toBe(expected);
            },
        );
        and(
            /^the original result traces are exactly "(.*)"$/,
            (expected: string) => {
                expect(traceCodes(original).join(',')).toBe(expected);
            },
        );
    });

    test('async traceSuccess enriches a resolved success', ({
        given,
        when,
        then,
    }) => {
        given(/^an async success with the value (\d+)$/, (value: string) => {
            resultAsync = ResultAsync.liftSuccess(Number(value));
        });
        when(
            /^I async traceSuccess with the message "(.*)" and resolve$/,
            async (code: string) => {
                resolved = await resultAsync.traceSuccess(trace(code)).resolve();
            },
        );
        then(/^the resolved traces are exactly "(.*)"$/, (expected: string) => {
            expect(traceCodes(resolved).join(',')).toBe(expected);
        });
    });

    test('async traceFailure enriches a resolved failure', ({
        given,
        when,
        then,
    }) => {
        given(
            /^an async failure with the error code "(.*)"$/,
            (code: string) => {
                resultAsync = ResultAsync<number>((helpers) =>
                    helpers.liftFailure({ type: 'processError', code }),
                );
            },
        );
        when(
            /^I async traceFailure with the message "(.*)" and resolve$/,
            async (code: string) => {
                resolved = await resultAsync.traceFailure(trace(code)).resolve();
            },
        );
        then(/^the resolved traces are exactly "(.*)"$/, (expected: string) => {
            expect(traceCodes(resolved).join(',')).toBe(expected);
        });
    });
});
