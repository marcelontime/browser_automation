/**
 * Comprehensive Recording Engine Testing Suite
 * Tests for Phase 1: Enhanced Recording Engine
 */

const { RecordingStudio } = require('../recording-studio');
const { EnhancedRecorder } = require('../enhanced-recorder');
const { ActionCapture } = require('../action-capture');
const { VariableAnalyzer } = require('../../analysis/variable-analyzer');
const TestHelpers = require('../../../test-infrastructure/test-helpers');

describe('Recording Engine Test Suite', () => {
  let recordingStudio;
  let mockPage;
  let mockBrowser;

  beforeEach(() => {
    // Mock browser and page objects
    mockPage = {
      on: jest.fn(),
      off: jest.fn(),
      evaluate: jest.fn(),
      screenshot: jest.fn(),
      $: jest.fn(),
      $$: jest.fn(),
      waitForSelector: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      goto: jest.fn(),
      url: jest.fn(() => 'https://example.com'),
      title: jest.fn(() => 'Test Page'),
      viewport: jest.fn(() => ({ width: 1920, height: 1080 }))
    };

    mockBrowser = {
      newPage: jest.fn(() => Promise.resolve(mockPage)),
      close: jest.fn()
    };

    recordingStudio = new RecordingStudio();
  });

  afterEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('RecordingStudio Component', () => {
    it('initializes with correct default configuration', () => {
      expect(recordingStudio).toBeDefined();
      expect(recordingStudio.isRecording).toBe(false);
      expect(recordingStudio.recordedActions).toEqual([]);
    });

    it('starts recording session successfully', async () => {
      const session = await recordingStudio.startRecording({
        url: 'https://example.com',
        quality: 'high'
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.status).toBe('recording');
      expect(recordingStudio.isRecording).toBe(true);
    });

    it('stops recording session correctly', async () => {
      await recordingStudio.startRecording({ url: 'https://example.com' });
      const result = await recordingStudio.stopRecording();

      expect(result).toBeDefined();
      expect(result.actions).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(recordingStudio.isRecording).toBe(false);
    });

    it('handles recording errors gracefully', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      await expect(recordingStudio.startRecording({
        url: 'https://invalid-url.com'
      })).rejects.toThrow('Navigation failed');

      expect(recordingStudio.isRecording).toBe(false);
    });

    it('captures user actions with high fidelity', async () => {
      await recordingStudio.startRecording({ url: 'https://example.com' });

      // Simulate user actions
      const clickAction = {
        type: 'click',
        target: { selector: '#submit-button', x: 100, y: 200 },
        timestamp: Date.now()
      };

      const typeAction = {
        type: 'type',
        target: { selector: '#input-field' },
        value: 'test input',
        timestamp: Date.now()
      };

      await recordingStudio.captureAction(clickAction);
      await recordingStudio.captureAction(typeAction);

      const result = await recordingStudio.stopRecording();

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].type).toBe('click');
      expect(result.actions[1].type).toBe('type');
    });

    it('performs within performance thresholds', async () => {
      const performanceResult = await TestHelpers.measurePerformance(async () => {
        await recordingStudio.startRecording({ url: 'https://example.com' });
        await recordingStudio.stopRecording();
      }, 'recording-session');

      expect(performanceResult.duration).toBeLessThan(1000); // 1 second threshold
    });
  });

  describe('EnhancedRecorder Component', () => {
    let enhancedRecorder;

    beforeEach(() => {
      enhancedRecorder = new EnhancedRecorder();
    });

    it('captures multiple selector strategies', async () => {
      const mockElement = {
        tagName: 'BUTTON',
        id: 'submit-btn',
        className: 'btn btn-primary',
        textContent: 'Submit',
        getAttribute: jest.fn((attr) => {
          const attrs = {
            'aria-label': 'Submit form',
            'data-testid': 'submit-button'
          };
          return attrs[attr];
        })
      };

      mockPage.evaluate.mockResolvedValue(mockElement);

      const strategies = await enhancedRecorder.captureElementStrategies(
        mockPage,
        { x: 100, y: 200 }
      );

      expect(strategies).toBeDefined();
      expect(strategies.css).toContain('#submit-btn');
      expect(strategies.css).toContain('.btn.btn-primary');
      expect(strategies.xpath).toBeDefined();
      expect(strategies.accessibility.label).toBe('Submit form');
      expect(strategies.accessibility.testId).toBe('submit-button');
    });

    it('generates visual fingerprints for elements', async () => {
      const mockScreenshot = Buffer.from('mock-screenshot-data');
      mockPage.screenshot.mockResolvedValue(mockScreenshot);

      const fingerprint = await enhancedRecorder.generateVisualFingerprint(
        mockPage,
        { x: 100, y: 200, width: 80, height: 30 }
      );

      expect(fingerprint).toBeDefined();
      expect(fingerprint.screenshot).toBeDefined();
      expect(fingerprint.boundingBox).toEqual({
        x: 100, y: 200, width: 80, height: 30
      });
      expect(fingerprint.visualHash).toBeDefined();
    });

    it('detects variable extraction opportunities', async () => {
      const mockAction = {
        type: 'type',
        target: { selector: '#email-input' },
        value: 'user@example.com'
      };

      const variableAnalyzer = new VariableAnalyzer();
      const suggestions = await variableAnalyzer.analyzeForVariables(mockAction);

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('email');
      expect(suggestions[0].confidence).toBeGreaterThan(0.8);
    });

    it('handles resolution-independent recording', async () => {
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 375, height: 667 }
      ];

      for (const viewport of viewports) {
        mockPage.viewport.mockReturnValue(viewport);

        const normalizedCoords = await enhancedRecorder.normalizeCoordinates(
          { x: 100, y: 200 },
          viewport
        );

        expect(normalizedCoords.x).toBeGreaterThanOrEqual(0);
        expect(normalizedCoords.x).toBeLessThanOrEqual(1);
        expect(normalizedCoords.y).toBeGreaterThanOrEqual(0);
        expect(normalizedCoords.y).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('ActionCapture Component', () => {
    let actionCapture;

    beforeEach(() => {
      actionCapture = new ActionCapture();
    });

    it('captures mouse events accurately', async () => {
      const mouseEvent = {
        type: 'click',
        clientX: 150,
        clientY: 250,
        button: 0,
        target: { id: 'test-button' }
      };

      const capturedAction = await actionCapture.captureMouseEvent(mouseEvent);

      expect(capturedAction.type).toBe('click');
      expect(capturedAction.coordinates).toEqual({ x: 150, y: 250 });
      expect(capturedAction.button).toBe('left');
      expect(capturedAction.timestamp).toBeDefined();
    });

    it('captures keyboard events accurately', async () => {
      const keyboardEvent = {
        type: 'keydown',
        key: 'Enter',
        code: 'Enter',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      };

      const capturedAction = await actionCapture.captureKeyboardEvent(keyboardEvent);

      expect(capturedAction.type).toBe('keypress');
      expect(capturedAction.key).toBe('Enter');
      expect(capturedAction.modifiers).toEqual({
        ctrl: false,
        shift: false,
        alt: false
      });
    });

    it('captures scroll events accurately', async () => {
      const scrollEvent = {
        type: 'scroll',
        target: { scrollTop: 500, scrollLeft: 0 }
      };

      const capturedAction = await actionCapture.captureScrollEvent(scrollEvent);

      expect(capturedAction.type).toBe('scroll');
      expect(capturedAction.position).toEqual({ x: 0, y: 500 });
    });

    it('handles complex form interactions', async () => {
      const formActions = [
        { type: 'click', target: { selector: '#name-input' } },
        { type: 'type', target: { selector: '#name-input' }, value: 'John Doe' },
        { type: 'click', target: { selector: '#email-input' } },
        { type: 'type', target: { selector: '#email-input' }, value: 'john@example.com' },
        { type: 'click', target: { selector: '#submit-button' } }
      ];

      const capturedSequence = [];
      for (const action of formActions) {
        const captured = await actionCapture.captureAction(action);
        capturedSequence.push(captured);
      }

      expect(capturedSequence).toHaveLength(5);
      expect(capturedSequence[1].value).toBe('John Doe');
      expect(capturedSequence[3].value).toBe('john@example.com');
    });
  });

  describe('Variable Analysis Integration', () => {
    let variableAnalyzer;

    beforeEach(() => {
      variableAnalyzer = new VariableAnalyzer();
    });

    it('detects email variables correctly', async () => {
      const action = {
        type: 'type',
        target: { selector: '#email' },
        value: 'test@example.com'
      };

      const analysis = await variableAnalyzer.analyzeForVariables(action);

      expect(analysis).toBeDefined();
      expect(analysis.length).toBeGreaterThan(0);
      expect(analysis[0].type).toBe('email');
      expect(analysis[0].pattern).toBeDefined();
      expect(analysis[0].confidence).toBeGreaterThan(0.9);
    });

    it('detects phone number variables correctly', async () => {
      const action = {
        type: 'type',
        target: { selector: '#phone' },
        value: '+1-555-123-4567'
      };

      const analysis = await variableAnalyzer.analyzeForVariables(action);

      expect(analysis[0].type).toBe('phone');
      expect(analysis[0].confidence).toBeGreaterThan(0.8);
    });

    it('detects date variables correctly', async () => {
      const action = {
        type: 'type',
        target: { selector: '#date' },
        value: '2025-01-15'
      };

      const analysis = await variableAnalyzer.analyzeForVariables(action);

      expect(analysis[0].type).toBe('date');
      expect(analysis[0].format).toBe('YYYY-MM-DD');
    });

    it('suggests variable names based on context', async () => {
      const action = {
        type: 'type',
        target: { 
          selector: '#user-email-input',
          label: 'Email Address',
          placeholder: 'Enter your email'
        },
        value: 'user@domain.com'
      };

      const analysis = await variableAnalyzer.analyzeForVariables(action);

      expect(analysis[0].suggestedName).toMatch(/email/i);
      expect(analysis[0].description).toContain('email');
    });
  });

  describe('Performance and Reliability Testing', () => {
    it('handles high-frequency actions without dropping events', async () => {
      const actions = Array.from({ length: 1000 }, (_, i) => ({
        type: 'mousemove',
        coordinates: { x: i, y: i },
        timestamp: Date.now() + i
      }));

      const start = performance.now();
      const capturedActions = [];

      for (const action of actions) {
        const captured = await recordingStudio.captureAction(action);
        capturedActions.push(captured);
      }

      const end = performance.now();

      expect(capturedActions).toHaveLength(1000);
      expect(end - start).toBeLessThan(5000); // 5 second threshold
    });

    it('maintains memory efficiency during long recordings', async () => {
      const initialMemory = TestHelpers.getMemoryUsage();

      await recordingStudio.startRecording({ url: 'https://example.com' });

      // Simulate long recording session
      for (let i = 0; i < 10000; i++) {
        await recordingStudio.captureAction({
          type: 'mousemove',
          coordinates: { x: i % 1000, y: i % 1000 },
          timestamp: Date.now()
        });
      }

      const finalMemory = TestHelpers.getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      await recordingStudio.stopRecording();

      // Memory increase should be reasonable (less than 50MB for 10k actions)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('recovers gracefully from browser crashes', async () => {
      await recordingStudio.startRecording({ url: 'https://example.com' });

      // Simulate browser crash
      mockPage.evaluate.mockRejectedValue(new Error('Browser disconnected'));

      const errorHandler = jest.fn();
      recordingStudio.on('error', errorHandler);

      await recordingStudio.captureAction({
        type: 'click',
        target: { selector: '#button' }
      });

      expect(errorHandler).toHaveBeenCalled();
      expect(recordingStudio.isRecording).toBe(false);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    const browsers = ['chromium', 'firefox', 'webkit'];

    browsers.forEach(browserName => {
      it(`works correctly with ${browserName}`, async () => {
        // Mock browser-specific behavior
        mockBrowser.name = browserName;

        const session = await recordingStudio.startRecording({
          url: 'https://example.com',
          browser: browserName
        });

        expect(session).toBeDefined();
        expect(session.browser).toBe(browserName);

        await recordingStudio.captureAction({
          type: 'click',
          target: { selector: '#test-button' }
        });

        const result = await recordingStudio.stopRecording();
        expect(result.actions).toHaveLength(1);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles invalid selectors gracefully', async () => {
      const invalidAction = {
        type: 'click',
        target: { selector: '###invalid-selector' }
      };

      await expect(recordingStudio.captureAction(invalidAction))
        .resolves.toBeDefined();

      // Should capture the action but mark it as potentially problematic
      const capturedAction = await recordingStudio.captureAction(invalidAction);
      expect(capturedAction.warnings).toContain('invalid-selector');
    });

    it('handles network timeouts during recording', async () => {
      mockPage.goto.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(recordingStudio.startRecording({
        url: 'https://slow-site.com',
        timeout: 50
      })).rejects.toThrow('Timeout');
    });

    it('handles dynamic content changes', async () => {
      let elementExists = true;
      mockPage.$.mockImplementation((selector) => {
        return elementExists ? { selector } : null;
      });

      await recordingStudio.startRecording({ url: 'https://example.com' });

      // Element exists initially
      await recordingStudio.captureAction({
        type: 'click',
        target: { selector: '#dynamic-button' }
      });

      // Element disappears
      elementExists = false;

      // Should handle gracefully
      await recordingStudio.captureAction({
        type: 'click',
        target: { selector: '#dynamic-button' }
      });

      const result = await recordingStudio.stopRecording();
      expect(result.actions).toHaveLength(2);
      expect(result.actions[1].warnings).toContain('element-not-found');
    });
  });
});