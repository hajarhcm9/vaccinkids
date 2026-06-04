module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/{tests,__tests__}/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  verbose: true,
  clearMocks: true,
  testTimeout: 15000,
};
