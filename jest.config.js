module.exports = {
  collectCoverage: true,
  reporters: [
    "default",
    ["jest-junit", {outputDirectory: "./coverage/"}],
  ],
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'cobertura',
  ],
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '<rootDir>/test/helpers/'
  ]
};
