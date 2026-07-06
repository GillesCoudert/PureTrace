import z from 'zod';

/**
 * Zod schema for a well-formed BCP 47 language tag.
 * Validated through `Intl.Locale`, so it checks structural well-formedness
 * (not subtag existence): script, 3-letter language and M49 region subtags pass.
 * Accepts e.g. 'fr', 'en-US', 'zh-Hant', 'fil', 'es-419'; rejects 'fr_FR', '123', ''.
 */
export const localeSchema = z.string().refine(
    (tag) => {
        try {
            new Intl.Locale(tag);
            return true;
        } catch {
            return false;
        }
    },
    { error: 'Invalid BCP 47 locale tag' },
);

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

/** A single PureMessage or a list of them, accepted interchangeably. */
export type PureMessageInput = PureMessage | readonly PureMessage[];

/** A single PureError or a list of them, accepted interchangeably. */
export type PureErrorInput = PureError | readonly PureError[];

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
 * It is structurally identical to Zod's `JSONType` (the inferred type of `z.json()`),
 * which means values of this type are interchangeable with Zod JSON schemas without
 * casts. `undefined` is intentionally excluded since it is not a valid JSON value
 * (`JSON.stringify` drops `undefined` properties).
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
 *
 * @example
 * ```typescript
 * const payload: JsonObject = { id: 'abc', count: 3, tags: ['a', 'b'] };
 * ```
 */
export type JsonObject = { [key: string]: Json };

/**
 * Represents the shape of a Zod object schema where all values are JSON-compatible schemas.
 */
export type ZodJsonObjectShape = {
    [key: string]: z.ZodType<Json>;
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
//#region                         MESSAGE REGISTRY                            #
//#────────────────────────────────────────────────────────────────────────────#

//>
//> > fr: Registre augmentable kind -> type -> forme du `data`. Les kinds natifs sont pre-enregistres ; les consommateurs ajoutent les leurs par module augmentation.
//> > en: Augmentable registry kind -> type -> `data` shape. Native kinds are pre-registered; consumers add their own through module augmentation.
//>

/**
 * Augmentable registry mapping each message `kind` to its allowed `type`s and
 * the shape of the `data` each carries.
 *
 * The native kinds (`error`, `information`, `metric`) are pre-registered.
 * Adding a custom kind is done through module augmentation — the single
 * extension point. It constrains the message generators at compile time only:
 * a raw {@link PureMessage} keeps an open `kind: string`, and nothing is
 * validated at runtime (see {@link messageSchema}).
 *
 * @example
 * ```typescript
 * declare module '@gilles-coudert/pure-trace' {
 *     interface MessageRegistry {
 *         audit: {
 *             login: { userId: string };
 *             logout: { userId: string };
 *         };
 *     }
 * }
 *
 * generateMessage({ kind: 'audit', type: 'login', code: 'ok', data: { userId: '1' } });
 * ```
 */
export interface MessageRegistry {
    error: {
        processError: Json | undefined;
        technicalIssue: Json | undefined;
        pureTraceInternalError: Json | undefined;
    };
    information: {
        warning: Json | undefined;
        information: Json | undefined;
    };
    metric: {
        start: string;
        stop: string;
    };
}

/**
 * All registered message kinds (native kinds plus any added by augmentation).
 */
export type MessageKind = keyof MessageRegistry;

/**
 * The registered `type`s available for a given message kind.
 */
export type MessageType<K extends MessageKind> = keyof MessageRegistry[K] &
    string;

/**
 * The `data` shape carried by a given kind/type pair.
 */
export type MessageData<
    K extends MessageKind,
    T extends MessageType<K>,
> = MessageRegistry[K][T];

//#region    ───── ERRORS ─────

/**
 * The registered error `type`s — the `type` field of a `kind: 'error'` message.
 */
export type NativeErrorType = MessageType<'error'>;

/**
 * The `data` shape associated with a given error type.
 */
export type NativeErrorData<T extends NativeErrorType> =
    MessageRegistry['error'][T];

/**
 * Parameters for generating a PureError.
 * @template T The error type.
 */
export type PureErrorParameters<T extends NativeErrorType> = {
    type: T;
    code: string;
    data?: NativeErrorData<T>;
    issuer?: string;
    localizedMessage?: LocalizedMessage;
};

/**
 * Generates a strongly-typed PureError (a message with `kind: 'error'`).
 * @template T The error type.
 * @param parameters PureError details and metadata.
 * @returns A PureError object.
 * @example
 * ```typescript
 * const error = generateError({
 *     type: 'processError',
 *     code: 'userNotFound',
 *     data: { userId: '42' },
 * });
 * ```
 */
export function generateError<T extends NativeErrorType>(
    parameters: PureErrorParameters<T>,
): PureError {
    return {
        kind: 'error',
        ...parameters,
    } as PureError;
}

//#endregion ───── ERRORS ─────

//#region    ───── MESSAGES ─────

/**
 * Parameters for generating a PureMessage.
 * @template K The message kind.
 * @template T The message type.
 */
export type GenerateMessageParameters<
    K extends MessageKind,
    T extends MessageType<K>,
> = {
    kind: K;
    type: T;
    code: string;
    data?: MessageData<K, T>;
    issuer?: string;
    localizedMessage?: LocalizedMessage;
};

/**
 * Generates a strongly-typed PureMessage (for traces, metrics, information).
 * @template K The message kind.
 * @template T The message type.
 * @param parameters PureMessage details and metadata.
 * @returns A PureMessage object.
 * @example
 * ```typescript
 * const trace = generateMessage({
 *     kind: 'metric',
 *     type: 'start',
 *     code: 'fetchUser',
 *     data: new Date().toISOString(),
 * });
 * ```
 */
export function generateMessage<
    K extends MessageKind,
    T extends MessageType<K>,
>(parameters: GenerateMessageParameters<K, T>): PureMessage {
    return {
        ...parameters,
    } as PureMessage;
}

//#endregion ───── MESSAGES ─────

//#────────────────────────────────────────────────────────────────────────────#
//#endregion   