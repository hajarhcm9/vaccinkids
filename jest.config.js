module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/{tests,__tests__}/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  verbose: true,
  clearMocks: true,
  testTimeout: 15000,
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 65,
      lines: 70,
    },
  },
};
