import React from 'react';
import styled from 'styled-components';
import { useTheme } from './theme-provider';
import { SunIcon, MoonIcon, MonitorIcon } from './icons';
import { EnhancedButton } from './enhanced-button';

const ThemeToggleContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

const ThemeDropdown = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--space-2);
  background: var(--neutral-0);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-2);
  min-width: 160px;
  z-index: var(--z-dropdown);
  
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all var(--transition-fast);
`;

const ThemeOption = styled.button<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: ${props => props.isActive ? 'var(--primary-50)' : 'transparent'};
  color: ${props => props.isActive ? 'var(--primary-700)' : 'var(--neutral-700)'};
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: var(--transition-fast);
  
  &:hover {
    background: ${props => props.isActive ? 'var(--primary-100)' : 'var(--neutral-100)'};
    color: ${props => props.isActive ? 'var(--primary-800)' : 'var(--neutral-800)'};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const ThemeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
`;

const ThemeLabel = styled.span`
  flex: 1;
  text-align: left;
`;

interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'dropdown',
  size = 'md'
}) => {
  const { theme, setTheme, actualTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-theme-toggle]')) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const getCurrentIcon = () => {
    switch (actualTheme) {
      case 'dark':
        return <MoonIcon size={16} />;
      case 'light':
        return <SunIcon size={16} />;
      default:
        return <MonitorIcon size={16} />;
    }
  };

  const handleThemeSelect = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    closeDropdown();
  };

  if (variant === 'button') {
    // Simple toggle button that cycles through themes
    const handleToggle = () => {
      const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
      const currentIndex = themes.indexOf(theme);
      const nextIndex = (currentIndex + 1) % themes.length;
      setTheme(themes[nextIndex]);
    };

    return (
      <EnhancedButton
        variant="ghost"
        size={size}
        onClick={handleToggle}
        className={className}
        title={`Current theme: ${theme}`}
        icon={getCurrentIcon()}
      />
    );
  }

  return (
    <ThemeToggleContainer className={className} data-theme-toggle>
      <EnhancedButton
        variant="ghost"
        size={size}
        onClick={toggleDropdown}
        title="Toggle theme"
        icon={getCurrentIcon()}
      />
      
      <ThemeDropdown isOpen={isOpen}>
        <ThemeOption
          isActive={theme === 'light'}
          onClick={() => handleThemeSelect('light')}
        >
          <ThemeIcon>
            <SunIcon size={16} />
          </ThemeIcon>
          <ThemeLabel>Light</ThemeLabel>
        </ThemeOption>
        
        <ThemeOption
          isActive={theme === 'dark'}
          onClick={() => handleThemeSelect('dark')}
        >
          <ThemeIcon>
            <MoonIcon size={16} />
          </ThemeIcon>
          <ThemeLabel>Dark</ThemeLabel>
        </ThemeOption>
        
        <ThemeOption
          isActive={theme === 'system'}
          onClick={() => handleThemeSelect('system')}
        >
          <ThemeIcon>
            <MonitorIcon size={16} />
          </ThemeIcon>
          <ThemeLabel>System</ThemeLabel>
        </ThemeOption>
      </ThemeDropdown>
    </ThemeToggleContainer>
  );
};