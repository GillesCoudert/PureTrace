Feature: Serializing and restoring results across a boundary

    As a service in a distributed system, I exchange serialized results and
    restore them with structural control over what comes back.

    Scenario: A success round-trips with its value and traces

        Given a success carrying the value 42 and the trace "fetched"
        When I serialize and restore it
        Then the restored result is a success with the value 42
        And the restored traces are exactly "fetched"

    Scenario: A failure round-trips with its error and traces

        Given a failure carrying the error code "notFound" and the trace "lookedUp"
        When I serialize and restore it
        Then the restored result is a failure with the error code "notFound"
        And the restored traces are exactly "lookedUp"

    Scenario: A malformed envelope is rejected as a failure

        Given a malformed serialized envelope
        When I restore it
        Then the restored result is a failure with the error code "invalidResultEnvelope"

    Scenario: An unregistered message kind is accepted on restore

        Given a serialized success whose only trace has the unregistered kind "custom" and code "withCustomKind"
        When I restore it
        Then the restored result is a success
        And the restored traces are exactly "withCustomKind"
