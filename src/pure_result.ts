import z from 'zod';
import {
    PureError,
    generateError,
    PureMessage,
    messageSchema,
    NativeErrorType,
    PureErrorParameters,
} from './pure_message';

/**
 * Represents the result of an operation, which can be either a Success or a Failure.
 * @template S The type of the success value.
 */
export type Result<S> = Success<S> | Failure;

abstract class PureResult<S> {
    /**
     * Constructs a new PureResult instance.
     * @param trace - An optional PureMessage to associate with the result.
     */
    constructor(trace?: PureMessage) {
        if (trace) {
            this.addTraces(trace);
        }
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                            TRACE MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    private readonly traces: PureMessage[] = [];

    /**
     * Retrieves the trace messages associated with this result.
     * @returns A copy of the trace messages.
     */
    public getTraces(): PureMessage[] {
        return structuredClone(this.traces);
    }

    /**
     * Adds trace messages to this result.
     * @param traces - The trace messages to add.
     * @returns The current instance for chaining.
     */
    public addTraces(...traces: PureMessage[]): this {
        for (let trace of traces) {
            const zodParseResult = messageSchema.safeParse(trace);
            if (!zodParseResult.success) {
                trace = generateError({
                    type: 'pureTraceInternalError',
                    code: 'invalidTraceMessage',
                    data: {
                        pureMessage: trace,
                        zodError: z.treeifyError(zodParseResult.error),
                    },
                });
            }
            this.traces.push(trace);
        }
        return this;
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#endregion                         TRACE MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                            ABSTRACT METHODS                          #
    //#────────────────────────────────────────────────────────────────────────────#

    //#region    ───── INTROSPECTION ─────

    /**
     * Determines if the result is a success.
     * @returns True if the result is a success, false otherwise.
     */
    abstract isSuccess(): this is Success<S>;

    /**
     * Determines if the result is a failure.
     * @returns True if the result is a failure, false otherwise.
     */
    abstract isFailure(): this is Failure;

    //#endregion ───── INTROSPECTION ─────

    //#region    ───── TAP (SIDE-EFFECTS) ─────

    /**
     * Calls the provided function if the result is a success.
     * @param onSuccess - Function to call with the success instance.
     * @returns The current Result instance.
     */
    abstract tapSuccess(onSuccess: (success: Success<S>) => void): Result<S>;

    /**
     * Calls the provided function if the result is a failure.
     * @param onFailure - Function to call with the failure instance.
     * @returns The current Result instance.
     */
    abstract tapFailure(onFailure: (failure: Failure) => void): Result<S>;

    /**
     * Calls the appropriate function depending on success or failure.
     * @param onSuccess - Function to call with the success instance.
     * @param onFailure - Function to call with the failure instance.
     * @returns The current Result instance.
     */
    abstract tapBoth(
        onSuccess: (success: Success<S>) => void,
        onFailure: (failure: Failure) => void,
    ): Result<S>;

    //#endregion ───── TAP (SIDE-EFFECTS) ─────

    //#region    ───── FUNCTORS ─────

    /**
     * Maps the success value using the provided function.
     * @param f - The function to apply to the success value.
     * @returns A new Result with the mapped success value.
     */
    abstract mapSuccess<S2>(f: (value: S) => Success<S2>): Result<S2>;

    /**
     * Maps the failure messages using the provided function.
     * @param f - The function to apply to the failure messages.
     * @returns A new Result with the mapped failure messages.
     */
    abstract mapFailure(f: (errors: PureMessage[]) => Failure): Result<S>;

    /**
     * Maps both success and failure values using the provided functions.
     * @param onSuccess - The function to apply to the success value.
     * @param onFailure - The function to apply to the failure messages.
     * @returns A new Result with the mapped values.
     */
    abstract mapBoth<S2>(
        onSuccess: (value: S) => Success<S2>,
        onFailure: (errors: PureMessage[]) => Failure,
    ): Result<S2>;

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    /**
     * Chains the success value using the provided function.
     * @param f - The function to apply to the success value.
     * @returns A new Result with the chained success value.
     */
    abstract chainSuccess<S2>(f: (value: S) => Result<S2>): Result<S2>;

    /**
     * Chains the failure messages using the provided function.
     * @param f - The function to apply to the failure messages.
     * @returns A new Result with the chained failure messages.
     */
    abstract chainFailure<S2>(
        f: (errors: PureMessage[]) => Result<S2>,
    ): Result<S | S2>;

    /**
     * Chains both success and failure values using the provided functions.
     * @param onSuccess - The function to apply to the success value.
     * @param onFailure - The function to apply to the failure messages.
     * @returns A new Result with the chained values.
     */
    abstract chainBoth<S2, S3>(
        onSuccess: (value: S) => Result<S2>,
        onFailure: (errors: PureMessage[]) => Result<S3>,
    ): Result<S2 | S3>;

    /**
     * Converts a failure to a success with a default value.
     * @param defaultValue - The default value to use for the success.
     * @returns A Success instance with the default value.
     */
    abstract convertFailureToSuccess(defaultValue: S): Success<S>;

    //#endregion ───── MONADS ─────

    //#────────────────────────────────────────────────────────────────────────────#
    //#endregion                         ABSTRACT METHODS                          #
    //#────────────────────────────────────────────────────────────────────────────#

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                              OTHER METHODS                           #
    //#────────────────────────────────────────────────────────────────────────────#

    /**
     * Calls the provided function with the current result instance as a side-effect.
     * @param f Function to call with the current result.
     * @returns The current Result instance.
     */
    public tap(f: (result: this) => void): Result<S> {
        f(this);
        return this as unknown as Result<S>;
    }

    //#region    ───── MONADS ─────

    /**
     * Chains a function over the current result, propagating existing traces to the new result.
     * @param f Function to apply to the current result.
     * @returns A new Result produced by the function, with existing traces added.
     */
    public chain<S2>(f: (result: this) => Result<S2>): Result<S2> {
        return f(this).addTraces(...this.getTraces());
    }

    //#endregion ───── MONADS ─────

    //#────────────────────────────────────────────────────────────────────────────#
    //#endregion                           OTHER METHODS                           #
    //#────────────────────────────────────────────────────────────────────────────#
}

/**
 * Represents a successful result.
 * @template S The type of the success value.
 */
export class Success<S> extends PureResult<S> {
    /**
     * Creates a new Success instance.
     * @param value The successful value.
     * @param trace Optional trace message.
     */
    constructor(
        public readonly value: S,
        trace?: PureMessage,
    ) {
        super(trace);
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                          RESULT IMPLEMENTATION                       #
    //#────────────────────────────────────────────────────────────────────────────#

    //#region    ───── INTROSPECTION ─────

    /**
     * Always returns true for Success.
     */
    public isSuccess(): this is Success<S> {
        return true;
    }

    /**
     * Always returns false for Success.
     */
    public isFailure(): this is Failure {
        return false;
    }

    //#endregion ───── INTROSPECTION ─────

    //#region    ───── TAP (SIDE-EFFECTS) ─────

    /**
     * Calls the provided function with the success instance.
     * @param onSuccess Function to call with the success instance.
     * @returns The current Result instance.
     */
    public tapSuccess(onSuccess: (success: Success<S>) => void): Result<S> {
        onSuccess(this);
        return this;
    }

    /**
     * Does nothing for Success.
     * @param onFailure Ignored function.
     * @returns The current Result instance.
     */
    public tapFailure(onFailure: (failure: Failure) => void): Result<S> {
        void onFailure;
        return this;
    }

    /**
     * Calls onSuccess with the success instance, ignores onFailure.
     * @param onSuccess Function to call with the success instance.
     * @param onFailure Ignored function.
     * @returns The current Result instance.
     */
    public tapBoth(
        onSuccess: (success: Success<S>) => void,
        onFailure: (failure: Failure) => void,
    ): Result<S> {
        onSuccess(this);
        void onFailure;
        return this;
    }

    //#endregion ───── TAP (SIDE-EFFECTS) ─────

    //#region    ───── FUNCTORS ─────

    /**
     * Maps the success value using the provided function.
     * @param f Function to apply to the success value.
     * @returns A new Result with the mapped value.
     */
    public mapSuccess<S2>(f: (value: S) => Success<S2>): Result<S2> {
        return f(this.value).addTraces(...this.getTraces());
    }

    /**
     * Ignores mapping on failure, returns this.
     * @param _ Ignored function.
     * @returns This instance.
     */
    public mapFailure(_: (errors: PureMessage[]) => Failure): Result<S> {
        return this;
    }

    /**
     * Applies the success function, ignores the failure function.
     * @param onSuccess Function to apply on success.
     * @param _ Ignored failure function.
     * @returns A new Result with the mapped value.
     */
    public mapBoth<S2>(
        onSuccess: (value: S) => Success<S2>,
        _: (errors: PureMessage[]) => Failure,
    ): Result<S2> {
        return this.mapSuccess(onSuccess);
    }

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    /**
     * Chains the success value using the provided function.
     * @param f Function to apply to the success value.
     * @returns A new Result produced by the function, with existing traces added.
     */
    public chainSuccess<S2>(f: (value: S) => Result<S2>): Result<S2> {
        return f(this.value).addTraces(...this.getTraces());
    }

    /**
     * Ignores chaining on failure, returns this.
     * @param _ Ignored function.
     * @returns This instance.
     */
    public chainFailure<S2>(
        _: (errors: PureMessage[]) => Result<S2>,
    ): Result<S | S2> {
        return this;
    }

    /**
     * Applies the success function, ignores the failure function.
     * @param onSuccess Function to apply on success.
     * @param _ Ignored failure function.
     * @returns A new Result.
     */
    public chainBoth<S2, S3>(
        onSuccess: (value: S) => Result<S2>,
        _: (errors: PureMessage[]) => Result<S3>,
    ): Result<S2 | S3> {
        return this.chainSuccess(onSuccess);
    }

    /**
     * Returns this instance since it is already a success.
     * @param _ Ignored default value.
     * @returns This instance.
     */
    public convertFailureToSuccess(_: S): Success<S> {
        return this;
    }

    //#endregion ───── MONADS ─────

    //#────────────────────────────────────────────────────────────────────────────#
    //#endregion                       RESULT IMPLEMENTATION                       #
    //#────────────────────────────────────────────────────────────────────────────#
}

/**
 * Represents a failed result.
 */
export class Failure extends PureResult<never> {
    private readonly errors: PureError[] = [];
    /**
     * Creates a new Failure instance.
     * @param errors One or more errors associated with the failure.
     */
    constructor(...errors: PureError[]) {
        super();
        this.addErrors(errors);
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                            ERROR MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    /**
     * Retrieves the errors associated with this failure.
     * @returns A copy of the errors.
     */
    public getErrors(): PureError[] {
        return structuredClone(this.errors);
    }

    /**
     * Adds errors to this failure.
     * @param errors The errors to add.
     * @returns The current instance for chaining.
     */
    public addErrors(errors: PureError[]): this {
        for (let error of errors) {
            const zodParseResult = messageSchema.safeParse(error);
            if (!zodParseResult.success) {
                error = generateError({
                    type: 'pureTraceInternalError',
                    code: 'invalidError',
                    data: {
                        pureMessage: error,
                        zodError: z.treeifyError(zodParseResult.error),
                    },
                });
            }
            this.errors.push(error);
        }
        return this;
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#endregion                         ERROR MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                          RESULT IMPLEMENTATION                       #
    //#────────────────────────────────────────────────────────────────────────────#

    //#region    ───── INTROSPECTION ─────

    /**
     * Always returns false for Failure.
     */
    public isSuccess(): this is Success<never> {
        return false;
    }

    /**
     * Always returns true for Failure.
     */
    public isFailure(): this is Failure {
        return true;
    }

    //#endregion ───── INTROSPECTION ─────

    //#region    ───── TAP (SIDE-EFFECTS) ─────

    /**
     * Does nothing for Failure.
     * @param onSuccess Ignored function.
     * @returns The current Result instance.
     */
    public tapSuccess(
        onSuccess: (success: Success<never>) => void,
    ): Result<never> {
        void onSuccess;
        return this;
    }

    /**
     * Calls the provided function with the failure instance.
     * @param onFailure Function to call with the failure instance.
     * @returns The current Result instance.
     */
    public tapFailure(onFailure: (failure: Failure) => void): Result<never> {
        onFailure(this);
        return this;
    }

    /**
     * Calls onFailure with the failure instance, ignores onSuccess.
     * @param onSuccess Ignored function.
     * @param onFailure Function to call with the failure instance.
     * @returns The current Result instance.
     */
    public tapBoth(
        onSuccess: (success: Success<never>) => void,
        onFailure: (failure: Failure) => void,
    ): Result<never> {
        void onSuccess;
        onFailure(this);
        return this;
    }

    //#endregion ───── TAP (SIDE-EFFECTS) ─────

    //#region    ───── FUNCTORS ─────

    /**
     * Ignores mapping on success, returns this.
     * @param _ Ignored function.
     * @returns This instance.
     */
    public mapSuccess<S2>(_: (value: never) => Success<S2>): Result<S2> {
        return this;
    }

    /**
     * Maps the failure errors using the provided function.
     * @param f Function to apply to the failure errors.
     * @returns A new Failure with mapped errors, with existing traces added.
     */
    public mapFailure(f: (errors: PureMessage[]) => Failure): Result<never> {
        return f(this.getErrors()).addTraces(...this.getTraces());
    }

    /**
     * Applies the failure function, ignores the success function.
     * @param _ Ignored success function.
     * @param onFailure Function to apply on failure.
     * @returns A new Result with the mapped failure.
     */
    public mapBoth<S2>(
        _: (value: never) => Success<S2>,
        onFailure: (errors: PureMessage[]) => Failure,
    ): Result<S2> {
        return this.mapFailure(onFailure);
    }

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    /**
     * Ignores chaining on success, returns this.
     * @param _ Ignored function.
     * @returns This instance.
     */
    public chainSuccess<S2>(_: (value: never) => Result<S2>): Result<S2> {
        return this;
    }

    /**
     * Chains the failure errors using the provided function.
     * @param f Function to apply to the failure errors.
     * @returns A new Result produced by the function, with existing traces added.
     */
    public chainFailure<S2>(
        f: (errors: PureMessage[]) => Result<S2>,
    ): Result<S2> {
        return f(this.getErrors()).addTraces(...this.getTraces());
    }

    /**
     * Applies the failure function, ignores the success function.
     * @param _ Ignored success function.
     * @param onFailure Function to apply on failure.
     * @returns A new Result produced by the failure function.
     */
    public chainBoth<S2, S3>(
        _: (value: never) => Result<S2>,
        onFailure: (errors: PureMessage[]) => Result<S3>,
    ): Result<S2 | S3> {
        return this.chainFailure(onFailure);
    }

    /**
     * Converts this failure to a success using a default value, adding all errors and traces.
     * @param defaultValue The default value to use for the success.
     * @returns A Success instance with the default value.
     */
    public convertFailureToSuccess(defaultValue: never): Success<never> {
        return new Success(defaultValue).addTraces(
            ...this.getErrors(),
            ...this.getTraces(),
        );
    }

    //#endregion ───── MONADS ─────

    //#────────────────────────────────────────────────────────────────────────────#
    //#endregion                       RESULT IMPLEMENTATION                       #
    //#────────────────────────────────────────────────────────────────────────────#
}

/**
 * Generates a Failure from PureError details.
 * @template T The type of the PureError.
 * @param parameters The PureError parameters.
 * @returns A Failure instance.
 */
export function generateFailure<T extends NativeErrorType>(
    parameters: PureErrorParameters<T>,
): Failure {
    return new Failure(generateError(parameters));
}

/**
 * Utility class for extracting results from functions or arrays.
 */
export class GetResult {
    /**
     * Executes a function and returns a Success or Failure depending on whether it throws.
     * @param functionToAudit The function to execute.
     * @param onFailure Function to generate a Failure from a caught error.
     * @returns A Result containing the function's return value or a Failure.
     */
    public static fromThrowable<X>(
        functionToAudit: () => X,
        onFailure: (catchedError: unknown) => Failure,
    ): Result<X> {
        try {
            return new Success<X>(functionToAudit());
        } catch (error) {
            return onFailure(error);
        }
    }

    /**
     * Aggregates an array of Results into a single Result.
     * @param results The array of Results.
     * @param firstFailureOnly If true, stops at the first failure.
     * @returns A Result containing an array of all success values, or the first failure.
     */
    public static fromResultArray<X>(
        results: Result<X>[],
        firstFailureOnly: boolean = true,
    ): Result<X[]> {
        const successes: X[] = [];
        const traces: PureMessage[] = [];
        let failure: Failure | undefined = undefined;
        for (const result of results) {
            //>
            //> > fr: Préservation des traces
            //> > en: Preservation of traces
            //>
            const resultTraces = result.getTraces();
            if (resultTraces?.length) {
                traces.push(...resultTraces);
            }
            if (result.isFailure()) {
                //>
                //> > fr: En cas de Failure
                //> > en: In case of Failure
                //>
                if (!failure) {
                    failure = result;
                    failure.addTraces(...traces);
                    if (firstFailureOnly) {
                        return failure;
                    }
                } else {
                    failure.addErrors(result.getErrors());
                    failure.addTraces(...traces);
                }
            } else {
                //>
                //> > fr: En cas de Success
                //> > en: In case of Success
                //>
                successes.push(result.value);
            }
        }
        if (failure) {
            return failure;
        }
        return new Success(successes).addTraces(...traces);
    }

    /**
     * Aggregates an array of Results into a Success, adding all traces and errors.
     * @param results The array of Results to aggregate.
     * @returns A Success containing all success values and all traces/errors.
     */
    public static fromResultArrayAsSuccess<X>(
        results: Result<X>[],
    ): Success<X[]> {
        const successes: X[] = [];
        const traces: PureMessage[] = [];
        for (const result of results) {
            //>
            //> > fr: Préservation des traces
            //> > en: Preservation of traces
            //>
            const resultTraces = result.getTraces();
            if (resultTraces?.length) {
                traces.push(...resultTraces);
            }
            if (result.isFailure()) {
                //>
                //> > fr: En cas de Failure
                //> > en: In case of Failure
                //>
                traces.push(...result.getErrors());
            } else if (result.isSuccess()) {
                //>
                //> > fr: En cas de Success
                //> > en: In case of Success
                //>
                successes.push(result.value);
            }
        }
        return new Success(successes).addTraces(...traces);
    }
}
