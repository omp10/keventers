import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

/**
 * Flat ESLint config (ESLint 9+).
 * Enforces the architectural fitness rules from Phase 1:
 *  - No console.* in application code (use the Pino logger).
 *  - No process.env access outside the config module.
 */
export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'logs/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'no-console': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    // Architectural rule: process.env may ONLY be read inside the config module
    // (the test bootstrap is exempt — it must seed env before config loads).
    files: ['src/**/*.js'],
    ignores: ['src/config/**', 'src/testing/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Do not read process.env outside src/config. Import the typed `config` object from "#config" instead.',
        },
      ],
    },
  },
  prettier,
];
