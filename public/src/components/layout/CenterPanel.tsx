import React from 'react';
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

const BrowserCanvas = styled.div`
  position: relative;
  overflow: hidden;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  border: none;
  
  /* Natural browser dimensions - fits content */
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16/10; /* Natural browser aspect ratio */
  margin: 0 auto;
  
  /* Professional browser-like appearance */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      rgba(0, 0, 0, 0.1) 0%, 
      rgba(0, 0, 0, 0.05) 50%, 
      rgba(0, 0, 0, 0.1) 100%);
    z-index: 1;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
`;

const BrowserFrame = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
`;

const BrowserHeader = styled.div`
  height: 40px;
  background: var(--neutral-100);
  border-bottom: 1px solid var(--neutral-200);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
`;

const TrafficLights = styled.div`
  display: flex;
  gap: var(--space-2);
`;

const TrafficLight = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const BrowserContent = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  background: white;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
`;

const Screenshot = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  border: none;
  background: white;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
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

const ModeControls = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

interface CenterPanelProps {
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
}

const CenterPanel: React.FC<CenterPanelProps> = ({
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
  onScreenshotClick
}) => {
  const [currentUrl, setCurrentUrl] = React.useState(url);
  const screenshotRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    setCurrentUrl(url);
  }, [url]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(currentUrl);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentUrl(e.target.value);
  };

  const handleScreenshotClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isManualMode || !onScreenshotClick || !screenshotRef.current) return;
    
    const rect = screenshotRef.current.getBoundingClientRect();
    const scaleX = screenshotRef.current.naturalWidth / rect.width;
    const scaleY = screenshotRef.current.naturalHeight / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    console.log(`Manual click at coordinates: (${x}, ${y})`);
    onScreenshotClick(x, y);
  };

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
            {isManualMode ? "🤖 Auto" : "👤 Manual"}
          </Button>
          <Button 
            variant={isPaused ? "warning" : "ghost"}
            size="sm"
            onClick={onTogglePause}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? "▶️" : "⏸️"}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSync}
            title="Sync Browser State"
          >
            🔄
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onPageInfo}
            title="Page Info"
          >
            📄
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
                <div className="title">Ready to Automate</div>
                <div className="subtitle">Enter a URL above to get started</div>
              </EmptyState>
            ) : (
              <>
                {screenshotSrc && (
                  <Screenshot 
                    ref={screenshotRef}
                    src={screenshotSrc} 
                    alt="Browser Screenshot"
                    onClick={handleScreenshotClick}
                    style={{ 
                      cursor: isManualMode ? 'crosshair' : 'default',
                      userSelect: 'none'
                    }}
                  />
                )}
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
      
      {/* Additional content area to show browser doesn't take full height */}
      <div style={{ 
        marginTop: 'var(--space-6)', 
        padding: 'var(--space-4)',
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
        color: 'var(--neutral-600)',
        fontSize: 'var(--text-sm)'
      }}>
        <div style={{ marginBottom: 'var(--space-2)', fontWeight: 'var(--font-medium)' }}>
          🎯 Browser Automation Controls
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onToggleManualMode} style={{ 
            padding: 'var(--space-2) var(--space-3)', 
            border: '1px solid var(--neutral-300)', 
            borderRadius: 'var(--radius-md)',
            background: isManualMode ? 'var(--primary-50)' : 'white',
            color: isManualMode ? 'var(--primary-700)' : 'var(--neutral-700)',
            cursor: 'pointer'
          }}>
            {isManualMode ? '🎯 Manual Mode ON' : '🤖 Auto Mode'}
          </button>
          <button onClick={onSync} style={{ 
            padding: 'var(--space-2) var(--space-3)', 
            border: '1px solid var(--neutral-300)', 
            borderRadius: 'var(--radius-md)',
            background: 'white',
            color: 'var(--neutral-700)',
            cursor: 'pointer'
          }}>
            🔄 Sync Browser
          </button>
          <button onClick={onPageInfo} style={{ 
            padding: 'var(--space-2) var(--space-3)', 
            border: '1px solid var(--neutral-300)', 
            borderRadius: 'var(--radius-md)',
            background: 'white',
            color: 'var(--neutral-700)',
            cursor: 'pointer'
          }}>
            ℹ️ Page Info
          </button>
        </div>
      </div>
    </PanelContainer>
  );
};

export default CenterPanel; 