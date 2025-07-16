import React, { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';
import VariableEditorModal from './components/automation/VariableEditorModal';

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

type MessageType = 'user' | 'bot' | 'system' | 'error';

const App: React.FC = () => {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Browser state
  const [url, setUrl] = useState('');
  const [screenshotSrc, setScreenshotSrc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Automation state
  const [automations, setAutomations] = useState<Automation[]>([]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Variable Editor Modal state
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [automationVariables, setAutomationVariables] = useState<any[]>([]);

  // WebSocket connection
  useEffect(() => {
    const connect = async () => {
      setConnectionStatus('connecting');
      try {
        const res = await fetch('/get-token');
        const data = await res.json();
        const token = data.token;

        const socket = new WebSocket(`ws://localhost:7079?token=${token}`);

        socket.onopen = () => {
          setConnectionStatus('connected');
          setWs(socket);
          
          // Request automations from server
          socket.send(JSON.stringify({ type: 'get_automations' }));
          
          // Add welcome messages
          const welcomeMessages: Message[] = [
            {
              id: Date.now().toString(),
              text: '👋 Welcome to AutoFlow! I\'m your browser automation assistant.',
              type: 'bot',
              timestamp: new Date()
            },
            {
              id: (Date.now() + 1).toString(),
              text: 'I can help you create automations by recording your actions and replaying them with different data.',
              type: 'bot',
              timestamp: new Date()
            },
            {
              id: (Date.now() + 2).toString(),
              text: '🚀 Get started by creating a new automation or typing a command like "Navigate to google.com"',
              type: 'bot',
              timestamp: new Date()
            }
          ];
          setMessages(welcomeMessages);
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          handleMessage(data);
        };

        socket.onclose = () => {
          setConnectionStatus('disconnected');
          setWs(null);
        };

        socket.onerror = (error) => {
          setConnectionStatus('disconnected');
          console.error('WebSocket error:', error);
        };
      } catch (err) {
        setConnectionStatus('disconnected');
        console.error('Connection error:', err);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const getExampleValue = (type: string): string => {
    const examples: Record<string, string> = {
      'email': 'user@example.com',
      'password': 'myPassword123',
      'cpf': '123.456.789-00',
      'phone': '(11) 98765-4321',
      'date': '2024-01-15',
      'number': '100',
      'url': 'https://example.com',
      'text': 'example text',
      'select': 'option1'
    };
    return examples[type] || 'value';
  };

  const handleMessage = (data: any) => {
    switch (data.type) {
      case 'screenshot':
        if (data.data) {
          setScreenshotSrc(`data:image/jpeg;base64,${data.data}`);
        } else if (data.error) {
          // Handle screenshot unavailable case
          console.log('Screenshot unavailable:', data.error);
          // Keep the last screenshot or show placeholder
        }
        setUrl(data.url);
        setIsLoading(false);
        break;

      case 'chat_response':
      case 'action_executed':
      case 'navigation_completed':
      case 'instruction_result':
        if (data.message) {
          addMessage(data.message, 'bot');
        }
        break;

      case 'processing':
        addMessage(data.message, 'system');
        break;

      case 'recording_started':
        setIsRecording(true);
        addMessage(data.message, 'system');
        break;

      case 'recording_stopped':
        setIsRecording(false);
        addMessage(data.message, 'system');
        if (data.automation) {
          const newAutomation: Automation = {
            id: data.automation.id,
            name: data.automation.name,
            status: 'ready',
            lastRun: undefined,
            description: data.automation.description || 'Recorded automation',
            stepCount: data.automation.stepCount || 0,
            variableCount: data.automation.variableCount || 0
          };
          setAutomations(prev => [...prev, newAutomation]);
        }
        break;

      case 'automation_started':
        if (data.automationId) {
          setAutomations(prev => prev.map(a => 
            a.id === data.automationId ? { ...a, status: 'running' as const } : a
          ));
        }
        addMessage(data.message, 'system');
        break;

      case 'automation_stopped':
        if (data.automationId) {
          setAutomations(prev => prev.map(a => 
            a.id === data.automationId 
              ? { ...a, status: 'ready' as const, lastRun: new Date() } 
              : a
          ));
        }
        addMessage(data.message, 'system');
        break;

      case 'variables_extracted':
        if (data.automationId && data.variables) {
          setAutomations(prev => prev.map(automation => 
            automation.id === data.automationId 
              ? { ...automation, variableCount: data.variables.length }
              : automation
          ));
          addMessage(`✅ Extracted ${data.variables.length} variables from automation`, 'system');
        }
        break;

      case 'automation_variables':
        if (data.variables) {
          setAutomationVariables(data.variables);
        }
        break;

      case 'automation_deleted':
        setAutomations(prev => prev.filter(automation => automation.id !== data.automationId));
        addMessage(data.message, 'system');
        break;

      case 'automation_completed':
        if (data.automationId) {
          setAutomations(prev => prev.map(a => 
            a.id === data.automationId 
              ? { ...a, status: 'ready' as const, lastRun: new Date() } 
              : a
          ));
        }
        addMessage(data.message, 'system');
        break;

      case 'automation_failed':
        if (data.automationId) {
          setAutomations(prev => prev.map(a => 
            a.id === data.automationId 
              ? { ...a, status: 'error' as const } 
              : a
          ));
        }
        addMessage(data.message, 'error');
        break;

      case 'automation_progress':
        addMessage(data.message, 'system');
        break;

      case 'error':
        addMessage(data.message, 'error');
        break;

      case 'manual_mode_enabled':
        setIsManualMode(true);
        addMessage(data.message, 'system');
        break;

      case 'manual_mode_disabled':
        setIsManualMode(false);
        addMessage(data.message, 'system');
        break;

      case 'automation_paused':
        setIsPaused(true);
        addMessage(data.message, 'system');
        break;

      case 'automation_resumed':
        setIsPaused(false);
        addMessage(data.message, 'system');
        break;

      case 'automation_edit_started':
        if (data.automation) {
          // For now, show a simple prompt to edit the name
          const newName = prompt('Edit automation name:', data.automation.name);
          if (newName && newName !== data.automation.name) {
            sendCommand({
              type: 'save_automation_edits',
              automationId: data.automationId,
              updates: { name: newName }
            });
          }
          addMessage(`📝 Editing automation: ${data.automation.name}`, 'system');
        }
        break;

      case 'automation_edit_saved':
        if (data.automation) {
          setAutomations(prev => prev.map(a => 
            a.id === data.automationId ? { ...a, name: data.automation.name } : a
          ));
          addMessage(data.message, 'system');
        }
        break;

      // Removed duplicate automation_variables case - handled above

      case 'automations_list':
        if (data.automations) {
          console.log('📋 Frontend received automations:', data.automations);
          // Add detailed ID logging
          data.automations.forEach((automation: any, index: number) => {
            console.log(`Automation ${index}: ID="${automation.id}", Name="${automation.name}"`);
          });
          setAutomations(data.automations);
          // Removed unnecessary chat message - only log to console
        }
        break;
    }
  };

  const addMessage = (text: string, type: MessageType) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      type,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendCommand = (command: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(command));
    }
  };

  // Event handlers
  const handleNavigate = (newUrl: string) => {
    setIsLoading(true);
    sendCommand({ type: 'navigate', url: newUrl });
  };

  const handleGoBack = () => {
    sendCommand({ type: 'go_back' });
  };

  const handleRefresh = () => {
    setIsLoading(true);
    sendCommand({ type: 'refresh' });
  };

  const handleToggleManualMode = () => {
    sendCommand({ type: 'toggle_manual_mode' });
  };

  const handleTogglePause = () => {
    sendCommand({ type: 'toggle_pause' });
  };

  const handleSync = () => {
    sendCommand({ type: 'sync_browser_state' });
  };

  const handlePageInfo = () => {
    sendCommand({ type: 'get_page_info' });
  };

  const handleScreenshotClick = (x: number, y: number) => {
    if (!isManualMode) return;
    
    addMessage(`Manual click at (${x}, ${y})`, 'user');
    sendCommand({ 
      type: 'manual_click', 
      x: x, 
      y: y 
    });
  };

  const handleSendMessage = (message: string) => {
    addMessage(message, 'user');
    
    // Check if we're waiting for variables for an automation
    const pendingAutomationId = sessionStorage.getItem('pendingAutomationId');
    if (pendingAutomationId && message.includes('$')) {
      // Parse variables from the message
      const variables = parseVariablesFromMessage(message);
      
      if (Object.keys(variables).length > 0) {
        // Clear pending automation
        sessionStorage.removeItem('pendingAutomationId');
        
        // Run automation with variables
        const automation = automations.find(a => a.id === pendingAutomationId);
        if (automation) {
          setAutomations(prev => prev.map(a => 
            a.id === pendingAutomationId ? { ...a, status: 'running' as const } : a
          ));
          addMessage(`Running automation "${automation.name}" with provided variables`, 'system');
          sendCommand({ 
            type: 'run_automation', 
            automationId: pendingAutomationId,
            variables: variables
          });
        }
        return;
      }
    }
    
    sendCommand({ type: 'chat_instruction', message });
  };

  const parseVariablesFromMessage = (message: string): Record<string, string> => {
    const variables: Record<string, string> = {};
    
    // Match patterns like ${VAR_NAME} value
    const pattern = /\$\{([A-Z_0-9]+)\}\s+([^\s$]+)/g;
    let match;
    
    while ((match = pattern.exec(message)) !== null) {
      variables[match[1]] = match[2];
    }
    
    return variables;
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    sendCommand({ type: 'toggle_recording' });
  };

  // Automation handlers
  const handleCreateAutomation = () => {
    const name = prompt('Enter automation name:');
    if (name) {
      addMessage(`Creating automation: ${name}`, 'system');
      sendCommand({ 
        type: 'create_automation', 
        name: name.trim(),
        description: 'New automation created'
      });
    }
  };

  const handleRunAutomation = (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    if (automation) {
      // If automation has variables, prompt for values
      if (automation.variableCount && automation.variableCount > 0) {
        addMessage(`📝 Please provide variables for "${automation.name}"`, 'system');
        
        // Request variable details from server to show proper examples
        sendCommand({ type: 'get_automation_variables', automationId });
        
        // Store the automation ID for when variables are provided
        sessionStorage.setItem('pendingAutomationId', automationId);
      } else {
        setAutomations(prev => prev.map(a => 
          a.id === automationId ? { ...a, status: 'running' as const } : a
        ));
        addMessage(`Running automation: ${automation.name}`, 'system');
        sendCommand({ type: 'run_automation', automationId });
      }
    }
  };

  const handleEditAutomation = (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    if (automation) {
      addMessage(`Editing automation: ${automation.name}`, 'system');
      sendCommand({ type: 'edit_automation', automationId });
    }
  };

  // Add refresh function
  const refreshAutomations = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('🔄 Refreshing automations from server...');
      ws.send(JSON.stringify({ type: 'get_automations' }));
    }
  };

  const handleDeleteAutomation = (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    console.log(`🗑️ Frontend attempting to delete automation:`, {
      requestedId: automationId,
      foundAutomation: automation,
      allAutomationIds: automations.map(a => a.id)
    });
    if (automation && window.confirm(`Delete automation "${automation.name}"?`)) {
      console.log(`🗑️ Sending delete command for ID: ${automationId}`);
      sendCommand({ type: 'delete_automation', automationId });
    }
  };

  const handleExtractVariables = (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    if (automation) {
      addMessage(`Extracting variables from: ${automation.name}`, 'system');
      sendCommand({ type: 'extract_variables', automationId });
    }
  };

  // New: Variable Editor Modal handlers
  const handleOpenVariableEditor = async (automation: Automation) => {
    setSelectedAutomation(automation);
    
    // Get existing variables for this automation
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'get_automation_variables', 
        automationId: automation.id 
      }));
    }
    
    setIsVariableModalOpen(true);
  };

  const handleCloseVariableEditor = () => {
    setIsVariableModalOpen(false);
    setSelectedAutomation(null);
    setAutomationVariables([]);
  };

  const handleSaveVariables = (variables: any[]) => {
    if (ws && ws.readyState === WebSocket.OPEN && selectedAutomation) {
      ws.send(JSON.stringify({
        type: 'update_automation_variables',
        automationId: selectedAutomation.id,
        variables: variables
      }));
      
      // Update local automation state
      setAutomations(prev => prev.map(automation => 
        automation.id === selectedAutomation.id 
          ? { ...automation, variableCount: variables.length }
          : automation
      ));
      
      addMessage(`Updated ${variables.length} variables for "${selectedAutomation.name}"`, 'system');
    }
  };

  // Removed automatic periodic refresh - automations will refresh only when needed
  // (on connection, after creation/deletion/editing operations)

  return (
    <>
      <Layout
        // Header props
        connectionStatus={connectionStatus}
        
        // Left Panel props
        automations={automations}
        onCreateAutomation={handleCreateAutomation}
        onRunAutomation={handleRunAutomation}
        onEditAutomation={handleEditAutomation}
        onDeleteAutomation={handleDeleteAutomation}
        onExtractVariables={handleExtractVariables}
        onOpenVariableEditor={handleOpenVariableEditor}
      
      // Center Panel props
      url={url}
      screenshotSrc={screenshotSrc}
      isLoading={isLoading}
      isManualMode={isManualMode}
      isPaused={isPaused}
      onNavigate={handleNavigate}
      onGoBack={handleGoBack}
      onRefresh={handleRefresh}
      onToggleManualMode={handleToggleManualMode}
      onTogglePause={handleTogglePause}
      onSync={handleSync}
      onPageInfo={handlePageInfo}
      onScreenshotClick={handleScreenshotClick}
      
      // Right Panel props
      messages={messages}
      isRecording={isRecording}
      onSendMessage={handleSendMessage}
      onToggleRecording={handleToggleRecording}
      websocket={ws}
      selectedAutomationId={selectedAutomation?.id}
      />

      {/* Variable Editor Modal */}
      <VariableEditorModal
        isOpen={isVariableModalOpen}
        automation={selectedAutomation}
        variables={automationVariables}
        onClose={handleCloseVariableEditor}
        onSave={handleSaveVariables}
      />
    </>
  );
};

export default App; 