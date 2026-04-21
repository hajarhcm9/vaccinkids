module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^next$' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-underscore-dangle': 'off',
    'consistent-return': 'warn',
  },
};