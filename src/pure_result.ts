import z from 'zod';
import {
    Error,
    generateError,
    Message,
    messageSchema,
    NativeErrorData,
    NativeErrorType,
} from './pure_message';

export type Result<S> = Success<S> | Failure;

abstract class PureResult<S> {
    constructor(trace?: Message) {
        if (trace) {
            this.addTraces(trace);
        }
    }

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                            TRACE MANAGEMENT                          #
    //#────────────────────────────────────────────────────────────────────────────#

    private readonly traces: Message[] = [];

    //>
    //> > fr: Récupération des traces sans pouvoir les modifier depuis l'extérieur.
    //> > en: Retrieval of traces without being able to modify them from outside.
    //>
    public getTraces(): Message[] {
        return structuredClone(this.traces);
    }

    public addTraces(...traces: Message[]): this {
        for (let trace of traces) {
            const zodParseResult = messageSchema.safeParse(trace);
            if (!zodParseResult.success) {
                trace = generateError(
                    'pureTraceInternalError',
                    'invalidTraceMessage',
                    {
                        message: trace,
                        zodError: z.treeifyError(zodParseResult.error),
                    },
                );
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

    abstract isSuccess(): this is Success<S>;

    abstract isFailure(): this is Failure;

    //#endregion ───── INTROSPECTION ─────

    //#region    ───── FUNCTORS ─────

    abstract mapSuccess<S2>(f: (value: S) => Success<S2>): Result<S2>;

    abstract mapFailure(f: (errors: Message[]) => Failure): Result<S>;

    abstract mapBoth<S2>(
        onSuccess: (value: S) => Success<S2>,
        onFailure: (errors: Message[]) => Failure,
    ): Result<S2>;

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    abstract chainSuccess<S2>(f: (value: S) => Result<S2>): Result<S2>;

    abstract chainFailure<S2>(
        f: (errors: Message[]) => Result<S2>,
    ): Result<S | S2>;

    abstract chainBoth<S2, S3>(
        onSuccess: (value: S) => Result<S2>,
        onFailure: (errors: Message[]) => Result<S3>,
    ): Result<S2 | S3>;

    abstract convertFailureToSuccess(defaultValue: S): Success<S>;

    //#endregion ───── MONADS ─────

    //#────────────────────────────────────────────────────────────────────────────#
    //#endregion                         ABSTRACT METHODS                          #
    //#────────────────────────────────────────────────────────────────────────────#

    //#────────────────────────────────────────────────────────────────────────────#
    //#region                              OHTER METHODS                           #
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
    //#endregion                           OHTER METHODS                           #
    //#────────────────────────────────────────────────────────────────────────────#
}

export class Success<S> extends PureResult<S> {
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

    public isSuccess(): this is Success<S> {
        return true;
    }

    public isFailure(): this is Failure {
        return false;
    }

    //#endregion ───── INTROSPECTION ─────

    //#region    ───── FUNCTORS ─────

    public mapSuccess<S2>(f: (value: S) => Success<S2>): Result<S2> {
        return f(this.value).addTraces(...this.getTraces());
    }

    public mapFailure(f: (errors: Message[]) => Failure): Result<S> {
        return this;
    }

    public mapBoth<S2>(
        onSuccess: (value: S) => Success<S2>,
        onFailure: (errors: Message[]) => Failure,
    ): Result<S2> {
        return this.mapSuccess(onSuccess);
    }

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    public chainSuccess<S2>(f: (value: S) => Result<S2>): Result<S2> {
        return f(this.value).addTraces(...this.getTraces());
    }

    public chainFailure<S2>(
        f: (errors: Message[]) => Result<S2>,
    ): Result<S | S2> {
        return this;
    }

    public chainBoth<S2, S3>(
        onSuccess: (value: S) => Result<S2>,
        onFailure: (errors: Message[]) => Result<S3>,
    ): Result<S2 | S3> {
        return this.chainSuccess(onSuccess);
    }

    public convertFailureToSuccess(defaultValue: S): Success<S> {
        return this;
    }

    //#endregion ───── MONADS ─────

    //#────────────────────────────────────────────────────────────────────────────#
    //#endregion                       RESULT IMPLEMENTATION                       #
    //#────────────────────────────────────────────────────────────────────────────#
}

export class Failure extends PureResult<never> {
    private readonly errors: Error[] = [];
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

    public addErrors(errors: Error[]): this {
        for (let error of errors) {
            const zodParseResult = messageSchema.safeParse(error);
            if (!zodParseResult.success) {
                error = generateError(
                    'pureTraceInternalError',
                    'invalidError',
                    {
                        message: error,
                        zodError: z.treeifyError(zodParseResult.error),
                    },
                );
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

    public mapSuccess<S2>(f: (value: never) => Success<S2>): Result<S2> {
        return this;
    }

    public mapFailure(f: (errors: Message[]) => Failure): Result<never> {
        return f(this.getErrors()).addTraces(...this.getTraces());
    }

    public mapBoth<S2>(
        onSuccess: (value: never) => Success<S2>,
        onFailure: (errors: Message[]) => Failure,
    ): Result<S2> {
        return this.mapFailure(onFailure);
    }

    //#endregion ───── FUNCTORS ─────

    //#region    ───── MONADS ─────

    public chainSuccess<S2>(f: (value: never) => Result<S2>): Result<S2> {
        return this;
    }

    public chainFailure<S2>(
        f: (errors: Message[]) => Result<S2>,
    ): Result<never | S2> {
        return f(this.getErrors()).addTraces(...this.getTraces());
    }

    public chainBoth<S2, S3>(
        onSuccess: (value: never) => Result<S2>,
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

export function generateFailure<T extends NativeErrorType>(
    type: T,
    code: string,
    data: NativeErrorData<T>,
): Failure {
    return new Failure(generateError(type, code, data));
}

export class GetResult {
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
