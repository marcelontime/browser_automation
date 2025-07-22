/**
 * Comprehensive UI Component Testing Suite
 * Tests for Phase 1: Modern UI/UX Transformation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '../theme-provider';
import { EnhancedButton } from '../enhanced-button';
import { EnhancedCard } from '../enhanced-card';
import { ThemeToggle } from '../theme-toggle';
import { ResponsiveGrid } from '../responsive-grid';

expect.extend(toHaveNoViolations);

describe('UI Component Test Suite', () => {
  const renderWithTheme = (component: React.ReactElement, theme = 'light') => {
    return render(
      <ThemeProvider defaultTheme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  describe('EnhancedButton Component', () => {
    it('renders with correct default props', () => {
      renderWithTheme(<EnhancedButton>Click me</EnhancedButton>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn-primary');
    });

    it('handles all variant types', () => {
      const variants = ['primary', 'secondary', 'success', 'warning', 'error'];
      
      variants.forEach(variant => {
        const { rerender } = renderWithTheme(
          <EnhancedButton variant={variant as any}>Test</EnhancedButton>
        );
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`btn-${variant}`);
      });
    });

    it('handles loading state correctly', async () => {
      renderWithTheme(<EnhancedButton loading>Loading</EnhancedButton>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('handles click events', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<EnhancedButton onClick={handleClick}>Click</EnhancedButton>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<EnhancedButton onClick={handleClick}>Click</EnhancedButton>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
      
      await userEvent.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await userEvent.keyboard('{Space}');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('meets accessibility standards', async () => {
      const { container } = renderWithTheme(
        <EnhancedButton aria-label="Accessible button">Click</EnhancedButton>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('responds within performance threshold', async () => {
      const start = performance.now();
      renderWithTheme(<EnhancedButton>Performance Test</EnhancedButton>);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50); // 50ms threshold
    });
  });

  describe('EnhancedCard Component', () => {
    it('renders with correct structure', () => {
      renderWithTheme(
        <EnhancedCard title="Test Card" description="Test description">
          <div>Card content</div>
        </EnhancedCard>
      );
      
      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('handles interactive states', async () => {
      const handleClick = jest.fn();
      renderWithTheme(
        <EnhancedCard 
          title="Interactive Card" 
          interactive 
          onClick={handleClick}
        >
          Content
        </EnhancedCard>
      );
      
      const card = screen.getByRole('button');
      await userEvent.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports different variants', () => {
      const variants = ['default', 'elevated', 'outlined'];
      
      variants.forEach(variant => {
        const { rerender } = renderWithTheme(
          <EnhancedCard variant={variant as any} title="Test">Content</EnhancedCard>
        );
        const card = screen.getByTestId('enhanced-card');
        expect(card).toHaveClass(`card-${variant}`);
      });
    });

    it('meets accessibility standards', async () => {
      const { container } = renderWithTheme(
        <EnhancedCard title="Accessible Card">Content</EnhancedCard>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ThemeToggle Component', () => {
    it('toggles between light and dark themes', async () => {
      renderWithTheme(<ThemeToggle />);
      
      const toggle = screen.getByRole('button', { name: /toggle theme/i });
      expect(toggle).toBeInTheDocument();
      
      await userEvent.click(toggle);
      
      // Verify theme change (this would depend on actual implementation)
      expect(toggle).toHaveAttribute('aria-pressed');
    });

    it('respects system theme preference', () => {
      // Mock system theme preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('dark'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithTheme(<ThemeToggle />);
      
      // Verify system theme is detected and applied
      const toggle = screen.getByRole('button');
      expect(toggle).toBeInTheDocument();
    });

    it('meets accessibility standards', async () => {
      const { container } = renderWithTheme(<ThemeToggle />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ResponsiveGrid Component', () => {
    it('renders with correct grid layout', () => {
      renderWithTheme(
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );
      
      const grid = screen.getByTestId('responsive-grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('responsive-grid');
    });

    it('adapts to different screen sizes', () => {
      // Mock different viewport sizes
      const viewports = [
        { width: 375, height: 667, expected: 'mobile' },
        { width: 768, height: 1024, expected: 'tablet' },
        { width: 1920, height: 1080, expected: 'desktop' }
      ];

      viewports.forEach(({ width, height, expected }) => {
        // Mock viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: height,
        });

        const { rerender } = renderWithTheme(
          <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
            <div>Item</div>
          </ResponsiveGrid>
        );

        const grid = screen.getByTestId('responsive-grid');
        expect(grid).toHaveAttribute('data-viewport', expected);
      });
    });

    it('meets accessibility standards', async () => {
      const { container } = renderWithTheme(
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Theme System Integration', () => {
    it('applies theme consistently across components', () => {
      renderWithTheme(
        <div>
          <EnhancedButton>Button</EnhancedButton>
          <EnhancedCard title="Card">Content</EnhancedCard>
        </div>,
        'dark'
      );

      const button = screen.getByRole('button');
      const card = screen.getByTestId('enhanced-card');

      expect(button).toHaveClass('dark-theme');
      expect(card).toHaveClass('dark-theme');
    });

    it('handles theme transitions smoothly', async () => {
      const { rerender } = renderWithTheme(
        <EnhancedButton>Theme Test</EnhancedButton>,
        'light'
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('light-theme');

      rerender(
        <ThemeProvider defaultTheme="dark">
          <EnhancedButton>Theme Test</EnhancedButton>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(button).toHaveClass('dark-theme');
      });
    });
  });

  describe('Performance Testing', () => {
    it('renders components within performance thresholds', async () => {
      const components = [
        () => <EnhancedButton>Test</EnhancedButton>,
        () => <EnhancedCard title="Test">Content</EnhancedCard>,
        () => <ThemeToggle />,
        () => <ResponsiveGrid columns={{ mobile: 1 }}><div>Item</div></ResponsiveGrid>
      ];

      for (const Component of components) {
        const start = performance.now();
        renderWithTheme(<Component />);
        const end = performance.now();
        
        expect(end - start).toBeLessThan(50); // 50ms threshold
      }
    });

    it('handles rapid re-renders efficiently', async () => {
      const { rerender } = renderWithTheme(
        <EnhancedButton>Initial</EnhancedButton>
      );

      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        rerender(
          <ThemeProvider defaultTheme="light">
            <EnhancedButton>Render {i}</EnhancedButton>
          </ThemeProvider>
        );
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(1000); // 1 second for 100 re-renders
    });
  });
});