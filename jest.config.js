module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/modules', '<rootDir>/public/src'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/?(*.)+(spec|test).js',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],
  collectCoverageFrom: [
    'modules/**/*.js',
    'public/src/**/*.{ts,tsx}',
    '!modules/**/node_modules/**',
    '!public/src/**/*.stories.{ts,tsx}',
    '!public/src/index.tsx',
    '!public/src/reportWebVitals.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  testTimeout: 30000,
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/modules/**/__tests__/**/*.js'],
      setupFilesAfterEnv: ['<rootDir>/test-setup-backend.js'],
      moduleFileExtensions: ['js', 'json']
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/public/src/**/__tests__/**/*.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/test-setup-frontend.js'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      globals: {
        'ts-jest': {
          useESM: false
        }
      }
    }
  ]
};