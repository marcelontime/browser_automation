import React from 'react';
import styled, { css } from 'styled-components';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
}

const BadgeContainer = styled.span<{
  $variant: string;
  $size: string;
  $dot: boolean;
  $pulse: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition: var(--transition-fast);
  position: relative;
  
  ${props => {
    if (props.$dot) {
      return css`
        width: 8px;
        height: 8px;
        padding: 0;
        border-radius: 50%;
      `;
    }
    
    switch (props.$size) {
      case 'sm':
        return css`
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
          line-height: var(--leading-none);
          min-height: 20px;
        `;
      case 'lg':
        return css`
          padding: var(--space-2) var(--space-4);
          font-size: var(--text-sm);
          line-height: var(--leading-tight);
          min-height: 32px;
        `;
      default: // md
        return css`
          padding: var(--space-1-5) var(--space-3);
          font-size: var(--text-xs);
          line-height: var(--leading-tight);
          min-height: 24px;
        `;
    }
  }}
  
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return css`
          background: var(--primary-600);
          color: var(--neutral-0);
        `;
      case 'secondary':
        return css`
          background: var(--secondary-600);
          color: var(--neutral-0);
        `;
      case 'success':
        return css`
          background: var(--success-100);
          color: var(--success-800);
          border: 1px solid var(--success-200);
        `;
      case 'warning':
        return css`
          background: var(--warning-100);
          color: var(--warning-800);
          border: 1px solid var(--warning-200);
        `;
      case 'error':
        return css`
          background: var(--error-100);
          color: var(--error-800);
          border: 1px solid var(--error-200);
        `;
      case 'outline':
        return css`
          background: transparent;
          color: var(--neutral-700);
          border: 1px solid var(--neutral-300);
        `;
      default: // default
        return css`
          background: var(--neutral-100);
          color: var(--neutral-800);
          border: 1px solid var(--neutral-200);
        `;
    }
  }}
  
  ${props => props.$pulse && css`
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `}
`;

const BadgeIcon = styled.span`
  display: inline-flex;
  align-items: center;
  margin-right: var(--space-1);
`;

const BadgeContent = styled.span`
  display: inline-flex;
  align-items: center;
`;

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  icon,
  dot = false,
  pulse = false,
  ...props
}) => {
  return (
    <BadgeContainer
      $variant={variant}
      $size={size}
      $dot={dot}
      $pulse={pulse}
      className={className}
      {...props}
    >
      {!dot && (
        <BadgeContent>
          {icon && <BadgeIcon>{icon}</BadgeIcon>}
          {children}
        </BadgeContent>
      )}
    </BadgeContainer>
  );
};