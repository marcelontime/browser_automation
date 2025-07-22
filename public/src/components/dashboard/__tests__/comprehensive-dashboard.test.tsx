/**
 * Comprehensive Dashboard Testing Suite
 * Tests for Phase 1: Dashboard Redesign Components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '../ui/theme-provider';
import { ModernDashboard } from '../ModernDashboard';
import { AutomationGrid } from '../AutomationGrid';
import { MetricsDashboard } from '../MetricsDashboard';
import { QuickActions } from '../QuickActions';
import { KeyboardShortcuts } from '../KeyboardShortcuts';

expect.extend(toHaveNoViolations);

// Mock data for testing
const mockAutomations = [
  {
    id: '1',
    name: 'Test Automation 1',
    description: 'First test automation',
    status: 'active',
    lastRun: new Date('2025-01-01'),
    successRate: 95,
    thumbnail: '/mock-thumbnail-1.png'
  },
  {
    id: '2',
    name: 'Test Automation 2',
    description: 'Second test automation',
    status: 'paused',
    lastRun: new Date('2025-01-02'),
    successRate: 87,
    thumbnail: '/mock-thumbnail-2.png'
  }
];

const mockMetrics = {
  totalAutomations: 25,
  activeAutomations: 18,
  successRate: 92.5,
  totalExecutions: 1250,
  averageExecutionTime: 45.2,
  errorRate: 7.5
};

describe('Dashboard Component Test Suite', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(
      <ThemeProvider defaultTheme="light">
        {component}
      </ThemeProvider>
    );
  };

  describe('ModernDashboard Component', () => {
    it('renders with all main sections', () => {
      renderWithTheme(
        <ModernDashboard 
          automations={mockAutomations}
          metrics={mockMetrics}
        />
      );

      expect(screen.getByTestId('modern-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('metrics-section')).toBeInTheDocument();
      expect(screen.getByTestId('automations-section')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions-section')).toBeInTheDocument();
    });

    it('handles loading state correctly', () => {
      renderWithTheme(
        <ModernDashboard 
          automations={[]}
          metrics={null}
          loading={true}
        />
      );

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('handles empty state correctly', () => {
      renderWithTheme(
        <ModernDashboard 
          automations={[]}
          metrics={mockMetrics}
        />
      );

      expect(screen.getByTestId('empty-automations')).toBeInTheDocument();
      expect(screen.getByText(/no automations found/i)).toBeInTheDocument();
    });

    it('supports search functionality', async () => {
      renderWithTheme(
        <ModernDashboard 
          automations={mockAutomations}
          metrics={mockMetrics}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search automations/i);
      await userEvent.type(searchInput, 'Test Automation 1');

      await waitFor(() => {
        expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Automation 2')).not.toBeInTheDocument();
      });
    });

    it('supports filtering by status', async () => {
      renderWithTheme(
        <ModernDashboard 
          automations={mockAutomations}
          metrics={mockMetrics}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter/i });
      await userEvent.click(filterButton);

      const activeFilter = screen.getByRole('checkbox', { name: /active/i });
      await userEvent.click(activeFilter);

      await waitFor(() => {
        expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Automation 2')).not.toBeInTheDocument();
      });
    });

    it('meets accessibility standards', async () => {
      const { container } = renderWithTheme(
        <ModernDashboard 
          automations={mockAutomations}
          metrics={mockMetrics}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AutomationGrid Component', () => {
    it('renders automation cards correctly', () => {
      renderWithTheme(
        <AutomationGrid automations={mockAutomations} />
      );

      expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
      expect(screen.getByText('Test Automation 2')).toBeInTheDocument();
      expect(screen.getByText('First test automation')).toBeInTheDocument();
    });

    it('handles card interactions', async () => {
      const onAutomationClick = jest.fn();
      renderWithTheme(
        <AutomationGrid 
          automations={mockAutomations}
          onAutomationClick={onAutomationClick}
        />
      );

      const firstCard = screen.getByTestId('automation-card-1');
      await userEvent.click(firstCard);

      expect(onAutomationClick).toHaveBeenCalledWith(mockAutomations[0]);
    });

    it('supports different view modes', () => {
      const { rerender } = renderWithTheme(
        <AutomationGrid automations={mockAutomations} viewMode="grid" />
      );

      expect(screen.getByTestId('automation-grid')).toHaveClass('grid-view');

      rerender(
        <ThemeProvider defaultTheme="light">
          <AutomationGrid automations={mockAutomations} viewMode="list" />
        </ThemeProvider>
      );

      expect(screen.getByTestId('automation-grid')).toHaveClass('list-view');
    });

    it('handles responsive layout', () => {
      // Mock different viewport sizes
      const viewports = [375, 768, 1920];

      viewports.forEach(width => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });

        const { rerender } = renderWithTheme(
          <AutomationGrid automations={mockAutomations} />
        );

        const grid = screen.getByTestId('automation-grid');
        expect(grid).toHaveAttribute('data-responsive', 'true');
      });
    });

    it('meets accessibility standards', async () => {
      const { container } = renderWithTheme(
        <AutomationGrid automations={mockAutomations} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('MetricsDashboard Component', () => {
    it('displays all metrics correctly', () => {
      renderWithTheme(<MetricsDashboard metrics={mockMetrics} />);

      expect(screen.getByText('25')).toBeInTheDocument(); // totalAutomations
      expect(screen.getByText('18')).toBeInTheDocument(); // activeAutomations
      expect(screen.getByText('92.5%')).toBeInTheDocument(); // successRate
      expect(screen.getByText('1,250')).toBeInTheDocument(); // totalExecutions
    });

    it('handles loading state', () => {
      renderWithTheme(<MetricsDashboard metrics={null} loading={true} />);
      
      expect(screen.getByTestId('metrics-loading')).toBeInTheDocument();
      expect(screen.getAllByTestId('metric-skeleton')).toHaveLength(6);
    });

    it('handles error state', () => {
      renderWithTheme(
        <MetricsDashboard 
          metrics={null} 
          error="Failed to load metrics" 
        />
      );
      
      expect(screen.getByText(/failed to load metrics/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('supports metric drill-down', async () => {
      const onMetricClick = jest.fn();
      renderWithTheme(
        <MetricsDashboard 
          metrics={mockMetrics}
          onMetricClick={onMetricClick}
        />
      );

      const successRateMetric = screen.getByTestId('metric-success-rate');
      await userEvent.click(successRateMetric);

      expect(onMetricClick).toHaveBeenCalledWith('successRate', 92.5);
    });

    it('meets accessibility standards', async () => {
      const { container } = renderWithTheme(
        <MetricsDashboard metrics={mockMetrics} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('QuickActions Component', () => {
    it('renders all quick action buttons', () => {
      renderWithTheme(<QuickActions />);

      expect(screen.getByRole('button', { name: /create automation/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import automation/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view templates/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });

    it('handles quick action clicks', async () => {
      const onCreateAutomation = jest.fn();
      const onImportAutomation = jest.fn();

      renderWithTheme(
        <QuickActions 
          onCreateAutomation={onCreateAutomation}
          onImportAutomation={onImportAutomation}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /create automation/i }));
      expect(onCreateAutomation).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole('button', { name: /import automation/i }));
      expect(onImportAutomation).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation', async () => {
      renderWithTheme(<QuickActions />);

      const firstButton = screen.getByRole('button', { name: /create automation/i });
      firstButton.focus();

      expect(firstButton).toHaveFocus();

      await userEvent.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /import automation/i })).toHaveFocus();
    });

    it('meets accessibility standards', async () => {
      const { container } = renderWithTheme(<QuickActions />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('KeyboardShortcuts Component', () => {
    it('handles keyboard shortcuts correctly', async () => {
      const onCreateAutomation = jest.fn();
      const onSearch = jest.fn();

      renderWithTheme(
        <KeyboardShortcuts 
          onCreateAutomation={onCreateAutomation}
          onSearch={onSearch}
        />
      );

      // Test Ctrl+N for new automation
      await userEvent.keyboard('{Control>}n{/Control}');
      expect(onCreateAutomation).toHaveBeenCalledTimes(1);

      // Test Ctrl+K for search
      await userEvent.keyboard('{Control>}k{/Control}');
      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('displays shortcut help when requested', async () => {
      renderWithTheme(<KeyboardShortcuts />);

      await userEvent.keyboard('{Control>}?{/Control}');

      expect(screen.getByTestId('shortcuts-help')).toBeInTheDocument();
      expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
    });

    it('handles shortcut conflicts gracefully', async () => {
      const onCreateAutomation = jest.fn();
      
      renderWithTheme(
        <KeyboardShortcuts 
          onCreateAutomation={onCreateAutomation}
          disabled={true}
        />
      );

      await userEvent.keyboard('{Control>}n{/Control}');
      expect(onCreateAutomation).not.toHaveBeenCalled();
    });
  });

  describe('Performance Testing', () => {
    it('renders dashboard components within performance thresholds', async () => {
      const start = performance.now();
      
      renderWithTheme(
        <ModernDashboard 
          automations={mockAutomations}
          metrics={mockMetrics}
        />
      );
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // 100ms threshold
    });

    it('handles large datasets efficiently', async () => {
      const largeAutomationSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `automation-${i}`,
        name: `Automation ${i}`,
        description: `Description ${i}`,
        status: i % 2 === 0 ? 'active' : 'paused',
        lastRun: new Date(),
        successRate: Math.random() * 100,
        thumbnail: `/thumbnail-${i}.png`
      }));

      const start = performance.now();
      
      renderWithTheme(
        <AutomationGrid automations={largeAutomationSet} />
      );
      
      const end = performance.now();
      expect(end - start).toBeLessThan(500); // 500ms threshold for large dataset
    });

    it('maintains smooth scrolling with virtual scrolling', async () => {
      const largeAutomationSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `automation-${i}`,
        name: `Automation ${i}`,
        description: `Description ${i}`,
        status: 'active',
        lastRun: new Date(),
        successRate: 95,
        thumbnail: `/thumbnail-${i}.png`
      }));

      renderWithTheme(
        <AutomationGrid 
          automations={largeAutomationSet}
          virtualScrolling={true}
        />
      );

      const grid = screen.getByTestId('automation-grid');
      
      // Simulate scrolling
      fireEvent.scroll(grid, { target: { scrollY: 1000 } });
      
      // Should maintain performance during scrolling
      await waitFor(() => {
        expect(grid.scrollTop).toBeGreaterThan(0);
      }, { timeout: 100 });
    });
  });

  describe('Integration Testing', () => {
    it('integrates all dashboard components correctly', () => {
      renderWithTheme(
        <ModernDashboard 
          automations={mockAutomations}
          metrics={mockMetrics}
        />
      );

      // Verify all components are present and working together
      expect(screen.getByTestId('modern-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('metrics-section')).toBeInTheDocument();
      expect(screen.getByTestId('automations-section')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions-section')).toBeInTheDocument();
    });

    it('handles real-time updates correctly', async () => {
      const { rerender } = renderWithTheme(
        <ModernDashboard 
          automations={mockAutomations}
          metrics={mockMetrics}
        />
      );

      const updatedMetrics = {
        ...mockMetrics,
        totalExecutions: 1300,
        successRate: 94.2
      };

      rerender(
        <ThemeProvider defaultTheme="light">
          <ModernDashboard 
            automations={mockAutomations}
            metrics={updatedMetrics}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('1,300')).toBeInTheDocument();
        expect(screen.getByText('94.2%')).toBeInTheDocument();
      });
    });
  });
});