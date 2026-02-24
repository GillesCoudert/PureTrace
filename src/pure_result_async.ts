/* eslint-disable @typescript-eslint/unbound-method */
import {
    PureMessage,
    NativeErrorType,
    PureErrorParameters,
} from './pure_message';
import { Success, Failure, generateFailure, Result } from './pure_result';

export type ResultAsyncValue<S> = PromiseLike<Result<S>>;

export interface ResultAsyncHelpers {
    /**
     * Lifts a Result into a ResultAsyncValue.
     * Note: Do NOT use liftResult(new Success(...)), use liftSuccess instead.
     * Note: Do NOT use liftResult(generateFailure(...)), use liftFailure instead.
     * @param result - The Result to lift.
     * @returns A ResultAsyncValue wrapping the Result.
     */
    liftResult<S>(result: Result<S>): ResultAsyncValue<S>;

    /**
     * Lifts a value into a ResultAsyncValue as a Success.
     * Prefer this over liftResult(new Success(...)).
     * @param value - The value to lift.
     * @returns A ResultAsyncValue wrapping the Success.
     */
    liftSuccess<S>(value: S): ResultAsyncValue<S>;

    /**
     * Lifts a Failure into a ResultAsyncValue.
     * Prefer this over liftResult(generateFailure(...)).
     * @template T The type of the native error.
     * @param parameters - The PureError parameters.
     * @returns A ResultAsyncValue wrapping the Failure.
     */
    liftFailure<T extends NativeErrorType>(
        parameters: PureErrorParameters<T>,
    ): ResultAsyncValue<never>;

    /**
     * Converts a Promise of a Result into a ResultAsyncValue.
     * @param promise - The Promise to convert.
     * @returns A ResultAsyncValue wrapping the Result.
     */
    fromResultPromise<S>(promise: PromiseLike<Result<S>>): ResultAsyncValue<S>;

    /**
     * Converts a Promise into a ResultAsyncValue, using a failure handler for errors.
     * @param promise - The Promise to convert.
     * @param failure - A function to generate a Failure from an error.
     * @returns A ResultAsyncValue wrapping the Result.
     */
    fromPromise<S>(
        promise: PromiseLike<S>,
        failure: (reason: unknown) => Failure,
    ): ResultAsyncValue<S>;
}

const resultAsyncHelpers: ResultAsyncHelpers = {
    liftResult<S>(result: Result<S>): ResultAsyncValue<S> {
        return Promise.resolve(result);
    },
    liftSuccess<S>(value: S): ResultAsyncValue<S> {
        return Promise.resolve(new Success(value));
    },
    liftFailure<T extends NativeErrorType>(
        parameters: PureErrorParameters<T>,
    ): ResultAsyncValue<never> {
        return Promise.resolve(generateFailure(parameters));
    },
    fromResultPromise<S>(promise: PromiseLike<Result<S>>): ResultAsyncValue<S> {
        return promise.then(
            resultAsyncHelpers.liftResult,
        ) as ResultAsyncValue<S>;
    },
    fromPromise<S>(
        promise: PromiseLike<S>,
        failure: ((reason: unknown) => Failure) | Failure,
    ): ResultAsyncValue<S> {
        return promise.then(
            (value) => resultAsyncHelpers.liftSuccess(value),
            (reason) =>
                resultAsyncHelpers.liftResult(
                    typeof failure === 'function' ? failure(reason) : failure,
                ),
        );
    },
};

export interface ResultAsync<S> extends PromiseLike<Result<S>> {
    resolve(): Promise<Result<S>>;
    tap(f: (result: Result<S>) => void): ResultAsync<S>;
    tapSuccess(onSuccess: (success: Success<S>) => void): ResultAsync<S>;
    tapFailure(onFailure: (failure: Failure) => void): ResultAsync<S>;
    tapBoth(
        onSuccess: (success: Success<S>) => void,
        onFailure: (failure: Failure) => void,
    ): ResultAsync<S>;
    mapSuccess<S2>(onSuccess: (value: S) => Success<S2>): ResultAsync<S2>;
    mapFailure(onFailure: (errors: PureMessage[]) => Failure): ResultAsync<S>;
    mapBoth<S2>(
        onSuccess: (value: S) => Success<S2>,
        onFailure: (errors: PureMessage[]) => Failure,
    ): ResultAsync<S2>;
    chain<S2>(next: (result: Result<S>) => ResultAsync<S2>): ResultAsync<S2>;
    chainSuccess<S2>(
        onSuccess: (value: S) => PromiseLike<Result<S2>>,
    ): ResultAsync<S2>;
    chainFailure<S2>(
        onFailure: (errors: PureMessage[]) => PromiseLike<Result<S2>>,
    ): ResultAsync<S | S2>;
    chainBoth<S2, S3>(
        onSuccess: (value: S) => PromiseLike<Result<S3>>,
        onFailure: (errors: PureMessage[]) => PromiseLike<Result<S2>>,
    ): ResultAsync<S2 | S3>;
}

class ResultAsyncImpl<S> implements ResultAsync<S> {
    constructor(
        private compute: (helpers: ResultAsyncHelpers) => ResultAsyncValue<S>,
    ) {}

    async resolve(): Promise<Result<S>> {
        try {
            return await this.compute(resultAsyncHelpers);
        } catch (e) {
            return generateFailure({
                type: 'technicalIssue',
                code: 'uncaughtException',
                data: {
                    message: JSON.stringify(e),
                },
            });
        }
    }

    tap(f: (result: Result<S>) => void): ResultAsync<S> {
        return ResultAsync(async ({ liftResult }) =>
            liftResult((await this.resolve()).tap(f)),
        );
    }

    tapSuccess(onSuccess: (success: Success<S>) => void): ResultAsync<S> {
        return ResultAsync(async ({ liftResult }) =>
            liftResult((await this.resolve()).tapSuccess(onSuccess)),
        );
    }

    tapFailure(onFailure: (failure: Failure) => void): ResultAsync<S> {
        return ResultAsync(async ({ liftResult }) =>
            liftResult((await this.resolve()).tapFailure(onFailure)),
        );
    }

    tapBoth(
        onSuccess: (success: Success<S>) => void,
        onFailure: (failure: Failure) => void,
    ): ResultAsync<S> {
        return ResultAsync(async ({ liftResult }) =>
            liftResult((await this.resolve()).tapBoth(onSuccess, onFailure)),
        );
    }

    mapSuccess<S2>(onSuccess: (value: S) => Success<S2>): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.resolve();
            return helpers.liftResult(result.mapSuccess(onSuccess));
        });
    }

    mapFailure(onFailure: (errors: PureMessage[]) => Failure): ResultAsync<S> {
        return ResultAsync(async (helpers) => {
            const result = await this.resolve();
            if (result.isFailure()) {
                return helpers.liftResult(result.mapFailure(onFailure));
            }
            return helpers.liftResult(result);
        });
    }

    mapBoth<S2>(
        onSuccess: (value: S) => Success<S2>,
        onFailure: (errors: PureMessage[]) => Failure,
    ): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.resolve();
            return helpers.liftResult(result.mapBoth(onSuccess, onFailure));
        });
    }

    chain<S2>(
        next: (result: Result<S>) => PromiseLike<Result<S2>>,
    ): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.resolve();
            return helpers.fromResultPromise(next(result));
        });
    }

    chainSuccess<S2>(
        next: (value: S) => PromiseLike<Result<S2>>,
    ): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.resolve();
            if (result.isSuccess()) {
                return helpers.fromResultPromise(next(result.value));
            }
            return helpers.liftResult(result);
        });
    }

    chainFailure<S2>(
        next: (errors: PureMessage[]) => PromiseLike<Result<S2>>,
    ): ResultAsync<S | S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.resolve();
            if (result.isFailure()) {
                return helpers.fromResultPromise(
                    next(result.getErrors()),
                ) as ResultAsyncValue<S | S2>;
            }
            return helpers.liftResult(result);
        });
    }

    chainBoth<S2, S3>(
        nextSuccess: (value: S) => PromiseLike<Result<S3>>,
        nextFailure: (errors: PureMessage[]) => PromiseLike<Result<S2>>,
    ): ResultAsync<S2 | S3> {
        return ResultAsync(async (helpers) => {
            const result = await this.resolve();
            if (result.isFailure()) {
                return helpers.fromResultPromise(
                    nextFailure(result.getErrors()),
                ) as ResultAsyncValue<S2 | S3>;
            }
            return helpers.fromResultPromise(nextSuccess(result.value));
        });
    }

    then: PromiseLike<Result<S>>['then'] = (onfulfilled, onrejected) =>
        this.resolve().then(onfulfilled, onrejected);
}

interface ResultAsyncFactory {
    <S>(
        compute: (helpers: ResultAsyncHelpers) => ResultAsyncValue<S>,
    ): ResultAsync<S>;
    liftResult<S>(result: Result<S>): ResultAsync<S>;
    liftSuccess<S>(value: S): ResultAsync<S>;
    liftFailure<T extends NativeErrorType>(
        parameters: PureErrorParameters<T>,
    ): ResultAsync<never>;
    fromResultPromise<S>(promise: () => PromiseLike<Result<S>>): ResultAsync<S>;
    fromPromise<S>(
        promise: () => PromiseLike<S>,
        failure: (reason: unknown) => Failure,
    ): ResultAsync<S>;
}

export const ResultAsync: ResultAsyncFactory = Object.assign(
    <S>(
        compute: (helpers: ResultAsyncHelpers) => ResultAsyncValue<S>,
    ): ResultAsync<S> => new ResultAsyncImpl(compute),
    {
        liftResult<S>(result: Result<S>): ResultAsync<S> {
            return ResultAsync(({ liftResult }) => liftResult(result));
        },
        liftSuccess<S>(value: S): ResultAsync<S> {
            return ResultAsync(({ liftSuccess }) => liftSuccess(value));
        },
        liftFailure<T extends NativeErrorType>(
            parameters: PureErrorParameters<T>,
        ): ResultAsync<never> {
            return ResultAsync(({ liftFailure }) => liftFailure(parameters));
        },
        fromResultPromise<S>(
            promise: () => PromiseLike<Result<S>>,
        ): ResultAsync<S> {
            return ResultAsync(({ fromResultPromise }) =>
                fromResultPromise(promise()),
            );
        },
        fromPromise<S>(
            promise: () => PromiseLike<S>,
            failure: (reason: unknown) => Failure,
        ): ResultAsync<S> {
            return ResultAsync(({ fromPromise }) =>
                fromPromise(promise(), failure),
            );
        },
    },
);
