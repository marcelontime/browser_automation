import React from 'react';
import styled from 'styled-components';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const StyledBadge = styled.span<{ $variant: string; $size: string }>`
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
  line-height: 1;
  transition: all var(--transition-fast);
  
  /* Size variants */
  ${props => {
    switch (props.$size) {
      case 'sm':
        return `
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
        `;
      case 'lg':
        return `
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-sm);
        `;
      default:
        return `
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
        `;
    }
  }}
  
  ${props => {
    switch (props.$variant) {
      case 'default':
        return `
          background: var(--primary-100);
          color: var(--primary-800);
        `;
      case 'secondary':
        return `
          background: var(--neutral-100);
          color: var(--neutral-800);
        `;
      case 'destructive':
        return `
          background: var(--red-100);
          color: var(--red-800);
        `;
      case 'outline':
        return `
          background: transparent;
          color: var(--neutral-700);
          border: 1px solid var(--neutral-300);
        `;
      default:
        return `
          background: var(--primary-100);
          color: var(--primary-800);
        `;
    }
  }}
`;

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  return (
    <StyledBadge $variant={variant} $size={size} className={className} {...props}>
      {children}
    </StyledBadge>
  );
};