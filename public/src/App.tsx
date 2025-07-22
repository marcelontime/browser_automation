import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/layout/Layout';
import VariableEditorModal from './components/automation/VariableEditorModal';
import VariableInputModal from './components/automation/VariableInputModal';
import ExecutionStatusDisplay from './components/automation/ExecutionStatusDisplay';
import { ModernDashboard } from './components/dashboard/ModernDashboard';
import { ThemeProvider } from './components/ui/theme-provider';

// Import global styles
import './styles/global.css';

interface Automation {
  id: string;
  name: string;
  lastRun?: Date;
  status: 'ready' | 'recording' | 'running' | 'error';
  description?: string;
  variableCount?: number;
  stepCount?: number;
  variables?: any[]; // Use any[] to avoid interface conflicts - each component will handle its own Variable interface
  steps?: any[]; // Add steps property that server sends
  createdAt?: string;
  playwrightScript?: string;
  scriptFilename?: string;
}

interface Message {
  id: string;
  text: string;
  type: 'user' | 'bot' | 'system' | 'error';
  timestamp: Date;
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

interface ExecutionLog {
  timestamp: string;
  level: string;
  message: string;
  stepIndex?: number;
}

type MessageType = 'user' | 'bot' | 'system' | 'error';

const App: React.FC = () => {
  // UI state
  const [useModernDashboard, setUseModernDashboard] = useState(true);
  
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

  // Variable Input Modal state (for editing variables before running)
  const [isVariableInputModalOpen, setIsVariableInputModalOpen] = useState(false);
  const [variableInputAutomation, setVariableInputAutomation] = useState<Automation | null>(null);

  // Execution Status Display state
  const [isExecutionStatusVisible, setIsExecutionStatusVisible] = useState(false);
  const [currentExecutionStatus, setCurrentExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  
  // Multiple execution statuses for left panel
  const [allExecutionStatuses, setAllExecutionStatuses] = useState<ExecutionStatus[]>([]);

  // WebSocket connection
  useEffect(() => {
    const connect = async () => {
      setConnectionStatus('connecting');
      try {
        const res = await fetch('/get-token');
        const data = await res.json();
        const token = data.token;

        // Get or generate session ID
        let sessionId = localStorage.getItem('browser_automation_session_id');
        
        // Build WebSocket URL with session ID if available
        const wsUrl = sessionId 
          ? `ws://localhost:7079?token=${token}&sessionId=${sessionId}`
          : `ws://localhost:7079?token=${token}`;

        console.log(`🔗 Connecting to: ${wsUrl}`);
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setConnectionStatus('connected');
          setWs(socket);
          
          // Request automations from server
          socket.send(JSON.stringify({ type: 'get_automations' }));
          
          // Add welcome messages (only for new sessions)
          if (!sessionId) {
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
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount



  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'status':
        // Store session ID for future connections
        if (data.sessionId) {
          localStorage.setItem('browser_automation_session_id', data.sessionId);
          console.log(`💾 Session ID stored: ${data.sessionId}`);
          
          // Show different message for resumed sessions
          if (data.resumed) {
            const resumedMessage: Message = {
              id: Date.now().toString(),
              text: `🔄 Welcome back! Resumed session ${data.sessionId}`,
              type: 'bot',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, resumedMessage]);
          }
        }
        
        const statusMessage: Message = {
          id: Date.now().toString(),
          text: data.message,
          type: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, statusMessage]);
        break;

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

      case 'manual_mode_toggled':
        console.log(`👤 Manual mode ${data.isManualMode ? 'enabled' : 'disabled'}`);
        setIsManualMode(data.isManualMode);
        addMessage(data.message, 'system');
        break;

      case 'pause_toggled':
        setIsPaused(data.isPaused);
        addMessage(data.message, 'system');
        break;

      case 'automation_started':
        if (data.automationId) {
          setAutomations(prev => prev.map(a => 
            a.id === data.automationId ? { ...a, status: 'running' as const } : a
          ));
        }
        addMessage(data.message, 'system');
        break;

      // Execution status events
      case 'execution_started':
        if (data.context) {
          setCurrentExecutionStatus(data.context);
          setExecutionLogs([]);
          setIsExecutionStatusVisible(true);
          
          // Add to all execution statuses for left panel
          setAllExecutionStatuses(prev => {
            const filtered = prev.filter(status => status.executionId !== data.context.executionId);
            return [...filtered, data.context];
          });
        }
        break;

      case 'execution_progress':
        if (data.executionId) {
          setCurrentExecutionStatus(prev => {
            // If no previous state OR executionId matches, update
            if (!prev || prev.executionId === data.executionId) {
              return {
                executionId: data.executionId,
                automationId: data.automationId || prev?.automationId || 'unknown',
                currentStep: data.currentStep,
                progress: data.progress,
                status: data.status || 'running',
                totalSteps: data.totalSteps || prev?.totalSteps || 5,
                startTime: prev?.startTime || new Date().toISOString(),
                successfulSteps: prev?.successfulSteps || 0,
                errorCount: prev?.errorCount || 0,
                metadata: prev?.metadata || { automationName: 'Unknown', hasVariables: false }
              };
            }
            return prev; // Different executionId, don't update
          });
        }
        
        // Update in all execution statuses for left panel
        setAllExecutionStatuses(prev => 
          prev.map(status => 
            status.executionId === data.executionId 
              ? { ...status, currentStep: data.currentStep, progress: data.progress, status: data.status }
              : status
          )
        );
        break;

      case 'execution_total_steps_updated':
        if (data.executionId && currentExecutionStatus?.executionId === data.executionId) {
          setCurrentExecutionStatus(prev => {
            if (!prev) return null;
            return {
              ...prev,
              totalSteps: data.totalSteps,
              currentStep: data.currentStep,
              progress: data.progress,
              status: data.status
            };
          });
        }
        
        // Update in all execution statuses for left panel
        setAllExecutionStatuses(prev => 
          prev.map(status => 
            status.executionId === data.executionId 
              ? { ...status, totalSteps: data.totalSteps, currentStep: data.currentStep, progress: data.progress, status: data.status }
              : status
          )
        );
        break;

      case 'execution_log':
        if (data.log) {
          setExecutionLogs(prev => [...prev, data.log]);
        }
        break;

      case 'execution_completed':
        if (data.executionId && currentExecutionStatus?.executionId === data.executionId) {
          setCurrentExecutionStatus(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'completed',
              endTime: data.endTime || new Date().toISOString(),
              duration: data.duration
            };
          });
          
          // ✅ AUTO-CLOSE: Automatically close execution status display after completion
          setTimeout(() => {
            setIsExecutionStatusVisible(false);
            setCurrentExecutionStatus(null);
          }, 3000); // Close after 3 seconds to allow user to see completion
        }
        break;

      case 'execution_failed':
        if (data.executionId && currentExecutionStatus?.executionId === data.executionId) {
          setCurrentExecutionStatus(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'failed',
              endTime: data.endTime || new Date().toISOString(),
              duration: data.duration,
              errorCount: (prev.errorCount || 0) + 1
            };
          });
          
          // ✅ AUTO-CLOSE: Automatically close execution status display after failure
          setTimeout(() => {
            setIsExecutionStatusVisible(false);
            setCurrentExecutionStatus(null);
          }, 5000); // Close after 5 seconds for failures to allow user to see error
        }
        break;

      case 'execution_paused':
        if (data.executionId && currentExecutionStatus?.executionId === data.executionId) {
          setCurrentExecutionStatus(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'paused'
            };
          });
        }
        
        // ✅ CRITICAL FIX: Update allExecutionStatuses for LeftPanel button rendering
        setAllExecutionStatuses(prev => 
          prev.map(status => 
            status.executionId === data.executionId 
              ? { ...status, status: 'paused' }
              : status
          )
        );
        break;

      case 'execution_resumed':
        if (data.executionId && currentExecutionStatus?.executionId === data.executionId) {
          setCurrentExecutionStatus(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'running'
            };
          });
        }
        
        // ✅ CRITICAL FIX: Update allExecutionStatuses for LeftPanel button rendering
        setAllExecutionStatuses(prev => 
          prev.map(status => 
            status.executionId === data.executionId 
              ? { ...status, status: 'running' }
              : status
          )
        );
        break;

      case 'execution_stopped':
        if (data.executionId && currentExecutionStatus?.executionId === data.executionId) {
          setCurrentExecutionStatus(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'cancelled',
              endTime: data.endTime || new Date().toISOString()
            };
          });
          
          // ✅ AUTO-CLOSE: Automatically close execution status display after stop
          setTimeout(() => {
            setIsExecutionStatusVisible(false);
            setCurrentExecutionStatus(null);
          }, 2000); // Close after 2 seconds for stopped executions
        }
        
        // ✅ CRITICAL FIX: Update allExecutionStatuses and remove completed execution
        setAllExecutionStatuses(prev => 
          prev.filter(status => status.executionId !== data.executionId)
        );
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
          // setAutomationVariables(data.variables); // This state variable was removed
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
          
          // ✅ AUTO-CLOSE: Automatically close execution status display after automation completion
          setTimeout(() => {
            setIsExecutionStatusVisible(false);
            setCurrentExecutionStatus(null);
          }, 3000); // Close after 3 seconds to allow user to see completion
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

      // Enhanced manual mode handlers
      case 'enhanced_manual_mode_enabled':
        setIsManualMode(true);
        addMessage(data.message, 'system');
        break;

      case 'enhanced_manual_mode_disabled':
        setIsManualMode(false);
        addMessage(data.message, 'system');
        break;

      // Real-time control messages
      case 'real_time_control_started':
        console.log('🎮 Real-time control started with capabilities:', data.capabilities);
        break;

      case 'real_time_control_stopped':
        console.log('🛑 Real-time control stopped');
        break;

      case 'real_time_screenshot':
        if (data.data) {
          const imageUrl = `data:image/jpeg;base64,${data.data}`;
          setScreenshotSrc(imageUrl);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sendCommand and currentExecutionStatus are stable and don't cause infinite re-renders

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

  // Clear session and start fresh
  const clearSession = () => {
    localStorage.removeItem('browser_automation_session_id');
    // Reconnect with new session
    window.location.reload();
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

  // Enhanced mouse event handler for real-time controls
  const handleEnhancedMouseEvent = (event: any) => {
    if (!isManualMode) return;
    
    console.log('Enhanced mouse event:', event);
    sendCommand({
      type: 'enhanced_mouse_event',
      ...event
    });
  };

  // Enhanced keyboard event handler for real-time controls
  const handleEnhancedKeyboardEvent = (event: any) => {
    if (!isManualMode) return;
    
    console.log('Enhanced keyboard event:', event);
    sendCommand({
      type: 'enhanced_keyboard_event',
      ...event
    });
  };

  // Touch event handler for mobile gestures
  const handleTouchEvent = (event: any) => {
    if (!isManualMode) return;
    
    console.log('Touch event:', event);
    sendCommand({
      type: 'touch_event',
      ...event
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

  const handleRunAutomation = (automationId: string, variables?: Record<string, string>) => {
    const automation = automations.find(a => a.id === automationId);
    if (automation) {
      // Update automation status to running
      setAutomations(prev => prev.map(a => 
        a.id === automationId ? { ...a, status: 'running' as const } : a
      ));
      
      // Run automation immediately with existing variables or provided variables
      const variableInfo = variables ? ` with ${Object.keys(variables).length} variables` : 
                          automation.variableCount ? ` with ${automation.variableCount} existing variables` : '';
      
      addMessage(`Running automation: ${automation.name}${variableInfo}`, 'system');
      sendCommand({ 
        type: 'run_automation', 
        automationId,
        variables: variables // Only send if explicitly provided
      });
    }
  };

  const handleEditAutomation = (automationId: string) => {
    const automation = automations.find(a => a.id === automationId);
    if (automation) {
      addMessage(`Editing automation: ${automation.name}`, 'system');
      sendCommand({ type: 'edit_automation', automationId });
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



  // Variable Editor Modal handlers (for editing automation variables)
  const handleOpenVariableEditor = async (automation: Automation) => {
    console.log('🔧 Opening Variable Editor for automation:', automation.id);
    setSelectedAutomation(automation);
    setIsVariableModalOpen(true);
  };

  const handleCloseVariableInput = () => {
    setIsVariableInputModalOpen(false);
    setVariableInputAutomation(null);
  };

  const handleSubmitVariableInput = (variables: Record<string, string>) => {
    if (variableInputAutomation) {
      // Run automation with the provided variables
      handleRunAutomation(variableInputAutomation.id, variables);
    }
  };

  const handleCloseVariableEditor = () => {
    setIsVariableModalOpen(false);
    setSelectedAutomation(null);
    // setAutomationVariables([]); // This state variable was removed
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

  // Execution Status Display handlers
  const handleCloseExecutionStatus = () => {
    setIsExecutionStatusVisible(false);
  };

  const handlePauseExecution = () => {
    if (currentExecutionStatus?.executionId) {
      sendCommand({ 
        type: 'pause_execution', 
        executionId: currentExecutionStatus.executionId 
      });
    }
  };

  const handleResumeExecution = () => {
    if (currentExecutionStatus?.executionId) {
      sendCommand({ 
        type: 'resume_execution', 
        executionId: currentExecutionStatus.executionId 
      });
    }
  };

  const handleStopExecution = () => {
    if (currentExecutionStatus?.executionId) {
      sendCommand({ 
        type: 'stop_execution', 
        executionId: currentExecutionStatus.executionId,
        reason: 'user_requested'
      });
    }
  };

  const handleRetryExecution = () => {
    if (currentExecutionStatus?.automationId) {
      // Re-run the same automation
      handleRunAutomation(currentExecutionStatus.automationId);
    }
  };

  // Left Panel execution control handlers
  const handlePauseExecutionFromPanel = (executionId: string) => {
    sendCommand({ 
      type: 'pause_execution', 
      executionId 
    });
  };

  const handleResumeExecutionFromPanel = (executionId: string) => {
    sendCommand({ 
      type: 'resume_execution', 
      executionId 
    });
  };

  const handleStopExecutionFromPanel = (executionId: string) => {
    sendCommand({ 
      type: 'stop_execution', 
      executionId,
      reason: 'user_requested'
    });
  };

  // Removed automatic periodic refresh - automations will refresh only when needed
  // (on connection, after creation/deletion/editing operations)

  return (
    <ThemeProvider>
      {useModernDashboard ? (
        <>
          <ModernDashboard
            automations={automations.map(automation => ({
              ...automation,
              successRate: 95 // Mock success rate for now
            }))}
            onCreateAutomation={handleCreateAutomation}
            onRunAutomation={handleRunAutomation}
            onEditAutomation={handleEditAutomation}
            onDeleteAutomation={handleDeleteAutomation}
            onToggleRecording={handleToggleRecording}
            isRecording={isRecording}
          />
          
          {/* Toggle button to switch back to old interface */}
          <div style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px', 
            zIndex: 1000 
          }}>
            <button
              onClick={() => setUseModernDashboard(false)}
              style={{
                padding: '8px 16px',
                background: 'var(--primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Switch to Classic View
            </button>
          </div>
        </>
      ) : (
        <>
          <Layout
            // Header props
            connectionStatus={connectionStatus}
            isRecording={isRecording}
            isManualMode={isManualMode}
            onToggleRecording={handleToggleRecording}
            onToggleManualMode={handleToggleManualMode}
            onClearSession={clearSession}
            
            // Left Panel props
            automations={automations}
            executionStatuses={allExecutionStatuses}
            onCreateAutomation={handleCreateAutomation}
            onRunAutomation={handleRunAutomation}
            onEditAutomation={handleEditAutomation}
            onDeleteAutomation={handleDeleteAutomation}
            onExtractVariables={handleExtractVariables}
            onOpenVariableEditor={handleOpenVariableEditor}
            onPauseExecution={handlePauseExecutionFromPanel}
            onResumeExecution={handleResumeExecutionFromPanel}
            onStopExecution={handleStopExecutionFromPanel}
          
            // Center Panel props
            url={url}
            screenshotSrc={screenshotSrc}
            isLoading={isLoading}
            isPaused={isPaused}
            onNavigate={handleNavigate}
            onGoBack={handleGoBack}
            onRefresh={handleRefresh}
            onTogglePause={handleTogglePause}
            onSync={handleSync}
            onPageInfo={handlePageInfo}
            onScreenshotClick={handleScreenshotClick}
            onEnhancedMouseEvent={handleEnhancedMouseEvent}
            onEnhancedKeyboardEvent={handleEnhancedKeyboardEvent}
            onTouchEvent={handleTouchEvent}
            
            // Right Panel props
            messages={messages}
            onSendMessage={handleSendMessage}
            websocket={ws}
            selectedAutomationId={selectedAutomation?.id}
          />
          
          {/* Toggle button to switch to modern interface */}
          <div style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px', 
            zIndex: 1000 
          }}>
            <button
              onClick={() => setUseModernDashboard(true)}
              style={{
                padding: '8px 16px',
                background: 'var(--primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Switch to Modern View
            </button>
          </div>
        </>
      )}

      {/* Variable Editor Modal */}
      <VariableEditorModal
        isOpen={isVariableModalOpen}
        automation={selectedAutomation}
        onClose={handleCloseVariableEditor}
        onSave={handleSaveVariables}
      />

      {/* Variable Input Modal */}
      <VariableInputModal
        isOpen={isVariableInputModalOpen}
        automation={variableInputAutomation}
        onClose={handleCloseVariableInput}
        onSubmit={handleSubmitVariableInput}
      />

      {/* Execution Status Display */}
      <ExecutionStatusDisplay
        isVisible={isExecutionStatusVisible}
        executionStatus={currentExecutionStatus}
        logs={executionLogs}
        onClose={handleCloseExecutionStatus}
        onPause={handlePauseExecution}
        onResume={handleResumeExecution}
        onStop={handleStopExecution}
        onRetry={handleRetryExecution}
      />
    </ThemeProvider>
  );
};

export default App; 