/**
 * Test Helper Utilities for Foundation Testing
 */

const { performance } = require('perf_hooks');

class TestHelpers {
  /**
   * Performance testing helper
   */
  static async measurePerformance(fn, name = 'operation') {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    return {
      result,
      duration,
      name,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Memory usage testing helper
   */
  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers
    };
  }

  /**
   * Mock data generators for testing
   */
  static generateMockAutomation(overrides = {}) {
    return {
      id: 'test-automation-' + Date.now(),
      name: 'Test Automation',
      description: 'Test automation for unit testing',
      status: 'active',
      steps: [
        {
          type: 'navigate',
          url: 'https://example.com',
          timeout: 5000
        },
        {
          type: 'click',
          selector: '#submit-button',
          timeout: 3000
        }
      ],
      variables: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      ...overrides
    };
  }

  static generateMockVariable(overrides = {}) {
    return {
      id: 'test-var-' + Date.now(),
      name: 'testVariable',
      type: 'string',
      value: 'test value',
      validation: [],
      metadata: {
        createdAt: new Date().toISOString()
      },
      ...overrides
    };
  }

  static generateMockExecutionContext(overrides = {}) {
    return {
      id: 'test-context-' + Date.now(),
      workflowId: 'test-workflow',
      status: 'running',
      startTime: new Date(),
      variables: {},
      logs: [],
      metrics: {
        executionTime: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      ...overrides
    };
  }

  /**
   * Async test utilities
   */
  static async waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await this.sleep(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Error simulation helpers
   */
  static simulateNetworkError() {
    const error = new Error('Network request failed');
    error.code = 'NETWORK_ERROR';
    error.status = 500;
    return error;
  }

  static simulateTimeoutError() {
    const error = new Error('Operation timed out');
    error.code = 'TIMEOUT_ERROR';
    return error;
  }

  static simulateElementNotFoundError() {
    const error = new Error('Element not found');
    error.code = 'ELEMENT_NOT_FOUND';
    return error;
  }

  /**
   * Test data cleanup
   */
  static async cleanup() {
    // Clean up test data, temporary files, etc.
    // This would be implemented based on specific cleanup needs
  }

  /**
   * Accessibility testing helpers
   */
  static async checkAccessibility(page, rules = []) {
    // This would integrate with axe-core or similar accessibility testing library
    const results = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };
    
    // Mock implementation - would be replaced with actual accessibility testing
    return results;
  }

  /**
   * Visual regression testing helpers
   */
  static async compareScreenshots(actual, expected, threshold = 0.1) {
    // Mock implementation for visual regression testing
    return {
      match: true,
      difference: 0,
      threshold
    };
  }
}

module.exports = TestHelpers;