// Global test setup for all tests
const { TextEncoder, TextDecoder } = require('util');

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock performance API
global.performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByName: () => [],
  getEntriesByType: () => []
};

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only show errors that are not expected test errors
  if (!args[0]?.toString().includes('Warning:') && 
      !args[0]?.toString().includes('Error evaluating custom condition:')) {
    originalConsoleError(...args);
  }
};

// Global test timeout
jest.setTimeout(30000);