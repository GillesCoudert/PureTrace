Feature: Railway combinators on Result

    As a developer composing operations, map/chain must apply on the
    matching branch, short-circuit on the other, and never lose a trace.

    Scenario: chainSuccess applies the function on a success
        Given a success with the value 2
        When I chainSuccess to multiply the value by 10
        Then the result is a success with the value 20

    Scenario: chainSuccess short-circuits on a failure
        Given a failure with the error code "boom"
        When I chainSuccess to multiply the value by 10
        Then the result is a failure
        And the result carries the error code "boom"

    Scenario: chainFailure recovers from a failure
        Given a failure with the error code "boom"
        When I chainFailure to recover with the success value 99
        Then the result is a success with the value 99

    Scenario: chainFailure is skipped on a success
        Given a success with the value 2
        When I chainFailure to recover with the success value 99
        Then the result is a success with the value 2

    Scenario: mapSuccess wraps the new value
        Given a success with the value 2
        When I mapSuccess to wrap the value plus 1
        Then the result is a success with the value 3

    Scenario: mapSuccess short-circuits on a failure
        Given a failure with the error code "boom"
        When I mapSuccess to wrap the value plus 1
        Then the result is a failure
        And the result carries the error code "boom"

    Scenario: chainBoth routes a success through the success branch
        Given a success with the value 2
        When I chainBoth with success times 10 and failure recovering to 0
        Then the result is a success with the value 20

    Scenario: chainBoth routes a failure through the failure branch
        Given a failure with the error code "boom"
        When I chainBoth with success times 10 and failure recovering to 0
        Then the result is a success with the value 0

    Scenario: traces accumulate across a chain and none are lost
        Given a success with the value 2 carrying the trace "t1"
        When I chainSuccess to a success that adds the trace "t2"
        Then the result is a success with the value 20
        And the result traces contain exactly "t1,t2"

    Scenario: convertFailureToSuccess moves errors into traces
        Given a failure with the error code "boom" carrying the trace "t1"
        When I convertFailureToSuccess with the default value 0
        Then the result is a success with the value 0
        And the result traces are exactly "boom,t1"
