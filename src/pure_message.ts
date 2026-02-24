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
//#region                              NATIVE ERRORS                           #
//#────────────────────────────────────────────────────────────────────────────#

//#region    ───── TYPES ─────

type NativeErrorDefinitions = {
    readonly pureTraceInternalError: z.ZodObject<
        {
            pureMessage: z.ZodObject<z.core.$ZodLooseShape, z.core.$loose>;
            zodError: z.ZodObject<z.core.$ZodLooseShape, z.core.$loose>;
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
 * Generates a strongly-typed PureError message object.
 * @template T The native PureError type.
 * @param options PureError details and metadata.
 * @returns A validated PureError object.
 */
export function generateError<T extends NativeErrorType>(options: {
    type: T;
    code: string;
    data?: NativeErrorData<T>;
    issuer?: string;
    localizedMessage?: LocalizedMessage;
}): PureError {
    return {
        kind: 'error',
        ...options,
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
 * Generates a strongly-typed PureMessage object.
 * @template K The PureMessage kind.
 * @template T The PureMessage type.
 * @param options PureMessage details and metadata.
 * @returns A validated PureMessage object.
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
    localizedMessage?: LocalizedMessage;
}): PureMessage {
    return {
        ...options,
    } as PureMessage;
}

//#endregion ───── GENERATOR ─────

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                          NATIVE MESSAGES                          #
//#────────────────────────────────────────────────────────────────────────────#
