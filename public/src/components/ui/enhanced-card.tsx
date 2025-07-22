import React from 'react';
import styled, { css } from 'styled-components';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  justify?: 'start' | 'center' | 'end' | 'between';
}

const CardContainer = styled.div<{
  $variant: string;
  $padding: string;
  $hover: boolean;
  $interactive: boolean;
}>`
  position: relative;
  border-radius: var(--radius-xl);
  transition: var(--transition-normal);
  overflow: hidden;
  
  ${props => {
    switch (props.$variant) {
      case 'elevated':
        return css`
          background: var(--neutral-0);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--neutral-100);
        `;
      case 'outlined':
        return css`
          background: var(--neutral-0);
          border: 2px solid var(--neutral-200);
          box-shadow: none;
        `;
      case 'glass':
        return css`
          background: var(--gradient-glass);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: var(--shadow-md);
        `;
      case 'gradient':
        return css`
          background: var(--gradient-primary);
          color: var(--neutral-0);
          border: none;
          box-shadow: var(--shadow-lg);
          
          /* Ensure text is readable on gradient */
          * {
            color: inherit;
          }
        `;
      default: // default
        return css`
          background: var(--neutral-0);
          border: 1px solid var(--neutral-200);
          box-shadow: var(--shadow-sm);
        `;
    }
  }}
  
  ${props => {
    switch (props.$padding) {
      case 'none':
        return css`
          padding: 0;
        `;
      case 'sm':
        return css`
          padding: var(--space-4);
        `;
      case 'lg':
        return css`
          padding: var(--space-8);
        `;
      case 'xl':
        return css`
          padding: var(--space-12);
        `;
      default: // md
        return css`
          padding: var(--space-6);
        `;
    }
  }}
  
  ${props => props.$interactive && css`
    cursor: pointer;
    
    &:focus {
      outline: 2px solid var(--primary-500);
      outline-offset: 2px;
    }
  `}
  
  ${props => props.$hover && css`
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${props.$variant === 'glass' ? 'var(--shadow-lg)' : 'var(--shadow-xl)'};
      border-color: ${props.$variant === 'outlined' ? 'var(--primary-300)' : 'var(--neutral-300)'};
    }
  `}
`;

const CardHeaderContainer = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-4);
`;

const CardHeaderContent = styled.div`
  flex: 1;
  min-width: 0; /* Prevent flex item from overflowing */
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: var(--space-4);
  flex-shrink: 0;
`;

const CardTitleElement = styled.h3<{ $size: string }>`
  margin: 0 0 var(--space-1) 0;
  font-weight: var(--font-semibold);
  color: var(--neutral-900);
  line-height: var(--leading-tight);
  
  ${props => {
    switch (props.$size) {
      case 'sm':
        return css`
          font-size: var(--text-base);
        `;
      case 'lg':
        return css`
          font-size: var(--text-xl);
        `;
      case 'xl':
        return css`
          font-size: var(--text-2xl);
        `;
      default: // md
        return css`
          font-size: var(--text-lg);
        `;
    }
  }}
`;

const CardDescriptionElement = styled.p`
  margin: 0;
  font-size: var(--text-sm);
  color: var(--neutral-600);
  line-height: var(--leading-relaxed);
`;

const CardContentContainer = styled.div<{ $padding: string }>`
  ${props => {
    switch (props.$padding) {
      case 'none':
        return css`
          margin: 0;
        `;
      case 'sm':
        return css`
          margin: var(--space-2) 0;
        `;
      case 'lg':
        return css`
          margin: var(--space-8) 0;
        `;
      default: // md
        return css`
          margin: var(--space-4) 0;
        `;
    }
  }}
`;

const CardFooterContainer = styled.div<{ $justify: string }>`
  display: flex;
  align-items: center;
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--neutral-200);
  
  ${props => {
    switch (props.$justify) {
      case 'center':
        return css`
          justify-content: center;
        `;
      case 'end':
        return css`
          justify-content: flex-end;
        `;
      case 'between':
        return css`
          justify-content: space-between;
        `;
      default: // start
        return css`
          justify-content: flex-start;
        `;
    }
  }}
  
  gap: var(--space-3);
`;

export const EnhancedCard: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  interactive = false,
  className,
  onClick,
  ...props
}) => {
  return (
    <CardContainer
      $variant={variant}
      $padding={padding}
      $hover={hover}
      $interactive={interactive}
      className={className}
      onClick={onClick}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      {...props}
    >
      {children}
    </CardContainer>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ 
  children, 
  className, 
  actions 
}) => (
  <CardHeaderContainer className={className}>
    <CardHeaderContent>
      {children}
    </CardHeaderContent>
    {actions && <CardActions>{actions}</CardActions>}
  </CardHeaderContainer>
);

export const CardTitle: React.FC<CardTitleProps> = ({ 
  children, 
  className, 
  size = 'md' 
}) => (
  <CardTitleElement $size={size} className={className}>
    {children}
  </CardTitleElement>
);

export const CardDescription: React.FC<CardDescriptionProps> = ({ 
  children, 
  className 
}) => (
  <CardDescriptionElement className={className}>
    {children}
  </CardDescriptionElement>
);

export const CardContent: React.FC<CardContentProps> = ({ 
  children, 
  className, 
  padding = 'md' 
}) => (
  <CardContentContainer $padding={padding} className={className}>
    {children}
  </CardContentContainer>
);

export const CardFooter: React.FC<CardFooterProps> = ({ 
  children, 
  className, 
  justify = 'start' 
}) => (
  <CardFooterContainer $justify={justify} className={className}>
    {children}
  </CardFooterContainer>
);