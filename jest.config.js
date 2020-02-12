module.exports = {
  collectCoverage: true,
  reporters: [
    "default",
  ],
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'cobertura',
  ],
  preset: 'ts-jest',
  testEnvironment: 'node',
};
