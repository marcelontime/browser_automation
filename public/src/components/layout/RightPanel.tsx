import React from 'react';
import styled from 'styled-components';
import Button from '../ui/Button';
import { Badge } from '../ui/Badge';

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

const AssistantHeader = styled.div`
  padding: var(--space-6);
  border-bottom: 1px solid var(--neutral-200);
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-500) 100%);
  color: white;
`;

const AssistantTitle = styled.h3`
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const AssistantSubtitle = styled.p`
  font-size: var(--text-sm);
  opacity: 0.9;
  margin: 0;
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

const ExamplesSection = styled.div`
  padding: var(--space-4);
  border-top: 1px solid var(--neutral-100);
  background: var(--neutral-50);
`;

const ExampleButton = styled.button`
  width: 100%;
  padding: var(--space-3);
  background: white;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--neutral-600);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--space-2);
  text-align: left;
  
  &:hover {
    border-color: var(--primary-300);
    background: var(--primary-50);
    color: var(--primary-700);
  }
  
  &:last-child {
    margin-bottom: 0;
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
}

const RightPanel: React.FC<RightPanelProps> = ({
  messages,
  isRecording,
  onSendMessage,
  onToggleRecording,
  isOpen = false,
  automationCount = 0,
  hasVariables = false
}) => {
  const [currentMessage, setCurrentMessage] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

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

  const handleExampleClick = (example: string) => {
    setCurrentMessage(example);
    inputRef.current?.focus();
  };

  // Dynamic examples based on context
  const getContextualExamples = () => {
    if (isRecording) {
      return [
        "Click on the login button",
        "Type user@example.com in the email field",
        "Select Brazil from the country dropdown",
        "Fill in the password field",
        "Navigate to checkout page"
      ];
    } else if (hasVariables) {
      return [
        "${LOGIN_EMAIL} john@example.com ${LOGIN_PASSWORD} myPass123",
        "${CPF} 123.456.789-00 ${PHONE} (11) 98765-4321",
        "${SEARCH_TERM} laptop ${MAX_PRICE} 5000",
        "${URL} https://example.com/login",
        "${USERNAME} johndoe ${EMAIL} john@email.com"
      ];
    } else if (automationCount > 0) {
      return [
        "Run my login automation",
        "Extract variables from the last recording",
        "Show me all automations",
        "Delete the test automation",
        "Edit automation steps"
      ];
    } else {
      return [
        "Navigate to google.com",
        "Create a new automation",
        "Start recording my actions",
        "Take a screenshot",
        "Help me automate a login"
      ];
    }
  };

  const examples = getContextualExamples();

  return (
    <PanelContainer className={isOpen ? 'open' : ''}>
      <AssistantHeader>
        <AssistantTitle>
          🤖 AI Assistant
        </AssistantTitle>
        <AssistantSubtitle>
          Teach me through natural commands!
        </AssistantSubtitle>
      </AssistantHeader>

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
              ref={inputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your instruction..."
              rows={1}
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

      <ExamplesSection>
        <div style={{ 
          fontSize: 'var(--text-xs)', 
          fontWeight: 'var(--font-medium)', 
          color: 'var(--neutral-600)',
          marginBottom: 'var(--space-2)'
        }}>
          💡 Try these examples:
        </div>
        {examples.map((example, index) => (
          <ExampleButton
            key={index}
            onClick={() => handleExampleClick(example)}
          >
            {example}
          </ExampleButton>
        ))}
      </ExamplesSection>
    </PanelContainer>
  );
};

export default RightPanel; 