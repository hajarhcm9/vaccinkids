module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  testTimeout: 15000,
};