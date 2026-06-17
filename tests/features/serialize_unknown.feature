Feature: serializeUnknown safe serialization

    As an observability layer, serializeUnknown must turn any value into a
    JSON-safe shape without ever throwing, handling the edge cases that
    JSON.stringify cannot: cycles, depth, throwing accessors, errors,
    and exotic runtime types.

    Scenario: a circular reference is replaced by a marker
        Given an object that references itself through "self"
        When I serialize it
        Then the serialized "self" property is "[Circular]"

    Scenario: recursion beyond the max depth is truncated
        Given a nested object 3 levels deep
        When I serialize it with a max depth of 1
        Then the serialized "a" property is "[MaxDepthReached]"

    Scenario: a throwing accessor does not break the rest of the object
        Given an object with a throwing getter "bad" and a plain property "good"
        When I serialize it
        Then the serialized "bad" property is "[ThrowingAccessor]"
        And the serialized "good" property equals the number 1

    Scenario: an Error preserves its name and message
        Given an Error with the message "boom"
        When I serialize it
        Then the serialized "name" property is "Error"
        And the serialized "message" property is "boom"

    Scenario: an AggregateError serializes its aggregated errors
        Given an AggregateError aggregating 2 errors
        When I serialize it
        Then the serialized "errors" property is an array of length 2

    Scenario: a Map becomes an array of entry pairs
        Given a Map with the single entry "k" mapped to 1
        When I serialize it
        Then the serialized value equals the entry pairs

    Scenario: exotic primitives become their string form
        Given the bigint 10
        When I serialize it
        Then the serialized value is the string "10"

    Scenario: an object with unreadable keys never throws
        Given a proxy that throws when its keys are read
        When I serialize it
        Then the serialized "[unreadableKeys]" property equals true
