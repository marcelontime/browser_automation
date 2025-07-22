// Backend-specific test setup
require('./test-setup');

// Mock Redis for backend tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true)
  }));
});

// Mock OpenAI
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Mock AI response' }]
      })
    }
  }))
}));

// Mock Stagehand
jest.mock('@browserbasehq/stagehand', () => ({
  Stagehand: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(true),
    page: {
      goto: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      screenshot: jest.fn(),
      evaluate: jest.fn(),
      $: jest.fn(),
      $$: jest.fn()
    },
    close: jest.fn()
  }))
}));