// Responsive utilities for the AI RPA platform

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Media query helpers
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  
  // Max width queries
  'max-xs': `(max-width: ${breakpoints.sm - 1}px)`,
  'max-sm': `(max-width: ${breakpoints.md - 1}px)`,
  'max-md': `(max-width: ${breakpoints.lg - 1}px)`,
  'max-lg': `(max-width: ${breakpoints.xl - 1}px)`,
  'max-xl': `(max-width: ${breakpoints['2xl'] - 1}px)`,
  
  // Range queries
  'sm-md': `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.lg - 1}px)`,
  'md-lg': `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.xl - 1}px)`,
  'lg-xl': `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints['2xl'] - 1}px)`,
} as const;

// Hook for responsive breakpoints
import { useState, useEffect } from 'react';

export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });
      
      // Determine current breakpoint
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    currentBreakpoint,
    windowSize,
    isMobile: currentBreakpoint === 'xs' || currentBreakpoint === 'sm',
    isTablet: currentBreakpoint === 'md',
    isDesktop: currentBreakpoint === 'lg' || currentBreakpoint === 'xl' || currentBreakpoint === '2xl',
    isSmallScreen: currentBreakpoint === 'xs' || currentBreakpoint === 'sm' || currentBreakpoint === 'md',
    isLargeScreen: currentBreakpoint === 'xl' || currentBreakpoint === '2xl',
  };
};

// Hook for media queries
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

// Responsive value helper
export const getResponsiveValue = <T>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint,
  fallback: T
): T => {
  // Try current breakpoint first
  if (values[currentBreakpoint] !== undefined) {
    return values[currentBreakpoint]!;
  }

  // Fallback to smaller breakpoints
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  
  for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }

  return fallback;
};

// Container width utilities
export const getContainerWidth = (breakpoint: Breakpoint): string => {
  switch (breakpoint) {
    case 'xs':
      return '100%';
    case 'sm':
      return '640px';
    case 'md':
      return '768px';
    case 'lg':
      return '1024px';
    case 'xl':
      return '1280px';
    case '2xl':
      return '1536px';
    default:
      return '100%';
  }
};

// Grid column utilities
export const getGridColumns = (breakpoint: Breakpoint, itemMinWidth: number = 300): number => {
  const containerWidth = breakpoints[breakpoint];
  const padding = 48; // Account for container padding
  const gap = 24; // Account for grid gap
  
  const availableWidth = containerWidth - padding;
  const columnsWithGap = Math.floor(availableWidth / (itemMinWidth + gap));
  
  return Math.max(1, columnsWithGap);
};

// Touch device detection
export const isTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

// Zoom level detection
export const getZoomLevel = (): number => {
  return Math.round((window.outerWidth / window.innerWidth) * 100) / 100;
};

// Viewport utilities
export const getViewportInfo = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    zoomLevel: getZoomLevel(),
    isTouchDevice: isTouchDevice(),
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
  };
};

// CSS helper for responsive styles
export const css = {
  // Media query helper for styled-components
  media: Object.entries(mediaQueries).reduce((acc, [key, value]) => {
    acc[key] = `@media ${value}`;
    return acc;
  }, {} as Record<keyof typeof mediaQueries, string>),
  
  // Container queries (when supported)
  container: {
    sm: '@container (min-width: 640px)',
    md: '@container (min-width: 768px)',
    lg: '@container (min-width: 1024px)',
    xl: '@container (min-width: 1280px)',
  },
};

// Responsive spacing helper
export const getResponsiveSpacing = (
  base: number,
  breakpoint: Breakpoint
): number => {
  const multipliers: Record<Breakpoint, number> = {
    xs: 0.75,
    sm: 0.875,
    md: 1,
    lg: 1.125,
    xl: 1.25,
    '2xl': 1.5,
  };
  
  return base * multipliers[breakpoint];
};

// Responsive font size helper
export const getResponsiveFontSize = (
  baseFontSize: number,
  breakpoint: Breakpoint
): number => {
  const scaleFactor: Record<Breakpoint, number> = {
    xs: 0.875,
    sm: 0.9375,
    md: 1,
    lg: 1.0625,
    xl: 1.125,
    '2xl': 1.25,
  };
  
  return baseFontSize * scaleFactor[breakpoint];
};

// Layout utilities
export const getLayoutConfig = (breakpoint: Breakpoint) => {
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    sidebarWidth: isMobile ? '100%' : isTablet ? '300px' : '400px',
    headerHeight: isMobile ? '56px' : '64px',
    contentPadding: isMobile ? '16px' : isTablet ? '24px' : '32px',
    gridColumns: getGridColumns(breakpoint),
    cardMinWidth: isMobile ? '280px' : '320px',
    modalWidth: isMobile ? '95%' : isTablet ? '80%' : '600px',
  };
};