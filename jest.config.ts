import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*steps.ts'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
};

export default config;
