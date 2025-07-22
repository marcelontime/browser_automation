import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { useBreakpoint, getLayoutConfig } from '../../utils/responsive';
import { EnhancedButton } from '../ui/enhanced-button';
import { MenuIcon, XIcon } from '../ui/icons';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

const LayoutContainer = styled.div<{ $isMobile: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--neutral-50);
  position: relative;
  overflow-x: hidden;
`;

const Header = styled.header<{ $headerHeight: string }>`
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: var(--neutral-0);
  border-bottom: 1px solid var(--neutral-200);
  box-shadow: var(--shadow-sm);
  height: ${props => props.$headerHeight};
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  
  @media (min-width: 768px) {
    padding: 0 var(--space-6);
  }
`;

const MainContainer = styled.div<{ 
  $hasSidebar: boolean; 
  $isMobile: boolean;
  $sidebarWidth: string;
}>`
  display: flex;
  flex: 1;
  position: relative;
  
  ${props => props.$hasSidebar && !props.$isMobile && css`
    padding-left: ${props.$sidebarWidth};
  `}
`;

const Sidebar = styled.aside<{ 
  $isOpen: boolean; 
  $isMobile: boolean;
  $sidebarWidth: string;
}>`
  position: ${props => props.$isMobile ? 'fixed' : 'fixed'};
  top: ${props => props.$isMobile ? '56px' : '64px'};
  left: 0;
  width: ${props => props.$sidebarWidth};
  height: ${props => props.$isMobile ? 'calc(100vh - 56px)' : 'calc(100vh - 64px)'};
  background: var(--neutral-0);
  border-right: 1px solid var(--neutral-200);
  z-index: ${props => props.$isMobile ? 'var(--z-modal)' : 'var(--z-fixed)'};
  overflow-y: auto;
  transition: transform var(--transition-normal);
  
  ${props => props.$isMobile && css`
    transform: translateX(${props.$isOpen ? '0' : '-100%'});
    box-shadow: ${props.$isOpen ? 'var(--shadow-xl)' : 'none'};
  `}
  
  ${props => !props.$isMobile && css`
    transform: translateX(${props.$isOpen ? '0' : '-100%'});
  `}
`;

const SidebarOverlay = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-modal-backdrop);
  opacity: ${props => props.$isVisible ? 1 : 0};
  visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
  transition: all var(--transition-fast);
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const MainContent = styled.main<{ 
  $contentPadding: string;
  $isMobile: boolean;
}>`
  flex: 1;
  padding: ${props => props.$contentPadding};
  min-width: 0; /* Prevent flex item from overflowing */
  
  /* Ensure content doesn't get too wide on large screens */
  max-width: 100%;
  
  ${props => props.$isMobile && css`
    padding: var(--space-4);
  `}
`;

const MobileMenuButton = styled(EnhancedButton)`
  @media (min-width: 768px) {
    display: none;
  }
`;

const SidebarCloseButton = styled(EnhancedButton)`
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 1;
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-4);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex: 1;
  min-width: 0;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
`;

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
  className
}) => {
  const { currentBreakpoint, isMobile, isTablet } = useBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const layoutConfig = getLayoutConfig(currentBreakpoint);

  // Close sidebar on mobile when breakpoint changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen && isMobile) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen, isMobile]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <LayoutContainer $isMobile={isMobile} className={className}>
      {header && (
        <Header $headerHeight={layoutConfig.headerHeight}>
          <HeaderContent>
            <HeaderLeft>
              {sidebar && (
                <MobileMenuButton
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  icon={<MenuIcon size={20} />}
                  aria-label="Toggle sidebar"
                />
              )}
              {header}
            </HeaderLeft>
          </HeaderContent>
        </Header>
      )}

      <MainContainer 
        $hasSidebar={!!sidebar} 
        $isMobile={isMobile}
        $sidebarWidth={layoutConfig.sidebarWidth}
      >
        {sidebar && (
          <>
            <Sidebar
              $isOpen={sidebarOpen}
              $isMobile={isMobile}
              $sidebarWidth={layoutConfig.sidebarWidth}
            >
              <SidebarCloseButton
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                icon={<XIcon size={20} />}
                aria-label="Close sidebar"
              />
              {sidebar}
            </Sidebar>
            
            <SidebarOverlay
              $isVisible={isMobile && sidebarOpen}
              onClick={handleOverlayClick}
            />
          </>
        )}

        <MainContent 
          $contentPadding={layoutConfig.contentPadding}
          $isMobile={isMobile}
        >
          {children}
        </MainContent>
      </MainContainer>
    </LayoutContainer>
  );
};