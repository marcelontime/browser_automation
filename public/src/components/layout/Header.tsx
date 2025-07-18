import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  height: 64px;
  background: white;
  border-bottom: 1px solid var(--neutral-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  box-shadow: var(--shadow-sm);
  z-index: var(--z-header);
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const LogoIcon = styled.div`
  font-size: var(--text-2xl);
`;

const BrandText = styled.h1`
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
  margin: 0;
`;

const StatusSection = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
`;

const ConnectionStatus = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--neutral-700);
`;

const StatusDot = styled.div<{ connected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.connected ? 'var(--success-500)' : 'var(--error-500)'};
  animation: ${props => props.connected ? 'none' : 'pulse 2s infinite'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const SystemInfo = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--neutral-500);
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

interface HeaderProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  isRecording: boolean;
  isManualMode: boolean;
  onToggleRecording: () => void;
  onToggleManualMode: () => void;
  onClearSession?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  connectionStatus, 
  isRecording, 
  isManualMode, 
  onToggleRecording, 
  onToggleManualMode,
  onClearSession
}) => {
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'disconnected': return '🔴';
    }
  };

  const getCurrentSessionId = () => {
    return localStorage.getItem('browser_automation_session_id');
  };

  const formatSessionId = (sessionId: string | null) => {
    if (!sessionId) return 'No session';
    return sessionId.length > 12 ? `${sessionId.substring(0, 12)}...` : sessionId;
  };

  return (
    <HeaderContainer>
      <Logo>
        <LogoIcon>🤖</LogoIcon>
        <BrandText>AutoFlow</BrandText>
      </Logo>
      
      <StatusSection>
        <ConnectionStatus>
          <StatusDot connected={connectionStatus === 'connected'} />
          <span className="status-text">{connectionStatus}</span>
        </ConnectionStatus>
        
        <SystemInfo>
          <InfoItem>
            <span>🎯</span>
            <span>Stagehand v2.0 + Timeout Protection</span>
          </InfoItem>
          <InfoItem>
            <span>⚡</span>
            <span>Production Ready</span>
          </InfoItem>
        </SystemInfo>
      </StatusSection>

      <div className="header-right">
        <button 
          className={`button ${isRecording ? 'button-danger' : 'button-primary'}`}
          onClick={onToggleRecording}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? '⏹️ Stop' : '🔴 Record'}
        </button>
        
        <button 
          className={`button ${isManualMode ? 'button-primary' : 'button-secondary'}`}
          onClick={onToggleManualMode}
          title={isManualMode ? 'Switch to automatic mode' : 'Switch to manual mode'}
        >
          {isManualMode ? '🤖 Auto' : '👤 Manual'}
        </button>

        <div className="session-info">
          <span className="session-id">📝 {formatSessionId(getCurrentSessionId())}</span>
          {onClearSession && (
            <button 
              className="button button-ghost button-sm"
              onClick={onClearSession}
              title="Start new session"
            >
              🔄 New Session
            </button>
          )}
        </div>
      </div>
    </HeaderContainer>
  );
};

export default Header; 