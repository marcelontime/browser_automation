import React from 'react';
import styled, { keyframes } from 'styled-components';
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
    z-index: 10;
    transition: left 0.3s ease;
    
    &.mobile-open {
      left: 0;
    }
  }
`;

const PanelSection = styled.div`
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
  font-weight: 600;
  color: var(--neutral-900);
  margin: 0 0 var(--space-4) 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const AutomationCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
`;

const AutomationTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  line-height: 1.4;
`;

const AutomationMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-top: 8px;
`;

// Animation keyframes
const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Enhanced AutomationCard with execution status
const EnhancedAutomationCard = styled.div<{ status: string }>`
  background: white;
  border: 1px solid ${props => {
    switch (props.status) {
      case 'running': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'recording': return '#f59e0b';
      default: return '#e2e8f0';
    }
  }};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  &.running {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    animation: ${pulse} 2s infinite;
  }
`;

// Progress indicator for running automations
const ProgressIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #f3f4f6;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: ${pulse} 1.5s infinite;
  }
`;

// Status badge for automation state
const StatusBadge = styled.span<{ status: string }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  text-transform: uppercase;
  background: ${props => {
    switch (props.status) {
      case 'running': return '#dbeafe';
      case 'recording': return '#fef3c7';
      case 'error': return '#fee2e2';
      case 'ready': return '#d1fae5';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'running': return '#1e40af';
      case 'recording': return '#92400e';
      case 'error': return '#dc2626';
      case 'ready': return '#065f46';
      default: return '#374151';
    }
  }};
`;

// Execution info overlay
const ExecutionOverlay = styled.div`
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  font-size: 11px;
  color: #1e40af;
`;

const ExecutionStep = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StepSpinner = styled.div`
  width: 10px;
  height: 10px;
  border: 1px solid #e5e7eb;
  border-top: 1px solid #3b82f6;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

// Simplified ActionButton with CSS classes instead of complex template literals
const ActionButton = styled.button`
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  background: #3b82f6;
  
  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  &.secondary {
    background: #f59e0b;
  }
  &.secondary:hover {
    background: #d97706;
  }
  
  &.danger {
    background: #ef4444;
  }
  &.danger:hover {
    background: #dc2626;
  }
  
  &.ghost {
    background: #6b7280;
  }
  &.ghost:hover {
    background: #4b5563;
  }
  
  &.success {
    background: #10b981;
  }
  &.success:hover {
    background: #059669;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    opacity: 0.6;
  }
  &:disabled:hover {
    background: #9ca3af;
    transform: none;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: var(--neutral-500);
  font-size: var(--text-sm);
  padding: var(--space-8) 0;
  
  .icon {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-2);
  }
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

interface ExecutionStatus {
  executionId: string;
  automationId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  progress: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  successfulSteps: number;
  errorCount: number;
  metadata: {
    automationName: string;
    hasVariables: boolean;
  };
}

interface LeftPanelProps {
  automations: Automation[];
  isRecording: boolean;
  executionStatuses?: ExecutionStatus[]; // Real-time execution data
  onCreateAutomation: () => void;
  onRunAutomation: (automationId: string, variables?: Record<string, string>) => void;
  onEditAutomation: (automationId: string) => void;
  onDeleteAutomation: (automationId: string) => void;
  onExtractVariables: (automationId: string) => void;
  onOpenVariableEditor: (automation: Automation) => void;
  onPauseExecution?: (executionId: string) => void;
  onResumeExecution?: (executionId: string) => void;
  onStopExecution?: (executionId: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  automations,
  isRecording,
  executionStatuses = [],
  onCreateAutomation,
  onRunAutomation,
  onEditAutomation,
  onDeleteAutomation,
  onExtractVariables,
  onOpenVariableEditor,
  onPauseExecution,
  onResumeExecution,
  onStopExecution
}) => {
  const formatDate = (date?: Date) => {
    if (!date) return 'Never run';
    try {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Never run';
    }
  };

  return (
    <PanelContainer>
      <PanelSection>
        <SectionTitle>🤖 Create Automation</SectionTitle>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Record your actions and reuse them with variables
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: '#3b82f6', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>1</div>
            <span style={{ fontSize: '12px', color: '#4b5563' }}>Give it a name</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: '#3b82f6', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>2</div>
            <span style={{ fontSize: '12px', color: '#4b5563' }}>Start recording</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: '#3b82f6', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>3</div>
            <span style={{ fontSize: '12px', color: '#4b5563' }}>Perform actions</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: '#3b82f6', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>4</div>
            <span style={{ fontSize: '12px', color: '#4b5563' }}>Extract variables</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: '#3b82f6', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>5</div>
            <span style={{ fontSize: '12px', color: '#4b5563' }}>Reuse with new data</span>
          </div>
        </div>
        
        <ActionButton 
          onClick={onCreateAutomation}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          ✨ Start New Automation
        </ActionButton>
      </PanelSection>

      <PanelSection>
        <SectionTitle>
          📚 My Automations 
          <Badge variant="secondary">{automations.length}</Badge>
        </SectionTitle>
        
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {automations.length === 0 ? (
            <EmptyState>
              <div className="icon">🎯</div>
              <div>No automations yet.</div>
              <div>Create your first one above!</div>
            </EmptyState>
          ) : (
            automations.map((automation) => {
              // Find execution status for this automation
              const executionStatus = executionStatuses.find(
                status => status.automationId === automation.id
              );
              
              return (
                <EnhancedAutomationCard 
                  key={automation.id} 
                  status={automation.status}
                  className={automation.status === 'running' ? 'running' : ''}
                >
                  {/* Progress indicator for running automations */}
                  {executionStatus && executionStatus.status === 'running' && (
                    <ProgressIndicator>
                      <ProgressBar progress={executionStatus.progress} />
                    </ProgressIndicator>
                  )}
                  
                  <AutomationTitle>
                    {automation.name}
                    <StatusBadge status={automation.status}>
                      {automation.status}
                    </StatusBadge>
                  </AutomationTitle>
                  
                  <AutomationMeta>
                    <MetaRow>
                      <span>🏃‍♂️</span>
                      <span>{formatDate(automation.lastRun)}</span>
                    </MetaRow>
                    
                    {automation.stepCount !== undefined && (
                      <MetaRow>
                        <span>📋</span>
                        <span>{automation.stepCount} steps recorded</span>
                      </MetaRow>
                    )}
                    
                    {automation.variableCount !== undefined && (
                      <MetaRow>
                        <span>🔧</span>
                        <span>{automation.variableCount} variables</span>
                      </MetaRow>
                    )}
                    
                    {automation.description && (
                      <MetaRow>
                        <span>📝</span>
                        <span>{automation.description}</span>
                      </MetaRow>
                    )}
                  </AutomationMeta>

                  {/* Execution status overlay for running automations */}
                  {executionStatus && ['running', 'paused'].includes(executionStatus.status) && (
                    <ExecutionOverlay>
                      <ExecutionStep>
                        {executionStatus.status === 'running' && <StepSpinner />}
                        <span>
                          {executionStatus.status === 'paused' ? '⏸️ Paused' : '▶️ Running'} - 
                          Step {executionStatus.currentStep}/{executionStatus.totalSteps}
                        </span>
                      </ExecutionStep>
                      <ExecutionStep>
                        <span>Progress: {executionStatus.progress}%</span>
                        <span>•</span>
                        <span>Success: {executionStatus.successfulSteps}/{executionStatus.totalSteps}</span>
                      </ExecutionStep>
                    </ExecutionOverlay>
                  )}

                  <ActionButtons>
                    {/* Dynamic Run/Pause/Resume button based on execution status */}
                    {executionStatus && executionStatus.status === 'running' ? (
                      <ActionButton
                        className="secondary"
                        onClick={() => onPauseExecution?.(executionStatus.executionId)}
                        title="Pause execution"
                      >
                        ⏸️ Pause
                      </ActionButton>
                    ) : executionStatus && executionStatus.status === 'paused' ? (
                      <ActionButton
                        className="success"
                        onClick={() => onResumeExecution?.(executionStatus.executionId)}
                        title="Resume execution"
                      >
                        ▶️ Resume
                      </ActionButton>
                    ) : (
                      <ActionButton
                        onClick={() => onRunAutomation(automation.id)}
                        disabled={automation.status === 'running' || automation.status === 'recording'}
                        title="Run automation with current variables"
                      >
                        {automation.status === 'running' ? '⏸️' : '▶️'} Run
                      </ActionButton>
                    )}
                    
                    {/* Stop button for running/paused automations */}
                    {executionStatus && ['running', 'paused'].includes(executionStatus.status) && (
                      <ActionButton
                        className="danger"
                        onClick={() => onStopExecution?.(executionStatus.executionId)}
                        title="Stop execution"
                      >
                        🛑 Stop
                      </ActionButton>
                    )}
                    
                    {/* Variables button - only show when not running */}
                    {automation.variableCount && automation.variableCount > 0 && 
                     (!executionStatus || !['running', 'paused'].includes(executionStatus.status)) && (
                      <ActionButton
                        className="secondary"
                        onClick={() => onOpenVariableEditor(automation)}
                        title="Edit variables before running"
                      >
                        🔧 Variables
                      </ActionButton>
                    )}
                    
                    {/* Extract button - only show when not running */}
                    {(!executionStatus || !['running', 'paused'].includes(executionStatus.status)) && (
                      <ActionButton
                        className="ghost"
                        onClick={() => onExtractVariables(automation.id)}
                        title="Extract new variables"
                      >
                        ✏️ Extract
                      </ActionButton>
                    )}
                    
                    {/* Delete button - only show when not running */}
                    {(!executionStatus || !['running', 'paused'].includes(executionStatus.status)) && (
                      <ActionButton
                        className="danger"
                        onClick={() => onDeleteAutomation(automation.id)}
                        title="Delete automation"
                      >
                        🗑️
                      </ActionButton>
                    )}
                  </ActionButtons>
                </EnhancedAutomationCard>
              );
            })
          )}
        </div>
      </PanelSection>
    </PanelContainer>
  );
};

export default LeftPanel; 