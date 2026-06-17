import { defineFeature, loadFeature } from 'jest-cucumber';
import {
    GetResult,
    Result,
    Success,
    generateFailure,
} from '../../src/pure_result';
import { PureMessage, generateMessage } from '../../src/pure_message';

const feature = loadFeature('tests/features/result_aggregation.feature');

defineFeature(feature, (test) => {
    test("A failure's own traces are not duplicated", ({
        given,
        when,
        then,
        and,
    }) => {
        const results: Result<unknown>[] = [];
        let aggregated: Result<unknown>;

        given(/^a failure carrying the traces "(.*)"$/, (codes: string) => {
            results.push(buildFailureWithTraces(codes));
        });

        when('I aggregate the results', () => {
            aggregated = GetResult.fromResultArray(results);
        });

        then('the aggregated result is a failure', () => {
            expect(aggregated.isFailure()).toBe(true);
        });

        and(/^the aggregated traces are exactly "(.*)"$/, (codes: string) => {
            expectTraceCodes(aggregated, codes);
        });
    });

    test('Traces of a success preceding the failure are preserved exactly once', ({
        given,
        and,
        when,
        then,
    }) => {
        const results: Result<unknown>[] = [];
        let aggregated: Result<unknown>;

        given(/^a success carrying the traces "(.*)"$/, (codes: string) => {
            results.push(
                new Success<unknown>(1, tracesFromCodes(codes)),
            );
        });

        and(/^a failure carrying the traces "(.*)"$/, (codes: string) => {
            results.push(buildFailureWithTraces(codes));
        });

        when('I aggregate the results', () => {
            aggregated = GetResult.fromResultArray(results);
        });

        then('the aggregated result is a failure', () => {
            expect(aggregated.isFailure()).toBe(true);
        });

        and(/^the aggregated traces are exactly "(.*)"$/, (codes: string) => {
            expectTraceCodes(aggregated, codes);
        });
    });

    test('Traces produced after the first failure are still preserved', ({
        given,
        and,
        when,
        then,
    }) => {
        const results: Result<unknown>[] = [];
        let aggregated: Result<unknown>;

        given(/^a failure carrying the traces "(.*)"$/, (codes: string) => {
            results.push(buildFailureWithTraces(codes));
        });

        and(/^a success carrying the traces "(.*)"$/, (codes: string) => {
            results.push(
                new Success<unknown>(1, tracesFromCodes(codes)),
            );
        });

        when('I aggregate the results', () => {
            aggregated = GetResult.fromResultArray(results);
        });

        then('the aggregated result is a failure', () => {
            expect(aggregated.isFailure()).toBe(true);
        });

        and(/^the aggregated traces are exactly "(.*)"$/, (codes: string) => {
            expectTraceCodes(aggregated, codes);
        });
    });
});

//>──────────────────────────────────────────────────────────────────────────────────<
//> fr: Fonctions utilitaires pour construire des résultats tracés et vérifier les codes. <
//>──────────────────────────────────────────────────────────────────────────────────<
//>───────────────────────────────────────────────────────────────────────────────<
//> en: Utility functions to build traced results and assert on trace codes.       <
//>───────────────────────────────────────────────────────────────────────────────<

function tracesFromCodes(codes: string): PureMessage[] {
    return codes.split(',').map((code) =>
        generateMessage({
            kind: 'information',
            type: 'information',
            code: code.trim(),
        }),
    );
}

function buildFailureWithTraces(codes: string): Result<unknown> {
    const failure = generateFailure({ type: 'processError', code: 'e1' });
    failure.addTraces(tracesFromCodes(codes));
    return failure;
}

//>
//> > fr: Comparaison ensembliste : détecte aussi bien les doublons que les manques.
//> > en: Multiset comparison: detects both duplicates and missing traces.
//>
function expectTraceCodes(result: Result<unknown>, codes: string): void {
    const expected = codes
        .split(',')
        .map((code) => code.trim())
        .sort();
    const actual = result
        .getTraces()
        .map((trace) => trace.code)
        .sort();
    expect(actual).toEqual(expected);
}
