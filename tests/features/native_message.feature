Feature: Native Message Behavior

    As a developer, I can use the native Message to audit my operations.

    Scenario Outline: Native message types

        Given an native success 
        When I trace a message of kind <kind> and type <type> with code <code> and data <data>
        Then the success traces contains a single message of kind <kind> and type <type> with code <code> and data <data>

        Examples:
            | kind        | type                   | code                               | data                                                                                  |
            | Information | Warning                | itIsAWarningWithData               | { "test": "test" }                                                                    |
            | Information | Warning                | itIsAWarningWithoutData            | undefined                                                                             |
            | Information | Information            | itIsAnInformationWithData          | { "test": "test" }                                                          |
            | Information | Information            | itIsAnInformationWithoutData       | undefined                                                                 |
            | Metric      | Start                  | itIsAMetricStart                   | "2025-11-28T20:51:00Z"                                                       |
            | Metric      | Stop                   | itIsAMetricEnd                     | "2025-11-28T20:52:00Z"                                                         |
            | Error       | ProcessError           | itIsAProcessErrorWithData          | { "test": "test" }                                                          |
            | Error       | ProcessError           | itIsAProcessErrorWithoutData       | undefined                                                                 |
            | Error       | TechnicalIssue         | itIsATechnicalIssueWithData        | { "test": "test" }                                                          |
            | Error       | TechnicalIssue         | itIsATechnicalIssueWithoutData     | undefined                                                                             |
            | Error       | PureTraceInternalError | itIsAPureTraceInternalError        | { "message": { "kind": "", "type": "", "code": "" }, "zodError": { "error": "" } }  |