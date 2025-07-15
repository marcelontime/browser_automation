import React from 'react';
import styled from 'styled-components';

interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const getPaddingSize = (padding: string) => {
  switch (padding) {
    case 'sm': return 'var(--space-4)';
    case 'md': return 'var(--space-6)';
    case 'lg': return 'var(--space-8)';
    default: return 'var(--space-6)';
  }
};

const getShadowSize = (shadow: string) => {
  switch (shadow) {
    case 'sm': return 'var(--shadow-sm)';
    case 'md': return 'var(--shadow-md)';
    case 'lg': return 'var(--shadow-lg)';
    case 'xl': return 'var(--shadow-xl)';
    default: return 'var(--shadow-sm)';
  }
};

const StyledCard = styled.div<{ 
  $padding: string; 
  $shadow: string; 
  $hover: boolean;
  $clickable: boolean;
}>`
  background: white;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-xl);
  padding: ${props => getPaddingSize(props.$padding)};
  box-shadow: ${props => getShadowSize(props.$shadow)};
  transition: all var(--transition-fast);
  
  ${props => props.$clickable && `
    cursor: pointer;
  `}
  
  ${props => props.$hover && `
    &:hover {
      border-color: var(--primary-300);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
  `}
`;

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  shadow = 'sm',
  hover = false,
  className,
  style,
  onClick
}) => {
  return (
    <StyledCard
      $padding={padding}
      $shadow={shadow}
      $hover={hover}
      $clickable={!!onClick}
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </StyledCard>
  );
};

export default Card; 