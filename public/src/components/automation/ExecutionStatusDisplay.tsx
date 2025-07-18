import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const StatusContainer = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 80px;
  right: 20px;
  width: 350px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
  z-index: 1000;
  transform: translateX(${props => props.isVisible ? '0' : '100%'});
  transition: transform 0.3s ease-in-out;
  max-height: 80vh;
  overflow-y: auto;
`;

const StatusHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const StatusBody = styled.div`
  padding: 20px;
`;

const AutomationInfo = styled.div`
  margin-bottom: 20px;
`;

const AutomationName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const AutomationMeta = styled.div`
  font-size: 12px;
  color: #6b7280;
  display: flex;
  gap: 16px;
`;

const ProgressSection = styled.div`
  margin-bottom: 20px;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ProgressLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const ProgressPercentage = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ progress: number; status: string }>`
  height: 100%;
  background: ${props => {
    switch (props.status) {
      case 'running': return '#3b82f6';
      case 'paused': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  }};
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
  ${props => props.status === 'running' ? `animation: ${pulse} 2s infinite;` : ''}
`;

const StepInfo = styled.div`
  margin-bottom: 16px;
`;

const CurrentStep = styled.div`
  font-size: 13px;
  color: #374151;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StepSpinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const StatusBadge = styled.span<{ status: string }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: uppercase;
  background: ${props => {
    switch (props.status) {
      case 'running': return '#dbeafe';
      case 'paused': return '#fef3c7';
      case 'completed': return '#d1fae5';
      case 'failed': return '#fee2e2';
      case 'cancelled': return '#f3f4f6';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'running': return '#1e40af';
      case 'paused': return '#92400e';
      case 'completed': return '#065f46';
      case 'failed': return '#dc2626';
      case 'cancelled': return '#374151';
      default: return '#374151';
    }
  }};
`;

const ControlButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const ControlButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          border: 1px solid #3b82f6;
          &:hover { background: #2563eb; border-color: #2563eb; }
          &:disabled { background: #9ca3af; border-color: #9ca3af; cursor: not-allowed; }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          border: 1px solid #ef4444;
          &:hover { background: #dc2626; border-color: #dc2626; }
          &:disabled { background: #9ca3af; border-color: #9ca3af; cursor: not-allowed; }
        `;
      default:
        return `
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          &:hover { background: #f9fafb; border-color: #9ca3af; }
          &:disabled { background: #f9fafb; color: #9ca3af; cursor: not-allowed; }
        `;
    }
  }}
`;

const ExecutionTime = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
`;

const ErrorSection = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
`;

const ErrorTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 4px;
`;

const ErrorMessage = styled.div`
  font-size: 12px;
  color: #7f1d1d;
`;

const LogSection = styled.div`
  margin-top: 16px;
`;

const LogTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
  display: flex;
  justify-content: between;
  align-items: center;
`;

const LogContainer = styled.div`
  max-height: 150px;
  overflow-y: auto;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;
`;

const LogEntry = styled.div<{ level: string }>`
  font-size: 11px;
  margin-bottom: 4px;
  color: ${props => {
    switch (props.level) {
      case 'error': return '#dc2626';
      case 'warning': return '#d97706';
      case 'info': return '#374151';
      default: return '#6b7280';
    }
  }};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LogTime = styled.span`
  color: #9ca3af;
  margin-right: 8px;
`;

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

interface ExecutionLog {
  timestamp: string;
  level: string;
  message: string;
  stepIndex?: number;
}

interface ExecutionStatusDisplayProps {
  isVisible: boolean;
  executionStatus: ExecutionStatus | null;
  logs: ExecutionLog[];
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRetry?: () => void;
}

const ExecutionStatusDisplay: React.FC<ExecutionStatusDisplayProps> = ({
  isVisible,
  executionStatus,
  logs,
  onClose,
  onPause,
  onResume,
  onStop,
  onRetry
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for duration calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : currentTime;
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '▶️';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🛑';
      default: return '⏳';
    }
  };

  const canPause = executionStatus?.status === 'running';
  const canResume = executionStatus?.status === 'paused';
  const canStop = ['running', 'paused'].includes(executionStatus?.status || '');
  const canRetry = ['failed', 'cancelled'].includes(executionStatus?.status || '');

  if (!executionStatus) {
    return null;
  }

  return (
    <StatusContainer isVisible={isVisible}>
      <StatusHeader>
        <StatusTitle>
          {getStatusIcon(executionStatus.status)}
          Execution Status
        </StatusTitle>
        <CloseButton onClick={onClose}>×</CloseButton>
      </StatusHeader>

      <StatusBody>
        <AutomationInfo>
          <AutomationName>{executionStatus.metadata.automationName}</AutomationName>
          <AutomationMeta>
            <span>ID: {executionStatus.executionId.slice(0, 8)}...</span>
            <span>Variables: {executionStatus.metadata.hasVariables ? 'Yes' : 'No'}</span>
            <StatusBadge status={executionStatus.status}>
              {executionStatus.status}
            </StatusBadge>
          </AutomationMeta>
        </AutomationInfo>

        <ProgressSection>
          <ProgressHeader>
            <ProgressLabel>Progress</ProgressLabel>
            <ProgressPercentage>{executionStatus.progress}%</ProgressPercentage>
          </ProgressHeader>
          <ProgressBar>
            <ProgressFill 
              progress={executionStatus.progress} 
              status={executionStatus.status}
            />
          </ProgressBar>
        </ProgressSection>

        <StepInfo>
          <CurrentStep>
            {executionStatus.status === 'running' && <StepSpinner />}
            Step {executionStatus.currentStep} of {executionStatus.totalSteps}
            {executionStatus.status === 'running' && ' (executing...)'}
          </CurrentStep>
        </StepInfo>

        <ExecutionTime>
          <span>Duration: {formatDuration(executionStatus.startTime, executionStatus.endTime)}</span>
          <span>Success: {executionStatus.successfulSteps}/{executionStatus.totalSteps}</span>
        </ExecutionTime>

        {executionStatus.errorCount > 0 && (
          <ErrorSection>
            <ErrorTitle>Errors Encountered</ErrorTitle>
            <ErrorMessage>{executionStatus.errorCount} error(s) during execution</ErrorMessage>
          </ErrorSection>
        )}

        <ControlButtons>
          {canPause && (
            <ControlButton onClick={onPause}>
              ⏸️ Pause
            </ControlButton>
          )}
          
          {canResume && (
            <ControlButton variant="primary" onClick={onResume}>
              ▶️ Resume
            </ControlButton>
          )}
          
          {canStop && (
            <ControlButton variant="danger" onClick={onStop}>
              🛑 Stop
            </ControlButton>
          )}
          
          {canRetry && onRetry && (
            <ControlButton variant="primary" onClick={onRetry}>
              🔄 Retry
            </ControlButton>
          )}
        </ControlButtons>

        {logs.length > 0 && (
          <LogSection>
            <LogTitle>
              Execution Log ({logs.length})
            </LogTitle>
            <LogContainer>
              {logs.slice(-20).map((log, index) => (
                <LogEntry key={index} level={log.level}>
                  <LogTime>{formatTime(log.timestamp)}</LogTime>
                  {log.stepIndex && `[Step ${log.stepIndex}] `}
                  {log.message}
                </LogEntry>
              ))}
            </LogContainer>
          </LogSection>
        )}
      </StatusBody>
    </StatusContainer>
  );
};

export default ExecutionStatusDisplay;