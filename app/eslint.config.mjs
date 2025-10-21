import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      'out/**/*',
      'node_modules/**/*',
      '.next/**/*',
      'coverage/**/*',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      '*.d.ts',
      '**/*.d.ts',
      '**/test-*.js',
      '**/run-*.js',
      '**/setup-*.js',
      '**/import-*.js',
      '**/check-*.js',
      '**/configure-*.js',
      '**/create-*.js',
      '**/verify-*.js',
      '**/update-*.js',
      '**/quick-*.js'
    ]
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@next/next/no-assign-module-variable': 'off'
    },
    settings: {
      next: {
        // Set to current project root so Next.js plugin can locate the app dir
        rootDir: ['.']
      }
    }
  },
];

export default eslintConfig;
