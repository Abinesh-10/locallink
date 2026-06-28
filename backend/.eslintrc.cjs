/* ESLint 8 config (matches the declared eslint ^8.57.0 devDependency).
   Intentionally lenient — its CI job is to catch genuine breakage (parse
   errors, truly-undefined references), not enforce a strict style the
   existing code wasn't written against. The `lint` script's `--ext .ts`
   flag is correct for this (legacy) config format. */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  env: { node: true, es2022: true },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-empty': ['warn', { allowEmptyCatch: true }],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'db/migrations/'],
};
