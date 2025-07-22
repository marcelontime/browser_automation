import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { ThemeProvider, useTheme } from '../ui/theme-provider';
import { ThemeToggle } from '../ui/theme-toggle';
import { EnhancedButton } from '../ui/enhanced-button';
import { Badge } from '../ui/Badge';
import { ResponsiveContainer } from '../ui/responsive-grid';
import { AutomationGrid } from './AutomationGrid';
import { MetricsDashboard } from './MetricsDashboard';
import { QuickActions } from './QuickActions';
import { KeyboardShortcuts, useKeyboardShortcuts } from './KeyboardShortcuts';
import { useBreakpoint, getLayoutConfig } from '../../utils/responsive';
import { 
  BotIcon, 
  SearchIcon,
  SettingsIcon,
  BellIcon
} from '../ui/icons';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: var(--neutral-50);
  display: flex;
  flex-direction: column;
`;

const Header = styled.header<{ $headerHeight: string }>`
  background: var(--neutral-0);
  border-bottom: 1px solid var(--neutral-200);
  height: ${props => props.$headerHeight};
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  padding: 0 var(--space-4);
  
  @media (min-width: 768px) {
    padding: 0 var(--space-6);
  }
  
  @media (min-width: 1024px) {
    padding: 0 var(--space-8);
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
  
  @media (min-width: 768px) {
    gap: var(--space-4);
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  
  @media (min-width: 768px) {
    gap: var(--space-3);
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
  flex-shrink: 0;
  
  @media (min-width: 768px) {
    gap: var(--space-3);
    font-size: var(--text-xl);
  }
`;

const LogoIcon = styled.div`
  width: 28px;
  height: 28px;
  background: var(--gradient-primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  
  @media (min-width: 768px) {
    width: 32px;
    height: 32px;
  }
`;

const LogoText = styled.span`
  display: none;
  
  @media (min-width: 640px) {
    display: inline;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  min-width: 200px;
  
  @media (max-width: 640px) {
    max-width: 250px;
    min-width: 150px;
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

const MainContent = styled.main<{ $contentPadding: string }>`
  flex: 1;
  padding: ${props => props.$contentPadding};
  
  @media (max-width: 640px) {
    padding: var(--space-4);
  }
  
  @media (min-width: 641px) and (max-width: 1024px) {
    padding: var(--space-6);
  }
`;

const DashboardHeader = styled.div`
  margin-bottom: var(--space-6);
  
  @media (min-width: 768px) {
    margin-bottom: var(--space-8);
  }
`;

const DashboardTitle = styled.h1`
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
  margin-bottom: var(--space-2);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: var(--leading-tight);
  
  @media (min-width: 768px) {
    font-size: var(--text-3xl);
  }
  
  @media (min-width: 1024px) {
    font-size: var(--text-4xl);
  }
`;

const DashboardSubtitle = styled.p`
  font-size: var(--text-base);
  color: var(--neutral-600);
  margin-bottom: var(--space-4);
  line-height: var(--leading-relaxed);
  
  @media (min-width: 768px) {
    font-size: var(--text-lg);
    margin-bottom: var(--space-6);
  }
`;

const NotificationBadge = styled.div`
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: var(--error-500);
    border-radius: 50%;
    border: 2px solid var(--neutral-0);
  }
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
}

interface ModernDashboardProps {
  automations: Automation[];
  onCreateAutomation: () => void;
  onRunAutomation: (id: string) => void;
  onEditAutomation: (id: string) => void;
  onDeleteAutomation: (id: string) => void;
  onToggleRecording: () => void;
  isRecording: boolean;
}

const DashboardContent: React.FC<ModernDashboardProps> = ({
  automations,
  onCreateAutomation,
  onRunAutomation,
  onEditAutomation,
  onDeleteAutomation,
  onToggleRecording,
  isRecording
}) => {
  const [hasNotifications] = useState(true); // Mock notification state
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { setTheme, theme } = useTheme();
  const { currentBreakpoint, isMobile, isTablet } = useBreakpoint();
  const layoutConfig = getLayoutConfig(currentBreakpoint);

  const stats = {
    total: automations.length,
    running: automations.filter(a => a.status === 'running').length,
    ready: automations.filter(a => a.status === 'ready').length,
    errors: automations.filter(a => a.status === 'error').length
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateAutomation,
    onToggleRecording,
    onSearch: () => searchInputRef.current?.focus(),
    onShowShortcuts: () => setShowShortcuts(true),
    onToggleTheme: () => {
      const themes = ['light', 'dark', 'system'] as const;
      const currentIndex = themes.indexOf(theme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      setTheme(nextTheme);
    }
  });

  // Focus search input on mount
  useEffect(() => {
    const handleSlashKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleSlashKey);
    return () => document.removeEventListener('keydown', handleSlashKey);
  }, []);

  return (
    <ThemeProvider>
      <DashboardContainer>
        <Header $headerHeight={layoutConfig.headerHeight}>
          <HeaderLeft>
            <Logo>
              <LogoIcon>
                <BotIcon size={isMobile ? 16 : 20} />
              </LogoIcon>
              <LogoText>AutoFlow AI</LogoText>
            </Logo>
            
            <SearchContainer>
              <SearchIconContainer>
                <SearchIcon size={14} />
              </SearchIconContainer>
              <SearchInput
                ref={searchInputRef}
                type="text"
                placeholder={isMobile ? "Search..." : "Search automations... (Press / to focus)"}
              />
            </SearchContainer>
          </HeaderLeft>
          
          <HeaderRight>
            {hasNotifications ? (
              <NotificationBadge>
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  icon={<BellIcon size={16} />}
                />
              </NotificationBadge>
            ) : (
              <EnhancedButton
                variant="ghost"
                size="sm"
                icon={<BellIcon size={16} />}
              />
            )}
            
            {!isMobile && (
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcuts(true)}
                title="Keyboard shortcuts (?)"
              >
                ?
              </EnhancedButton>
            )}
            
            <EnhancedButton
              variant="ghost"
              size="sm"
              icon={<SettingsIcon size={16} />}
            />
            <ThemeToggle />
          </HeaderRight>
        </Header>

        <MainContent $contentPadding={layoutConfig.contentPadding}>
          <ResponsiveContainer>
            <DashboardHeader>
              <DashboardTitle>Automation Dashboard</DashboardTitle>
              <DashboardSubtitle>
                {isMobile 
                  ? "Manage your browser automations with AI"
                  : "Create, manage, and monitor your browser automations with AI-powered intelligence"
                }
              </DashboardSubtitle>
              
              <MetricsDashboard automations={automations} />
              
              <QuickActions
                onCreateAutomation={onCreateAutomation}
                onToggleRecording={onToggleRecording}
                isRecording={isRecording}
                runningCount={stats.running}
                errorCount={stats.errors}
                totalCount={stats.total}
              />
            </DashboardHeader>

            <AutomationGrid
              automations={automations}
              onRunAutomation={onRunAutomation}
              onEditAutomation={onEditAutomation}
              onDeleteAutomation={onDeleteAutomation}
              onCreateAutomation={onCreateAutomation}
            />
          </ResponsiveContainer>
        </MainContent>
        
        <KeyboardShortcuts
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      </DashboardContainer>
    );
};

export const ModernDashboard: React.FC<ModernDashboardProps> = (props) => {
  return (
    <ThemeProvider>
      <DashboardContent {...props} />
    </ThemeProvider>
  );
};