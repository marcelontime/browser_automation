import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { EnhancedCard, CardHeader, CardTitle, CardContent } from '../ui/enhanced-card';
import { EnhancedButton } from '../ui/enhanced-button';
import { Badge } from '../ui/badge';
import { XIcon } from '../ui/icons';

const ShortcutsModal = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all var(--transition-fast);
`;

const ShortcutsCard = styled(EnhancedCard)`
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  transform: ${props => props.className?.includes('open') ? 'scale(1)' : 'scale(0.95)'};
  transition: transform var(--transition-fast);
`;

const ShortcutsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const ShortcutGroup = styled.div`
  border-bottom: 1px solid var(--neutral-200);
  padding-bottom: var(--space-4);
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const GroupTitle = styled.h4`
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--neutral-700);
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ShortcutItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
`;

const ShortcutDescription = styled.div`
  font-size: var(--text-sm);
  color: var(--neutral-700);
`;

const ShortcutKeys = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

const KeyBadge = styled(Badge)`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-2);
  background: var(--neutral-100);
  color: var(--neutral-700);
  border: 1px solid var(--neutral-300);
`;

const PlusSign = styled.span`
  font-size: var(--text-xs);
  color: var(--neutral-400);
`;

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  description: string;
  keys: string[];
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { description: 'Show keyboard shortcuts', keys: ['?'] },
      { description: 'Search automations', keys: ['Ctrl', 'K'] },
      { description: 'Create new automation', keys: ['Ctrl', 'N'] },
      { description: 'Toggle theme', keys: ['Ctrl', 'Shift', 'T'] },
      { description: 'Focus search', keys: ['/'] },
    ]
  },
  {
    title: 'Recording',
    shortcuts: [
      { description: 'Start/Stop recording', keys: ['Ctrl', 'R'] },
      { description: 'Pause recording', keys: ['Ctrl', 'P'] },
      { description: 'Save recording', keys: ['Ctrl', 'S'] },
      { description: 'Cancel recording', keys: ['Escape'] },
    ]
  },
  {
    title: 'Automation Control',
    shortcuts: [
      { description: 'Run selected automation', keys: ['Enter'] },
      { description: 'Stop all running automations', keys: ['Ctrl', 'Shift', 'S'] },
      { description: 'Edit automation', keys: ['E'] },
      { description: 'Delete automation', keys: ['Delete'] },
      { description: 'Duplicate automation', keys: ['Ctrl', 'D'] },
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { description: 'Navigate up', keys: ['↑'] },
      { description: 'Navigate down', keys: ['↓'] },
      { description: 'Select automation', keys: ['Space'] },
      { description: 'Go to dashboard', keys: ['G', 'D'] },
      { description: 'Go to settings', keys: ['G', 'S'] },
    ]
  },
  {
    title: 'View',
    shortcuts: [
      { description: 'Toggle grid/list view', keys: ['Ctrl', 'Shift', 'V'] },
      { description: 'Filter by status', keys: ['F'] },
      { description: 'Sort by name', keys: ['S', 'N'] },
      { description: 'Sort by date', keys: ['S', 'D'] },
      { description: 'Refresh view', keys: ['Ctrl', 'Shift', 'R'] },
    ]
  }
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  isOpen,
  onClose
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!mounted) return null;

  return (
    <ShortcutsModal isOpen={isOpen} onClick={handleBackdropClick}>
      <ShortcutsCard className={isOpen ? 'open' : ''}>
        <CardHeader actions={
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<XIcon size={16} />}
          />
        }>
          <CardTitle>Keyboard Shortcuts</CardTitle>
        </CardHeader>
        
        <CardContent>
          <ShortcutsList>
            {shortcutGroups.map((group, groupIndex) => (
              <ShortcutGroup key={groupIndex}>
                <GroupTitle>{group.title}</GroupTitle>
                {group.shortcuts.map((shortcut, shortcutIndex) => (
                  <ShortcutItem key={shortcutIndex}>
                    <ShortcutDescription>
                      {shortcut.description}
                    </ShortcutDescription>
                    <ShortcutKeys>
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <KeyBadge size="sm">{key}</KeyBadge>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <PlusSign>+</PlusSign>
                          )}
                        </React.Fragment>
                      ))}
                    </ShortcutKeys>
                  </ShortcutItem>
                ))}
              </ShortcutGroup>
            ))}
          </ShortcutsList>
        </CardContent>
      </ShortcutsCard>
    </ShortcutsModal>
  );
};

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = (callbacks: {
  onCreateAutomation?: () => void;
  onToggleRecording?: () => void;
  onSearch?: () => void;
  onShowShortcuts?: () => void;
  onToggleTheme?: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { ctrlKey, shiftKey, key } = e;

      // Ctrl+N - Create new automation
      if (ctrlKey && !shiftKey && key === 'n') {
        e.preventDefault();
        callbacks.onCreateAutomation?.();
      }

      // Ctrl+R - Toggle recording
      if (ctrlKey && !shiftKey && key === 'r') {
        e.preventDefault();
        callbacks.onToggleRecording?.();
      }

      // Ctrl+K - Search
      if (ctrlKey && !shiftKey && key === 'k') {
        e.preventDefault();
        callbacks.onSearch?.();
      }

      // ? - Show shortcuts
      if (!ctrlKey && !shiftKey && key === '?') {
        e.preventDefault();
        callbacks.onShowShortcuts?.();
      }

      // Ctrl+Shift+T - Toggle theme
      if (ctrlKey && shiftKey && key === 'T') {
        e.preventDefault();
        callbacks.onToggleTheme?.();
      }

      // / - Focus search
      if (!ctrlKey && !shiftKey && key === '/') {
        e.preventDefault();
        callbacks.onSearch?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
};