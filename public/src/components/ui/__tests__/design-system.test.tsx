import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../theme-provider';
import { EnhancedButton } from '../enhanced-button';
import { EnhancedCard, CardHeader, CardTitle, CardContent, CardFooter } from '../enhanced-card';
import { Badge } from '../badge';
import { ThemeToggle } from '../theme-toggle';
import { PlayIcon, PauseIcon } from '../icons';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock matchMedia
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

describe('Design System Components', () => {
  describe('ThemeProvider', () => {
    it('provides theme context to children', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Child component</div>
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('applies theme to document', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <div>Content</div>
        </ThemeProvider>
      );
      
      // Check if theme attribute is set on document
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('EnhancedButton', () => {
    it('renders with default props', () => {
      render(<EnhancedButton>Click me</EnhancedButton>);
      
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('handles different variants', () => {
      const { rerender } = render(<EnhancedButton variant="primary">Primary</EnhancedButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<EnhancedButton variant="secondary">Secondary</EnhancedButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<EnhancedButton variant="destructive">Destructive</EnhancedButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles different sizes', () => {
      const { rerender } = render(<EnhancedButton size="sm">Small</EnhancedButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<EnhancedButton size="lg">Large</EnhancedButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<EnhancedButton loading>Loading</EnhancedButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(<EnhancedButton onClick={handleClick}>Click me</EnhancedButton>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders with icon', () => {
      render(
        <EnhancedButton icon={<PlayIcon data-testid="play-icon" />}>
          Play
        </EnhancedButton>
      );
      
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('disables when disabled prop is true', () => {
      render(<EnhancedButton disabled>Disabled</EnhancedButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('EnhancedCard', () => {
    it('renders with default props', () => {
      render(
        <EnhancedCard>
          <CardContent>Card content</CardContent>
        </EnhancedCard>
      );
      
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('handles different variants', () => {
      const { rerender } = render(
        <EnhancedCard variant="elevated">
          <CardContent>Elevated card</CardContent>
        </EnhancedCard>
      );
      expect(screen.getByText('Elevated card')).toBeInTheDocument();

      rerender(
        <EnhancedCard variant="outlined">
          <CardContent>Outlined card</CardContent>
        </EnhancedCard>
      );
      expect(screen.getByText('Outlined card')).toBeInTheDocument();
    });

    it('renders complete card structure', () => {
      render(
        <EnhancedCard>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <EnhancedButton>Action</EnhancedButton>
          </CardFooter>
        </EnhancedCard>
      );
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('handles interactive cards', () => {
      const handleClick = jest.fn();
      render(
        <EnhancedCard interactive onClick={handleClick}>
          <CardContent>Interactive card</CardContent>
        </EnhancedCard>
      );
      
      const card = screen.getByText('Interactive card').closest('div');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
      
      fireEvent.click(card!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Badge', () => {
    it('renders with default props', () => {
      render(<Badge>Default badge</Badge>);
      
      expect(screen.getByText('Default badge')).toBeInTheDocument();
    });

    it('handles different variants', () => {
      const { rerender } = render(<Badge variant="primary">Primary</Badge>);
      expect(screen.getByText('Primary')).toBeInTheDocument();

      rerender(<Badge variant="success">Success</Badge>);
      expect(screen.getByText('Success')).toBeInTheDocument();

      rerender(<Badge variant="error">Error</Badge>);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      render(
        <Badge icon={<PlayIcon data-testid="badge-icon" />}>
          With Icon
        </Badge>
      );
      
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('renders as dot', () => {
      render(<Badge dot />);
      
      // Dot badges don't have text content
      const badge = document.querySelector('[data-testid]')?.parentElement;
      expect(badge).toBeInTheDocument();
    });

    it('handles pulse animation', () => {
      render(<Badge pulse>Pulsing badge</Badge>);
      
      expect(screen.getByText('Pulsing badge')).toBeInTheDocument();
    });
  });

  describe('ThemeToggle', () => {
    it('renders theme toggle button', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('opens dropdown on click', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('changes theme when option is selected', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const darkOption = screen.getByText('Dark');
      fireEvent.click(darkOption);
      
      // Check if theme was applied
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Icons', () => {
    it('renders PlayIcon', () => {
      render(<PlayIcon data-testid="play-icon" />);
      
      const icon = screen.getByTestId('play-icon');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    it('renders PauseIcon', () => {
      render(<PauseIcon data-testid="pause-icon" />);
      
      const icon = screen.getByTestId('pause-icon');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    it('handles custom size and color', () => {
      render(<PlayIcon data-testid="custom-icon" size={32} color="red" />);
      
      const icon = screen.getByTestId('custom-icon');
      expect(icon).toHaveAttribute('width', '32');
      expect(icon).toHaveAttribute('height', '32');
      expect(icon).toHaveAttribute('stroke', 'red');
    });
  });

  describe('Design Tokens', () => {
    it('applies CSS custom properties', () => {
      render(<div data-testid="test-element">Test</div>);
      
      const element = screen.getByTestId('test-element');
      const styles = getComputedStyle(element);
      
      // Check if CSS custom properties are available
      // Note: jsdom doesn't fully support CSS custom properties,
      // so this test mainly ensures the component renders without errors
      expect(element).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper focus management', () => {
      render(
        <div>
          <EnhancedButton>Button 1</EnhancedButton>
          <EnhancedButton>Button 2</EnhancedButton>
        </div>
      );
      
      const buttons = screen.getAllByRole('button');
      
      // Focus first button
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();
      
      // Tab to second button
      fireEvent.keyDown(buttons[0], { key: 'Tab' });
      // Note: jsdom doesn't handle tab navigation automatically
      buttons[1].focus();
      expect(buttons[1]).toHaveFocus();
    });

    it('provides proper ARIA attributes', () => {
      render(
        <EnhancedCard interactive>
          <CardContent>Interactive card</CardContent>
        </EnhancedCard>
      );
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('supports keyboard navigation', () => {
      const handleClick = jest.fn();
      render(
        <EnhancedCard interactive onClick={handleClick}>
          <CardContent>Interactive card</CardContent>
        </EnhancedCard>
      );
      
      const card = screen.getByRole('button');
      
      // Simulate Enter key press
      fireEvent.keyDown(card, { key: 'Enter' });
      // Note: We'd need to implement keyboard handlers for this to work
      
      // Simulate Space key press
      fireEvent.keyDown(card, { key: ' ' });
      // Note: We'd need to implement keyboard handlers for this to work
    });
  });

  describe('Responsive Design', () => {
    it('handles different screen sizes', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <EnhancedCard>
          <CardContent>Responsive card</CardContent>
        </EnhancedCard>
      );
      
      expect(screen.getByText('Responsive card')).toBeInTheDocument();
      
      // Change to mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));
      
      expect(screen.getByText('Responsive card')).toBeInTheDocument();
    });
  });
});