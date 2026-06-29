module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
  ],
  rules: {
    'react/prop-types': 'off',
  },
  settings: { react: { version: 'detect' } },
  env: { node: true, browser: true, es2022: true },
  ignorePatterns: ['dist', 'node_modules', '*.config.*'],
};
