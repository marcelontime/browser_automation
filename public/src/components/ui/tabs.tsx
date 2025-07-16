import React, { createContext, useContext, useState } from 'react';
import styled from 'styled-components';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const TabsContainer = styled.div`
  width: 100%;
`;

const TabsListContainer = styled.div`
  display: flex;
  border-bottom: 1px solid var(--neutral-200);
  background: var(--neutral-50);
`;

const TabsTriggerButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border: none;
  background: ${props => props.active ? 'white' : 'transparent'};
  color: ${props => props.active ? 'var(--primary-600)' : 'var(--neutral-600)'};
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 2px solid ${props => props.active ? 'var(--primary-500)' : 'transparent'};
  
  &:hover {
    background: ${props => props.active ? 'white' : 'var(--neutral-100)'};
    color: ${props => props.active ? 'var(--primary-600)' : 'var(--neutral-700)'};
  }
`;

const TabsContentContainer = styled.div`
  padding: var(--space-4);
`;

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className }) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <TabsContainer className={className}>
      {children}
    </TabsContainer>
  </TabsContext.Provider>
);

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => (
  <TabsListContainer className={className}>
    {children}
  </TabsListContainer>
);

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className }) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component');
  }

  const { value: currentValue, onValueChange } = context;
  const isActive = currentValue === value;

  return (
    <TabsTriggerButton
      active={isActive}
      onClick={() => onValueChange(value)}
      className={className}
    >
      {children}
    </TabsTriggerButton>
  );
};

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }

  const { value: currentValue } = context;

  if (currentValue !== value) {
    return null;
  }

  return (
    <TabsContentContainer className={className}>
      {children}
    </TabsContentContainer>
  );
};