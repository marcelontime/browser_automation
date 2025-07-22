import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Button } from '../ui/Button';

const PanelContainer = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--neutral-50);
  position: relative;
  min-height: 0;
  padding: var(--space-4);
`;

const BrowserControls = styled.div`
  padding: var(--space-4) var(--space-6);
  background: white;
  border-bottom: 1px solid var(--neutral-200);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  box-shadow: var(--shadow-sm);
`;

const NavigationControls = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const UrlBar = styled.input`
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-family: var(--font-family-mono);
  background: var(--neutral-50);
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: white;
  }
  
  &::placeholder {
    color: var(--neutral-400);
  }
`;

const ModeControls = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const PerformanceIndicator = styled.div<{ quality: string }>`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--neutral-500);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  background: ${props => {
    switch (props.quality) {
      case 'excellent': return 'var(--success-50)';
      case 'good': return 'var(--warning-50)';
      case 'poor': return 'var(--error-50)';
      default: return 'var(--neutral-50)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.quality) {
      case 'excellent': return 'var(--success-200)';
      case 'good': return 'var(--warning-200)';
      case 'poor': return 'var(--error-200)';
      default: return 'var(--neutral-200)';
    }
  }};
`;

const QualityDot = styled.div<{ quality: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => {
    switch (props.quality) {
      case 'excellent': return 'var(--success-500)';
      case 'good': return 'var(--warning-500)';
      case 'poor': return 'var(--error-500)';
      default: return 'var(--neutral-400)';
    }
  }};
  animation: ${props => props.quality === 'excellent' ? 'none' : 'pulse 2s infinite'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const BrowserCanvas = styled.div`
  position: relative;
  overflow: hidden;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  border: none;
  
  /* Use full available space - no max-width constraint */
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 500px; /* Ensure minimum usable height */
`;

const BrowserFrame = styled.div`
  width: 100%;
  height: 100%;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  position: relative;
  border: 1px solid var(--neutral-300);
  display: flex;
  flex-direction: column;
`;

const BrowserHeader = styled.div`
  height: 32px;
  background: linear-gradient(to bottom, #f6f6f6, #e8e8e8);
  border-bottom: 1px solid #d0d0d0;
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  gap: var(--space-2);
`;

const TrafficLights = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const TrafficLight = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const BrowserContent = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fafafa;
  width: 100%;
  height: 100%;
`;

const Screenshot = styled.canvas<{ isManualMode?: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  cursor: ${props => props.isManualMode ? 'crosshair' : 'default'};
  user-select: none;
  transition: filter 0.2s ease;
  
  &:hover {
    filter: ${props => props.isManualMode ? 'brightness(1.05)' : 'none'};
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid var(--neutral-200);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  color: var(--neutral-600);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
`;

const EmptyState = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--neutral-500);
  text-align: center;
  
  .icon {
    font-size: 4rem;
    margin-bottom: var(--space-4);
    opacity: 0.5;
  }
  
  .title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-2);
  }
  
  .subtitle {
    font-size: var(--text-base);
    color: var(--neutral-400);
  }
`;

const VirtualKeyboard = styled.div<{ visible: boolean }>`
  position: fixed;
  bottom: ${props => props.visible ? '0' : '-200px'};
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid var(--neutral-300);
  padding: var(--space-4);
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: var(--space-2);
  transition: bottom 0.3s ease;
  z-index: 1000;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const KeyboardKey = styled.button`
  padding: var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  background: white;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--neutral-50);
    border-color: var(--primary-500);
  }
  
  &:active {
    background: var(--primary-50);
    transform: scale(0.95);
  }
`;

const TouchIndicator = styled.div<{ x: number; y: number; visible: boolean }>`
  position: absolute;
  left: ${props => props.x - 20}px;
  top: ${props => props.y - 20}px;
  width: 40px;
  height: 40px;
  border: 3px solid var(--primary-500);
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  z-index: 999;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.2s ease;
  animation: ${props => props.visible ? 'touchPulse 0.3s ease-out' : 'none'};
  
  @keyframes touchPulse {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

interface EnhancedCenterPanelProps {
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
  onEnhancedMouseEvent?: (event: any) => void;
  onEnhancedKeyboardEvent?: (event: any) => void;
  onTouchEvent?: (event: any) => void;
  websocket?: WebSocket | null;
}

const EnhancedCenterPanel: React.FC<EnhancedCenterPanelProps> = ({
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
  onEnhancedMouseEvent,
  onEnhancedKeyboardEvent,
  onTouchEvent,
  websocket
}) => {
  const [currentUrl, setCurrentUrl] = useState(url);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVirtualKeyboardVisible, setIsVirtualKeyboardVisible] = useState(false);
  const [streamingQuality, setStreamingQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [frameRate, setFrameRate] = useState(0);
  const [latency, setLatency] = useState(0);
  const [touchIndicator, setTouchIndicator] = useState({ x: 0, y: 0, visible: false });
  
  // Mouse state for drag operations
  const [isDragging, setIsDragging] = useState(false);
  
  // Touch state for gestures
  const [gestureStartDistance, setGestureStartDistance] = useState(0);
  
  // Throttle hover events to prevent flooding
  const lastHoverTime = useRef(0);
  const HOVER_THROTTLE_MS = 50; // Reduced to 50ms for more responsive control

  useEffect(() => {
    setCurrentUrl(url);
  }, [url]);

  // Update canvas with screenshot data
  const updateCanvas = useCallback((base64Data: string) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match container
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Draw image to fit canvas
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = `data:image/jpeg;base64,${base64Data}`;
  }, []);

  // Real-time screenshot handling
  useEffect(() => {
    if (!websocket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle both real-time and regular screenshot messages
        if (data.type === 'real_time_screenshot') {
          // Update canvas with new frame
          updateCanvas(data.data);
          
          // Update performance metrics
          if (data.metadata) {
            setFrameRate(data.metadata.frameRate || 0);
            setLatency(data.metadata.captureTime || 0);
            
            // Determine quality based on performance
            if (data.metadata.frameRate >= 15 && data.metadata.captureTime < 100) {
              setStreamingQuality('excellent');
            } else if (data.metadata.frameRate >= 10 && data.metadata.captureTime < 200) {
              setStreamingQuality('good');
            } else {
              setStreamingQuality('poor');
            }
          }
        } else if (data.type === 'screenshot' && data.data) {
          // ✅ CRITICAL FIX: Also handle regular screenshot messages
          updateCanvas(data.data);
          
          // Set reasonable defaults for regular screenshots
          setFrameRate(0.5); // 0.5 FPS for regular screenshots (every 2 seconds)
          setLatency(50); // Assume reasonable latency
          setStreamingQuality('good'); // Default quality
        }
      } catch (error) {
        console.error('Error handling real-time message:', error);
      }
    };

    websocket.addEventListener('message', handleMessage);
    return () => websocket.removeEventListener('message', handleMessage);
  }, [websocket, updateCanvas]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(currentUrl);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentUrl(e.target.value);
  };

  // Enhanced mouse event handling
  const handleCanvasMouseEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>, eventType: string) => {
    if (!isManualMode || !canvasRef.current || !onEnhancedMouseEvent) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    
    // Use actual canvas dimensions for scaling (responsive to any size)
    const scaleX = canvas.width / (rect.width * window.devicePixelRatio);
    const scaleY = canvas.height / (rect.height * window.devicePixelRatio);
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    const mouseEvent = {
      type: eventType,
      x,
      y,
      button: e.button === 0 ? 'left' : e.button === 1 ? 'middle' : 'right',
      modifiers: [
        e.ctrlKey && 'Control',
        e.shiftKey && 'Shift',
        e.altKey && 'Alt',
        e.metaKey && 'Meta'
      ].filter(Boolean),
      timestamp: Date.now()
    };

    onEnhancedMouseEvent(mouseEvent);

    // Show touch indicator for visual feedback
    if (eventType === 'click') {
      setTouchIndicator({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
      setTimeout(() => setTouchIndicator(prev => ({ ...prev, visible: false })), 300);
    }
  }, [isManualMode, onEnhancedMouseEvent]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isManualMode) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setIsDragging(true);
      handleCanvasMouseEvent(e, 'mouse_down');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isManualMode) return;
    
    if (isDragging) {
      handleCanvasMouseEvent(e, 'drag_move');
    } else {
      // Throttle hover events to prevent spam
      const now = Date.now();
      if (now - lastHoverTime.current >= HOVER_THROTTLE_MS) {
        lastHoverTime.current = now;
        handleCanvasMouseEvent(e, 'hover');
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isManualMode) return;
    
    if (isDragging) {
      handleCanvasMouseEvent(e, 'drag_end');
      setIsDragging(false);
    } else {
      handleCanvasMouseEvent(e, 'click');
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleCanvasMouseEvent(e, 'double_click');
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleCanvasMouseEvent(e, 'right_click');
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!isManualMode || !onEnhancedMouseEvent) return;
    
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const canvas = canvasRef.current;
    const scaleX = canvas.width / (rect.width * window.devicePixelRatio);
    const scaleY = canvas.height / (rect.height * window.devicePixelRatio);
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    onEnhancedMouseEvent({
      type: e.ctrlKey ? 'zoom' : 'scroll',
      x,
      y,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      timestamp: Date.now()
    });
  };

  // Touch event handling for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isManualMode || !onTouchEvent) return;
    
    e.preventDefault();
    const touches = Array.from(e.touches);
    
    if (touches.length === 1) {
      // Single touch - potential tap
      const touch = touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const canvas = canvasRef.current;
        const scaleX = canvas.width / (rect.width * window.devicePixelRatio);
        const scaleY = canvas.height / (rect.height * window.devicePixelRatio);
        
        const x = Math.round((touch.clientX - rect.left) * scaleX);
        const y = Math.round((touch.clientY - rect.top) * scaleY);
        
        onTouchEvent({
          type: 'touch_start',
          touches: [{ x, y, id: touch.identifier }],
          timestamp: Date.now()
        });
      }
    } else if (touches.length === 2) {
      // Two finger gesture
      const distance = Math.sqrt(
        Math.pow(touches[1].clientX - touches[0].clientX, 2) +
        Math.pow(touches[1].clientY - touches[0].clientY, 2)
      );
      setGestureStartDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isManualMode || !onTouchEvent) return;
    
    e.preventDefault();
    const touches = Array.from(e.touches);
    
    if (touches.length === 2 && gestureStartDistance > 0) {
      // Pinch zoom gesture
      const currentDistance = Math.sqrt(
        Math.pow(touches[1].clientX - touches[0].clientX, 2) +
        Math.pow(touches[1].clientY - touches[0].clientY, 2)
      );
      
      const scale = currentDistance / gestureStartDistance;
      const centerX = (touches[0].clientX + touches[1].clientX) / 2;
      const centerY = (touches[0].clientY + touches[1].clientY) / 2;
      
      onTouchEvent({
        type: 'pinch_zoom',
        center: { x: centerX, y: centerY },
        scale,
        timestamp: Date.now()
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isManualMode) return;
    
    setGestureStartDistance(0);
  };

  // Virtual keyboard handling
  const handleVirtualKey = (key: string) => {
    if (!onEnhancedKeyboardEvent) return;
    
    onEnhancedKeyboardEvent({
      type: key.length === 1 ? 'type_text' : 'key_press',
      text: key.length === 1 ? key : undefined,
      key: key.length > 1 ? key : undefined,
      timestamp: Date.now()
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isManualMode || !onEnhancedKeyboardEvent) return;
      
      // Prevent default browser shortcuts when in manual mode
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.startsWith('F')) {
        e.preventDefault();
      }
      
      const modifiers = [
        e.ctrlKey && 'Control',
        e.shiftKey && 'Shift',
        e.altKey && 'Alt',
        e.metaKey && 'Meta'
      ].filter(Boolean);
      
      if (modifiers.length > 0 || e.key.length > 1) {
        // Complex shortcut or special key
        onEnhancedKeyboardEvent({
          type: modifiers.length > 0 ? 'shortcut' : 'key_press',
          key: modifiers.length > 0 ? `${modifiers.join('+')}+${e.key}` : e.key,
          modifiers,
          timestamp: Date.now()
        });
      } else {
        // Regular text
        onEnhancedKeyboardEvent({
          type: 'type_text',
          text: e.key,
          timestamp: Date.now()
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isManualMode, onEnhancedKeyboardEvent]);

  const virtualKeyboardKeys = [
    'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
    'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Enter',
    'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace', 'Space', 'Tab'
  ];

  return (
    <PanelContainer>
      <BrowserControls>
        <NavigationControls>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onGoBack}
            title="Go Back"
          >
            ←
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onRefresh}
            title="Refresh"
          >
            🔄
          </Button>
        </NavigationControls>
        
        <form onSubmit={handleUrlSubmit} style={{ flex: 1, display: 'flex', gap: 'var(--space-3)' }}>
          <UrlBar
            type="text"
            value={currentUrl}
            onChange={handleUrlChange}
            placeholder="Enter URL or search..."
          />
          <Button 
            type="submit"
            variant="primary" 
            size="sm"
          >
            Go
          </Button>
        </form>
        
        <ModeControls>
          <Button 
            variant={isManualMode ? "primary" : "secondary"}
            size="sm"
            onClick={onToggleManualMode}
            title={isManualMode ? "Switch to Auto Mode" : "Switch to Manual Mode"}
          >
            {isManualMode ? "🎮 Remote" : "🤖 Auto"}
          </Button>
          <Button 
            variant={isPaused ? "warning" : "ghost"}
            size="sm"
            onClick={onTogglePause}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? "▶️" : "⏸️"}
          </Button>
          {isManualMode && (
            <PerformanceIndicator quality={streamingQuality}>
              <QualityDot quality={streamingQuality} />
              {frameRate}fps • {latency}ms
            </PerformanceIndicator>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsVirtualKeyboardVisible(!isVirtualKeyboardVisible)}
            title="Toggle Virtual Keyboard"
          >
            ⌨️
          </Button>
        </ModeControls>
      </BrowserControls>
      
      <BrowserCanvas>
        <BrowserFrame>
          <BrowserHeader>
            <TrafficLights>
              <TrafficLight color="#ff5f57" />
              <TrafficLight color="#ffbd2e" />
              <TrafficLight color="#28ca42" />
            </TrafficLights>
          </BrowserHeader>
          
          <BrowserContent>
            {!screenshotSrc && !isLoading ? (
              <EmptyState>
                <div className="icon">🌐</div>
                <div className="title">Enhanced Remote Control Ready</div>
                <div className="subtitle">
                  {isManualMode 
                    ? "Real-time streaming active • Click anywhere to interact"
                    : "Enter a URL above to get started"
                  }
                </div>
              </EmptyState>
            ) : (
              <>
                <Screenshot 
                  ref={canvasRef}
                  isManualMode={isManualMode}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onDoubleClick={handleDoubleClick}
                  onContextMenu={handleContextMenu}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
                <TouchIndicator 
                  x={touchIndicator.x}
                  y={touchIndicator.y}
                  visible={touchIndicator.visible}
                />
                {isLoading && (
                  <LoadingOverlay>
                    <LoadingSpinner />
                    <LoadingText>Loading page...</LoadingText>
                  </LoadingOverlay>
                )}
              </>
            )}
          </BrowserContent>
        </BrowserFrame>
      </BrowserCanvas>

      {/* Virtual Keyboard for Mobile */}
      <VirtualKeyboard visible={isVirtualKeyboardVisible}>
        {virtualKeyboardKeys.map((key, index) => (
          <KeyboardKey
            key={index}
            onClick={() => handleVirtualKey(key)}
            style={{
              gridColumn: key === 'Space' ? 'span 3' : 
                          key === 'Backspace' ? 'span 2' : 
                          key === 'Enter' ? 'span 2' : 'span 1'
            }}
          >
            {key === 'Space' ? '⎵' : 
             key === 'Backspace' ? '⌫' : 
             key === 'Enter' ? '↵' : 
             key === 'Tab' ? '⇥' : key}
          </KeyboardKey>
        ))}
      </VirtualKeyboard>
    </PanelContainer>
  );
};

export default EnhancedCenterPanel; 