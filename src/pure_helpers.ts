import z from 'zod';
import { Failure, Result, Success } from './pure_result';
import { PureError, generateError } from './pure_message';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pureZodParse<T extends z.ZodObject<any>>(
    data: unknown,
    contract: T,
): Result<z.infer<T>> {
    return convertZodParseResultToPureResult(contract.safeParse(data));
}

export function convertZodParseResultToPureResult<TOutput>(
    result: z.ZodSafeParseResult<TOutput>,
): Result<TOutput> {
    if (result.success) {
        return new Success(result.data);
    } else {
        const errorMessages: PureError[] = [];
        let zodGenericErrorCount = 0;
        //>
        //> > fr: Une erreur Zod est constituée de plusieurs erreurs.
        //> > en: A Zod error consists of multiple issues.
        //>
        for (const issue of result.error.issues) {
            if (issue.code === 'custom') {
                errorMessages.push(
                    generateError({
                        type: 'processError',
                        code: issue.message,
                        data: issue.params,
                    }),
                );
            } else {
                zodGenericErrorCount++;
            }
        }
        //>
        //> > fr: Génération d'une erreur générique si nécessaire.
        //> > en: Generating a generic error if necessary.
        //>
        if (zodGenericErrorCount > 0) {
            errorMessages.push(
                generateError({
                    type: 'processError',
                    code: 'zodParseFailed',
                    data: {
                        count: zodGenericErrorCount.toString(),
                        zodError: result.error.stack ?? '',
                    },
                }),
            );
        }
        return new Failure(...errorMessages);
    }
}
