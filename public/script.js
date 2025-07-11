// WebSocket connection and global variables
let ws;
let isRecording = false;
let availableScripts = [];
let selectedScript = null;
let connectionRetryCount = 0;
let maxRetries = 5;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupKeyboardShortcuts();
});

function initializeApp() {
    connect();
    showWelcomeMessage();
    hideLoadingOverlay();
}

function setupEventListeners() {
    // Auto-resize textarea
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }

    // Modal click outside to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Ctrl + R to start/stop recording
        if (event.ctrlKey && event.key === 'r') {
            event.preventDefault();
            toggleRecording();
        }
        
        // Escape to focus on chat or close modals
        if (event.key === 'Escape') {
            if (document.querySelector('.modal[style*="block"]')) {
                closeAllModals();
            } else {
                document.getElementById('chatInput').focus();
            }
        }
        
        // Enter to send message (when focused on chat input)
        if (event.key === 'Enter' && event.target.id === 'chatInput' && !event.shiftKey) {
            event.preventDefault();
            sendChatMessage();
        }
    });
}

// WebSocket connection management
function connect() {
    updateStatus('🔄 Connecting...');
    
    ws = new WebSocket('ws://localhost:7079');
    
    ws.onopen = () => {
        updateStatus('✅ Connected');
        connectionRetryCount = 0;
        console.log('Connected to server');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
    
    ws.onclose = () => {
        updateStatus('❌ Disconnected');
        if (connectionRetryCount < maxRetries) {
            connectionRetryCount++;
            updateStatus(`🔄 Reconnecting... (${connectionRetryCount}/${maxRetries})`);
            setTimeout(connect, 3000);
        } else {
            updateStatus('❌ Connection failed - Please refresh the page');
        }
    };
    
    ws.onerror = (error) => {
        updateStatus('❌ Connection error');
        console.error('WebSocket error:', error);
    };
}

function handleMessage(data) {
    switch (data.type) {
        case 'init':
            availableScripts = data.scripts || [];
            isRecording = data.isRecording || false;
            updateScriptsList();
            updateRecordingUI();
            break;
            
        case 'screenshot':
            updateScreenshot(data.data);
            updateUrlBar(data.url);
            hideLoadingOverlay();
            break;
            
        case 'chat_response':
        case 'action_executed':
        case 'navigation_completed':
            addMessage(data.message, 'bot');
            break;
            
        case 'script_step':
            addMessage(data.message, 'system');
            break;
            
        case 'script_execution_started':
        case 'script_execution_completed':
            addMessage(data.message, 'system');
            break;
            
        case 'recording_started':
            isRecording = true;
            updateRecordingUI();
            addMessage(data.message, 'system');
            break;
            
        case 'recording_stopped':
            isRecording = false;
            updateRecordingUI();
            if (data.script) {
                availableScripts.push(data.script.name);
                updateScriptsList();
                showVariablesInfo(data.script);
            }
            addMessage(data.message, 'system');
            break;
            
        case 'script_deleted':
            availableScripts = availableScripts.filter(name => name !== data.scriptName);
            updateScriptsList();
            addMessage(data.message, 'system');
            break;
            
        case 'error':
            addMessage(data.message, 'error');
            break;
            
        case 'page_info':
            updatePageInfo(data.info);
            break;
            
        case 'manual_mode_enabled':
            updateManualModeUI(true);
            addMessage(data.message, 'system');
            break;
            
        case 'manual_mode_disabled':
            updateManualModeUI(false);
            addMessage(data.message, 'system');
            break;
            
        case 'automation_paused':
            updatePauseUI(true);
            addMessage(data.message, 'system');
            break;
            
        case 'automation_resumed':
            updatePauseUI(false);
            addMessage(data.message, 'system');
            break;
            
        case 'browser_state_synced':
            addMessage(data.message, 'system');
            break;
            
        case 'action_blocked':
            addMessage(data.message, 'error');
            break;
            
        case 'script_variables':
            if (window.pendingVariablesModal) {
                displayVariablesModal(window.pendingVariablesModal.scriptName, data.variables);
                window.pendingVariablesModal = null;
            }
            break;
    }
}

// UI Update Functions
function updateScreenshot(base64Data) {
    const screenshot = document.getElementById('screenshot');
    if (screenshot) {
        screenshot.src = 'data:image/png;base64,' + base64Data;
    }
}

function updateUrlBar(url) {
    const urlBar = document.getElementById('urlBar');
    if (urlBar && url) {
        urlBar.value = url;
    }
}

function updateStatus(status) {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
        statusBar.textContent = status;
    }
}

function updatePageInfo(info) {
    updateStatus(`📄 ${info.title} - ${info.inputs} inputs, ${info.buttons} buttons`);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Chat Functions
function addMessage(message, type) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showWelcomeMessage() {
    setTimeout(() => {
        addMessage('👋 Hello! I\'m your browser automation assistant.', 'bot');
        addMessage('You can:', 'bot');
        addMessage('• Give me natural language commands', 'bot');
        addMessage('• Record sequences of actions as scripts', 'bot');
        addMessage('• Execute saved scripts with different parameters', 'bot');
        addMessage('Type "help" for examples or click the Examples button.', 'bot');
    }, 1000);
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (message.toLowerCase() === 'help') {
        showHelpModal();
        input.value = '';
        return;
    }
    
    addMessage(message, 'user');
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'chat_instruction',
            message
        }));
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
    
    input.value = '';
    input.style.height = 'auto';
}

function handleChatEnter(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}

// Recording Functions
function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const indicator = document.getElementById('recordingIndicator');
    
    if (!recordBtn || !indicator) return;
    
    if (isRecording) {
        recordBtn.textContent = '⏹️ Stop Recording';
        recordBtn.className = 'btn btn-danger';
        indicator.style.display = 'block';
    } else {
        recordBtn.textContent = '🔴 Start Recording';
        recordBtn.className = 'btn btn-success';
        indicator.style.display = 'none';
    }
}

function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    const name = document.getElementById('scriptName').value.trim();
    const description = document.getElementById('scriptDescription').value.trim();
    
    if (!name) {
        alert('Please enter a script name');
        return;
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'start_recording',
            name,
            description
        }));
        
        addMessage(`🎬 Starting recording: "${name}"`, 'user');
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
}

function stopRecording() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'stop_recording'
        }));
        
        addMessage('⏹️ Stopping recording...', 'user');
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
}

// Script Management Functions
function updateScriptsList() {
    const scriptsList = document.getElementById('scriptsList');
    if (!scriptsList) return;
    
    scriptsList.innerHTML = '';
    
    if (availableScripts.length === 0) {
        scriptsList.innerHTML = '<div class="no-scripts">No scripts saved yet</div>';
        return;
    }
    
    availableScripts.forEach(scriptName => {
        const scriptDiv = document.createElement('div');
        scriptDiv.className = 'script-item';
        scriptDiv.innerHTML = `
            <h5>${scriptName}</h5>
            <p>Click to execute or configure variables</p>
            <div class="script-actions">
                <button class="btn btn-sm btn-primary" onclick="executeScript('${scriptName}')">▶️ Run</button>
                <button class="btn btn-sm btn-secondary" onclick="showVariablesModal('${scriptName}')">⚙️ Variables</button>
                <button class="btn btn-sm btn-danger" onclick="deleteScript('${scriptName}')">🗑️</button>
            </div>
        `;
        scriptsList.appendChild(scriptDiv);
    });
}

function executeScript(scriptName) {
    // Check for saved variables
    const savedVariables = localStorage.getItem(`variables_${scriptName}`);
    let variables = {};
    
    if (savedVariables) {
        variables = JSON.parse(savedVariables);
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'execute_script',
            scriptName,
            variables
        }));
        
        addMessage(`🎬 Executing script: "${scriptName}"`, 'user');
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
}

function deleteScript(scriptName) {
    if (confirm(`Are you sure you want to delete the script "${scriptName}"?`)) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'delete_script',
                scriptName
            }));
        } else {
            addMessage('❌ Not connected to server', 'error');
        }
    }
}

// Variables Management
function showVariablesModal(scriptName) {
    selectedScript = scriptName;
    const modal = document.getElementById('variablesModal');
    const form = document.getElementById('variablesForm');
    
    if (!modal || !form) return;
    
    // Request script variables from server
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'get_script_variables',
            scriptName
        }));
        
        // Store the modal reference for when we get the response
        window.pendingVariablesModal = { scriptName, modal, form };
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
}

function displayVariablesModal(scriptName, scriptVariables) {
    const modal = document.getElementById('variablesModal');
    const form = document.getElementById('variablesForm');
    
    if (!modal || !form) return;
    
    // Load saved variables
    const savedVariables = localStorage.getItem(`variables_${scriptName}`) || '{}';
    const variables = JSON.parse(savedVariables);
    
    // Create form inputs based on actual script variables
    let formHTML = `<h4>Variables for "${scriptName}":</h4>`;
    
    if (scriptVariables && scriptVariables.length > 0) {
        scriptVariables.forEach(variable => {
            const currentValue = variables[variable.name] || variable.value || '';
            formHTML += `
                <div class="variable-group">
                    <label>${variable.name}:</label>
                    <input type="text" 
                           id="var_${variable.name}" 
                           placeholder="${variable.description || 'e.g., ' + variable.value}" 
                           value="${currentValue}"
                           title="${variable.description || 'Variable: ' + variable.name}">
                </div>
            `;
        });
    } else {
        // Fallback to generic fields if no variables defined
        formHTML += `
            <div class="variable-group">
                <label>Search Term:</label>
                <input type="text" id="var_searchTerm" placeholder="e.g., mesa-de-jardim" value="${variables.searchTerm || ''}">
            </div>
            <div class="variable-group">
                <label>Name:</label>
                <input type="text" id="var_name" placeholder="e.g., John Smith" value="${variables.name || ''}">
            </div>
            <div class="variable-group">
                <label>Value:</label>
                <input type="text" id="var_value" placeholder="e.g., 1000" value="${variables.value || ''}">
            </div>
        `;
    }
    
    form.innerHTML = formHTML;
    modal.style.display = 'flex';
}

function saveAndExecuteScript() {
    if (!selectedScript) return;
    
    const variables = {};
    const inputs = document.querySelectorAll('#variablesForm input');
    
    inputs.forEach(input => {
        if (input.id.startsWith('var_')) {
            const varName = input.id.replace('var_', '');
            if (input.value.trim()) {
                variables[varName] = input.value.trim();
            }
        }
    });
    
    // Save variables to localStorage
    localStorage.setItem(`variables_${selectedScript}`, JSON.stringify(variables));
    
    // Execute script
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'execute_script',
            scriptName: selectedScript,
            variables
        }));
        
        addMessage(`🎬 Executing "${selectedScript}" with custom variables`, 'user');
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
    
    closeVariablesModal();
}

function closeVariablesModal() {
    const modal = document.getElementById('variablesModal');
    if (modal) {
        modal.style.display = 'none';
    }
    selectedScript = null;
}

function showVariablesInfo(script) {
    if (script.variables && script.variables.length > 0) {
        addMessage(`💡 Script saved! Variables detected: ${script.variables.map(v => v.name).join(', ')}`, 'system');
        addMessage('Use the "⚙️ Variables" button to customize values before execution.', 'system');
    }
}

// Navigation Functions
function navigate() {
    const url = document.getElementById('urlBar').value.trim();
    if (!url) return;
    
    showLoadingOverlay();
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'navigate',
            url: url.startsWith('http') ? url : 'https://' + url
        }));
    } else {
        addMessage('❌ Not connected to server', 'error');
        hideLoadingOverlay();
    }
}

function handleUrlEnter(event) {
    if (event.key === 'Enter') {
        navigate();
    }
}

function goBack() {
    addMessage('Back function not implemented yet', 'system');
}

function getPageInfo() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'get_page_info'
        }));
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
}

// Help and Examples
function showExamples() {
    showHelpModal();
}

function showHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Utility Functions
function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

function showNotification(message, type = 'info') {
    // Create a simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#e0245e' : '#17bf63'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1001;
        animation: slideDown 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
    addMessage('❌ An error occurred. Please check the console for details.', 'error');
});

// Prevent default drag and drop
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Manual Control Functions
let isManualMode = false;
let isAutomationPaused = false;

function toggleManualMode() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'toggle_manual_mode'
        }));
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
}

function pauseAutomation() {
    if (isAutomationPaused) {
        // Resume automation
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'resume_automation'
            }));
        }
    } else {
        // Pause automation
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'pause_automation'
            }));
        }
    }
}

function syncBrowserState() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'sync_browser_state'
        }));
        addMessage('🔄 Synchronizing browser state...', 'user');
    } else {
        addMessage('❌ Not connected to server', 'error');
    }
}

function updateManualModeUI(enabled) {
    isManualMode = enabled;
    const manualBtn = document.getElementById('manualModeBtn');
    
    if (enabled) {
        manualBtn.classList.add('manual');
        manualBtn.textContent = '🤖 Auto';
    } else {
        manualBtn.classList.remove('manual');
        manualBtn.textContent = '👤 Manual';
    }
}

function updatePauseUI(paused) {
    isAutomationPaused = paused;
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (paused) {
        pauseBtn.classList.add('paused');
        pauseBtn.textContent = '▶️ Resume';
    } else {
        pauseBtn.classList.remove('paused');
        pauseBtn.textContent = '⏸️ Pause';
    }
} 