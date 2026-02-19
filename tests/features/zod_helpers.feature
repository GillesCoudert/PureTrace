Feature: Zod Helpers Behavior

    As a developer, I can use Zod helpers to parse data and convert results to PureTrace format.

    Scenario Outline: Successful Zod parsing with valid data

        Given a Zod schema with fields <fields>
        When I parse valid data <data> with pureZodParse
        Then the result is a success
        And the success value is <expectedValue>

        Examples:
            | fields                          | data                                      | expectedValue                             |
            | name:string,age:number          | {"name":"John","age":30}                  | {"name":"John","age":30}                  |
            | name:string,age:number?         | {"name":"Bob"}                            | {"name":"Bob"}                            |
            | text:string,active:boolean      | {"text":"hello","active":true}            | {"text":"hello","active":true}            |

    Scenario Outline: Failed Zod parsing with invalid data - generic errors

        Given a Zod schema with fields <fields>
        When I parse invalid data <data> with pureZodParse
        Then the result is a failure
        And the failure contains a single error with code "zodParseFailed"
        And the error data contains a count of <errorCount>

        Examples:
            | fields                          | data                                      | errorCount |
            | name:string,age:number          | {"name":"John","age":"thirty"}            | 1          |
            | name:string,age:number          | {"name":"John"}                           | 1          |
            | name:string,age:number          | {"name":123,"age":"abc"}                  | 2          |

    Scenario Outline: Failed Zod parsing with custom validation errors

        Given a Zod schema with custom validation on field <field> requiring <validation>
        When I parse data <data> with pureZodParse
        Then the result is a failure
        And the failure contains an error with code <errorCode>
        And the error has type "processError"

        Examples:
            | field | validation          | data             | errorCode        |
            | age   | minimum:18          | {"age":15}       | AGE_TOO_YOUNG    |
            | name  | minLength:3         | {"name":"AB"}    | NAME_TOO_SHORT   |

    Scenario Outline: Failed Zod parsing with mixed errors

        Given a Zod schema with custom validation on age and a required email field
        When I parse data <data> with pureZodParse
        Then the result is a failure
        And the failure contains error codes "AGE_VALIDATION_FAILED" and "zodParseFailed"

        Examples:
            | data                                    |
            | {"age":15,"email":"invalid"}            |

    Scenario Outline: Converting Zod SafeParseResult to PureResult - Success

        Given a successful Zod SafeParseResult with value <value>
        When I convert it with convertZodParseResultToPureResult
        Then the result is a success
        And the success value is <value>

        Examples:
            | value                                   |
            | {"name":"Alice","age":25}               |
            | {"active":true}                         |

    Scenario Outline: Converting Zod SafeParseResult to PureResult - Failure

        Given a failed Zod SafeParseResult with <issueCount> generic issues
        When I convert it with convertZodParseResultToPureResult
        Then the result is a failure
        And the failure contains a single error with code "zodParseFailed"
        And the error data contains a count of <issueCount>

        Examples:
            | issueCount |
            | 1          |
            | 2          |
            | 3          |

    Scenario: Converting Zod SafeParseResult with custom error

        Given a failed Zod SafeParseResult with a custom error "CUSTOM_ERROR" and params {"min":10}
        When I convert it with convertZodParseResultToPureResult
        Then the result is a failure
        And the failure contains a single error with code "CUSTOM_ERROR"
        And the error data is {"min":10}

    Scenario Outline: Edge cases for Zod parsing

        Given a Zod schema for <schemaType>
        When I parse <inputData> with pureZodParse
        Then the result is <resultType>

        Examples:
            | schemaType      | inputData     | resultType |
            | emptyObject     | {}            | success    |
            | stringField     | null          | failure    |
            | stringField     | undefined     | failure    |
