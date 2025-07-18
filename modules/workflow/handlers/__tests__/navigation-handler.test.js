const NavigationHandler = require('../navigation-handler');

describe('NavigationHandler', () => {
    let handler;
    let mockPage;
    let mockContext;
    let mockResponse;

    beforeEach(() => {
        handler = new NavigationHandler();
        
        mockResponse = {
            status: jest.fn().mockReturnValue(200),
            statusText: jest.fn().mockReturnValue('OK'),
            headers: jest.fn().mockReturnValue({})
        };
        
        mockPage = {
            goto: jest.fn().mockResolvedValue(mockResponse),
            goBack: jest.fn().mockResolvedValue(mockResponse),
            goForward: jest.fn().mockResolvedValue(mockResponse),
            reload: jest.fn().mockResolvedValue(mockResponse),
            close: jest.fn().mockResolvedValue(),
            url: jest.fn().mockReturnValue('https://example.com'),
            title: jest.fn().mockReturnValue('Test Page'),
            waitForSelector: jest.fn().mockResolvedValue(),
            waitForFunction: jest.fn().mockResolvedValue(),
            waitForURL: jest.fn().mockResolvedValue(),
            waitForLoadState: jest.fn().mockResolvedValue()
        };
        
        mockContext = {
            automationEngine: { page: mockPage },
            getVariable: jest.fn(),
            setVariable: jest.fn()
        };
    });

    describe('Step Validation', () => {
        test('should validate goto step with URL', () => {
            const step = { action: 'goto', target: 'https://example.com' };
            expect(() => handler.validate(step)).not.toThrow();
        });

        test('should reject goto step without URL', () => {
            const step = { action: 'goto' };
            expect(() => handler.validate(step)).toThrow('Navigation goto requires target URL');
        });

        test('should validate other navigation actions', () => {
            ['back', 'forward', 'refresh', 'close'].forEach(action => {
                const step = { action };
                expect(() => handler.validate(step)).not.toThrow();
            });
        });

        test('should reject unknown action', () => {
            const step = { action: 'unknown' };
            expect(() => handler.validate(step)).toThrow('Unknown navigation action: unknown');
        });
    });

    describe('Goto Navigation', () => {
        test('should navigate to URL', async () => {
            const step = {
                id: 'nav-1',
                action: 'goto',
                target: 'https://example.com'
            };

            const result = await handler.execute(step, mockContext);

            expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            expect(result).toMatchObject({
                success: true,
                action: 'goto',
                target: 'https://example.com',
                url: 'https://example.com',
                title: 'Test Page'
            });
        });

        test('should process URL with variables', async () => {
            mockContext.getVariable.mockImplementation(name => {
                if (name === 'baseUrl') return 'https://test.com';
                if (name === 'path') return '/login';
                return null;
            });

            const step = {
                id: 'nav-1',
                action: 'goto',
                target: '{{baseUrl}}{{path}}'
            };

            await handler.execute(step, mockContext);

            expect(mockPage.goto).toHaveBeenCalledWith('https://test.com/login', expect.any(Object));
        });

        test('should use custom wait options', async () => {
            const step = {
                id: 'nav-1',
                action: 'goto',
                target: 'https://example.com',
                waitUntil: 'domcontentloaded',
                timeout: 10000
            };

            await handler.execute(step, mockContext);

            expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
        });

        test('should wait for additional conditions', async () => {
            const step = {
                id: 'nav-1',
                action: 'goto',
                target: 'https://example.com',
                waitFor: '#content'
            };

            await handler.execute(step, mockContext);

            expect(mockPage.waitForSelector).toHaveBeenCalledWith('#content', { timeout: 10000 });
        });
    });

    describe('Back Navigation', () => {
        test('should navigate back', async () => {
            const step = {
                id: 'nav-1',
                action: 'back'
            };

            const result = await handler.execute(step, mockContext);

            expect(mockPage.goBack).toHaveBeenCalledWith({
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            expect(result).toMatchObject({
                success: true,
                action: 'back'
            });
        });
    });

    describe('Forward Navigation', () => {
        test('should navigate forward', async () => {
            const step = {
                id: 'nav-1',
                action: 'forward'
            };

            const result = await handler.execute(step, mockContext);

            expect(mockPage.goForward).toHaveBeenCalledWith({
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            expect(result).toMatchObject({
                success: true,
                action: 'forward'
            });
        });
    });

    describe('Page Refresh', () => {
        test('should refresh page', async () => {
            const step = {
                id: 'nav-1',
                action: 'refresh'
            };

            const result = await handler.execute(step, mockContext);

            expect(mockPage.reload).toHaveBeenCalledWith({
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            expect(result).toMatchObject({
                success: true,
                action: 'refresh'
            });
        });
    });

    describe('Page Close', () => {
        test('should close page', async () => {
            const step = {
                id: 'nav-1',
                action: 'close'
            };

            const result = await handler.execute(step, mockContext);

            expect(mockPage.close).toHaveBeenCalled();

            expect(result).toMatchObject({
                success: true,
                action: 'close'
            });
        });
    });

    describe('Wait Conditions', () => {
        test('should wait for selector', async () => {
            await handler.waitForCondition(mockPage, '#element', mockContext);
            expect(mockPage.waitForSelector).toHaveBeenCalledWith('#element', { timeout: 10000 });
        });

        test('should wait for function', async () => {
            const waitFor = {
                type: 'function',
                function: 'document.readyState === "complete"',
                timeout: 5000
            };

            await handler.waitForCondition(mockPage, waitFor, mockContext);
            expect(mockPage.waitForFunction).toHaveBeenCalledWith(
                'document.readyState === "complete"',
                { timeout: 5000 }
            );
        });

        test('should wait for URL pattern', async () => {
            const waitFor = {
                type: 'url',
                pattern: '/dashboard',
                timeout: 15000
            };

            await handler.waitForCondition(mockPage, waitFor, mockContext);
            expect(mockPage.waitForURL).toHaveBeenCalledWith('/dashboard', { timeout: 15000 });
        });

        test('should wait for load state', async () => {
            const waitFor = {
                type: 'load',
                state: 'networkidle',
                timeout: 20000
            };

            await handler.waitForCondition(mockPage, waitFor, mockContext);
            expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 20000 });
        });
    });

    describe('Error Handling', () => {
        test('should handle navigation errors', async () => {
            const error = new Error('Navigation failed');
            mockPage.goto.mockRejectedValue(error);

            const step = {
                id: 'nav-1',
                action: 'goto',
                target: 'https://example.com'
            };

            await expect(handler.execute(step, mockContext))
                .rejects.toThrow('Navigation goto failed: Navigation failed');
        });

        test('should handle missing browser engine', async () => {
            mockContext.automationEngine = null;

            const step = {
                id: 'nav-1',
                action: 'goto',
                target: 'https://example.com'
            };

            await expect(handler.execute(step, mockContext))
                .rejects.toThrow('Browser automation engine not available');
        });
    });

    describe('URL Processing', () => {
        test('should process URL without variables', () => {
            const url = 'https://example.com/page';
            const processed = handler.processUrl(url, mockContext);
            expect(processed).toBe(url);
        });

        test('should process URL with single variable', () => {
            mockContext.getVariable.mockReturnValue('test.com');
            const url = 'https://{{domain}}/page';
            const processed = handler.processUrl(url, mockContext);
            expect(processed).toBe('https://test.com/page');
        });

        test('should process URL with multiple variables', () => {
            mockContext.getVariable.mockImplementation(name => {
                if (name === 'protocol') return 'https';
                if (name === 'domain') return 'example.com';
                if (name === 'path') return 'login';
                return null;
            });

            const url = '{{protocol}}://{{domain}}/{{path}}';
            const processed = handler.processUrl(url, mockContext);
            expect(processed).toBe('https://example.com/login');
        });

        test('should handle missing variables', () => {
            mockContext.getVariable.mockReturnValue(undefined);
            const url = 'https://{{missing}}/page';
            const processed = handler.processUrl(url, mockContext);
            expect(processed).toBe('https://{{missing}}/page');
        });
    });
});