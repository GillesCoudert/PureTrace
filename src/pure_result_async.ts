import { Message } from './pure_message';
import { Success, Failure, generateFailure, Result } from './pure_result';

type ResultAsyncValue<S> = PromiseLike<Success<S>>;

interface ResultAsyncHelpers {
    liftResult<S>(result: Result<S>): ResultAsyncValue<S>;
    liftSuccess<S>(value: S): ResultAsyncValue<S>;
    fromResultPromise<S>(promise: PromiseLike<Result<S>>): ResultAsyncValue<S>;
    fromPromise<S>(
        promise: PromiseLike<S>,
        failure: (reason: unknown) => Failure,
    ): ResultAsyncValue<S>;
}

const resultAsyncHelpers: ResultAsyncHelpers = {
    liftResult<S>(result: Result<S>): ResultAsyncValue<S> {
        if (result.isSuccess()) {
            return Promise.resolve(result as Success<S>);
        }
        throw result as Failure;
    },
    liftSuccess<S>(value: S): ResultAsyncValue<S> {
        return Promise.resolve(new Success(value));
    },
    fromResultPromise<S>(promise: PromiseLike<Result<S>>): ResultAsyncValue<S> {
        return promise.then(
            resultAsyncHelpers.liftResult,
        ) as ResultAsyncValue<S>;
    },
    fromPromise<S>(
        promise: PromiseLike<S>,
        failure: (reason: unknown) => Failure,
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

interface ResultAsync<S> extends PromiseLike<Result<S>> {
    resolve(): Promise<Result<S>>;
    tap(f: (result: Result<S>) => void): ResultAsync<S>;
    mapSuccess<S2>(onSuccess: (value: S) => Success<S2>): ResultAsync<S2>;
    mapFailure(onFailure: (errors: Message[]) => Failure): ResultAsync<S>;
    mapBoth<S2>(
        onSuccess: (value: S) => Success<S2>,
        onFailure: (errors: Message[]) => Failure,
    ): ResultAsync<S2>;
    chain<S2>(next: (result: Result<S>) => ResultAsync<S2>): ResultAsync<S2>;
    chainSuccess<S2>(
        onSuccess: (value: S) => PromiseLike<Result<S2>>,
    ): ResultAsync<S2>;
    chainFailure<S2>(
        onFailure: (errors: Message[]) => PromiseLike<Result<S2>>,
    ): ResultAsync<S | S2>;
    chainBoth<S2, S3>(
        onSuccess: (value: S) => PromiseLike<Result<S3>>,
        onFailure: (errors: Message[]) => PromiseLike<Result<S2>>,
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
            if (e instanceof Failure) {
                return e;
            }
            return generateFailure('technicalIssue', 'uncatchedException', {
                message: JSON.stringify(e),
            });
        }
    }

    tap(f: (result: Result<S>) => void): ResultAsync<S> {
        return ResultAsync(async ({ liftResult }) =>
            liftResult((await this.resolve()).tap(f)),
        );
    }

    mapSuccess<S2>(onSuccess: (value: S) => Success<S2>): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.resolve();
            return helpers.liftResult(result.mapSuccess(onSuccess));
        });
    }

    mapFailure(onFailure: (errors: Message[]) => Failure): ResultAsync<S> {
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
        onFailure: (errors: Message[]) => Failure,
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
        next: (errors: Message[]) => PromiseLike<Result<S2>>,
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
        nextFailure: (errors: Message[]) => PromiseLike<Result<S2>>,
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
