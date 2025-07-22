import { 
  breakpoints, 
  getResponsiveValue, 
  getContainerWidth, 
  getGridColumns, 
  getZoomLevel, 
  getViewportInfo,
  getResponsiveSpacing,
  getResponsiveFontSize,
  getLayoutConfig
} from '../responsive';

// Mock window object
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  outerWidth: 1024,
  devicePixelRatio: 1,
  matchMedia: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
};

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockWindow.innerWidth,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: mockWindow.innerHeight,
});

Object.defineProperty(window, 'outerWidth', {
  writable: true,
  configurable: true,
  value: mockWindow.outerWidth,
});

Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: mockWindow.devicePixelRatio,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: mockWindow.matchMedia,
});

describe('Responsive Utilities', () => {
  describe('breakpoints', () => {
    it('has correct breakpoint values', () => {
      expect(breakpoints.xs).toBe(0);
      expect(breakpoints.sm).toBe(640);
      expect(breakpoints.md).toBe(768);
      expect(breakpoints.lg).toBe(1024);
      expect(breakpoints.xl).toBe(1280);
      expect(breakpoints['2xl']).toBe(1536);
    });
  });

  describe('getResponsiveValue', () => {
    it('returns value for current breakpoint', () => {
      const values = { lg: 'large', md: 'medium', sm: 'small' };
      const result = getResponsiveValue(values, 'lg', 'fallback');
      expect(result).toBe('large');
    });

    it('falls back to smaller breakpoints', () => {
      const values = { md: 'medium', sm: 'small' };
      const result = getResponsiveValue(values, 'lg', 'fallback');
      expect(result).toBe('medium');
    });

    it('returns fallback when no values match', () => {
      const values = { xs: 'extra-small' };
      const result = getResponsiveValue(values, 'xl', 'fallback');
      expect(result).toBe('fallback');
    });
  });

  describe('getContainerWidth', () => {
    it('returns correct container widths', () => {
      expect(getContainerWidth('xs')).toBe('100%');
      expect(getContainerWidth('sm')).toBe('640px');
      expect(getContainerWidth('md')).toBe('768px');
      expect(getContainerWidth('lg')).toBe('1024px');
      expect(getContainerWidth('xl')).toBe('1280px');
      expect(getContainerWidth('2xl')).toBe('1536px');
    });
  });

  describe('getGridColumns', () => {
    it('calculates correct number of columns', () => {
      expect(getGridColumns('xs', 300)).toBe(1);
      expect(getGridColumns('sm', 300)).toBe(1);
      expect(getGridColumns('md', 300)).toBe(2);
      expect(getGridColumns('lg', 300)).toBe(3);
      expect(getGridColumns('xl', 300)).toBe(4);
      expect(getGridColumns('2xl', 300)).toBe(5);
    });

    it('handles different item widths', () => {
      expect(getGridColumns('lg', 200)).toBeGreaterThan(getGridColumns('lg', 400));
    });

    it('returns at least 1 column', () => {
      expect(getGridColumns('xs', 1000)).toBe(1);
    });
  });

  describe('getZoomLevel', () => {
    it('calculates zoom level correctly', () => {
      // Mock outerWidth and innerWidth
      Object.defineProperty(window, 'outerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      
      expect(getZoomLevel()).toBe(1);
    });

    it('handles zoomed in state', () => {
      Object.defineProperty(window, 'outerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerWidth', { value: 512 });
      
      expect(getZoomLevel()).toBe(2);
    });
  });

  describe('getViewportInfo', () => {
    it('returns correct viewport information', () => {
      const info = getViewportInfo();
      
      expect(info).toHaveProperty('width');
      expect(info).toHaveProperty('height');
      expect(info).toHaveProperty('devicePixelRatio');
      expect(info).toHaveProperty('zoomLevel');
      expect(info).toHaveProperty('isTouchDevice');
      expect(info).toHaveProperty('orientation');
    });

    it('detects orientation correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });
      
      const info = getViewportInfo();
      expect(info.orientation).toBe('landscape');
    });

    it('detects portrait orientation', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });
      
      const info = getViewportInfo();
      expect(info.orientation).toBe('portrait');
    });
  });

  describe('getResponsiveSpacing', () => {
    it('scales spacing based on breakpoint', () => {
      const baseSpacing = 16;
      
      expect(getResponsiveSpacing(baseSpacing, 'xs')).toBe(12); // 16 * 0.75
      expect(getResponsiveSpacing(baseSpacing, 'sm')).toBe(14); // 16 * 0.875
      expect(getResponsiveSpacing(baseSpacing, 'md')).toBe(16); // 16 * 1
      expect(getResponsiveSpacing(baseSpacing, 'lg')).toBe(18); // 16 * 1.125
      expect(getResponsiveSpacing(baseSpacing, 'xl')).toBe(20); // 16 * 1.25
      expect(getResponsiveSpacing(baseSpacing, '2xl')).toBe(24); // 16 * 1.5
    });
  });

  describe('getResponsiveFontSize', () => {
    it('scales font size based on breakpoint', () => {
      const baseFontSize = 16;
      
      expect(getResponsiveFontSize(baseFontSize, 'xs')).toBe(14); // 16 * 0.875
      expect(getResponsiveFontSize(baseFontSize, 'sm')).toBe(15); // 16 * 0.9375
      expect(getResponsiveFontSize(baseFontSize, 'md')).toBe(16); // 16 * 1
      expect(getResponsiveFontSize(baseFontSize, 'lg')).toBe(17); // 16 * 1.0625
      expect(getResponsiveFontSize(baseFontSize, 'xl')).toBe(18); // 16 * 1.125
      expect(getResponsiveFontSize(baseFontSize, '2xl')).toBe(20); // 16 * 1.25
    });
  });

  describe('getLayoutConfig', () => {
    it('returns correct config for mobile', () => {
      const config = getLayoutConfig('xs');
      
      expect(config.isMobile).toBe(true);
      expect(config.isTablet).toBe(false);
      expect(config.isDesktop).toBe(false);
      expect(config.sidebarWidth).toBe('100%');
      expect(config.headerHeight).toBe('56px');
      expect(config.contentPadding).toBe('16px');
    });

    it('returns correct config for tablet', () => {
      const config = getLayoutConfig('md');
      
      expect(config.isMobile).toBe(false);
      expect(config.isTablet).toBe(true);
      expect(config.isDesktop).toBe(false);
      expect(config.sidebarWidth).toBe('300px');
      expect(config.headerHeight).toBe('64px');
      expect(config.contentPadding).toBe('24px');
    });

    it('returns correct config for desktop', () => {
      const config = getLayoutConfig('lg');
      
      expect(config.isMobile).toBe(false);
      expect(config.isTablet).toBe(false);
      expect(config.isDesktop).toBe(true);
      expect(config.sidebarWidth).toBe('400px');
      expect(config.headerHeight).toBe('64px');
      expect(config.contentPadding).toBe('32px');
    });

    it('calculates grid columns correctly', () => {
      const mobileConfig = getLayoutConfig('xs');
      const desktopConfig = getLayoutConfig('xl');
      
      expect(mobileConfig.gridColumns).toBeLessThan(desktopConfig.gridColumns);
    });

    it('sets appropriate card min width', () => {
      const mobileConfig = getLayoutConfig('xs');
      const desktopConfig = getLayoutConfig('lg');
      
      expect(mobileConfig.cardMinWidth).toBe('280px');
      expect(desktopConfig.cardMinWidth).toBe('320px');
    });

    it('sets appropriate modal width', () => {
      const mobileConfig = getLayoutConfig('xs');
      const tabletConfig = getLayoutConfig('md');
      const desktopConfig = getLayoutConfig('lg');
      
      expect(mobileConfig.modalWidth).toBe('95%');
      expect(tabletConfig.modalWidth).toBe('80%');
      expect(desktopConfig.modalWidth).toBe('600px');
    });
  });
});

// Integration tests
describe('Responsive Integration', () => {
  it('breakpoints are in ascending order', () => {
    const breakpointValues = Object.values(breakpoints);
    const sortedValues = [...breakpointValues].sort((a, b) => a - b);
    
    expect(breakpointValues).toEqual(sortedValues);
  });

  it('responsive spacing increases with breakpoint size', () => {
    const baseSpacing = 16;
    const spacings = [
      getResponsiveSpacing(baseSpacing, 'xs'),
      getResponsiveSpacing(baseSpacing, 'sm'),
      getResponsiveSpacing(baseSpacing, 'md'),
      getResponsiveSpacing(baseSpacing, 'lg'),
      getResponsiveSpacing(baseSpacing, 'xl'),
      getResponsiveSpacing(baseSpacing, '2xl'),
    ];
    
    for (let i = 1; i < spacings.length; i++) {
      expect(spacings[i]).toBeGreaterThanOrEqual(spacings[i - 1]);
    }
  });

  it('responsive font size increases with breakpoint size', () => {
    const baseFontSize = 16;
    const fontSizes = [
      getResponsiveFontSize(baseFontSize, 'xs'),
      getResponsiveFontSize(baseFontSize, 'sm'),
      getResponsiveFontSize(baseFontSize, 'md'),
      getResponsiveFontSize(baseFontSize, 'lg'),
      getResponsiveFontSize(baseFontSize, 'xl'),
      getResponsiveFontSize(baseFontSize, '2xl'),
    ];
    
    for (let i = 1; i < fontSizes.length; i++) {
      expect(fontSizes[i]).toBeGreaterThanOrEqual(fontSizes[i - 1]);
    }
  });

  it('grid columns increase with breakpoint size', () => {
    const itemWidth = 300;
    const columns = [
      getGridColumns('xs', itemWidth),
      getGridColumns('sm', itemWidth),
      getGridColumns('md', itemWidth),
      getGridColumns('lg', itemWidth),
      getGridColumns('xl', itemWidth),
      getGridColumns('2xl', itemWidth),
    ];
    
    for (let i = 1; i < columns.length; i++) {
      expect(columns[i]).toBeGreaterThanOrEqual(columns[i - 1]);
    }
  });
});