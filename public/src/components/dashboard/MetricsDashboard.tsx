import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EnhancedCard, CardContent } from '../ui/enhanced-card';
import { Badge } from '../ui/badge';
import { 
  BotIcon, 
  PlayIcon, 
  ZapIcon, 
  CpuIcon, 
  CheckIcon, 
  AlertTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon
} from '../ui/icons';

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-6);
    margin-bottom: var(--space-8);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const MetricCard = styled(EnhancedCard)<{ variant?: 'default' | 'success' | 'warning' | 'error' }>`
  position: relative;
  overflow: hidden;
  transition: var(--transition-normal);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  ${props => {
    switch (props.variant) {
      case 'success':
        return `
          border-color: var(--success-300);
          &:hover { border-color: var(--success-400); }
        `;
      case 'warning':
        return `
          border-color: var(--warning-300);
          &:hover { border-color: var(--warning-400); }
        `;
      case 'error':
        return `
          border-color: var(--error-300);
          &:hover { border-color: var(--error-400); }
        `;
      default:
        return `
          border-color: var(--neutral-200);
          &:hover { border-color: var(--primary-300); }
        `;
    }
  }}
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
`;

const MetricIcon = styled.div<{ variant?: 'default' | 'success' | 'warning' | 'error' }>`
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.variant) {
      case 'success': return 'var(--success-100)';
      case 'warning': return 'var(--warning-100)';
      case 'error': return 'var(--error-100)';
      default: return 'var(--primary-100)';
    }
  }};
  color: ${props => {
    switch (props.variant) {
      case 'success': return 'var(--success-600)';
      case 'warning': return 'var(--warning-600)';
      case 'error': return 'var(--error-600)';
      default: return 'var(--primary-600)';
    }
  }};
  
  @media (min-width: 768px) {
    width: 48px;
    height: 48px;
  }
`;

const MetricValue = styled.div`
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
  margin-bottom: var(--space-1);
  line-height: var(--leading-none);
  
  @media (min-width: 768px) {
    font-size: var(--text-3xl);
  }
`;

const MetricLabel = styled.div`
  font-size: var(--text-sm);
  color: var(--neutral-600);
  font-weight: var(--font-medium);
  margin-bottom: var(--space-3);
`;

const MetricChange = styled.div<{ trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: ${props => {
    switch (props.trend) {
      case 'up': return 'var(--success-600)';
      case 'down': return 'var(--error-600)';
      default: return 'var(--neutral-600)';
    }
  }};
`;

const MetricSubtext = styled.div`
  font-size: var(--text-xs);
  color: var(--neutral-500);
  margin-top: var(--space-2);
`;

const QuickStats = styled.div`
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--neutral-200);
`;

const QuickStat = styled.div`
  flex: 1;
  text-align: center;
`;

const QuickStatValue = styled.div`
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--neutral-900);
`;

const QuickStatLabel = styled.div`
  font-size: var(--text-xs);
  color: var(--neutral-500);
  margin-top: var(--space-1);
`;

interface Automation {
  id: string;
  name: string;
  status: 'ready' | 'running' | 'error' | 'recording';
  lastRun?: Date;
  successRate?: number;
  createdAt?: Date;
  executionCount?: number;
  avgExecutionTime?: number;
}

interface MetricsDashboardProps {
  automations: Automation[];
  executionStatuses?: any[];
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  automations,
  executionStatuses = []
}) => {
  const metrics = useMemo(() => {
    const total = automations.length;
    const running = automations.filter(a => a.status === 'running').length;
    const ready = automations.filter(a => a.status === 'ready').length;
    const errors = automations.filter(a => a.status === 'error').length;
    const recording = automations.filter(a => a.status === 'recording').length;
    
    // Calculate success rate
    const automationsWithRuns = automations.filter(a => a.lastRun);
    const avgSuccessRate = automationsWithRuns.length > 0 
      ? Math.round(automationsWithRuns.reduce((sum, a) => sum + (a.successRate || 0), 0) / automationsWithRuns.length)
      : 0;
    
    // Calculate total executions
    const totalExecutions = automations.reduce((sum, a) => sum + (a.executionCount || 0), 0);
    
    // Calculate average execution time
    const automationsWithTime = automations.filter(a => a.avgExecutionTime);
    const avgExecutionTime = automationsWithTime.length > 0
      ? Math.round(automationsWithTime.reduce((sum, a) => sum + (a.avgExecutionTime || 0), 0) / automationsWithTime.length)
      : 0;
    
    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentRuns = automations.filter(a => a.lastRun && a.lastRun > weekAgo).length;
    
    return {
      total,
      running,
      ready,
      errors,
      recording,
      avgSuccessRate,
      totalExecutions,
      avgExecutionTime,
      recentRuns
    };
  }, [automations]);

  const formatExecutionTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <MetricsGrid>
      {/* Total Automations */}
      <MetricCard>
        <CardContent>
          <MetricHeader>
            <MetricIcon>
              <BotIcon size={24} />
            </MetricIcon>
            <Badge variant="secondary" size="sm">Total</Badge>
          </MetricHeader>
          
          <MetricValue>{metrics.total}</MetricValue>
          <MetricLabel>Total Automations</MetricLabel>
          
          <QuickStats>
            <QuickStat>
              <QuickStatValue>{metrics.ready}</QuickStatValue>
              <QuickStatLabel>Ready</QuickStatLabel>
            </QuickStat>
            <QuickStat>
              <QuickStatValue>{metrics.recording}</QuickStatValue>
              <QuickStatLabel>Recording</QuickStatLabel>
            </QuickStat>
          </QuickStats>
          
          <MetricSubtext>
            {metrics.recentRuns} automations ran in the last 7 days
          </MetricSubtext>
        </CardContent>
      </MetricCard>

      {/* Currently Running */}
      <MetricCard variant={metrics.running > 0 ? 'success' : 'default'}>
        <CardContent>
          <MetricHeader>
            <MetricIcon variant={metrics.running > 0 ? 'success' : 'default'}>
              <PlayIcon size={24} />
            </MetricIcon>
            <Badge 
              variant={metrics.running > 0 ? 'success' : 'secondary'} 
              size="sm"
              pulse={metrics.running > 0}
            >
              {metrics.running > 0 ? 'Active' : 'Idle'}
            </Badge>
          </MetricHeader>
          
          <MetricValue>{metrics.running}</MetricValue>
          <MetricLabel>Currently Running</MetricLabel>
          
          {metrics.running > 0 && (
            <MetricChange trend="up">
              <ZapIcon size={12} />
              <span>Active executions in progress</span>
            </MetricChange>
          )}
          
          <MetricSubtext>
            {metrics.avgExecutionTime > 0 
              ? `Average runtime: ${formatExecutionTime(metrics.avgExecutionTime)}`
              : 'No execution data available'
            }
          </MetricSubtext>
        </CardContent>
      </MetricCard>

      {/* Success Rate */}
      <MetricCard variant={metrics.avgSuccessRate >= 90 ? 'success' : metrics.avgSuccessRate >= 70 ? 'warning' : 'error'}>
        <CardContent>
          <MetricHeader>
            <MetricIcon variant={metrics.avgSuccessRate >= 90 ? 'success' : metrics.avgSuccessRate >= 70 ? 'warning' : 'error'}>
              {metrics.avgSuccessRate >= 90 ? <CheckIcon size={24} /> : <AlertTriangleIcon size={24} />}
            </MetricIcon>
            <Badge 
              variant={metrics.avgSuccessRate >= 90 ? 'success' : metrics.avgSuccessRate >= 70 ? 'warning' : 'error'} 
              size="sm"
            >
              {metrics.avgSuccessRate >= 90 ? 'Excellent' : metrics.avgSuccessRate >= 70 ? 'Good' : 'Needs Attention'}
            </Badge>
          </MetricHeader>
          
          <MetricValue>{metrics.avgSuccessRate}%</MetricValue>
          <MetricLabel>Average Success Rate</MetricLabel>
          
          <MetricChange trend={metrics.avgSuccessRate >= 90 ? 'up' : metrics.avgSuccessRate >= 70 ? 'neutral' : 'down'}>
            {metrics.avgSuccessRate >= 90 ? <TrendingUpIcon size={12} /> : 
             metrics.avgSuccessRate >= 70 ? <ClockIcon size={12} /> : <TrendingDownIcon size={12} />}
            <span>
              {metrics.avgSuccessRate >= 90 ? 'Performing excellently' :
               metrics.avgSuccessRate >= 70 ? 'Stable performance' : 'May need optimization'}
            </span>
          </MetricChange>
          
          <MetricSubtext>
            Based on {automations.filter(a => a.lastRun).length} automations with execution history
          </MetricSubtext>
        </CardContent>
      </MetricCard>

      {/* Error Count */}
      <MetricCard variant={metrics.errors > 0 ? 'error' : 'success'}>
        <CardContent>
          <MetricHeader>
            <MetricIcon variant={metrics.errors > 0 ? 'error' : 'success'}>
              <CpuIcon size={24} />
            </MetricIcon>
            <Badge 
              variant={metrics.errors > 0 ? 'error' : 'success'} 
              size="sm"
            >
              {metrics.errors > 0 ? 'Issues' : 'Healthy'}
            </Badge>
          </MetricHeader>
          
          <MetricValue>{metrics.errors}</MetricValue>
          <MetricLabel>Automations with Errors</MetricLabel>
          
          {metrics.errors > 0 ? (
            <MetricChange trend="down">
              <AlertTriangleIcon size={12} />
              <span>Require immediate attention</span>
            </MetricChange>
          ) : (
            <MetricChange trend="up">
              <CheckIcon size={12} />
              <span>All automations healthy</span>
            </MetricChange>
          )}
          
          <QuickStats>
            <QuickStat>
              <QuickStatValue>{metrics.totalExecutions}</QuickStatValue>
              <QuickStatLabel>Total Runs</QuickStatLabel>
            </QuickStat>
            <QuickStat>
              <QuickStatValue>{Math.round((metrics.ready / Math.max(metrics.total, 1)) * 100)}%</QuickStatValue>
              <QuickStatLabel>Ready</QuickStatLabel>
            </QuickStat>
          </QuickStats>
        </CardContent>
      </MetricCard>
    </MetricsGrid>
  );
};