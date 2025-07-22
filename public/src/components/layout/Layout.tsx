import React from 'react';
import styled from 'styled-components';
import Header from './Header';
import LeftPanel from './LeftPanel';
import EnhancedCenterPanel from './EnhancedCenterPanel';
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
  onEnhancedMouseEvent?: (event: any) => void;
  onEnhancedKeyboardEvent?: (event: any) => void;
  onTouchEvent?: (event: any) => void;

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
        
        <EnhancedCenterPanel
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
          onEnhancedMouseEvent={props.onEnhancedMouseEvent}
          onEnhancedKeyboardEvent={props.onEnhancedKeyboardEvent}
          onTouchEvent={props.onTouchEvent}
          websocket={props.websocket}
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