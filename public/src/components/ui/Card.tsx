import React from 'react';
import styled from 'styled-components';

const CardContainer = styled.div`
  background: white;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
`;

const CardHeaderContainer = styled.div`
  padding: var(--space-6);
  border-bottom: 1px solid var(--neutral-100);
`;

const CardTitleElement = styled.h3`
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--neutral-900);
  margin: 0;
`;

const CardContentContainer = styled.div`
  padding: var(--space-6);
`;

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <CardContainer className={className}>
    {children}
  </CardContainer>
);

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <CardHeaderContainer className={className}>
    {children}
  </CardHeaderContainer>
);

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => (
  <CardTitleElement className={className}>
    {children}
  </CardTitleElement>
);

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => (
  <CardContentContainer className={className}>
    {children}
  </CardContentContainer>
);