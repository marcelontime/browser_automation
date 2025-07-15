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
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

const Header: React.FC<HeaderProps> = ({ 
  connectionStatus = 'connected'
}) => {
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const getEngineInfo = () => {
    return 'Stagehand v2.0 + Timeout Protection';
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
          {getStatusText()}
        </ConnectionStatus>
        
        <SystemInfo>
          <InfoItem>
            <span>🎯</span>
            <span>{getEngineInfo()}</span>
          </InfoItem>
          <InfoItem>
            <span>⚡</span>
            <span>Production Ready</span>
          </InfoItem>
        </SystemInfo>
      </StatusSection>
    </HeaderContainer>
  );
};

export default Header; 