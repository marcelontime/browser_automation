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

export interface LayoutProps {
  // Header props
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  isRecording: boolean;
  isManualMode: boolean;
  onToggleRecording: () => void;
  onToggleManualMode: () => void;
  onClearSession?: () => void;
  
  // Left panel props
  automations: Automation[];
  executionStatuses?: any[]; // ExecutionStatus array
  onCreateAutomation: () => void;
  onRunAutomation: (automationId: string, variables?: Record<string, string>) => void;
  onEditAutomation: (automationId: string) => void;
  onDeleteAutomation: (automationId: string) => void;
  onExtractVariables: (automationId: string) => void;
  onOpenVariableEditor: (automation: Automation) => void;
  onPauseExecution?: (executionId: string) => void;
  onResumeExecution?: (executionId: string) => void;
  onStopExecution?: (executionId: string) => void;

  // Center panel props
  url: string;
  screenshotSrc: string;
  isLoading: boolean;
  isPaused: boolean;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onRefresh: () => void;
  onTogglePause: () => void;
  onSync: () => void;
  onPageInfo: () => void;
  onScreenshotClick: (x: number, y: number) => void;

  // Right panel props
  messages: Message[];
  onSendMessage: (message: string) => void;
  websocket: WebSocket | null;
  selectedAutomationId?: string;
}

const Layout: React.FC<LayoutProps> = (props) => {
  return (
    <LayoutContainer>
      <Header 
        connectionStatus={props.connectionStatus}
        isRecording={props.isRecording}
        isManualMode={props.isManualMode}
        onToggleRecording={props.onToggleRecording}
        onToggleManualMode={props.onToggleManualMode}
        onClearSession={props.onClearSession}
      />
      
      <MainContent>
        <LeftPanel
          automations={props.automations}
          isRecording={props.isRecording}
          executionStatuses={props.executionStatuses}
          onCreateAutomation={props.onCreateAutomation}
          onRunAutomation={props.onRunAutomation}
          onEditAutomation={props.onEditAutomation}
          onDeleteAutomation={props.onDeleteAutomation}
          onExtractVariables={props.onExtractVariables}
          onOpenVariableEditor={props.onOpenVariableEditor}
          onPauseExecution={props.onPauseExecution}
          onResumeExecution={props.onResumeExecution}
          onStopExecution={props.onStopExecution}
        />
        
        <CenterPanel
          url={props.url}
          screenshotSrc={props.screenshotSrc}
          isLoading={props.isLoading}
          isManualMode={props.isManualMode}
          isPaused={props.isPaused}
          onNavigate={props.onNavigate}
          onGoBack={props.onGoBack}
          onRefresh={props.onRefresh}
          onToggleManualMode={props.onToggleManualMode}
          onTogglePause={props.onTogglePause}
          onSync={props.onSync}
          onPageInfo={props.onPageInfo}
          onScreenshotClick={props.onScreenshotClick}
        />
        
        <RightPanel
          messages={props.messages}
          isRecording={props.isRecording}
          onSendMessage={props.onSendMessage}
          onToggleRecording={props.onToggleRecording}
          websocket={props.websocket}
          selectedAutomationId={props.selectedAutomationId}
        />
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout; 