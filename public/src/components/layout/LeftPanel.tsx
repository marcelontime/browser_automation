import React from 'react';
import styled from 'styled-components';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const PanelContainer = styled.aside`
  width: 400px;
  min-width: 400px;
  background: white;
  border-right: 1px solid var(--neutral-200);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (max-width: 768px) {
    position: fixed;
    left: -400px;
    top: 64px;
    height: calc(100vh - 64px);
    z-index: var(--z-modal);
    transition: left var(--transition-normal);
    
    &.open {
      left: 0;
    }
  }
`;

const PanelSection = styled.section`
  padding: var(--space-6);
  border-bottom: 1px solid var(--neutral-100);
  
  &:last-child {
    border-bottom: none;
    flex: 1;
    overflow-y: auto;
  }
`;

const SectionTitle = styled.h3`
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--neutral-900);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const CreateAutomationCard = styled(Card)`
  padding: var(--space-6);
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-500) 100%);
  color: white;
  border: none;
  margin-bottom: var(--space-4);
  text-align: center;
`;

const CreateTitle = styled.h4`
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
`;

const CreateSubtitle = styled.p`
  font-size: var(--text-sm);
  opacity: 0.9;
  margin-bottom: var(--space-4);
`;

const WorkflowSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
`;

const WorkflowStep = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  opacity: 0.8;
`;

const StepNumber = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
`;

const AutomationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 400px;
  overflow-y: auto;
`;

const AutomationItem = styled(Card)`
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid var(--neutral-200);
  
  &:hover {
    border-color: var(--primary-300);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
`;

const AutomationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
`;

const AutomationTitle = styled.h4`
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--neutral-900);
  margin: 0;
  flex: 1;
  margin-right: var(--space-2);
`;

const AutomationMeta = styled.div`
  font-size: var(--text-xs);
  color: var(--neutral-500);
  margin-bottom: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const VariableCount = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--primary-600);
`;

const AutomationActions = styled.div`
  display: flex;
  gap: var(--space-1);
`;

const EmptyState = styled.div`
  text-align: center;
  color: var(--neutral-500);
  font-size: var(--text-sm);
  padding: var(--space-8) 0;
  
  .icon {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-2);
    opacity: 0.5;
  }
`;

const StatusIndicator = styled.div<{ status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => 
    props.status === 'ready' ? 'var(--success-500)' :
    props.status === 'recording' ? 'var(--warning-500)' :
    props.status === 'running' ? 'var(--primary-500)' :
    'var(--error-500)'
  };
  flex-shrink: 0;
`;

const RecordingIndicator = styled.div<{ isRecording: boolean }>`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: ${props => props.isRecording ? 'var(--error-50)' : 'var(--neutral-50)'};
  border: 1px solid ${props => props.isRecording ? 'var(--error-200)' : 'var(--neutral-200)'};
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
`;

const RecordingDot = styled.div<{ isRecording: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.isRecording ? 'var(--error-500)' : 'var(--neutral-400)'};
  animation: ${props => props.isRecording ? 'pulse 1s infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const RecordingText = styled.div<{ isRecording: boolean }>`
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: ${props => props.isRecording ? 'var(--error-700)' : 'var(--neutral-600)'};
`;

interface Automation {
  id: string;
  name: string;
  lastRun?: Date;
  status: 'ready' | 'recording' | 'running' | 'error';
  description?: string;
  variableCount?: number;
  stepCount?: number;
}

interface LeftPanelProps {
  automations: Automation[];
  isRecording: boolean;
  onCreateAutomation: () => void;
  onRunAutomation: (automationId: string) => void;
  onEditAutomation: (automationId: string) => void;
  onDeleteAutomation: (automationId: string) => void;
  onExtractVariables: (automationId: string) => void;
  onOpenVariableEditor: (automation: Automation) => void;
  isOpen?: boolean;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  automations = [],
  isRecording,
  onCreateAutomation,
  onRunAutomation,
  onEditAutomation,
  onDeleteAutomation,
  onExtractVariables,
  onOpenVariableEditor,
  isOpen = false
}) => {
  const formatLastRun = (date?: Date) => {
    if (!date) return 'Never run';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <PanelContainer className={isOpen ? 'open' : ''}>
      <PanelSection>
        <CreateAutomationCard>
          <CreateTitle>
            🤖 Create Automation
          </CreateTitle>
          <CreateSubtitle>
            Record your actions and reuse them with variables
          </CreateSubtitle>
          
          <WorkflowSteps>
            <WorkflowStep>
              <StepNumber>1</StepNumber>
              <span>Give it a name</span>
            </WorkflowStep>
            <WorkflowStep>
              <StepNumber>2</StepNumber>
              <span>Start recording</span>
            </WorkflowStep>
            <WorkflowStep>
              <StepNumber>3</StepNumber>
              <span>Perform actions</span>
            </WorkflowStep>
            <WorkflowStep>
              <StepNumber>4</StepNumber>
              <span>Extract variables</span>
            </WorkflowStep>
            <WorkflowStep>
              <StepNumber>5</StepNumber>
              <span>Reuse with new data</span>
            </WorkflowStep>
          </WorkflowSteps>
          
          <Button 
            variant="secondary" 
            size="lg" 
            onClick={onCreateAutomation}
            style={{ 
              width: '100%', 
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white'
            }}
          >
            ✨ Start New Automation
          </Button>
        </CreateAutomationCard>

        {isRecording && (
          <RecordingIndicator isRecording={isRecording}>
            <RecordingDot isRecording={isRecording} />
            <RecordingText isRecording={isRecording}>
              Recording in progress...
            </RecordingText>
          </RecordingIndicator>
        )}
      </PanelSection>
      
      <PanelSection>
        <SectionTitle>
          📚 My Automations
          {automations.length > 0 && (
            <Badge variant="secondary" size="sm">
              {automations.length}
            </Badge>
          )}
        </SectionTitle>
        <AutomationsList>
          {automations.length === 0 ? (
            <EmptyState>
              <div className="icon">🎯</div>
              <div>No automations yet.</div>
              <div>Create your first one above!</div>
            </EmptyState>
          ) : (
            automations.map(automation => (
              <AutomationItem key={automation.id}>
                <AutomationHeader>
                  <AutomationTitle>{automation.name}</AutomationTitle>
                  <StatusIndicator status={automation.status} />
                </AutomationHeader>
                <AutomationMeta>
                  <div>{formatLastRun(automation.lastRun)}</div>
                  {automation.stepCount && (
                    <div>{automation.stepCount} steps recorded</div>
                  )}
                  {automation.variableCount !== undefined && (
                    <VariableCount>
                      <span>🔧</span>
                      <span>{automation.variableCount} variables</span>
                    </VariableCount>
                  )}
                  {automation.description && (
                    <div style={{ color: 'var(--neutral-600)', marginTop: 'var(--space-1)' }}>
                      {automation.description}
                    </div>
                  )}
                </AutomationMeta>
                <AutomationActions>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => onRunAutomation(automation.id)}
                    disabled={automation.status === 'running' || automation.status === 'recording'}
                    title="Run automation"
                  >
                    {automation.status === 'running' ? '⏸️' : '▶️'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => onExtractVariables(automation.id)}
                    title="Extract variables"
                  >
                    🔧
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onOpenVariableEditor(automation)}
                    title="Edit variables"
                  >
                    ✏️
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onDeleteAutomation(automation.id)}
                    title="Delete automation"
                  >
                    🗑️
                  </Button>
                </AutomationActions>
              </AutomationItem>
            ))
          )}
        </AutomationsList>
      </PanelSection>
    </PanelContainer>
  );
};

export default LeftPanel; 