import { defineFeature, loadFeature } from 'jest-cucumber';
import { Result, Success } from '../../src/pure_result';

const feature = loadFeature('tests/features/native_success.feature');

defineFeature(feature, (test) => {
    test('Tap idempotency', ({ given, when, then, and }) => {
        let result: Result<number | string | boolean>;
        given(/^a success with the value (.*) of type (.*)$/, (arg0, arg1) => {
            switch (arg1) {
                case 'number':
                    result = new Success(Number(arg0));
                    break;
                case 'boolean':
                    result = new Success(arg0 === 'true');
                    break;
                default: {
                    result = new Success(arg0.toString());
                }
            }
        });

        when(/^I tap it with a new trace "(.*)"$/, (arg0) => {
            result = result.tap((value) => {
                value.addTraces({
                    code: arg0,
                    kind: 'Information',
                    type: 'Information',
                });
            });
        });

        and(/^the result is a success with the value (.*)$/, (arg0) => {
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value.toString()).toEqual(arg0);
            }
        });

        and(/^its only trace is "(.*)"$/, (arg0) => {
            const traces = result.getTraces();
            expect(traces.length).toBe(1);
            expect(traces[0].code).toBe(arg0);
        });
    });
});
