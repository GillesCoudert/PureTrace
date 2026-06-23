import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

export default [
    { ignores: ['lib/**', 'node_modules/**', '*.config.ts', '*.config.mts', '*.config.mjs'] },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        plugins: {
            '@typescript-eslint': tseslint.plugin,
        },
        languageOptions: {
            parser: tseslint.parser,
            globals: globals.node,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
            // Async est l'enjeu de la lib (cf. point 2) : on rend ces garde-fous explicites.
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
        },
    },
    {
        // Les callbacks de steps jest-cucumber reçoivent les captures regex en `any` :
        // on relâche la famille no-unsafe-* (bruit structurel), on garde les règles de correction.
        files: ['tests/**/*.ts'],
        languageOptions: {
            globals: globals.jest,
        },
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
];
