import z from 'zod';
import { Failure, Result, Success } from './pure_result.js';
import {
    Json,
    JsonObject,
    PureError,
    PureMessage,
    errorSchema,
    generateError,
    messageSchema,
} from './pure_message.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pureZodParse<T extends z.ZodObject<any>>(
    data: unknown,
    contract: T,
): Result<z.infer<T>> {
    return convertZodParseResultToPureResult(contract.safeParse(data));
}

//>
//> > fr: Champs d'issue exclus de `data` : `code` (remonté en code) et `input` (secrets/PII).
//> > en: Issue fields excluded from `data`: `code` (lifted to code) and `input` (secrets/PII).
//>
const nonDataIssueKeys = new Set<string>(['code', 'input']);

export function convertZodParseResultToPureResult<TOutput>(
    result: z.ZodSafeParseResult<TOutput>,
): Result<TOutput> {
    if (result.success) {
        return new Success(result.data);
    }
    return new Failure(
        result.error.issues.map((issue) => {
            if (issue.code === 'custom') {
                return generateError({
                    type: 'processError',
                    code: issue.message,
                    data: serializeUnknown(issue.params),
                });
            }
            const details: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(issue)) {
                if (!nonDataIssueKeys.has(key)) {
                    details[key] = value;
                }
            }
            return generateError({
                type: 'processError',
                code: issue.code,
                data: serializeUnknown(details),
            });
        }),
    );
}

//#────────────────────────────────────────────────────────────────────────────#
//#region                       UNKNOWN VALUE SERIALIZATION                    #
//#────────────────────────────────────────────────────────────────────────────#

/**
 * Options for {@link serializeUnknown}.
 */
export interface SerializeUnknownOptions {
    /**
     * Maximum recursion depth before truncation. Defaults to 10.
     * Beyond this depth, the value is replaced by '[MaxDepthReached]'.
     */
    maxDepth?: number;
}

const defaultMaxDepth = 10;

/**
 * Serializes any unknown value into a Json-safe representation, never throwing.
 *
 * Coverage beyond JSON.stringify:
 * - Errors (including subclasses, AggregateError, the cause chain, and own
 *   custom enumerable properties) — preserves non-enumerable name/message/stack.
 * - Date → ISO string (Invalid Date → null).
 * - RegExp → `{ source, flags }`.
 * - Map → array of `[key, value]` pairs (preserves order and non-string keys).
 * - Set → array of values.
 * - bigint, symbol, function → human-readable string form.
 * - NaN, Infinity, -Infinity → string form (JSON has no native representation).
 * - Circular references → '[Circular]'.
 * - Recursion exceeding `maxDepth` → '[MaxDepthReached]'.
 * - Property accessors that throw → '[ThrowingAccessor]' (the rest of the
 *   object is preserved).
 *
 * Intended for observability use cases where preserving information matters
 * more than round-trip fidelity (typed values become strings; this is a
 * one-way transformation).
 *
 * @param value The value to serialize.
 * @param options Optional configuration.
 * @returns A Json-safe representation. Never throws.
 *
 * @example
 * ```typescript
 * import { serializeUnknown } from '@gilles-coudert/pure-trace';
 *
 * try {
 *     riskyOperation();
 * } catch (e: unknown) {
 *     const safe = serializeUnknown(e);
 *     console.log(JSON.stringify(safe));
 * }
 * ```
 */
export function serializeUnknown(
    value: unknown,
    options: SerializeUnknownOptions = {},
): Json {
    const maxDepth = options.maxDepth ?? defaultMaxDepth;
    try {
        return serializeRecursive(value, maxDepth, new WeakSet());
    } catch {
        //>
        //> > fr: Filet de sécurité absolu : on ne propage jamais d'exception.
        //> > en: Absolute safety net: an exception is never propagated.
        //>
        return '[SerializationFailed]';
    }
}

function serializeRecursive(
    value: unknown,
    depthRemaining: number,
    seen: WeakSet<object>,
): Json {
    //>
    //> > fr: Cas primitifs (chemin rapide).
    //> > en: Primitive cases (fast path).
    //>
    if (value === null || value === undefined) return null;
    const valueType = typeof value;
    if (valueType === 'boolean') return value as boolean;
    if (valueType === 'string') return value as string;
    if (valueType === 'number') {
        const numericValue = value as number;
        if (Number.isFinite(numericValue)) return numericValue;
        if (Number.isNaN(numericValue)) return 'NaN';
        return numericValue > 0 ? 'Infinity' : '-Infinity';
    }
    if (valueType === 'bigint') return (value as bigint).toString();
    if (valueType === 'symbol') return (value as symbol).toString();
    if (valueType === 'function') {
        const functionName = (value as { name?: string }).name;
        return `[Function: ${
            functionName && functionName.length > 0 ? functionName : 'anonymous'
        }]`;
    }

    //>
    //> > fr: Garde de profondeur.
    //> > en: Depth guard.
    //>
    if (depthRemaining <= 0) return '[MaxDepthReached]';

    const objectValue = value as object;

    //>
    //> > fr: Détection de référence circulaire.
    //> > en: Circular reference detection.
    //>
    if (seen.has(objectValue)) return '[Circular]';
    seen.add(objectValue);

    try {
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value.toISOString();
        }
        if (value instanceof RegExp) {
            return { source: value.source, flags: value.flags };
        }
        if (value instanceof Error) {
            return serializeErrorInstance(value, depthRemaining - 1, seen);
        }
        if (value instanceof Map) {
            const pairs: Json[] = [];
            for (const [mapKey, mapValue] of value.entries()) {
                pairs.push([
                    serializeRecursive(mapKey, depthRemaining - 1, seen),
                    serializeRecursive(mapValue, depthRemaining - 1, seen),
                ]);
            }
            return pairs;
        }
        if (value instanceof Set) {
            const items: Json[] = [];
            for (const item of value) {
                items.push(serializeRecursive(item, depthRemaining - 1, seen));
            }
            return items;
        }
        if (Array.isArray(value)) {
            return value.map((item) =>
                serializeRecursive(item, depthRemaining - 1, seen),
            );
        }
        return serializePlainObject(objectValue, depthRemaining - 1, seen);
    } finally {
        //>
        //> > fr: Retrait après visite — autorise les répétitions non cycliques (siblings).
        //> > en: Remove after visit — allows non-cyclic repeated occurrences (siblings).
        //>
        seen.delete(objectValue);
    }
}

function serializeErrorInstance(
    err: Error,
    depthRemaining: number,
    seen: WeakSet<object>,
): JsonObject {
    const result: JsonObject = {
        name: err.name,
        message: err.message,
    };
    if (err.stack !== undefined) {
        result.stack = err.stack;
    }
    if (err.cause !== undefined) {
        result.cause = serializeRecursive(err.cause, depthRemaining, seen);
    }
    //>
    //> > fr: AggregateError — sérialisation explicite de la liste interne.
    //> > en: AggregateError — explicit serialization of the internal list.
    //>
    const aggregatedErrors = (err as { errors?: unknown }).errors;
    if (Array.isArray(aggregatedErrors)) {
        result.errors = aggregatedErrors.map((entry) =>
            serializeRecursive(entry, depthRemaining, seen),
        );
    }
    //>
    //> > fr: Préservation des propriétés énumérables propres (champs custom des sous-classes).
    //> > en: Preserve own enumerable properties (custom fields on subclasses).
    //>
    for (const propertyKey of Object.keys(err)) {
        if (propertyKey in result) continue;
        try {
            result[propertyKey] = serializeRecursive(
                (err as unknown as Record<string, unknown>)[propertyKey],
                depthRemaining,
                seen,
            );
        } catch {
            result[propertyKey] = '[ThrowingAccessor]';
        }
    }
    return result;
}

function serializePlainObject(
    obj: object,
    depthRemaining: number,
    seen: WeakSet<object>,
): JsonObject {
    const result: JsonObject = {};
    let propertyKeys: string[];
    try {
        propertyKeys = Object.keys(obj);
    } catch {
        return { '[unreadableKeys]': true };
    }
    for (const propertyKey of propertyKeys) {
        try {
            result[propertyKey] = serializeRecursive(
                (obj as Record<string, unknown>)[propertyKey],
                depthRemaining,
                seen,
            );
        } catch {
            result[propertyKey] = '[ThrowingAccessor]';
        }
    }
    return result;
}

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                    UNKNOWN VALUE SERIALIZATION                    #
//#────────────────────────────────────────────────────────────────────────────#
//#────────────────────────────────────────────────────────────────────────────#
//#region                        RESULT SERIALIZATION                          #
//#────────────────────────────────────────────────────────────────────────────#

//>
//> > fr: Frontiere distribuee : (de)serialisation d'un Result avec controle structurel.
//> > en: Distributed boundary: (de)serialization of a Result with structural control.
//>

/**
 * JSON-safe wire format of a {@link Result}, suitable for transport between
 * processes (queues, RPC, event stores).
 */
export type SerializedResult =
    | { outcome: 'success'; value: Json; traces: PureMessage[] }
    | { outcome: 'failure'; errors: PureError[]; traces: PureMessage[] };

const serializedResultSchema = z.discriminatedUnion('outcome', [
    z.object({
        outcome: z.literal('success'),
        value: z.json(),
        traces: z.array(messageSchema),
    }),
    z.object({
        outcome: z.literal('failure'),
        errors: z.array(errorSchema),
        traces: z.array(messageSchema),
    }),
]);

/**
 * Serializes a Result into a JSON-safe envelope.
 *
 * The success value must already be JSON-serializable (`Json`). The returned
 * object can be passed to `JSON.stringify` as-is.
 *
 * @example
 * ```typescript
 * const wire = JSON.stringify(serializeResult(new Success({ id: 1 })));
 * ```
 */
export function serializeResult<S extends Json>(
    result: Result<S>,
): SerializedResult {
    if (result.isSuccess()) {
        return {
            outcome: 'success',
            value: result.value,
            traces: result.getTraces(),
        };
    }
    return {
        outcome: 'failure',
        errors: result.getErrors(),
        traces: result.getTraces(),
    };
}

/**
 * Reconstructs a Result from an untrusted serialized envelope.
 *
 * Validates the envelope *structure* (outcome, well-formed messages), not the
 * taxonomy: an unregistered `kind` is accepted on purpose, since a peer service
 * may use kinds this one does not know. A malformed envelope yields a `Failure`
 * with code `invalidResultEnvelope` rather than throwing.
 *
 * @example
 * ```typescript
 * const restored = deserializeResult(JSON.parse(wire));
 * ```
 */
export function deserializeResult(input: unknown): Result<Json> {
    const parsed = serializedResultSchema.safeParse(input);
    if (!parsed.success) {
        return new Failure([
            generateError({
                type: 'technicalIssue',
                code: 'invalidResultEnvelope',
                data: serializeUnknown(parsed.error),
            }),
        ]);
    }
    const envelope = parsed.data;
    if (envelope.outcome === 'success') {
        return new Success<Json>(envelope.value, envelope.traces);
    }
    return new Failure(envelope.errors, envelope.traces);
}

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                      RESULT SERIALIZATION                         #
//#────────────────────────────────────────────────────────────────────────────#
