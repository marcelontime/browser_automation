import React from 'react';
import styled from 'styled-components';
import { EnhancedButton } from '../ui/enhanced-button';
import { EnhancedCard, CardContent } from '../ui/enhanced-card';
import { 
  BotIcon, 
  PlayIcon, 
  StopIcon, 
  ZapIcon, 
  CpuIcon, 
  SettingsIcon,
  FileIcon,
  DatabaseIcon
} from '../ui/icons';

const QuickActionsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  
  @media (min-width: 768px) {
    gap: var(--space-6);
    margin-bottom: var(--space-8);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ActionsCard = styled(EnhancedCard)`
  background: var(--gradient-primary);
  color: var(--neutral-0);
  border: none;
  
  * {
    color: inherit;
  }
`;

const PrimaryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  
  @media (min-width: 768px) {
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
`;

const SecondaryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  
  @media (min-width: 768px) {
    gap: var(--space-3);
    padding-top: var(--space-4);
  }
`;

const ActionButton = styled(EnhancedButton)`
  background: rgba(255, 255, 255, 0.1);
  color: var(--neutral-0);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(0);
  }
`;

const SecondaryActionButton = styled(EnhancedButton)`
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: var(--neutral-0);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const StatusCard = styled(EnhancedCard)`
  min-width: 250px;
  
  @media (min-width: 768px) {
    min-width: 280px;
  }
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
`;

const StatusTitle = styled.h3`
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--neutral-900);
  margin: 0;
`;

const StatusList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const StatusItem = styled.div<{ status: 'success' | 'warning' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: ${props => {
    switch (props.status) {
      case 'success': return 'var(--success-50)';
      case 'warning': return 'var(--warning-50)';
      case 'error': return 'var(--error-50)';
      default: return 'var(--neutral-50)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'success': return 'var(--success-200)';
      case 'warning': return 'var(--warning-200)';
      case 'error': return 'var(--error-200)';
      default: return 'var(--neutral-200)';
    }
  }};
`;

const StatusIcon = styled.div<{ status: 'success' | 'warning' | 'error' | 'info' }>`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.status) {
      case 'success': return 'var(--success-100)';
      case 'warning': return 'var(--warning-100)';
      case 'error': return 'var(--error-100)';
      default: return 'var(--neutral-100)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'success': return 'var(--success-600)';
      case 'warning': return 'var(--warning-600)';
      case 'error': return 'var(--error-600)';
      default: return 'var(--neutral-600)';
    }
  }};
`;

const StatusContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const StatusText = styled.div`
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--neutral-900);
  margin-bottom: var(--space-1);
`;

const StatusSubtext = styled.div`
  font-size: var(--text-xs);
  color: var(--neutral-600);
`;

interface QuickActionsProps {
  onCreateAutomation: () => void;
  onToggleRecording: () => void;
  isRecording: boolean;
  runningCount: number;
  errorCount: number;
  totalCount: number;
  onStopAllAutomations?: () => void;
  onOpenSettings?: () => void;
  onImportAutomation?: () => void;
  onExportAutomations?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onCreateAutomation,
  onToggleRecording,
  isRecording,
  runningCount,
  errorCount,
  totalCount,
  onStopAllAutomations,
  onOpenSettings,
  onImportAutomation,
  onExportAutomations
}) => {
  const getSystemStatus = () => {
    if (errorCount > 0) return 'error';
    if (runningCount > 0) return 'warning';
    if (totalCount > 0) return 'success';
    return 'info';
  };

  const getSystemMessage = () => {
    if (errorCount > 0) return `${errorCount} automation${errorCount > 1 ? 's' : ''} need attention`;
    if (runningCount > 0) return `${runningCount} automation${runningCount > 1 ? 's' : ''} currently running`;
    if (totalCount > 0) return 'All automations are ready';
    return 'No automations created yet';
  };

  return (
    <QuickActionsContainer>
      <ActionsCard>
        <CardContent>
          <PrimaryActions>
            <ActionButton
              variant="secondary"
              size="lg"
              onClick={onCreateAutomation}
              icon={<BotIcon size={20} />}
            >
              Create Automation
            </ActionButton>
            
            <ActionButton
              variant={isRecording ? "error" : "secondary"}
              size="lg"
              onClick={onToggleRecording}
              icon={isRecording ? <StopIcon size={20} /> : <PlayIcon size={20} />}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </ActionButton>
            
            {runningCount > 0 && onStopAllAutomations && (
              <ActionButton
                variant="warning"
                size="lg"
                onClick={onStopAllAutomations}
                icon={<StopIcon size={20} />}
              >
                Stop All ({runningCount})
              </ActionButton>
            )}
          </PrimaryActions>
          
          <SecondaryActions>
            {onImportAutomation && (
              <SecondaryActionButton
                variant="ghost"
                size="sm"
                onClick={onImportAutomation}
                icon={<FileIcon size={16} />}
              >
                Import
              </SecondaryActionButton>
            )}
            
            {onExportAutomations && totalCount > 0 && (
              <SecondaryActionButton
                variant="ghost"
                size="sm"
                onClick={onExportAutomations}
                icon={<DatabaseIcon size={16} />}
              >
                Export All
              </SecondaryActionButton>
            )}
            
            {onOpenSettings && (
              <SecondaryActionButton
                variant="ghost"
                size="sm"
                onClick={onOpenSettings}
                icon={<SettingsIcon size={16} />}
              >
                Settings
              </SecondaryActionButton>
            )}
          </SecondaryActions>
        </CardContent>
      </ActionsCard>
      
      <StatusCard>
        <CardContent>
          <StatusHeader>
            <StatusTitle>System Status</StatusTitle>
          </StatusHeader>
          
          <StatusList>
            <StatusItem status={getSystemStatus()}>
              <StatusIcon status={getSystemStatus()}>
                {getSystemStatus() === 'error' ? <CpuIcon size={16} /> :
                 getSystemStatus() === 'warning' ? <ZapIcon size={16} /> :
                 getSystemStatus() === 'success' ? <BotIcon size={16} /> :
                 <BotIcon size={16} />}
              </StatusIcon>
              <StatusContent>
                <StatusText>{getSystemMessage()}</StatusText>
                <StatusSubtext>
                  {totalCount} total automation{totalCount !== 1 ? 's' : ''}
                </StatusSubtext>
              </StatusContent>
            </StatusItem>
            
            {isRecording && (
              <StatusItem status="warning">
                <StatusIcon status="warning">
                  <PlayIcon size={16} />
                </StatusIcon>
                <StatusContent>
                  <StatusText>Recording in progress</StatusText>
                  <StatusSubtext>Capturing your actions...</StatusSubtext>
                </StatusContent>
              </StatusItem>
            )}
            
            <StatusItem status="info">
              <StatusIcon status="info">
                <ZapIcon size={16} />
              </StatusIcon>
              <StatusContent>
                <StatusText>AI Engine Ready</StatusText>
                <StatusSubtext>Intelligent automation assistance active</StatusSubtext>
              </StatusContent>
            </StatusItem>
          </StatusList>
        </CardContent>
      </StatusCard>
    </QuickActionsContainer>
  );
};