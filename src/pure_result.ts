import z from 'zod';
import {
    Error,
    generateError,
    Message,
    messageSchema,
    NativeErrorData,
    NativeErrorType,
} from './pure_message';

/**
 * Represents the result of an operation, which can be either a Success or a Failure.
 * @template S The type of the success value.
 */
export type Result<S> = Success<S> | Failure;

abstract class PureResult<S> {
    /**
     * Constructs a new PureResult instance.
     * @param trace - An optional trace message to associate with the result.
     */
    constructor(trace?: Message) {
        if (trace) {
            this.addTraces(trace);
        }
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                            TRACE MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    private readonly traces: Message[] = [];

    /**
     * Retrieves the trace messages associated with this result.
     * @returns A copy of the trace messages.
     */
    public getTraces(): Message[] {
        return structuredClone(this.traces);
    }

    /**
     * Adds trace messages to this result.
     * @param traces - The trace messages to add.
     * @returns The current instance for chaining.
     */
    public addTraces(...traces: Message[]): this {
        for (let trace of traces) {
            const zodParseResult = messageSchema.safeParse(trace);
            if (!zodParseResult.success) {
                trace = generateError({
                    type: 'pureTraceInternalError',
                    code: 'invalidTraceMessage',
                    data: {
                        message: trace,
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
    abstract mapFailure(f: (errors: Message[]) => Failure): Result<S>;

    /**
     * Maps both success and failure values using the provided functions.
     * @param onSuccess - The function to apply to the success value.
     * @param onFailure - The function to apply to the failure messages.
     * @returns A new Result with the mapped values.
     */
    abstract mapBoth<S2>(
        onSuccess: (value: S) => Success<S2>,
        onFailure: (errors: Message[]) => Failure,
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
        f: (errors: Message[]) => Result<S2>,
    ): Result<S | S2>;

    /**
     * Chains both success and failure values using the provided functions.
     * @param onSuccess - The function to apply to the success value.
     * @param onFailure - The function to apply to the failure messages.
     * @returns A new Result with the chained values.
     */
    abstract chainBoth<S2, S3>(
        onSuccess: (value: S) => Result<S2>,
        onFailure: (errors: Message[]) => Result<S3>,
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

    public tap(f: (result: this) => void): Result<S> {
        f(this);
        return this as unknown as Result<S>;
    }

    //#region    ───── MONADS ─────

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
        trace?: Message,
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
    public mapFailure(_: (errors: Message[]) => Failure): Result<S> {
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
        _: (errors: Message[]) => Failure,
    ): Result<S2> {
        return this.mapSuccess(onSuccess);
    }

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    public chainSuccess<S2>(f: (value: S) => Result<S2>): Result<S2> {
        return f(this.value).addTraces(...this.getTraces());
    }

    /**
     * Ignores chaining on failure, returns this.
     * @param _ Ignored function.
     * @returns This instance.
     */
    public chainFailure<S2>(
        _: (errors: Message[]) => Result<S2>,
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
        _: (errors: Message[]) => Result<S3>,
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
    private readonly errors: Error[] = [];
    /**
     * Creates a new Failure instance.
     * @param errors One or more errors associated with the failure.
     */
    constructor(...errors: Error[]) {
        super();
        this.addErrors(errors);
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                            ERROR MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    public getErrors(): Error[] {
        return structuredClone(this.errors);
    }

    /**
     * Adds errors to this failure.
     * @param errors The errors to add.
     * @returns The current instance for chaining.
     */
    public addErrors(errors: Error[]): this {
        for (let error of errors) {
            const zodParseResult = messageSchema.safeParse(error);
            if (!zodParseResult.success) {
                error = generateError({
                    type: 'pureTraceInternalError',
                    code: 'invalidError',
                    data: {
                        message: error,
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

    public isSuccess(): this is Success<never> {
        return false;
    }

    public isFailure(): this is Failure {
        return true;
    }

    //#endregion ───── INTROSPECTION ─────

    //#region    ───── FUNCTORS ─────

    public mapSuccess<S2>(_: (value: never) => Success<S2>): Result<S2> {
        return this;
    }

    public mapFailure(f: (errors: Message[]) => Failure): Result<never> {
        return f(this.getErrors()).addTraces(...this.getTraces());
    }

    public mapBoth<S2>(
        _: (value: never) => Success<S2>,
        onFailure: (errors: Message[]) => Failure,
    ): Result<S2> {
        return this.mapFailure(onFailure);
    }

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    public chainSuccess<S2>(_: (value: never) => Result<S2>): Result<S2> {
        return this;
    }

    public chainFailure<S2>(f: (errors: Message[]) => Result<S2>): Result<S2> {
        return f(this.getErrors()).addTraces(...this.getTraces());
    }

    public chainBoth<S2, S3>(
        _: (value: never) => Result<S2>,
        onFailure: (errors: Message[]) => Result<S3>,
    ): Result<S2 | S3> {
        return this.chainFailure(onFailure);
    }

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
 * Generates a Failure from error details.
 * @template T The type of the error.
 * @param type The error type.
 * @param code The error code.
 * @param data The error data.
 * @param issuer Optional issuer.
 * @param localizedMessage Optional localized message.
 * @returns A Failure instance.
 */
export function generateFailure<T extends NativeErrorType>(parameters: {
    type: T;
    code: string;
    data?: NativeErrorData<T>;
    issuer?: string;
    localizedMessage?: string;
}): Failure {
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
        const traces: Message[] = [];
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
        const traces: Message[] = [];
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
