import { defineFeature, loadFeature } from 'jest-cucumber';
import { Success } from '../../src/pure_result';

const feature = loadFeature('tests/features/native_message.feature');

defineFeature(feature, (test) => {
    test('Native message types', ({ given, when, then }) => {
        let success: Success<unknown>;
        given('an native success', () => {
            success = new Success(true);
        });

        when(
            /^I trace a message of kind (.*) and type (.*) with code (.*) and data (.*)$/,
            (arg0, arg1, arg2, arg3) => {
                success = success.addTraces({
                    kind: arg0,
                    type: arg1,
                    code: arg2,
                    data: arg3 === 'undefined' ? undefined : JSON.parse(arg3),
                });
            },
        );

        then(
            /^the success traces contains a single message of kind (.*) and type (.*) with code (.*) and data (.*)$/,
            (arg0, arg1, arg2, arg3) => {
                const traces = success.getTraces();
                expect(traces.length).toBe(1);
                const trace = traces[0];
                expect(trace.kind).toBe(arg0);
                expect(trace.type).toBe(arg1);
                expect(trace.code).toBe(arg2);
                expect(trace.data).toEqual(
                    arg3 === 'undefined' ? undefined : JSON.parse(arg3),
                );
            },
        );
    });
});
