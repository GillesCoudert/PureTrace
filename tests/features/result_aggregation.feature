Feature: Trace preservation when aggregating results

    As someone auditing a process, when several operation results are
    aggregated into one, every trace must be preserved exactly once —
    none lost, none duplicated.

    Scenario: A failure's own traces are not duplicated

        Given a failure carrying the traces "f1"
        When I aggregate the results
        Then the aggregated result is a failure
        And the aggregated traces are exactly "f1"

    Scenario: Traces of a success preceding the failure are preserved exactly once

        Given a success carrying the traces "s1"
        And a failure carrying the traces "f1"
        When I aggregate the results
        Then the aggregated result is a failure
        And the aggregated traces are exactly "s1,f1"

    Scenario: Traces produced after the first failure are still preserved

        Given a failure carrying the traces "f1"
        And a success carrying the traces "s2"
        When I aggregate the results
        Then the aggregated result is a failure
        And the aggregated traces are exactly "f1,s2"
