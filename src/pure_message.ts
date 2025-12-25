import z from 'zod';

export const messageSchema = z.object({
    kind: z.string(),
    type: z.string(),
    code: z.string(),
    data: z.json().optional(),
});

export type Message = z.infer<typeof messageSchema>;

export const errorSchema = messageSchema.extend({
    kind: z.literal('error'),
});
export type Error = z.infer<typeof errorSchema>;

//#────────────────────────────────────────────────────────────────────────────#
//#region                              NATIVE ERRORS                           #
//#────────────────────────────────────────────────────────────────────────────#

//#region    ───── DEFINITIONS ─────

const nativeErrorDefinitions = {
    pureTraceInternalError: z.object({
        message: z.looseObject({}),
        zodError: z.looseObject({}),
    }),
    technicalIssue: z.json(),
    processError: z.json(),
} as const;

//#endregion ───── DEFINITIONS ─────

//#region    ───── TYPES ─────

type NativeErrorDefinitions = typeof nativeErrorDefinitions;
export type NativeErrorType = keyof NativeErrorDefinitions;
export type NativeErrorData<T extends NativeErrorType> = z.infer<
    (typeof nativeErrorDefinitions)[T]
>;

//#endregion ───── TYPES ─────

//#region    ───── GENERATOR ─────

export function generateError<T extends NativeErrorType>(
    type: T,
    code: string,
    data?: NativeErrorData<T>,
): Error {
    return {
        kind: 'error',
        type,
        code,
        data,
    } as any;
}

//#endregion ───── GENERATOR ─────

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                           NATIVE ERRORS                           #
//#────────────────────────────────────────────────────────────────────────────#

//#────────────────────────────────────────────────────────────────────────────#
//#region                             NATIVE MESSAGES                          #
//#────────────────────────────────────────────────────────────────────────────#

//#region    ───── DEFINITIONS ─────

const nativeMessageDefinitions = {
    error: nativeErrorDefinitions,
    information: {
        warning: z.json(),
        information: z.json(),
    },
    metric: {
        start: z.iso.datetime(),
        stop: z.iso.datetime(),
    },
} as const;

//#endregion ───── DEFINITIONS ─────

//#region    ───── TYPES ─────

type NativeMessageDefinitions = typeof nativeMessageDefinitions;
type NativeMessageKind = keyof NativeMessageDefinitions;
type NativeMessageType<K extends NativeMessageKind> =
    keyof NativeMessageDefinitions[K];
type NativeMessageData<
    K extends NativeMessageKind,
    T extends NativeMessageType<K>,
> = NativeMessageDefinitions[K][T];

//#endregion ───── TYPES ─────

//#region    ───── GENERATOR ─────

export function generateMessage<
    K extends NativeMessageKind,
    T extends NativeMessageType<K>,
>(kind: K, type: T, code: string, data?: NativeMessageData<K, T>): Message {
    return {
        kind,
        type,
        code,
        data,
    } as any;
}

//#endregion ───── GENERATOR ─────

//#────────────────────────────────────────────────────────────────────────────#
//#endregion                          NATIVE MESSAGES                          #
//#────────────────────────────────────────────────────────────────────────────#
