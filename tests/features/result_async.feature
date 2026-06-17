Feature: ResultAsync railway behavior

    As a developer composing asynchronous operations, ResultAsync must
    route on the matching branch, surface thrown exceptions as failures,
    and propagate traces — mirroring the synchronous Result.

    Scenario: liftSuccess resolves to a success
        Given an async success with the value 5
        When I resolve it
        Then the resolved result is a success with the value 5

    Scenario: liftFailure resolves to a failure
        Given an async failure with the error code "boom"
        When I resolve it
        Then the resolved result is a failure
        And the resolved result carries the error code "boom"

    Scenario: chainSuccess routes on an async success
        Given an async success with the value 5
        When I chainSuccess to an async success multiplying the value by 10
        And I resolve it
        Then the resolved result is a success with the value 50

    Scenario: chainSuccess short-circuits on an async failure
        Given an async failure with the error code "boom"
        When I chainSuccess to an async success multiplying the value by 10
        And I resolve it
        Then the resolved result is a failure
        And the resolved result carries the error code "boom"

    Scenario: chainFailure recovers from an async failure
        Given an async failure with the error code "boom"
        When I chainFailure to an async success with the value 99
        And I resolve it
        Then the resolved result is a success with the value 99

    Scenario: a thrown exception inside the computation becomes a failure
        Given an async computation that throws
        When I resolve it
        Then the resolved result is a failure
        And the resolved result carries the error code "uncaughtException"

    Scenario: a ResultAsync runs its computation at most once across consumptions
        Given an async computation that counts how many times it runs
        When I resolve it twice
        Then the computation has run 1 time
