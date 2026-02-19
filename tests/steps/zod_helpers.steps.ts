import { defineFeature, loadFeature } from 'jest-cucumber';
import z from 'zod';
import {
    pureZodParse,
    convertZodParseResultToPureResult,
} from '../../src/pure_helpers';
import { Result } from '../../src/pure_result';

const feature = loadFeature('tests/features/zod_helpers.feature');

defineFeature(feature, (test) => {
    test('Successful Zod parsing with valid data', ({
        given,
        when,
        then,
        and,
    }) => {
        let schema: z.ZodObject<z.ZodRawShape>;
        let result: Result<unknown>;

        given(/^a Zod schema with fields (.*)$/, (fields: string) => {
            const fieldDefinitions = parseFieldDefinitions(fields);
            schema = z.object(fieldDefinitions);
        });

        when(/^I parse valid data (.*) with pureZodParse$/, (data: string) => {
            const parsedData = JSON.parse(data);
            result = pureZodParse(parsedData, schema);
        });

        then('the result is a success', () => {
            expect(result.isSuccess()).toBe(true);
        });

        and(/^the success value is (.*)$/, (expectedValue: string) => {
            if (result.isSuccess()) {
                expect(result.value).toEqual(JSON.parse(expectedValue));
            }
        });
    });

    test('Failed Zod parsing with invalid data - generic errors', ({
        given,
        when,
        then,
        and,
    }) => {
        let schema: z.ZodObject<z.ZodRawShape>;
        let result: Result<unknown>;

        given(/^a Zod schema with fields (.*)$/, (fields: string) => {
            const fieldDefinitions = parseFieldDefinitions(fields);
            schema = z.object(fieldDefinitions);
        });

        when(
            /^I parse invalid data (.*) with pureZodParse$/,
            (data: string) => {
                const parsedData = JSON.parse(data);
                result = pureZodParse(parsedData, schema);
            },
        );

        then('the result is a failure', () => {
            expect(result.isFailure()).toBe(true);
        });

        and(
            /^the failure contains a single error with code "(.*)"$/,
            (errorCode: string) => {
                if (result.isFailure()) {
                    const errors = result.getErrors();
                    expect(errors).toHaveLength(1);
                    expect(errors[0].code).toBe(errorCode);
                }
            },
        );

        and(
            /^the error data contains a count of (.*)$/,
            (errorCount: string) => {
                if (result.isFailure()) {
                    const errors = result.getErrors();
                    const count = parseInt(
                        (errors[0].data as Record<string, unknown>)
                            ?.count as string,
                        10,
                    );
                    expect(count).toBeGreaterThanOrEqual(
                        parseInt(errorCount, 10),
                    );
                }
            },
        );
    });

    test('Failed Zod parsing with custom validation errors', ({
        given,
        when,
        then,
        and,
    }) => {
        let schema: z.ZodObject<z.ZodRawShape>;
        let result: Result<unknown>;

        given(
            /^a Zod schema with custom validation on field (.*) requiring (.*)$/,
            (field: string, validation: string) => {
                schema = createSchemaWithCustomValidation(field, validation);
            },
        );

        when(/^I parse data (.*) with pureZodParse$/, (data: string) => {
            const parsedData = JSON.parse(data);
            result = pureZodParse(parsedData, schema);
        });

        then('the result is a failure', () => {
            expect(result.isFailure()).toBe(true);
        });

        and(
            /^the failure contains an error with code (.*)$/,
            (errorCode: string) => {
                if (result.isFailure()) {
                    const errors = result.getErrors();
                    const codes = errors.map((e) => e.code);
                    expect(codes).toContain(errorCode);
                }
            },
        );

        and(/^the error has type "(.*)"$/, (errorType: string) => {
            if (result.isFailure()) {
                const errors = result.getErrors();
                const errorWithCode = errors.find((e) => e.type === errorType);
                expect(errorWithCode).toBeDefined();
            }
        });
    });

    test('Failed Zod parsing with mixed errors', ({
        given,
        when,
        then,
        and,
    }) => {
        let schema: z.ZodObject<z.ZodRawShape>;
        let result: Result<unknown>;

        given(
            'a Zod schema with custom validation on age and a required email field',
            () => {
                schema = z.object({
                    age: z.number().refine((val) => val >= 18, {
                        message: 'AGE_VALIDATION_FAILED',
                        params: { minAge: 18 },
                    }),
                    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
                });
            },
        );

        when(/^I parse data (.*) with pureZodParse$/, (data: string) => {
            const parsedData = JSON.parse(data);
            result = pureZodParse(parsedData, schema);
        });

        then('the result is a failure', () => {
            expect(result.isFailure()).toBe(true);
        });

        and(
            /^the failure contains error codes "(.*)" and "(.*)"$/,
            (errorCode1: string, errorCode2: string) => {
                if (result.isFailure()) {
                    const errors = result.getErrors();
                    const codes = errors.map((e) => e.code);
                    expect(codes).toContain(errorCode1);
                    expect(codes).toContain(errorCode2);
                }
            },
        );
    });

    test('Converting Zod SafeParseResult to PureResult - Success', ({
        given,
        when,
        then,
        and,
    }) => {
        let zodResult: z.ZodSafeParseResult<unknown>;
        let result: Result<unknown>;

        given(
            /^a successful Zod SafeParseResult with value (.*)$/,
            (value: string) => {
                const parsedValue = JSON.parse(value);
                zodResult = { success: true, data: parsedValue };
            },
        );

        when('I convert it with convertZodParseResultToPureResult', () => {
            result = convertZodParseResultToPureResult(zodResult);
        });

        then('the result is a success', () => {
            expect(result.isSuccess()).toBe(true);
        });

        and(/^the success value is (.*)$/, (value: string) => {
            if (result.isSuccess()) {
                expect(result.value).toEqual(JSON.parse(value));
            }
        });
    });

    test('Converting Zod SafeParseResult to PureResult - Failure', ({
        given,
        when,
        then,
        and,
    }) => {
        let zodResult: z.ZodSafeParseResult<unknown>;
        let result: Result<unknown>;

        given(
            /^a failed Zod SafeParseResult with (.*) generic issues$/,
            (issueCount: string) => {
                const count = parseInt(issueCount, 10);
                const issues: z.core.$ZodIssue[] = [];
                for (let i = 0; i < count; i++) {
                    issues.push({
                        code: 'invalid_type',
                        expected: 'string',
                        path: [`field${i}`],
                        message: `Invalid type`,
                    } as z.core.$ZodIssue);
                }
                zodResult = {
                    success: false,
                    error: new z.ZodError(issues),
                };
            },
        );

        when('I convert it with convertZodParseResultToPureResult', () => {
            result = convertZodParseResultToPureResult(zodResult);
        });

        then('the result is a failure', () => {
            expect(result.isFailure()).toBe(true);
        });

        and(
            /^the failure contains a single error with code "(.*)"$/,
            (errorCode: string) => {
                if (result.isFailure()) {
                    const errors = result.getErrors();
                    expect(errors).toHaveLength(1);
                    expect(errors[0].code).toBe(errorCode);
                }
            },
        );

        and(
            /^the error data contains a count of (.*)$/,
            (issueCount: string) => {
                if (result.isFailure()) {
                    const errors = result.getErrors();
                    const count = parseInt(
                        (errors[0].data as Record<string, unknown>)
                            ?.count as string,
                        10,
                    );
                    expect(count).toBe(parseInt(issueCount, 10));
                }
            },
        );
    });

    test('Converting Zod SafeParseResult with custom error', ({
        given,
        when,
        then,
        and,
    }) => {
        let zodResult: z.ZodSafeParseResult<unknown>;
        let result: Result<unknown>;

        given(
            /^a failed Zod SafeParseResult with a custom error "(.*)" and params (.*)$/,
            (errorCode: string, params: string) => {
                const parsedParams = JSON.parse(params);
                const issues: z.core.$ZodIssue[] = [
                    {
                        code: 'custom',
                        path: ['field'],
                        message: errorCode,
                        params: parsedParams,
                    },
                ];
                zodResult = {
                    success: false,
                    error: new z.ZodError(issues),
                };
            },
        );

        when('I convert it with convertZodParseResultToPureResult', () => {
            result = convertZodParseResultToPureResult(zodResult);
        });

        then('the result is a failure', () => {
            expect(result.isFailure()).toBe(true);
        });

        and(
            /^the failure contains a single error with code "(.*)"$/,
            (errorCode: string) => {
                if (result.isFailure()) {
                    const errors = result.getErrors();
                    expect(errors).toHaveLength(1);
                    expect(errors[0].code).toBe(errorCode);
                }
            },
        );

        and(/^the error data is (.*)$/, (data: string) => {
            if (result.isFailure()) {
                const errors = result.getErrors();
                expect(errors[0].data).toEqual(JSON.parse(data));
            }
        });
    });

    test('Edge cases for Zod parsing', ({ given, when, then }) => {
        let schema: z.ZodObject<z.ZodRawShape>;
        let result: Result<unknown>;

        given(/^a Zod schema for (.*)$/, (schemaType: string) => {
            schema = createSchemaForEdgeCase(schemaType);
        });

        when(/^I parse (.*) with pureZodParse$/, (inputData: string) => {
            let parsedData: unknown;
            if (inputData === 'null') {
                parsedData = null;
            } else if (inputData === 'undefined') {
                parsedData = undefined;
            } else {
                parsedData = JSON.parse(inputData);
            }
            result = pureZodParse(parsedData, schema);
        });

        then(/^the result is (.*)$/, (resultType: string) => {
            if (resultType === 'success') {
                expect(result.isSuccess()).toBe(true);
            } else {
                expect(result.isFailure()).toBe(true);
            }
        });
    });
});

//>──────────────────────────────────────────────────────────────────────────────────<
//> fr: Fonctions utilitaires pour la création de schémas Zod à partir des chaînes. <
//>──────────────────────────────────────────────────────────────────────────────────<
//>───────────────────────────────────────────────────────────────────────────────<
//> en: Utility functions for creating Zod schemas from strings.                  <
//>───────────────────────────────────────────────────────────────────────────────<

function parseFieldDefinitions(fields: string): Record<string, z.ZodTypeAny> {
    const fieldPairs = fields.split(',');
    const schema: Record<string, z.ZodTypeAny> = {};

    for (const pair of fieldPairs) {
        const [name, type] = pair.split(':');
        const isOptional = type.endsWith('?');
        const baseType = isOptional ? type.slice(0, -1) : type;

        let zodType: z.ZodTypeAny;
        switch (baseType) {
            case 'string':
                zodType = z.string();
                break;
            case 'number':
                zodType = z.number();
                break;
            case 'boolean':
                zodType = z.boolean();
                break;
            default:
                zodType = z.string();
        }

        schema[name] = isOptional ? zodType.optional() : zodType;
    }

    return schema;
}

function createSchemaWithCustomValidation(
    field: string,
    validation: string,
): z.ZodObject<z.ZodRawShape> {
    const [validationType, value] = validation.split(':');

    if (field === 'age' && validationType === 'minimum') {
        return z.object({
            age: z.number().refine((val) => val >= parseInt(value, 10), {
                message: 'AGE_TOO_YOUNG',
                params: { minAge: parseInt(value, 10) },
            }),
        });
    }

    if (field === 'name' && validationType === 'minLength') {
        return z.object({
            name: z
                .string()
                .refine((val) => val.length >= parseInt(value, 10), {
                    message: 'NAME_TOO_SHORT',
                    params: { minLength: parseInt(value, 10) },
                }),
        });
    }

    return z.object({});
}

function createSchemaForEdgeCase(
    schemaType: string,
): z.ZodObject<z.ZodRawShape> {
    switch (schemaType) {
        case 'emptyObject':
            return z.object({});
        case 'stringField':
            return z.object({ name: z.string() });
        default:
            return z.object({});
    }
}
