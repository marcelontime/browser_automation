// Frontend-specific test setup
require('./test-setup');
require('@testing-library/jest-dom');

// Mock React components and hooks
global.React = require('react');

// Mock window and document objects
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock CSS modules
const mockCSSModule = new Proxy({}, {
  get: () => 'mock-class-name'
});

// Mock file imports
jest.mock('\\.(css|less|scss|sass)$', () => mockCSSModule, { virtual: true });