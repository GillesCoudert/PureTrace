Feature: Trace enrichment combinators on Result

    As a developer, trace/traceSuccess/traceFailure must enrich a Result with
    traces without mutating it, on the matching branch only, and accept either a
    single message or a list.

    Scenario: trace enriches a success unconditionally
        Given a success with the value 2
        When I trace with the message "t1"
        Then the result is a success
        And the result traces are exactly "t1"

    Scenario: trace enriches a failure unconditionally
        Given a failure with the error code "boom"
        When I trace with the message "t1"
        Then the result is a failure
        And the result traces are exactly "t1"

    Scenario: traceSuccess enriches only a success
        Given a success with the value 2
        When I traceSuccess with the message "t1"
        Then the result traces are exactly "t1"

    Scenario: traceSuccess is skipped on a failure
        Given a failure with the error code "boom"
        When I traceSuccess with the message "t1"
        Then the result traces are exactly ""

    Scenario: traceFailure enriches only a failure
        Given a failure with the error code "boom"
        When I traceFailure with the message "t1"
        Then the result traces are exactly "t1"

    Scenario: traceFailure is skipped on a success
        Given a success with the value 2
        When I traceFailure with the message "t1"
        Then the result traces are exactly ""

    Scenario: trace accepts a list of messages
        Given a success with the value 2
        When I trace with the messages "t1,t2"
        Then the result traces are exactly "t1,t2"

    Scenario: trace does not mutate the original result
        Given a success with the value 2 carrying the trace "t0"
        When I trace it into a new result with the message "t1"
        Then the new result traces are exactly "t0,t1"
        And the original result traces are exactly "t0"

    Scenario: async traceSuccess enriches a resolved success
        Given an async success with the value 2
        When I async traceSuccess with the message "t1" and resolve
        Then the resolved traces are exactly "t1"

    Scenario: async traceFailure enriches a resolved failure
        Given an async failure with the error code "boom"
        When I async traceFailure with the message "t1" and resolve
        Then the resolved traces are exactly "t1"
