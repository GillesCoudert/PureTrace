import { defineFeature, loadFeature, DefineStepFunction } from 'jest-cucumber';
import { Result, Success, generateFailure } from '../../src/pure_result';
import { PureMessage } from '../../src/pure_message';

const feature = loadFeature('tests/features/result_railway.feature');

function trace(code: string): PureMessage {
    return { kind: 'information', type: 'information', code };
}

function traceCodes(result: Result<unknown>): string[] {
    return result.getTraces().map((message) => message.code);
}

defineFeature(feature, (test) => {
    let result: Result<number>;

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

    const thenSuccessValue = (step: DefineStepFunction): void => {
        step(
            /^the result is a success with the value (\d+)$/,
            (value: string) => {
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe(Number(value));
                }
            },
        );
    };

    test('chainSuccess applies the function on a success', ({
        given,
        when,
        then,
    }) => {
        givenSuccess(given);
        when(/^I chainSuccess to multiply the value by 10$/, () => {
            result = result.chainSuccess((value) => new Success(value * 10));
        });
        thenSuccessValue(then);
    });

    test('chainSuccess short-circuits on a failure', ({
        given,
        when,
        then,
        and,
    }) => {
        givenFailure(given);
        when(/^I chainSuccess to multiply the value by 10$/, () => {
            result = result.chainSuccess((value) => new Success(value * 10));
        });
        then(/^the result is a failure$/, () => {
            expect(result.isFailure()).toBe(true);
        });
        and(/^the result carries the error code "(.*)"$/, (code: string) => {
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.getErrors().map((error) => error.code)).toContain(
                    code,
                );
            }
        });
    });

    test('chainFailure recovers from a failure', ({ given, when, then }) => {
        givenFailure(given);
        when(
            /^I chainFailure to recover with the success value (\d+)$/,
            (value: string) => {
                result = result.chainFailure(() => new Success(Number(value)));
            },
        );
        thenSuccessValue(then);
    });

    test('chainFailure is skipped on a success', ({ given, when, then }) => {
        givenSuccess(given);
        when(
            /^I chainFailure to recover with the success value (\d+)$/,
            (value: string) => {
                result = result.chainFailure(() => new Success(Number(value)));
            },
        );
        thenSuccessValue(then);
    });

    test('mapSuccess wraps the new value', ({ given, when, then }) => {
        givenSuccess(given);
        when(/^I mapSuccess to wrap the value plus 1$/, () => {
            result = result.mapSuccess((value) => value + 1);
        });
        thenSuccessValue(then);
    });

    test('mapSuccess short-circuits on a failure', ({
        given,
        when,
        then,
        and,
    }) => {
        givenFailure(given);
        when(/^I mapSuccess to wrap the value plus 1$/, () => {
            result = result.mapSuccess((value) => value + 1);
        });
        then(/^the result is a failure$/, () => {
            expect(result.isFailure()).toBe(true);
        });
        and(/^the result carries the error code "(.*)"$/, (code: string) => {
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.getErrors().map((error) => error.code)).toContain(
                    code,
                );
            }
        });
    });

    test('chainBoth routes a success through the success branch', ({
        given,
        when,
        then,
    }) => {
        givenSuccess(given);
        when(
            /^I chainBoth with success times 10 and failure recovering to 0$/,
            () => {
                result = result.chainBoth(
                    (value) => new Success(value * 10),
                    () => new Success(0),
                );
            },
        );
        thenSuccessValue(then);
    });

    test('chainBoth routes a failure through the failure branch', ({
        given,
        when,
        then,
    }) => {
        givenFailure(given);
        when(
            /^I chainBoth with success times 10 and failure recovering to 0$/,
            () => {
                result = result.chainBoth(
                    (value) => new Success(value * 10),
                    () => new Success(0),
                );
            },
        );
        thenSuccessValue(then);
    });

    test('traces accumulate across a chain and none are lost', ({
        given,
        when,
        then,
        and,
    }) => {
        given(
            /^a success with the value (\d+) carrying the trace "(.*)"$/,
            (value: string, code: string) => {
                result = new Success(Number(value), [trace(code)]);
            },
        );
        when(
            /^I chainSuccess to a success that adds the trace "(.*)"$/,
            (code: string) => {
                result = result.chainSuccess(
                    (value) => new Success(value * 10, [trace(code)]),
                );
            },
        );
        thenSuccessValue(then);
        and(
            /^the result traces contain exactly "(.*)"$/,
            (expected: string) => {
                const expectedCodes = expected.split(',').sort();
                expect(traceCodes(result).sort()).toEqual(expectedCodes);
            },
        );
    });

    test('convertFailureToSuccess moves errors into traces', ({
        given,
        when,
        then,
        and,
    }) => {
        given(
            /^a failure with the error code "(.*)" carrying the trace "(.*)"$/,
            (code: string, traceCode: string) => {
                result = generateFailure({
                    type: 'processError',
                    code,
                }).cloneWithTraces([trace(traceCode)]);
            },
        );
        when(
            /^I convertFailureToSuccess with the default value (\d+)$/,
            (value: string) => {
                result = result.convertFailureToSuccess(Number(value));
            },
        );
        thenSuccessValue(then);
        and(/^the result traces are exactly "(.*)"$/, (expected: string) => {
            expect(traceCodes(result).join(',')).toBe(expected);
        });
    });
});
