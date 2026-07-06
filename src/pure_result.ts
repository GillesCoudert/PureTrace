import {
    PureError,
    generateError,
    PureMessage,
    PureMessageInput,
    PureErrorInput,
    NativeErrorType,
    PureErrorParameters,
} from './pure_message.js';

/** Normalizes a single item or a list into a readonly array. */
function toArray<T>(input: T | readonly T[]): readonly T[] {
    return Array.isArray(input) ? (input as readonly T[]) : [input as T];
}

/**
 * Represents the result of an operation, which can be either a Success or a Failure.
 * @template S The type of the success value.
 */
export type Result<S> = Success<S> | Failure;

abstract class PureResult<S> {
    /**
     * Constructs a new PureResult instance.
     * @param traces - Optional PureMessages to associate with the result.
     */
    constructor(traces?: PureMessageInput) {
        if (traces) {
            this.addTraces(traces);
        }
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                            TRACE MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    protected readonly traces: PureMessage[] = [];

    /**
     * Retrieves the trace messages associated with this result.
     * @returns A shallow copy of the trace messages (messages are immutable).
     */
    public getTraces(): PureMessage[] {
        return [...this.traces];
    }

    /**
     * Adds trace messages to this result.
     * @param traces - The trace messages to add.
     */
    public addTraces(traces: PureMessageInput): void {
        //>
        //> > fr: Pas de validation runtime : confiance au typage en interne.
        //> > en: No runtime validation: internal callers are trusted via types.
        //>
        this.traces.push(...toArray(traces));
    }

    /**
     * Returns a new result of the same variant carrying this result's own
     * messages followed by the given ambient traces. Never mutates this instance.
     * @param ambient - Trace messages to append after this result's own messages.
     * @returns A new result enriched with the ambient traces.
     */
    public abstract cloneWithTraces(ambient: PureMessageInput): Result<S>;

    /**
     * Non-destructive, chainable trace enrichment. Returns a new result of the
     * same variant with the given traces appended. Alias façade over
     * {@link cloneWithTraces} for an intent-revealing name in chains.
     */
    public trace(traces: PureMessageInput): Result<S> {
        return this.cloneWithTraces(traces);
    }

    /**
     * Like {@link trace} but only enriches a `Success`; a `Failure` is returned
     * unchanged. Non-destructive.
     */
    public abstract traceSuccess(traces: PureMessageInput): Result<S>;

    /**
     * Like {@link trace} but only enriches a `Failure`; a `Success` is returned
     * unchanged. Non-destructive.
     */
    public abstract traceFailure(traces: PureMessageInput): Result<S>;

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
    abstract mapSuccess<S2>(f: (value: S) => S2): Result<S2>;

    /**
     * Maps the failure messages using the provided function.
     * @param f - The function to apply to the failure messages.
     * @returns A new Result with the mapped failure messages.
     */
    abstract mapFailure(f: (errors: PureError[]) => PureError[]): Result<S>;

    /**
     * Maps both success and failure values using the provided functions.
     * @param onSuccess - The function to apply to the success value.
     * @param onFailure - The function to apply to the failure messages.
     * @returns A new Result with the mapped values.
     */
    abstract mapBoth<S2>(
        onSuccess: (value: S) => S2,
        onFailure: (errors: PureError[]) => PureError[],
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
     * Recovers a failure into `Success(defaultValue)`; a success is returned
     * unchanged. Generic on the default's type so it stays callable on a
     * `Result<S>`, where `Failure`'s success type is `never`.
     * @param defaultValue - Value used when the result is a failure.
     */
    abstract convertFailureToSuccess<T>(defaultValue: T): Success<S | T>;

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
        return f(this).cloneWithTraces(this.traces);
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
     * @param traces Optional trace messages.
     */
    constructor(
        public readonly value: S,
        traces?: PureMessageInput,
    ) {
        super(traces);
    }

    /**
     * Returns a new Success with the same value, this result's own traces,
     * then the given ambient traces.
     */
    public cloneWithTraces(ambient: PureMessageInput): Result<S> {
        return new Success(this.value, [...this.traces, ...toArray(ambient)]);
    }

    public traceSuccess(traces: PureMessageInput): Result<S> {
        return this.cloneWithTraces(traces);
    }

    public traceFailure(_: PureMessageInput): Result<S> {
        return this;
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
    public mapSuccess<S2>(f: (value: S) => S2): Result<S2> {
        return new Success(f(this.value), this.traces);
    }

    /**
     * Ignores mapping on failure, returns this.
     * @param _ Ignored function.
     * @returns This instance.
     */
    public mapFailure(_: (errors: PureError[]) => PureError[]): Result<S> {
        return this;
    }

    /**
     * Applies the success function, ignores the failure function.
     * @param onSuccess Function to apply on success.
     * @param _ Ignored failure function.
     * @returns A new Result with the mapped value.
     */
    public mapBoth<S2>(
        onSuccess: (value: S) => S2,
        _: (errors: PureError[]) => PureError[],
    ): Result<S2> {
        return this.mapSuccess(onSuccess);
    }

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    public chainSuccess<S2>(f: (value: S) => Result<S2>): Result<S2> {
        return f(this.value).cloneWithTraces(this.traces);
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
    public convertFailureToSuccess<T>(_: T): Success<S | T> {
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
     * @param errors The errors associated with the failure.
     * @param traces Optional trace messages.
     */
    constructor(
        errors: PureErrorInput = [],
        traces?: PureMessageInput,
    ) {
        super(traces);
        this.addErrors(errors);
    }

    /**
     * Returns a new Failure with the same errors, this result's own traces,
     * then the given ambient traces.
     */
    public cloneWithTraces(ambient: PureMessageInput): Failure {
        return new Failure(this.errors, [...this.traces, ...toArray(ambient)]);
    }

    public traceSuccess(_: PureMessageInput): Result<never> {
        return this;
    }

    public traceFailure(traces: PureMessageInput): Result<never> {
        return this.cloneWithTraces(traces);
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                            ERROR MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    /**
     * Retrieves the errors associated with this failure.
     * @returns A shallow copy of the errors (errors are immutable).
     */
    public getErrors(): PureError[] {
        return [...this.errors];
    }

    /**
     * Adds errors to this failure.
     * @param errors The errors to add.
     */
    public addErrors(errors: PureErrorInput): void {
        //>
        //> > fr: Pas de validation runtime : confiance au typage en interne.
        //> > en: No runtime validation: internal callers are trusted via types.
        //>
        this.errors.push(...toArray(errors));
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

    public mapSuccess<S2>(_: (value: never) => S2): Result<S2> {
        return this;
    }

    public mapFailure(f: (errors: PureError[]) => PureError[]): Result<never> {
        return new Failure(f(this.getErrors()), this.traces);
    }

    public mapBoth<S2>(
        _: (value: never) => S2,
        onFailure: (errors: PureError[]) => PureError[],
    ): Result<S2> {
        return this.mapFailure(onFailure);
    }

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    public chainSuccess<S2>(_: (value: never) => Result<S2>): Result<S2> {
        return this;
    }

    public chainFailure<S2>(
        f: (errors: PureMessage[]) => Result<S2>,
    ): Result<S2> {
        return f(this.getErrors()).cloneWithTraces(this.traces);
    }

    public chainBoth<S2, S3>(
        _: (value: never) => Result<S2>,
        onFailure: (errors: PureMessage[]) => Result<S3>,
    ): Result<S2 | S3> {
        return this.chainFailure(onFailure);
    }

    public convertFailureToSuccess<T>(defaultValue: T): Success<T> {
        return new Success(defaultValue, [...this.errors, ...this.traces]);
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
    return new Failure([generateError(parameters)]);
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
        onFailure: (caughtError: unknown) => Failure,
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
                    //> ?! ─────────────────── ?!
                    //> ?! fr: Première erreur ?!
                    //> ?! ─────────────────── ?!
                    failure = new Failure(result.getErrors());
                } else if (!firstFailureOnly) {
                    failure.addErrors(result.getErrors());
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
            return failure.cloneWithTraces(traces);
        }
        return new Success(successes, traces);
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
        return new Success(successes, traces);
    }
}
