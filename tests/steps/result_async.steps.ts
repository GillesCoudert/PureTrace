import { defineFeature, loadFeature, DefineStepFunction } from 'jest-cucumber';
import { Result } from '../../src/pure_result';
import { ResultAsync } from '../../src/pure_result_async';

const feature = loadFeature('tests/features/result_async.feature');

defineFeature(feature, (test) => {
    let resultAsync: ResultAsync<number>;
    let resolved: Result<number>;
    let runCount: number;

    const whenResolved = (step: DefineStepFunction): void => {
        step(/^I resolve it$/, async () => {
            resolved = await resultAsync.resolve();
        });
    };

    const givenAsyncSuccess = (given: DefineStepFunction): void => {
        given(/^an async success with the value (\d+)$/, (value: string) => {
            resultAsync = ResultAsync.liftSuccess(Number(value));
        });
    };

    const givenAsyncFailure = (given: DefineStepFunction): void => {
        given(
            /^an async failure with the error code "(.*)"$/,
            (code: string) => {
                resultAsync = ResultAsync<number>((helpers) =>
                    helpers.liftFailure({ type: 'processError', code }),
                );
            },
        );
    };

    const thenResolvedSuccess = (step: DefineStepFunction): void => {
        step(
            /^the resolved result is a success with the value (\d+)$/,
            (value: string) => {
                expect(resolved.isSuccess()).toBe(true);
                if (resolved.isSuccess()) {
                    expect(resolved.value).toBe(Number(value));
                }
            },
        );
    };

    const thenResolvedFailureWithCode = (step: DefineStepFunction): void => {
        step(
            /^the resolved result carries the error code "(.*)"$/,
            (code: string) => {
                expect(resolved.isFailure()).toBe(true);
                if (resolved.isFailure()) {
                    expect(
                        resolved.getErrors().map((error) => error.code),
                    ).toContain(code);
                }
            },
        );
    };

    test('liftSuccess resolves to a success', ({ given, when, then }) => {
        givenAsyncSuccess(given);
        whenResolved(when);
        thenResolvedSuccess(then);
    });

    test('liftFailure resolves to a failure', ({ given, when, then, and }) => {
        givenAsyncFailure(given);
        whenResolved(when);
        then(/^the resolved result is a failure$/, () => {
            expect(resolved.isFailure()).toBe(true);
        });
        thenResolvedFailureWithCode(and);
    });

    test('chainSuccess routes on an async success', ({
        given,
        when,
        and,
        then,
    }) => {
        givenAsyncSuccess(given);
        when(
            /^I chainSuccess to an async success multiplying the value by 10$/,
            () => {
                resultAsync = resultAsync.chainSuccess((value) =>
                    ResultAsync.liftSuccess(value * 10),
                );
            },
        );
        whenResolved(and);
        thenResolvedSuccess(then);
    });

    test('chainSuccess short-circuits on an async failure', ({
        given,
        when,
        and,
        then,
    }) => {
        givenAsyncFailure(given);
        when(
            /^I chainSuccess to an async success multiplying the value by 10$/,
            () => {
                resultAsync = resultAsync.chainSuccess((value) =>
                    ResultAsync.liftSuccess(value * 10),
                );
            },
        );
        whenResolved(and);
        then(/^the resolved result is a failure$/, () => {
            expect(resolved.isFailure()).toBe(true);
        });
        thenResolvedFailureWithCode(and);
    });

    test('chainFailure recovers from an async failure', ({
        given,
        when,
        and,
        then,
    }) => {
        givenAsyncFailure(given);
        when(
            /^I chainFailure to an async success with the value (\d+)$/,
            (value: string) => {
                resultAsync = resultAsync.chainFailure(() =>
                    ResultAsync.liftSuccess(Number(value)),
                );
            },
        );
        whenResolved(and);
        thenResolvedSuccess(then);
    });

    test('a thrown exception inside the computation becomes a failure', ({
        given,
        when,
        then,
        and,
    }) => {
        given(/^an async computation that throws$/, () => {
            resultAsync = ResultAsync<number>(() => {
                throw new Error('kaboom');
            });
        });
        whenResolved(when);
        then(/^the resolved result is a failure$/, () => {
            expect(resolved.isFailure()).toBe(true);
        });
        thenResolvedFailureWithCode(and);
    });

    //>
    //> Characterization test for analysis point 2: ResultAsync is NOT memoized,
    //> so each consumption re-runs the underlying computation. This pins the
    //> CURRENT behavior; if memoization is later introduced, this test should
    //> go red and be updated deliberately.
    //>
    test('a ResultAsync re-executes its computation on every consumption', ({
        given,
        when,
        then,
    }) => {
        given(
            /^an async computation that counts how many times it runs$/,
            () => {
                runCount = 0;
                resultAsync = ResultAsync<number>((helpers) => {
                    runCount++;
                    return helpers.liftSuccess(runCount);
                });
            },
        );
        when(/^I resolve it twice$/, async () => {
            await resultAsync.resolve();
            await resultAsync.resolve();
        });
        then(/^the computation has run (\d+) times$/, (count: string) => {
            expect(runCount).toBe(Number(count));
        });
    });
});
