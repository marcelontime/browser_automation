import React from 'react';
import styled from 'styled-components';
import { Button } from '../ui/Button';

const PanelContainer = styled.aside`
  width: 450px;
  min-width: 450px;
  background: white;
  border-left: 1px solid var(--neutral-200);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (max-width: 1024px) {
    position: fixed;
    right: -450px;
    top: 64px;
    height: calc(100vh - 64px);
    z-index: var(--z-modal);
    transition: right var(--transition-normal);
    
    &.open {
      right: 0;
    }
  }
`;

const RecordingSection = styled.div`
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--neutral-100);
  background: var(--neutral-50);
`;

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: var(--space-4);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const Message = styled.div<{ type: 'user' | 'bot' | 'system' | 'error' }>`
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  line-height: 1.4;
  animation: fadeIn 0.3s ease-in;
  max-width: 85%;
  word-wrap: break-word;
  
  ${props => {
    switch (props.type) {
      case 'user':
        return `
          background: var(--primary-600);
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: var(--radius-sm);
        `;
      case 'bot':
        return `
          background: var(--neutral-100);
          color: var(--neutral-800);
          align-self: flex-start;
          border-bottom-left-radius: var(--radius-sm);
        `;
      case 'system':
        return `
          background: var(--success-50);
          color: var(--success-700);
          align-self: center;
          text-align: center;
          font-weight: var(--font-medium);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          padding: var(--space-2) var(--space-3);
        `;
      case 'error':
        return `
          background: var(--error-50);
          color: var(--error-700);
          align-self: center;
          text-align: center;
          font-weight: var(--font-medium);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          padding: var(--space-2) var(--space-3);
        `;
      default:
        return '';
    }
  }}
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ChatInputContainer = styled.div`
  padding: var(--space-4);
  border-top: 1px solid var(--neutral-200);
  background: white;
`;

const ChatInputWrapper = styled.div`
  display: flex;
  gap: var(--space-2);
  align-items: flex-end;
`;

const ChatInput = styled.textarea`
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  resize: none;
  min-height: 44px;
  max-height: 120px;
  font-size: var(--text-sm);
  font-family: var(--font-family-sans);
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  &::placeholder {
    color: var(--neutral-400);
  }
`;

const RecordingIndicator = styled.div<{ isRecording: boolean }>`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: ${props => props.isRecording ? 'var(--error-600)' : 'var(--neutral-600)'};
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

type MessageType = 'user' | 'bot' | 'system' | 'error';

interface Message {
  id: string;
  text: string;
  type: MessageType;
  timestamp: Date;
}

interface RightPanelProps {
  messages: Message[];
  isRecording: boolean;
  onSendMessage: (message: string) => void;
  onToggleRecording: () => void;
  isOpen?: boolean;
  automationCount?: number;
  hasVariables?: boolean;
  websocket?: WebSocket | null;
  selectedAutomationId?: string;
}

const RightPanel: React.FC<RightPanelProps> = ({
  messages,
  isRecording,
  onSendMessage,
  onToggleRecording,
  isOpen = false,
  automationCount = 0,
  hasVariables = false,
  websocket = null,
  selectedAutomationId = undefined
}) => {
  const [currentMessage, setCurrentMessage] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      onSendMessage(currentMessage.trim());
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <PanelContainer className={isOpen ? 'open' : ''}>
      <RecordingSection>
        <RecordingIndicator isRecording={isRecording}>
          <RecordingDot isRecording={isRecording} />
          {isRecording ? 'Recording actions...' : 'Ready to record'}
        </RecordingIndicator>
        <Button
          variant={isRecording ? "error" : "primary"}
          size="sm"
          onClick={onToggleRecording}
          style={{ marginTop: 'var(--space-3)', width: '100%' }}
        >
          {isRecording ? '⏹️ Stop Recording' : '🔴 Start Recording'}
        </Button>
      </RecordingSection>

      <ChatContainer>
        <ChatMessages>
          {messages.map((message) => (
            <Message key={message.id} type={message.type}>
              {message.text}
            </Message>
          ))}
          <div ref={messagesEndRef} />
        </ChatMessages>

        <ChatInputContainer>
          <ChatInputWrapper>
            <ChatInput
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={2}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendMessage}
              disabled={!currentMessage.trim()}
            >
              Send
            </Button>
          </ChatInputWrapper>
        </ChatInputContainer>
      </ChatContainer>
    </PanelContainer>
  );
};

export default RightPanel; 