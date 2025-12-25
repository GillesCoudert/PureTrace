Feature: Native Success Behavior

    As a developer, I can use the native Success to audit my operations.

    Scenario Outline: Tap idempotency

        Given a success with the value <value> of type <type>
        When I tap it with a new trace "tapped"
        Then the result is a success with the value <value>
        And its only trace is "tapped"

        Examples:
            | value   | type    |
            | 20      | number  |
            | test    | string  |
            | true    | boolean |