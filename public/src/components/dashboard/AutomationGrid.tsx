import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { EnhancedCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/enhanced-card';
import { EnhancedButton } from '../ui/enhanced-button';
import { Badge } from '../ui/badge';
import { ResponsiveGrid } from '../ui/responsive-grid';
import { useBreakpoint, getLayoutConfig } from '../../utils/responsive';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  EditIcon, 
  DeleteIcon, 
  ZapIcon,
  CpuIcon,
  BotIcon,
  SearchIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
  GridIcon,
  ListIcon
} from '../ui/icons';

const GridContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
`;

const GridHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--neutral-0);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  
  @media (min-width: 768px) {
    gap: var(--space-4);
    padding: var(--space-6);
  }
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const GridHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
  
  @media (min-width: 768px) {
    gap: var(--space-4);
  }
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }
`;

const GridHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  
  @media (min-width: 768px) {
    gap: var(--space-3);
  }
  
  @media (max-width: 640px) {
    justify-content: space-between;
    flex-wrap: wrap;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  min-width: 200px;
  flex: 1;
  max-width: 400px;
  
  @media (max-width: 640px) {
    min-width: 100%;
    max-width: 100%;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-10);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  background: var(--neutral-0);
  transition: var(--transition-fast);
  
  @media (min-width: 768px) {
    padding: var(--space-3) var(--space-4) var(--space-3) var(--space-12);
  }
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: var(--neutral-400);
  }
`;

const SearchIconContainer = styled.div`
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--neutral-400);
  
  @media (min-width: 768px) {
    left: var(--space-4);
  }
`;

const FilterButton = styled(EnhancedButton)<{ active: boolean }>`
  ${props => props.active && `
    background: var(--primary-100);
    color: var(--primary-700);
    border-color: var(--primary-300);
  `}
`;

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  overflow: hidden;
`;

const ViewButton = styled.button<{ active: boolean }>`
  padding: var(--space-2) var(--space-3);
  border: none;
  background: ${props => props.active ? 'var(--primary-100)' : 'transparent'};
  color: ${props => props.active ? 'var(--primary-700)' : 'var(--neutral-600)'};
  cursor: pointer;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: ${props => props.active ? 'var(--primary-200)' : 'var(--neutral-100)'};
  }
`;

const SortButton = styled(EnhancedButton)<{ active: boolean; direction?: 'asc' | 'desc' }>`
  ${props => props.active && `
    background: var(--primary-100);
    color: var(--primary-700);
    border-color: var(--primary-300);
  `}
`;

const GridContent = styled.div<{ view: 'grid' | 'list' }>`
  ${props => props.view === 'grid' ? `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-4);
    
    @media (min-width: 768px) {
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: var(--space-6);
    }
    
    @media (min-width: 1024px) {
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    }
    
    @media (max-width: 640px) {
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }
  ` : `
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    
    @media (min-width: 768px) {
      gap: var(--space-4);
    }
  `}
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const AutomationCard = styled(EnhancedCard)<{ 
  status: string; 
  view: 'grid' | 'list';
}>`
  position: relative;
  overflow: hidden;
  transition: var(--transition-normal);
  border: 1px solid ${props => {
    switch (props.status) {
      case 'running': return 'var(--primary-300)';
      case 'error': return 'var(--error-300)';
      case 'recording': return 'var(--warning-300)';
      default: return 'var(--neutral-200)';
    }
  }};
  
  ${props => props.view === 'list' && `
    display: flex;
    align-items: center;
    padding: var(--space-4);
    
    .card-content {
      display: flex;
      align-items: center;
      width: 100%;
      gap: var(--space-4);
    }
  `}
  
  &:hover {
    transform: ${props => props.view === 'grid' ? 'translateY(-4px)' : 'translateX(4px)'};
    box-shadow: var(--shadow-xl);
    border-color: var(--primary-400);
  }
  
  ${props => props.status === 'running' && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--gradient-primary);
      animation: ${pulse} 2s infinite;
    }
  `}
`;

const AutomationIcon = styled.div<{ status: string }>`
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.status) {
      case 'running': return 'var(--primary-100)';
      case 'error': return 'var(--error-100)';
      case 'recording': return 'var(--warning-100)';
      default: return 'var(--neutral-100)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'running': return 'var(--primary-600)';
      case 'error': return 'var(--error-600)';
      case 'recording': return 'var(--warning-600)';
      default: return 'var(--neutral-600)';
    }
  }};
  flex-shrink: 0;
`;

const AutomationInfo = styled.div<{ view: 'grid' | 'list' }>`
  ${props => props.view === 'list' && `
    flex: 1;
    min-width: 0;
  `}
`;

const AutomationMeta = styled.div<{ view: 'grid' | 'list' }>`
  display: flex;
  ${props => props.view === 'grid' ? `
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: var(--space-4) 0;
  ` : `
    gap: var(--space-4);
    align-items: center;
  `}
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--neutral-600);
  white-space: nowrap;
`;

const AutomationActions = styled.div<{ view: 'grid' | 'list' }>`
  display: flex;
  gap: var(--space-2);
  ${props => props.view === 'list' && `
    flex-shrink: 0;
  `}
`;

const StatusIndicator = styled.div<{ status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'running': return 'var(--success-500)';
      case 'error': return 'var(--error-500)';
      case 'recording': return 'var(--warning-500)';
      default: return 'var(--neutral-400)';
    }
  }};
  ${props => props.status === 'running' && `animation: ${pulse} 2s infinite;`}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-16) var(--space-8);
  color: var(--neutral-500);
`;

const EmptyStateIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-4);
  color: var(--neutral-400);
`;

const EmptyStateTitle = styled.h3`
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--neutral-700);
  margin-bottom: var(--space-2);
`;

const EmptyStateDescription = styled.p`
  font-size: var(--text-base);
  color: var(--neutral-500);
  margin-bottom: var(--space-6);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

interface Automation {
  id: string;
  name: string;
  description?: string;
  status: 'ready' | 'running' | 'error' | 'recording';
  lastRun?: Date;
  stepCount?: number;
  variableCount?: number;
  successRate?: number;
  createdAt?: Date;
  tags?: string[];
}

interface AutomationGridProps {
  automations: Automation[];
  onRunAutomation: (id: string) => void;
  onEditAutomation: (id: string) => void;
  onDeleteAutomation: (id: string) => void;
  onCreateAutomation: () => void;
  onOpenVariableEditor?: (automation: Automation) => void;
}

type SortField = 'name' | 'lastRun' | 'status' | 'successRate' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'ready' | 'running' | 'error' | 'recording';
type ViewMode = 'grid' | 'list';

export const AutomationGrid: React.FC<AutomationGridProps> = ({
  automations,
  onRunAutomation,
  onEditAutomation,
  onDeleteAutomation,
  onCreateAutomation,
  onOpenVariableEditor
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('lastRun');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { currentBreakpoint, isMobile, isTablet } = useBreakpoint();
  const layoutConfig = getLayoutConfig(currentBreakpoint);

  // Force list view on mobile for better UX
  const effectiveViewMode = isMobile ? 'list' : viewMode;

  const filteredAndSortedAutomations = useMemo(() => {
    let filtered = automations.filter(automation => {
      const matchesSearch = automation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           automation.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || automation.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'lastRun':
          aValue = a.lastRun?.getTime() || 0;
          bValue = b.lastRun?.getTime() || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'successRate':
          aValue = a.successRate || 0;
          bValue = b.successRate || 0;
          break;
        case 'createdAt':
          aValue = a.createdAt?.getTime() || 0;
          bValue = b.createdAt?.getTime() || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [automations, searchQuery, filterStatus, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never run';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'running': return 'primary';
      case 'error': return 'error';
      case 'recording': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <ZapIcon size={20} />;
      case 'error': return <CpuIcon size={20} />;
      case 'recording': return <BotIcon size={20} />;
      default: return <BotIcon size={20} />;
    }
  };

  const statusCounts = useMemo(() => {
    return automations.reduce((acc, automation) => {
      acc[automation.status] = (acc[automation.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [automations]);

  return (
    <GridContainer>
      <GridHeader>
        <GridHeaderLeft>
          <SearchContainer>
            <SearchIconContainer>
              <SearchIcon size={16} />
            </SearchIconContainer>
            <SearchInput
              type="text"
              placeholder="Search automations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchContainer>
          
          <FilterButton
            variant="ghost"
            size="sm"
            active={filterStatus !== 'all'}
            onClick={() => setFilterStatus(filterStatus === 'all' ? 'ready' : 'all')}
            icon={<FilterIcon size={16} />}
          >
            {filterStatus === 'all' ? 'All' : filterStatus}
            {filterStatus !== 'all' && statusCounts[filterStatus] && ` (${statusCounts[filterStatus]})`}
          </FilterButton>
        </GridHeaderLeft>
        
        <GridHeaderRight>
          <SortButton
            variant="ghost"
            size="sm"
            active={sortField === 'name'}
            onClick={() => handleSort('name')}
            icon={sortField === 'name' && sortDirection === 'asc' ? <SortAscIcon size={16} /> : <SortDescIcon size={16} />}
          >
            Name
          </SortButton>
          
          {!isMobile && (
            <SortButton
              variant="ghost"
              size="sm"
              active={sortField === 'lastRun'}
              onClick={() => handleSort('lastRun')}
              icon={sortField === 'lastRun' && sortDirection === 'asc' ? <SortAscIcon size={16} /> : <SortDescIcon size={16} />}
            >
              Last Run
            </SortButton>
          )}
          
          {!isMobile && (
            <ViewToggle>
              <ViewButton
                active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <GridIcon size={16} />
              </ViewButton>
              <ViewButton
                active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                <ListIcon size={16} />
              </ViewButton>
            </ViewToggle>
          )}
        </GridHeaderRight>
      </GridHeader>

      {filteredAndSortedAutomations.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <BotIcon size={64} />
          </EmptyStateIcon>
          <EmptyStateTitle>
            {searchQuery || filterStatus !== 'all' ? 'No matching automations' : 'No automations yet'}
          </EmptyStateTitle>
          <EmptyStateDescription>
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first automation. Record your actions and let AI help you build powerful workflows.'
            }
          </EmptyStateDescription>
          {!searchQuery && filterStatus === 'all' && (
            <EnhancedButton
              variant="primary"
              size="lg"
              onClick={onCreateAutomation}
              icon={<BotIcon size={20} />}
            >
              Create Your First Automation
            </EnhancedButton>
          )}
        </EmptyState>
      ) : (
        <GridContent view={effectiveViewMode}>
          {filteredAndSortedAutomations.map((automation) => (
            <AutomationCard key={automation.id} status={automation.status} view={effectiveViewMode} hover>
              {effectiveViewMode === 'grid' ? (
                <>
                  <CardHeader actions={
                    <Badge 
                      variant={getStatusBadgeVariant(automation.status)}
                      size="sm"
                      icon={<StatusIndicator status={automation.status} />}
                    >
                      {automation.status}
                    </Badge>
                  }>
                    <CardTitle size="lg">{automation.name}</CardTitle>
                    {automation.description && (
                      <CardDescription>{automation.description}</CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <AutomationMeta view={effectiveViewMode}>
                      <MetaItem>
                        <span>🏃‍♂️</span>
                        <span>{formatDate(automation.lastRun)}</span>
                      </MetaItem>
                      
                      {automation.stepCount && (
                        <MetaItem>
                          <span>📋</span>
                          <span>{automation.stepCount} steps</span>
                        </MetaItem>
                      )}
                      
                      {automation.variableCount && (
                        <MetaItem>
                          <span>🔧</span>
                          <span>{automation.variableCount} variables</span>
                        </MetaItem>
                      )}
                      
                      {automation.successRate && (
                        <MetaItem>
                          <span>✅</span>
                          <span>{automation.successRate}% success</span>
                        </MetaItem>
                      )}
                    </AutomationMeta>
                  </CardContent>
                  
                  <CardFooter justify="between">
                    <AutomationActions view={effectiveViewMode}>
                      <EnhancedButton
                        variant="primary"
                        size="sm"
                        onClick={() => onRunAutomation(automation.id)}
                        disabled={automation.status === 'running'}
                        icon={automation.status === 'running' ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                      >
                        {automation.status === 'running' ? 'Running' : 'Run'}
                      </EnhancedButton>
                      
                      {automation.variableCount && automation.variableCount > 0 && onOpenVariableEditor && (
                        <EnhancedButton
                          variant="secondary"
                          size="sm"
                          onClick={() => onOpenVariableEditor(automation)}
                          icon={<EditIcon size={14} />}
                        >
                          Variables
                        </EnhancedButton>
                      )}
                      
                      <EnhancedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditAutomation(automation.id)}
                        icon={<EditIcon size={14} />}
                      />
                      
                      <EnhancedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteAutomation(automation.id)}
                        icon={<DeleteIcon size={14} />}
                      />
                    </AutomationActions>
                    
                    {automation.successRate && (
                      <Badge variant="outline" size="sm">
                        {automation.successRate}% success
                      </Badge>
                    )}
                  </CardFooter>
                </>
              ) : (
                <CardContent className="card-content">
                  <AutomationIcon status={automation.status}>
                    {getStatusIcon(automation.status)}
                  </AutomationIcon>
                  
                  <AutomationInfo view={effectiveViewMode}>
                    <CardTitle size="md">{automation.name}</CardTitle>
                    {automation.description && (
                      <CardDescription>{automation.description}</CardDescription>
                    )}
                  </AutomationInfo>
                  
                  <AutomationMeta view={effectiveViewMode}>
                    <MetaItem>
                      <span>🏃‍♂️</span>
                      <span>{formatDate(automation.lastRun)}</span>
                    </MetaItem>
                    
                    {automation.stepCount && (
                      <MetaItem>
                        <span>📋</span>
                        <span>{automation.stepCount} steps</span>
                      </MetaItem>
                    )}
                    
                    {automation.variableCount && (
                      <MetaItem>
                        <span>🔧</span>
                        <span>{automation.variableCount} variables</span>
                      </MetaItem>
                    )}
                  </AutomationMeta>
                  
                  <Badge 
                    variant={getStatusBadgeVariant(automation.status)}
                    size="sm"
                    icon={<StatusIndicator status={automation.status} />}
                  >
                    {automation.status}
                  </Badge>
                  
                  <AutomationActions view={effectiveViewMode}>
                    <EnhancedButton
                      variant="primary"
                      size="sm"
                      onClick={() => onRunAutomation(automation.id)}
                      disabled={automation.status === 'running'}
                      icon={automation.status === 'running' ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                    >
                      {automation.status === 'running' ? 'Running' : 'Run'}
                    </EnhancedButton>
                    
                    <EnhancedButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditAutomation(automation.id)}
                      icon={<EditIcon size={14} />}
                    />
                    
                    <EnhancedButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteAutomation(automation.id)}
                      icon={<DeleteIcon size={14} />}
                    />
                  </AutomationActions>
                </CardContent>
              )}
            </AutomationCard>
          ))}
        </GridContent>
      )}
    </GridContainer>
  );
};