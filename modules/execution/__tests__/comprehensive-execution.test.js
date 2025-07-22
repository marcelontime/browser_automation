/**
 * Comprehensive Execution Engine Testing Suite
 * Tests for Phase 1: Self-Healing Execution Engine
 */

const SelfHealingEngine = require('../self-healing-engine');
const AdaptiveTimingController = require('../adaptive-timing-controller');
const ErrorRecoveryFramework = require('../error-recovery-framework');
const VisualSimilarityMatcher = require('../visual-similarity-matcher');
const SemanticContextAnalyzer = require('../semantic-context-analyzer');
const TestHelpers = require('../../../test-infrastructure/test-helpers');

describe('Execution Engine Test Suite', () => {
  let selfHealingEngine;
  let adaptiveTimingController;
  let errorRecoveryFramework;
  let mockPage;
  let mockContext;

  beforeEach(() => {
    mockPage = {
      $: jest.fn(),
      $$: jest.fn(),
      evaluate: jest.fn(),
      waitForSelector: jest.fn(),
      waitForFunction: jest.fn(),
      screenshot: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      url: jest.fn(() => 'https://example.com'),
      title: jest.fn(() => 'Test Page'),
      viewport: jest.fn(() => ({ width: 1920, height: 1080 }))
    };

    mockContext = TestHelpers.generateMockExecutionContext({
      page: mockPage,
      variables: { testVar: 'testValue' }
    });

    selfHealingEngine = new SelfHealingEngine();
    adaptiveTimingController = new AdaptiveTimingController();
    errorRecoveryFramework = new ErrorRecoveryFramework();
  });

  afterEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('SelfHealingEngine Component', () => {
    it('finds elements using primary selector strategy', async () => {
      const mockElement = { tagName: 'BUTTON', textContent: 'Submit' };
      mockPage.$.mockResolvedValue(mockElement);

      const selector = {
        primary: '#submit-button',
        fallbacks: ['.submit-btn', '[data-testid="submit"]'],
        visualFingerprint: null,
        semanticContext: null
      };

      const element = await selfHealingEngine.findElement(selector, mockPage);

      expect(element).toBe(mockElement);
      expect(mockPage.$).toHaveBeenCalledWith('#submit-button');
    });

    it('falls back to alternative selectors when primary fails', async () => {
      const mockElement = { tagName: 'BUTTON', textContent: 'Submit' };
      
      mockPage.$
        .mockResolvedValueOnce(null) // Primary fails
        .mockResolvedValueOnce(mockElement); // Fallback succeeds

      const selector = {
        primary: '#submit-button',
        fallbacks: ['.submit-btn', '[data-testid="submit"]'],
        visualFingerprint: null,
        semanticContext: null
      };

      const element = await selfHealingEngine.findElement(selector, mockPage);

      expect(element).toBe(mockElement);
      expect(mockPage.$).toHaveBeenCalledWith('#submit-button');
      expect(mockPage.$).toHaveBeenCalledWith('.submit-btn');
    });

    it('uses visual similarity matching when selectors fail', async () => {
      mockPage.$.mockResolvedValue(null); // All selectors fail
      
      const visualMatcher = new VisualSimilarityMatcher();
      const mockVisualElement = { tagName: 'BUTTON', textContent: 'Submit' };
      
      jest.spyOn(visualMatcher, 'findSimilarElement')
        .mockResolvedValue(mockVisualElement);

      selfHealingEngine.visualMatcher = visualMatcher;

      const selector = {
        primary: '#submit-button',
        fallbacks: ['.submit-btn'],
        visualFingerprint: {
          screenshot: 'base64-image-data',
          boundingBox: { x: 100, y: 200, width: 80, height: 30 },
          visualHash: 'abc123'
        },
        semanticContext: null
      };

      const element = await selfHealingEngine.findElement(selector, mockPage);

      expect(element).toBe(mockVisualElement);
      expect(visualMatcher.findSimilarElement).toHaveBeenCalled();
    });

    it('uses semantic context matching as final fallback', async () => {
      mockPage.$.mockResolvedValue(null); // All selectors fail
      
      const semanticAnalyzer = new SemanticContextAnalyzer();
      const mockSemanticElement = { tagName: 'BUTTON', textContent: 'Submit' };
      
      jest.spyOn(semanticAnalyzer, 'findBySemanticContext')
        .mockResolvedValue(mockSemanticElement);

      selfHealingEngine.semanticAnalyzer = semanticAnalyzer;

      const selector = {
        primary: '#submit-button',
        fallbacks: ['.submit-btn'],
        visualFingerprint: null,
        semanticContext: {
          role: 'button',
          purpose: 'form-submission',
          label: 'Submit',
          context: 'contact-form'
        }
      };

      const element = await selfHealingEngine.findElement(selector, mockPage);

      expect(element).toBe(mockSemanticElement);
      expect(semanticAnalyzer.findBySemanticContext).toHaveBeenCalled();
    });

    it('learns from successful fallback strategies', async () => {
      const mockElement = { tagName: 'BUTTON', textContent: 'Submit' };
      
      mockPage.$
        .mockResolvedValueOnce(null) // Primary fails
        .mockResolvedValueOnce(mockElement); // Fallback succeeds

      const selector = {
        primary: '#submit-button',
        fallbacks: ['.submit-btn', '[data-testid="submit"]'],
        visualFingerprint: null,
        semanticContext: null
      };

      const updateSelectorSpy = jest.spyOn(selfHealingEngine, 'updateSelectorStrategy');

      await selfHealingEngine.findElement(selector, mockPage);

      expect(updateSelectorSpy).toHaveBeenCalledWith(selector, '.submit-btn');
    });

    it('performs within performance thresholds', async () => {
      const mockElement = { tagName: 'BUTTON', textContent: 'Submit' };
      mockPage.$.mockResolvedValue(mockElement);

      const selector = {
        primary: '#submit-button',
        fallbacks: [],
        visualFingerprint: null,
        semanticContext: null
      };

      const performanceResult = await TestHelpers.measurePerformance(async () => {
        await selfHealingEngine.findElement(selector, mockPage);
      }, 'element-finding');

      expect(performanceResult.duration).toBeLessThan(100); // 100ms threshold
    });
  });

  describe('AdaptiveTimingController Component', () => {
    it('calculates optimal wait times based on action type', async () => {
      const navigationAction = { type: 'navigate', url: 'https://example.com' };
      const clickAction = { type: 'click', selector: '#button' };
      const typeAction = { type: 'type', selector: '#input', value: 'text' };

      const navWait = await adaptiveTimingController.calculateOptimalWait(
        navigationAction, mockContext
      );
      const clickWait = await adaptiveTimingController.calculateOptimalWait(
        clickAction, mockContext
      );
      const typeWait = await adaptiveTimingController.calculateOptimalWait(
        typeAction, mockContext
      );

      expect(navWait.timeout).toBeGreaterThan(clickWait.timeout);
      expect(clickWait.timeout).toBeGreaterThan(typeWait.timeout);
      expect(navWait.strategy).toBe('networkidle');
      expect(clickWait.strategy).toBe('element-visible');
      expect(typeWait.strategy).toBe('element-stable');
    });

    it('adapts timing based on network conditions', async () => {
      const action = { type: 'click', selector: '#button' };

      // Simulate slow network
      adaptiveTimingController.networkConditions = {
        speed: 'slow',
        latency: 500,
        throughput: 1000000 // 1Mbps
      };

      const slowWait = await adaptiveTimingController.calculateOptimalWait(
        action, mockContext
      );

      // Simulate fast network
      adaptiveTimingController.networkConditions = {
        speed: 'fast',
        latency: 50,
        throughput: 100000000 // 100Mbps
      };

      const fastWait = await adaptiveTimingController.calculateOptimalWait(
        action, mockContext
      );

      expect(slowWait.timeout).toBeGreaterThan(fastWait.timeout);
    });

    it('adapts timing based on page complexity', async () => {
      const action = { type: 'click', selector: '#button' };

      // Simple page
      const simpleContext = {
        ...mockContext,
        page: {
          ...mockPage,
          complexity: {
            domNodes: 100,
            scripts: 2,
            stylesheets: 1,
            images: 5
          }
        }
      };

      // Complex page
      const complexContext = {
        ...mockContext,
        page: {
          ...mockPage,
          complexity: {
            domNodes: 5000,
            scripts: 20,
            stylesheets: 10,
            images: 100
          }
        }
      };

      const simpleWait = await adaptiveTimingController.calculateOptimalWait(
        action, simpleContext
      );
      const complexWait = await adaptiveTimingController.calculateOptimalWait(
        action, complexContext
      );

      expect(complexWait.timeout).toBeGreaterThan(simpleWait.timeout);
    });

    it('provides fallback strategies for timing failures', async () => {
      const action = { type: 'click', selector: '#dynamic-button' };

      const waitStrategy = await adaptiveTimingController.calculateOptimalWait(
        action, mockContext
      );

      expect(waitStrategy.fallbackStrategies).toBeDefined();
      expect(waitStrategy.fallbackStrategies.length).toBeGreaterThan(0);
      expect(waitStrategy.fallbackStrategies).toContain('element-visible');
      expect(waitStrategy.fallbackStrategies).toContain('element-stable');
    });

    it('learns from historical timing data', async () => {
      const action = { type: 'click', selector: '#button' };

      // Simulate historical data showing this action typically takes longer
      adaptiveTimingController.historicalData = {
        '#button': {
          averageTime: 2000,
          successRate: 0.95,
          samples: 100
        }
      };

      const waitStrategy = await adaptiveTimingController.calculateOptimalWait(
        action, mockContext
      );

      expect(waitStrategy.timeout).toBeGreaterThan(1000); // Should be influenced by history
    });
  });

  describe('ErrorRecoveryFramework Component', () => {
    it('classifies errors correctly', async () => {
      const elementNotFoundError = TestHelpers.simulateElementNotFoundError();
      const networkError = TestHelpers.simulateNetworkError();
      const timeoutError = TestHelpers.simulateTimeoutError();

      const elementClassification = await errorRecoveryFramework.classifyError(
        elementNotFoundError, mockContext
      );
      const networkClassification = await errorRecoveryFramework.classifyError(
        networkError, mockContext
      );
      const timeoutClassification = await errorRecoveryFramework.classifyError(
        timeoutError, mockContext
      );

      expect(elementClassification.category).toBe('element-not-found');
      expect(elementClassification.severity).toBe('recoverable');
      expect(networkClassification.category).toBe('network-error');
      expect(timeoutClassification.category).toBe('timeout-error');
    });

    it('selects appropriate recovery strategies', async () => {
      const elementError = TestHelpers.simulateElementNotFoundError();
      
      const classification = await errorRecoveryFramework.classifyError(
        elementError, mockContext
      );
      const strategy = errorRecoveryFramework.selectRecoveryStrategy(classification);

      expect(strategy).toBeDefined();
      expect(strategy.type).toBe('element-recovery');
      expect(strategy.maxRetries).toBeGreaterThan(0);
    });

    it('attempts error recovery successfully', async () => {
      const elementError = TestHelpers.simulateElementNotFoundError();
      
      // Mock successful recovery
      mockPage.$.mockResolvedValueOnce(null).mockResolvedValueOnce({
        tagName: 'BUTTON',
        textContent: 'Submit'
      });

      const recoveryResult = await errorRecoveryFramework.attemptRecovery(
        elementError, mockContext
      );

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.strategy).toBe('alternative-selector');
      expect(recoveryResult.attempts).toBeGreaterThan(0);
    });

    it('handles unrecoverable errors gracefully', async () => {
      const fatalError = new Error('Critical system failure');
      fatalError.code = 'FATAL_ERROR';

      const classification = await errorRecoveryFramework.classifyError(
        fatalError, mockContext
      );

      expect(classification.severity).toBe('fatal');

      const recoveryResult = await errorRecoveryFramework.attemptRecovery(
        fatalError, mockContext
      );

      expect(recoveryResult.success).toBe(false);
      expect(recoveryResult.recommendation).toBe('abort-execution');
    });

    it('implements exponential backoff for retries', async () => {
      const networkError = TestHelpers.simulateNetworkError();
      
      const retryTimes = [];
      const originalSetTimeout = setTimeout;
      
      global.setTimeout = jest.fn((callback, delay) => {
        retryTimes.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for testing
      });

      await errorRecoveryFramework.attemptRecovery(networkError, mockContext);

      expect(retryTimes.length).toBeGreaterThan(1);
      expect(retryTimes[1]).toBeGreaterThan(retryTimes[0]); // Exponential backoff
      expect(retryTimes[2]).toBeGreaterThan(retryTimes[1]);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('VisualSimilarityMatcher Component', () => {
    let visualMatcher;

    beforeEach(() => {
      visualMatcher = new VisualSimilarityMatcher();
    });

    it('finds visually similar elements', async () => {
      const targetFingerprint = {
        screenshot: 'base64-target-image',
        boundingBox: { x: 100, y: 200, width: 80, height: 30 },
        visualHash: 'target-hash'
      };

      const mockElements = [
        { 
          boundingBox: { x: 105, y: 205, width: 80, height: 30 },
          visualHash: 'similar-hash'
        },
        { 
          boundingBox: { x: 200, y: 300, width: 100, height: 50 },
          visualHash: 'different-hash'
        }
      ];

      mockPage.$$.mockResolvedValue(mockElements);
      
      jest.spyOn(visualMatcher, 'calculateSimilarity')
        .mockResolvedValueOnce(0.95) // High similarity
        .mockResolvedValueOnce(0.3); // Low similarity

      const similarElement = await visualMatcher.findSimilarElement(
        targetFingerprint, mockPage
      );

      expect(similarElement).toBe(mockElements[0]);
      expect(visualMatcher.calculateSimilarity).toHaveBeenCalledTimes(2);
    });

    it('calculates visual similarity accurately', async () => {
      const image1 = 'base64-image-1';
      const image2 = 'base64-image-2-similar';
      const image3 = 'base64-image-3-different';

      const similarity1 = await visualMatcher.calculateSimilarity(image1, image2);
      const similarity2 = await visualMatcher.calculateSimilarity(image1, image3);

      expect(similarity1).toBeGreaterThan(similarity2);
      expect(similarity1).toBeGreaterThanOrEqual(0);
      expect(similarity1).toBeLessThanOrEqual(1);
    });

    it('handles different image formats', async () => {
      const formats = ['png', 'jpeg', 'webp'];
      
      for (const format of formats) {
        const image = `data:image/${format};base64,mock-image-data`;
        
        const similarity = await visualMatcher.calculateSimilarity(
          image, image
        );

        expect(similarity).toBe(1); // Identical images
      }
    });
  });

  describe('SemanticContextAnalyzer Component', () => {
    let semanticAnalyzer;

    beforeEach(() => {
      semanticAnalyzer = new SemanticContextAnalyzer();
    });

    it('finds elements by semantic context', async () => {
      const semanticContext = {
        role: 'button',
        purpose: 'form-submission',
        label: 'Submit',
        context: 'contact-form'
      };

      const mockElements = [
        { 
          tagName: 'BUTTON',
          textContent: 'Submit',
          getAttribute: jest.fn(() => 'button')
        },
        { 
          tagName: 'INPUT',
          type: 'submit',
          value: 'Submit Form'
        }
      ];

      mockPage.$$.mockResolvedValue(mockElements);

      const element = await semanticAnalyzer.findBySemanticContext(
        semanticContext, mockPage
      );

      expect(element).toBe(mockElements[0]);
    });

    it('analyzes element context accurately', async () => {
      const mockElement = {
        tagName: 'BUTTON',
        textContent: 'Submit Form',
        getAttribute: jest.fn((attr) => {
          const attrs = {
            'role': 'button',
            'aria-label': 'Submit contact form',
            'data-purpose': 'form-submission'
          };
          return attrs[attr];
        }),
        closest: jest.fn(() => ({
          tagName: 'FORM',
          id: 'contact-form'
        }))
      };

      const context = await semanticAnalyzer.analyzeElementContext(mockElement);

      expect(context.role).toBe('button');
      expect(context.purpose).toContain('form-submission');
      expect(context.label).toContain('Submit');
      expect(context.context).toContain('contact-form');
    });

    it('handles complex semantic relationships', async () => {
      const mockForm = {
        tagName: 'FORM',
        id: 'user-registration',
        querySelectorAll: jest.fn(() => [
          { name: 'username', type: 'text' },
          { name: 'email', type: 'email' },
          { name: 'password', type: 'password' }
        ])
      };

      const mockButton = {
        tagName: 'BUTTON',
        textContent: 'Create Account',
        closest: jest.fn(() => mockForm)
      };

      const context = await semanticAnalyzer.analyzeElementContext(mockButton);

      expect(context.purpose).toContain('registration');
      expect(context.context).toContain('user-registration');
      expect(context.relatedFields).toContain('username');
      expect(context.relatedFields).toContain('email');
    });
  });

  describe('Integration Testing', () => {
    it('integrates all execution components correctly', async () => {
      const action = {
        type: 'click',
        selector: {
          primary: '#submit-button',
          fallbacks: ['.submit-btn'],
          visualFingerprint: {
            screenshot: 'base64-image',
            boundingBox: { x: 100, y: 200, width: 80, height: 30 }
          },
          semanticContext: {
            role: 'button',
            purpose: 'form-submission'
          }
        }
      };

      // Primary selector fails
      mockPage.$.mockResolvedValueOnce(null);
      
      // Fallback selector fails
      mockPage.$.mockResolvedValueOnce(null);
      
      // Visual matching succeeds
      const mockElement = { tagName: 'BUTTON', textContent: 'Submit' };
      jest.spyOn(selfHealingEngine, 'findElement')
        .mockResolvedValue(mockElement);

      const element = await selfHealingEngine.findElement(action.selector, mockPage);

      expect(element).toBe(mockElement);
    });

    it('handles complete execution workflow', async () => {
      const workflow = [
        { type: 'navigate', url: 'https://example.com' },
        { type: 'click', selector: '#button1' },
        { type: 'type', selector: '#input1', value: 'test' },
        { type: 'click', selector: '#submit' }
      ];

      const executionResults = [];

      for (const step of workflow) {
        const waitStrategy = await adaptiveTimingController.calculateOptimalWait(
          step, mockContext
        );

        try {
          // Simulate step execution
          const result = await selfHealingEngine.executeStep(step, mockPage);
          executionResults.push({ step, result, success: true });
        } catch (error) {
          const recovery = await errorRecoveryFramework.attemptRecovery(
            error, mockContext
          );
          executionResults.push({ step, error, recovery, success: recovery.success });
        }
      }

      expect(executionResults).toHaveLength(4);
      expect(executionResults.every(r => r.success)).toBe(true);
    });
  });

  describe('Performance and Scalability Testing', () => {
    it('maintains performance under concurrent executions', async () => {
      const concurrentExecutions = 10;
      const promises = [];

      for (let i = 0; i < concurrentExecutions; i++) {
        const promise = selfHealingEngine.findElement({
          primary: `#button-${i}`,
          fallbacks: [`.btn-${i}`]
        }, mockPage);
        promises.push(promise);
      }

      const start = performance.now();
      await Promise.all(promises);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // 1 second for 10 concurrent executions
    });

    it('handles memory efficiently during long executions', async () => {
      const initialMemory = TestHelpers.getMemoryUsage();

      // Simulate long-running execution
      for (let i = 0; i < 1000; i++) {
        await selfHealingEngine.findElement({
          primary: `#element-${i}`,
          fallbacks: []
        }, mockPage);
      }

      const finalMemory = TestHelpers.getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });

    it('scales error recovery efficiently', async () => {
      const errors = Array.from({ length: 100 }, (_, i) => 
        TestHelpers.simulateElementNotFoundError()
      );

      const start = performance.now();

      const recoveryPromises = errors.map(error => 
        errorRecoveryFramework.attemptRecovery(error, mockContext)
      );

      await Promise.all(recoveryPromises);
      const end = performance.now();

      expect(end - start).toBeLessThan(5000); // 5 seconds for 100 error recoveries
    });
  });
});