import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    [
        {
            files: ['lib/**/*.{js,mjs,cjs,ts,mts,cts}'],
            plugins: {
                '@typescript-eslint': tseslint.plugin,
            },
            languageOptions: {
                globals: globals.node,
                parserOptions: {
                    projectService: true,
                },
            },
        },
    ],
);
