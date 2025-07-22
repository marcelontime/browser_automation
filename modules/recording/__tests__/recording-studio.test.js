const RecordingStudio = require('../recording-studio');
const EnhancedRecorder = require('../enhanced-recorder');
const ActionCapture = require('../action-capture');

describe('RecordingStudio', () => {
  let recordingStudio;
  let mockRecorder;
  let mockActionCapture;

  beforeEach(() => {
    mockRecorder = {
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      pauseRecording: jest.fn(),
      resumeRecording: jest.fn(),
      getRecordingState: jest.fn(() => ({ isRecording: false }))
    };

    mockActionCapture = {
      captureAction: jest.fn(),
      getElementStrategies: jest.fn(),
      analyzeContext: jest.fn()
    };

    recordingStudio = new RecordingStudio({
      recorder: mockRecorder,
      actionCapture: mockActionCapture
    });
  });

  describe('Recording Session Management', () => {
    test('should start recording session successfully', async () => {
      const options = {
        quality: 'high',
        strategies: ['dom', 'visual', 'accessibility']
      };

      mockRecorder.startRecording.mockResolvedValue({ sessionId: 'test-session' });

      const session = await recordingStudio.startRecording(options);

      expect(mockRecorder.startRecording).toHaveBeenCalledWith(options);
      expect(session).toHaveProperty('sessionId', 'test-session');
    });

    test('should handle recording start failure', async () => {
      mockRecorder.startRecording.mockRejectedValue(new Error('Failed to start'));

      await expect(recordingStudio.startRecording({}))
        .rejects.toThrow('Failed to start');
    });

    test('should stop recording and return session data', async () => {
      const mockSessionData = {
        actions: [{ type: 'click', element: 'button' }],
        duration: 5000
      };

      mockRecorder.stopRecording.mockResolvedValue(mockSessionData);

      const result = await recordingStudio.stopRecording();

      expect(mockRecorder.stopRecording).toHaveBeenCalled();
      expect(result).toEqual(mockSessionData);
    });
  });

  describe('Action Processing', () => {
    test('should process user action with multi-strategy capture', async () => {
      const userAction = {
        type: 'click',
        target: { x: 100, y: 200 },
        timestamp: Date.now()
      };

      const mockElement = {
        strategies: {
          css: ['#button'],
          xpath: ['//button[@id="button"]'],
          accessibility: { role: 'button', name: 'Submit' }
        },
        confidence: 0.95
      };

      const mockOptimized = {
        ...userAction,
        optimized: true
      };

      const mockVariables = [
        { name: 'buttonText', value: 'Submit', confidence: 0.8 }
      ];

      mockActionCapture.getElementStrategies.mockResolvedValue(mockElement);
      recordingStudio.aiAnalyzer = {
        optimizeAction: jest.fn().mockResolvedValue(mockOptimized)
      };
      recordingStudio.variableExtractor = {
        suggestVariables: jest.fn().mockResolvedValue(mockVariables)
      };

      const result = await recordingStudio.processAction(userAction);

      expect(result).toEqual({
        ...mockOptimized,
        element: mockElement,
        suggestedVariables: mockVariables
      });
    });

    test('should handle action processing errors gracefully', async () => {
      const userAction = { type: 'click', target: null };

      mockActionCapture.getElementStrategies.mockRejectedValue(
        new Error('Invalid target')
      );

      await expect(recordingStudio.processAction(userAction))
        .rejects.toThrow('Invalid target');
    });
  });

  describe('Real-time Analysis', () => {
    test('should provide real-time recording feedback', async () => {
      const mockSession = { id: 'test-session' };
      const mockAnalysis = {
        quality: 'high',
        suggestions: ['Consider adding wait conditions'],
        warnings: []
      };

      recordingStudio.aiAnalyzer = {
        startRealTimeAnalysis: jest.fn(),
        getAnalysis: jest.fn().mockResolvedValue(mockAnalysis)
      };

      await recordingStudio.startRealTimeAnalysis(mockSession);
      const analysis = await recordingStudio.getRealTimeAnalysis();

      expect(recordingStudio.aiAnalyzer.startRealTimeAnalysis)
        .toHaveBeenCalledWith(mockSession);
      expect(analysis).toEqual(mockAnalysis);
    });
  });

  describe('Performance Tests', () => {
    test('should process actions within performance threshold', async () => {
      const userAction = {
        type: 'click',
        target: { x: 100, y: 200 }
      };

      mockActionCapture.getElementStrategies.mockResolvedValue({
        strategies: { css: ['#test'] },
        confidence: 0.9
      });

      const { duration } = await measurePerformance(async () => {
        await recordingStudio.processAction(userAction);
      });

      // Should process action within 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle concurrent action processing', async () => {
      const actions = Array.from({ length: 10 }, (_, i) => ({
        type: 'click',
        target: { x: i * 10, y: i * 10 }
      }));

      mockActionCapture.getElementStrategies.mockResolvedValue({
        strategies: { css: ['#test'] },
        confidence: 0.9
      });

      const promises = actions.map(action => 
        recordingStudio.processAction(action)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });
  });
});