/**
 * Comprehensive Test Configuration for Foundation Testing
 * Phase 1: Foundation Enhancement Testing Suite
 */

const testConfig = {
  // Test Coverage Requirements
  coverage: {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90
  },

  // Performance Testing Thresholds
  performance: {
    uiResponseTime: 100, // milliseconds
    apiResponseTime: 200, // milliseconds
    renderTime: 50, // milliseconds
    memoryUsage: 100 * 1024 * 1024, // 100MB
    bundleSize: 2 * 1024 * 1024 // 2MB
  },

  // Accessibility Testing Configuration
  accessibility: {
    wcagLevel: 'AA',
    rules: [
      'color-contrast',
      'keyboard-navigation',
      'screen-reader',
      'focus-management',
      'semantic-markup'
    ]
  },

  // Test Environments
  environments: {
    unit: {
      timeout: 5000,
      retries: 2
    },
    integration: {
      timeout: 15000,
      retries: 1
    },
    e2e: {
      timeout: 30000,
      retries: 3
    },
    performance: {
      timeout: 60000,
      retries: 1
    }
  },

  // Browser Testing Matrix
  browsers: [
    { name: 'chromium', version: 'latest' },
    { name: 'firefox', version: 'latest' },
    { name: 'webkit', version: 'latest' }
  ],

  // Viewport Testing Matrix
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'ultrawide', width: 2560, height: 1440 }
  ]
};

module.exports = testConfig;