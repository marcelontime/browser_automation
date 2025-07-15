import React from 'react';
import styled from 'styled-components';
import Header from './Header';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--neutral-50);
  overflow: hidden;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
  width: 100%;
  overflow: hidden;
`;

const MobileOverlay = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-modal-backdrop);
  opacity: ${props => props.isVisible ? 1 : 0};
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  transition: all var(--transition-normal);
  
  @media (min-width: 1024px) {
    display: none;
  }
`;

const MobileMenuButton = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: var(--z-fixed);
  background: var(--primary-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2);
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--primary-700);
    transform: translateY(-1px);
  }
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileChatButton = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: var(--z-fixed);
  background: var(--primary-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2);
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--primary-700);
    transform: translateY(-1px);
  }
  
  @media (min-width: 1024px) {
    display: none;
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

interface Message {
  id: string;
  text: string;
  type: 'user' | 'bot' | 'system' | 'error';
  timestamp: Date;
}

interface LayoutProps {
  // Header props
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  
  // Left Panel props
  automations: Automation[];
  isRecording: boolean;
  onCreateAutomation: () => void;
  onRunAutomation: (automationId: string) => void;
  onEditAutomation: (automationId: string) => void;
  onDeleteAutomation: (automationId: string) => void;
  onExtractVariables: (automationId: string) => void;
  onOpenVariableEditor: (automation: Automation) => void;
  
  // Center Panel props
  url: string;
  screenshotSrc: string;
  isLoading: boolean;
  isManualMode: boolean;
  isPaused: boolean;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onRefresh: () => void;
  onToggleManualMode: () => void;
  onTogglePause: () => void;
  onSync: () => void;
  onPageInfo: () => void;
  onScreenshotClick?: (x: number, y: number) => void;
  
  // Right Panel props
  messages: Message[];
  onSendMessage: (message: string) => void;
  onToggleRecording: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  // Header props
  connectionStatus = 'connected',
  
  // Left Panel props
  automations,
  isRecording,
  onCreateAutomation,
  onRunAutomation,
  onEditAutomation,
  onDeleteAutomation,
  onExtractVariables,
  onOpenVariableEditor,
  
  // Center Panel props
  url,
  screenshotSrc,
  isLoading,
  isManualMode,
  isPaused,
  onNavigate,
  onGoBack,
  onRefresh,
  onToggleManualMode,
  onTogglePause,
  onSync,
  onPageInfo,
  onScreenshotClick,
  
  // Right Panel props
  messages,
  onSendMessage,
  onToggleRecording
}) => {
  const [isLeftPanelOpen, setIsLeftPanelOpen] = React.useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = React.useState(false);

  const toggleLeftPanel = () => {
    setIsLeftPanelOpen(!isLeftPanelOpen);
    if (isRightPanelOpen) setIsRightPanelOpen(false);
  };

  const toggleRightPanel = () => {
    setIsRightPanelOpen(!isRightPanelOpen);
    if (isLeftPanelOpen) setIsLeftPanelOpen(false);
  };

  const closePanels = () => {
    setIsLeftPanelOpen(false);
    setIsRightPanelOpen(false);
  };

      return (
      <LayoutContainer>
        <Header 
          connectionStatus={connectionStatus}
        />
        
        <MainContent>
          <LeftPanel 
            automations={automations}
            isRecording={isRecording}
            onCreateAutomation={onCreateAutomation}
            onRunAutomation={onRunAutomation}
            onEditAutomation={onEditAutomation}
            onDeleteAutomation={onDeleteAutomation}
            onExtractVariables={onExtractVariables}
            onOpenVariableEditor={onOpenVariableEditor}
            isOpen={isLeftPanelOpen}
          />
          
          <CenterPanel 
            url={url}
            screenshotSrc={screenshotSrc}
            isLoading={isLoading}
            isManualMode={isManualMode}
            isPaused={isPaused}
            onNavigate={onNavigate}
            onGoBack={onGoBack}
            onRefresh={onRefresh}
            onToggleManualMode={onToggleManualMode}
            onTogglePause={onTogglePause}
            onSync={onSync}
            onPageInfo={onPageInfo}
            onScreenshotClick={onScreenshotClick}
          />
          
          <RightPanel 
            messages={messages}
            isRecording={isRecording}
            onSendMessage={onSendMessage}
            onToggleRecording={onToggleRecording}
            isOpen={isRightPanelOpen}
            automationCount={automations.length}
            hasVariables={automations.some(a => a.variableCount && a.variableCount > 0)}
          />
        </MainContent>
        
        {/* Mobile Controls */}
        <MobileMenuButton onClick={toggleLeftPanel}>
          📋
        </MobileMenuButton>
        
        <MobileChatButton onClick={toggleRightPanel}>
          💬
        </MobileChatButton>
        
        <MobileOverlay 
          isVisible={isLeftPanelOpen || isRightPanelOpen}
          onClick={closePanels}
        />
      </LayoutContainer>
    );
};

export default Layout; 