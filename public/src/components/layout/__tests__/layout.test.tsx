import React from 'react';
import { render, screen, fireEvent } from '../../../test-utils';
import '@testing-library/jest-dom';
import { ResponsiveLayout } from '../ResponsiveLayout';
import { LeftPanel } from '../LeftPanel';
import { RightPanel } from '../RightPanel';

// Mock the responsive utilities
jest.mock('../../../utils/responsive', () => ({
  getLayoutConfig: jest.fn((breakpoint) => ({
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    sidebarWidth: breakpoint === 'xs' ? '100%' : '300px',
    headerHeight: '64px',
    contentPadding: '24px',
    gridColumns: breakpoint === 'xs' ? 1 : breakpoint === 'sm' ? 2 : 3,
    cardMinWidth: '280px',
    modalWidth: breakpoint === 'xs' ? '95%' : '600px',
  })),
  getViewportInfo: jest.fn(() => ({
    width: 1024,
    height: 768,
    devicePixelRatio: 1,
    zoomLevel: 1,
    isTouchDevice: false,
    orientation: 'landscape',
  })),
}));

describe('ResponsiveLayout', () => {
  const defaultProps = {
    children: <div data-testid="main-content">Main Content</div>,
  };

  it('renders main content', () => {
    render(<ResponsiveLayout {...defaultProps} />);
    
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('renders with left panel', () => {
    render(
      <ResponsiveLayout 
        {...defaultProps}
        leftPanel={<div data-testid="left-panel">Left Panel</div>}
      />
    );
    
    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('renders with right panel', () => {
    render(
      <ResponsiveLayout 
        {...defaultProps}
        rightPanel={<div data-testid="right-panel">Right Panel</div>}
      />
    );
    
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('renders with both panels', () => {
    render(
      <ResponsiveLayout 
        {...defaultProps}
        leftPanel={<div data-testid="left-panel">Left Panel</div>}
        rightPanel={<div data-testid="right-panel">Right Panel</div>}
      />
    );
    
    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('handles mobile layout', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(
      <ResponsiveLayout 
        {...defaultProps}
        leftPanel={<div data-testid="left-panel">Left Panel</div>}
      />
    );
    
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResponsiveLayout {...defaultProps} className="custom-layout" />
    );
    
    expect(container.firstChild).toHaveClass('custom-layout');
  });
});

describe('LeftPanel', () => {
  it('renders navigation items', () => {
    render(<LeftPanel />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Automations')).toBeInTheDocument();
    expect(screen.getByText('Variables')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    render(<LeftPanel activeItem="automations" />);
    
    const automationsLink = screen.getByText('Automations').closest('a');
    expect(automationsLink).toHaveAttribute('aria-current', 'page');
  });

  it('handles navigation clicks', () => {
    const onNavigate = jest.fn();
    render(<LeftPanel onNavigate={onNavigate} />);
    
    fireEvent.click(screen.getByText('Automations'));
    expect(onNavigate).toHaveBeenCalledWith('automations');
  });

  it('shows user profile section', () => {
    render(<LeftPanel />);
    
    expect(screen.getByText('User Profile')).toBeInTheDocument();
  });

  it('displays system status', () => {
    render(<LeftPanel />);
    
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('All systems operational')).toBeInTheDocument();
  });

  it('shows quick actions', () => {
    render(<LeftPanel />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('New Automation')).toBeInTheDocument();
    expect(screen.getByText('Start Recording')).toBeInTheDocument();
  });

  it('handles quick action clicks', () => {
    const onCreateAutomation = jest.fn();
    const onStartRecording = jest.fn();
    
    render(
      <LeftPanel 
        onCreateAutomation={onCreateAutomation}
        onStartRecording={onStartRecording}
      />
    );
    
    fireEvent.click(screen.getByText('New Automation'));
    expect(onCreateAutomation).toHaveBeenCalled();
    
    fireEvent.click(screen.getByText('Start Recording'));
    expect(onStartRecording).toHaveBeenCalled();
  });

  it('collapses on mobile', () => {
    render(<LeftPanel collapsed />);
    
    // Should still render but in collapsed state
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});

describe('RightPanel', () => {
  it('renders when open', () => {
    render(<RightPanel isOpen={true} />);
    
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<RightPanel isOpen={false} />);
    
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('renders with custom content', () => {
    render(
      <RightPanel isOpen={true}>
        <div data-testid="custom-content">Custom Content</div>
      </RightPanel>
    );
    
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });

  it('handles close action', () => {
    const onClose = jest.fn();
    render(<RightPanel isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('shows default content sections', () => {
    render(<RightPanel isOpen={true} />);
    
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('displays automation details when provided', () => {
    const automation = {
      id: '1',
      name: 'Test Automation',
      description: 'Test description',
      status: 'ready' as const,
      stepCount: 5,
      variableCount: 2,
      successRate: 95,
      lastRun: new Date('2024-01-15T10:00:00Z'),
      createdAt: new Date('2024-01-01T10:00:00Z'),
    };

    render(<RightPanel isOpen={true} selectedAutomation={automation} />);
    
    expect(screen.getByText('Test Automation')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('5 steps')).toBeInTheDocument();
    expect(screen.getByText('2 variables')).toBeInTheDocument();
  });

  it('shows execution history', () => {
    const history = [
      {
        id: '1',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        status: 'success' as const,
        duration: 1500,
      },
      {
        id: '2',
        timestamp: new Date('2024-01-14T10:00:00Z'),
        status: 'error' as const,
        duration: 800,
        error: 'Element not found',
      },
    ];

    render(<RightPanel isOpen={true} executionHistory={history} />);
    
    expect(screen.getByText('Recent Executions')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Element not found')).toBeInTheDocument();
  });

  it('provides help and documentation links', () => {
    render(<RightPanel isOpen={true} />);
    
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    const onClose = jest.fn();
    render(<RightPanel isOpen={true} onClose={onClose} />);
    
    const panel = screen.getByRole('complementary');
    fireEvent.keyDown(panel, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalled();
  });

  it('traps focus when open', () => {
    render(<RightPanel isOpen={true} />);
    
    const panel = screen.getByRole('complementary');
    expect(panel).toHaveAttribute('tabIndex', '-1');
  });
});

describe('Layout Integration', () => {
  it('handles responsive breakpoint changes', () => {
    const { rerender } = render(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );
    
    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    fireEvent(window, new Event('resize'));
    
    rerender(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('manages panel states correctly', () => {
    const TestComponent = () => {
      const [rightPanelOpen, setRightPanelOpen] = React.useState(false);
      
      return (
        <ResponsiveLayout
          leftPanel={<LeftPanel />}
          rightPanel={
            <RightPanel 
              isOpen={rightPanelOpen} 
              onClose={() => setRightPanelOpen(false)} 
            />
          }
        >
          <button onClick={() => setRightPanelOpen(true)}>
            Open Right Panel
          </button>
        </ResponsiveLayout>
      );
    };

    render(<TestComponent />);
    
    // Initially closed
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    
    // Open panel
    fireEvent.click(screen.getByText('Open Right Panel'));
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    
    // Close panel
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('provides proper ARIA landmarks', () => {
    render(
      <ResponsiveLayout
        leftPanel={<LeftPanel />}
        rightPanel={<RightPanel isOpen={true} />}
      >
        <main>Main Content</main>
      </ResponsiveLayout>
    );
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(
      <ResponsiveLayout
        leftPanel={<LeftPanel />}
      >
        <div>Content</div>
      </ResponsiveLayout>
    );
    
    const navLinks = screen.getAllByRole('link');
    navLinks.forEach(link => {
      expect(link).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  it('provides skip links for screen readers', () => {
    render(
      <ResponsiveLayout
        leftPanel={<LeftPanel />}
      >
        <div>Content</div>
      </ResponsiveLayout>
    );
    
    // Skip links should be available (though may be visually hidden)
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
  });
});