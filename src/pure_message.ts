import z from 'zod';

/**
 * Zod schema for a BCP 47 locale identifier.
 * Accepts formats like 'fr', 'en-US', 'ja-JP'.
 */
export const localeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/);

/**
 * Represents a BCP 47 locale identifier.
 */
export type Locale = z.infer<typeof localeSchema>;

/**
 * Zod schema for a localized message structure.
 */
export const localizedMessageSchema = z.object({
    locale: localeSchema.optional(),
    message: z.string().min(1),
});

/**
 * Represents a localized message with optional locale.
 */
export type LocalizedMessage = z.infer<typeof localizedMessageSchema>;

/**
 * Zod schema for a generic PureMessage structure.
 */
export const messageSchema = z.object({
    kind: z.string(),
    type: z.string(),
    code: z.string(),
    data: z.json().optional(),
    issuer: z.string().min(1).optional(),
    localizedMessage: localizedMessageSchema.optional(),
});

/**
 * Represents a validated PureMessage object.
 */
export type PureMessage = z.infer<typeof messageSchema>;

/**
 * Zod schema for a PureError message, extending the generic PureMessage schema.
 */
export const errorSchema = messageSchema.extend({
    kind: z.literal('error'),
});

/**
 * Represents a validated PureError object.
 */
export type PureError = z.infer<typeof errorSchema>;

//#────────────────────────────────────────────────────────────────────────────#
//#region                              COMMON TYPES                            #
//#────────────────────────────────────────────────────────────────────────────#

/**
 * Represents any valid JSON value.
 *
 * This type captures all possible JSON data types:
 * - Primitives: null, boolean, number, string
 * - Structures: arrays and objects
 *
 * The type is recursive to support nested JSON structures of arbitrary depth.
 *
 * @example
 * ```typescript
 * const simpleValue: Json = 'hello';
 * const numberValue: Json = 42;
 * const arrayValue: Json = [1, 2, 'three'];
 * const objectValue: Json = { name: 'John', age: 30, active: true };
 * const nestedValue: Json = {
 *   user: { name: 'John', contacts: ['email', 'phone'] },
 *   metadata: null
 * };
 * ```
 */
export type Json =
    | null
    | boolean
    | number
    | string
    | Json[]
    | { [key: string]: Json };

/**
 * Represents a plain JSON object with string keys and JSON values.
 */
export type JsonObject = { [key: string]: Json };

/**
 * Represents the shape of a Zod object schema where all values are JSON-compatible schemas.
 */
export type ZodJsonObjectShape = {
    [key: string]: z.ZodJSONSchema;
};

/**
 * Represents a Zod object schema with JSON-compatible fields.
 * @template TBehavior The object parsing behavior (strip, passthrough, etc.).
 */
export type ZodJsonObject<
    TBehavior extends z.core.$ZodObjectConfig = z.core.$strip,
> = z.ZodObject<ZodJsonObjectShape, TBehavior>;

/**
 * Represents a Zod object schema with loose (passthrough) JSON-compatible fields.
 */
export type ZodAnyJsonObject = ZodJsonObject<z.core.$loose>;

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                           COMMON TYPES                            #
//#────────────────────────────────────────────────────────────────────────────#

//#────────────────────────────────────────────────────────────────────────────#
//#region                              NATIVE ERRORS                           #
//#────────────────────────────────────────────────────────────────────────────#

//#region    ───── TYPES ─────

type NativeErrorDefinitions = {
    readonly pureTraceInternalError: z.ZodObject<
        {
            pureMessage: ZodAnyJsonObject;
            zodError: ZodAnyJsonObject;
        },
        z.core.$strip
    >;
    readonly technicalIssue: z.ZodUnion<[z.ZodJSONSchema, z.ZodUndefined]>;
    readonly processError: z.ZodUnion<[z.ZodJSONSchema, z.ZodUndefined]>;
};

/**
 * The set of all native PureError type keys.
 */
export type NativeErrorType = keyof NativeErrorDefinitions;

/**
 * The data type associated with a given native PureError type.
 */
export type NativeErrorData<T extends NativeErrorType> = z.infer<
    NativeErrorDefinitions[T]
>;

//#endregion ───── TYPES ─────

//#region    ───── GENERATOR ─────

/**
 * Parameters for generating a PureError.
 * @template T The native PureError type.
 */
export type PureErrorParameters<T extends NativeErrorType> = {
    type: T;
    code: string;
    data?: NativeErrorData<T>;
    issuer?: string;
    localizedMessage?: LocalizedMessage;
};

/**
 * Generates a strongly-typed PureError message object.
 * @template T The native PureError type.
 * @param parameters PureError details and metadata.
 * @returns A validated PureError object.
 */
export function generateError<T extends NativeErrorType>(
    parameters: PureErrorParameters<T>,
): PureError {
    return {
        kind: 'error',
        ...parameters,
    } as PureError;
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
    pureError: NativeErrorDefinitions;
    information: {
        warning: ZodAnyJsonObject;
        information: ZodAnyJsonObject;
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
 * Parameters for generating a PureMessage.
 * @template K The PureMessage kind.
 * @template T The PureMessage type.
 */
export type GenerateMessageParameters<
    K extends NativeMessageKind,
    T extends NativeMessageType<K>,
> = {
    kind: K;
    type: T;
    code: string;
    data?: NativeMessageData<K, T>;
    issuer?: string;
    localizedMessage?: LocalizedMessage;
};

/**
 * Generates a strongly-typed PureMessage object.
 * @template K The PureMessage kind.
 * @template T The PureMessage type.
 * @param parameters PureMessage details and metadata.
 * @returns A validated PureMessage object.
 */
export function generateMessage<
    K extends NativeMessageKind,
    T extends NativeMessageType<K>,
>(parameters: GenerateMessageParameters<K, T>): PureMessage {
    return {
        ...parameters,
    } as PureMessage;
}

//#endregion ───── GENERATOR ─────

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                          NATIVE MESSAGES                          #
//#────────────────────────────────────────────────────────────────────────────#
