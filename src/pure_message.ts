import z from 'zod';

/**
 * Zod schema for a generic message structure.
 */
export const messageSchema = z.object({
    kind: z.string(),
    type: z.string(),
    code: z.string(),
    data: z.json().optional(),
    issuer: z.string().min(1).optional(),
    localizedMessage: z.string().min(1).optional(),
});

/**
 * Represents a validated message object.
 */
export type Message = z.infer<typeof messageSchema>;

/**
 * Zod schema for an error message, extending the generic message schema.
 */
export const errorSchema = messageSchema.extend({
    kind: z.literal('error'),
});

/**
 * Represents a validated error object.
 */
export type Error = z.infer<typeof errorSchema>;

//#────────────────────────────────────────────────────────────────────────────#
//#region                              NATIVE ERRORS                           #
//#────────────────────────────────────────────────────────────────────────────#

//#region    ───── TYPES ─────

type NativeErrorDefinitions = {
    readonly pureTraceInternalError: z.ZodObject<
        {
            message: z.ZodObject<z.core.$ZodLooseShape, z.core.$loose>;
            zodError: z.ZodObject<z.core.$ZodLooseShape, z.core.$loose>;
        },
        z.core.$strip
    >;
    readonly technicalIssue: z.ZodUnion<[z.ZodJSONSchema, z.ZodUndefined]>;
    readonly processError: z.ZodUnion<[z.ZodJSONSchema, z.ZodUndefined]>;
};

/**
 * The set of all native error type keys.
 */
export type NativeErrorType = keyof NativeErrorDefinitions;

/**
 * The data type associated with a given native error type.
 */
export type NativeErrorData<T extends NativeErrorType> = z.infer<
    NativeErrorDefinitions[T]
>;

//#endregion ───── TYPES ─────

//#region    ───── GENERATOR ─────

/**
 * Generates a strongly-typed error message object.
 * @template T The native error type.
 * @param options Error details and metadata.
 * @returns A validated error object.
 */
export function generateError<T extends NativeErrorType>(options: {
    type: T;
    code: string;
    data?: NativeErrorData<T>;
    issuer?: string;
    localizedMessage?: string;
}): Error {
    return {
        kind: 'error',
        ...options,
    } as Error;
}

//#endregion ───── GENERATOR ─────

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                           NATIVE ERRORS                           #
//#────────────────────────────────────────────────────────────────────────────#

//#────────────────────────────────────────────────────────────────────────────#
//#region                             NATIVE MESSAGES                          #
//#────────────────────────────────────────────────────────────────────────────#

//#region    ───── TYPES ─────

type NativeMessageDefinitions = {
    error: NativeErrorDefinitions;
    information: {
        warning: z.ZodJSONSchema;
        information: z.ZodJSONSchema;
    };
    metric: {
        start: z.ZodISODateTime;
        stop: z.ZodISODateTime;
    };
};
type NativeMessageKind = keyof NativeMessageDefinitions;
type NativeMessageType<K extends NativeMessageKind> =
    keyof NativeMessageDefinitions[K];
type NativeMessageData<
    K extends NativeMessageKind,
    T extends NativeMessageType<K>,
> = NativeMessageDefinitions[K][T];

//#endregion ───── TYPES ─────

//#region    ───── GENERATOR ─────

/**
 * Generates a strongly-typed message object.
 * @template K The message kind.
 * @template T The message type.
 * @param options Message details and metadata.
 * @returns A validated message object.
 */
export function generateMessage<
    K extends NativeMessageKind,
    T extends NativeMessageType<K>,
>(options: {
    kind: K;
    type: T;
    code: string;
    data?: NativeMessageData<K, T>;
    issuer?: string;
    localizedMessage?: string;
}): Message {
    return {
        ...options,
    } as Message;
}

//#endregion ───── GENERATOR ─────

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                          NATIVE MESSAGES                          #
//#────────────────────────────────────────────────────────────────────────────#
