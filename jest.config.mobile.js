module.exports = {
  preset: 'react-native',
  testMatch: ['**/tests/mobile/**/*.test.js'],
  setupFiles: ['./tests/mobile/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|react-native-keychain|@react-native-firebase)/)',
  ],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/tests/mobile/__mocks__/SvgMock.js',
  },
  clearMocks: true,
  verbose: true,
  testTimeout: 10000,
};
