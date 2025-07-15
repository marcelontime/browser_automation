import React from 'react';
import styled, { css } from 'styled-components';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  style?: React.CSSProperties;
}

const getVariantStyles = (variant: BadgeVariant) => {
  switch (variant) {
    case 'primary':
      return css`
        background: var(--primary-100);
        color: var(--primary-700);
      `;
    case 'secondary':
      return css`
        background: var(--neutral-100);
        color: var(--neutral-700);
      `;
    case 'success':
      return css`
        background: var(--success-50);
        color: var(--success-600);
      `;
    case 'warning':
      return css`
        background: var(--warning-50);
        color: var(--warning-600);
      `;
    case 'error':
      return css`
        background: var(--error-50);
        color: var(--error-600);
      `;
    case 'info':
      return css`
        background: var(--info-50);
        color: var(--info-600);
      `;
    default:
      return '';
  }
};

const getSizeStyles = (size: BadgeSize) => {
  switch (size) {
    case 'sm':
      return css`
        padding: var(--space-1) var(--space-2);
        font-size: var(--text-xs);
      `;
    case 'md':
      return css`
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
      `;
    case 'lg':
      return css`
        padding: var(--space-3) var(--space-4);
        font-size: var(--text-base);
      `;
    default:
      return '';
  }
};

const StyledBadge = styled.span<{ 
  $variant: BadgeVariant; 
  $size: BadgeSize; 
}>`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
  
  ${props => getVariantStyles(props.$variant)}
  ${props => getSizeStyles(props.$size)}
`;

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  className,
  style
}) => {
  return (
    <StyledBadge
      $variant={variant}
      $size={size}
      className={className}
      style={style}
    >
      {children}
    </StyledBadge>
  );
};

// Status Badge for connection states
interface StatusBadgeProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'processing' | 'error';
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { variant: 'success' as const, icon: '✅', text: 'Connected' };
      case 'connecting':
        return { variant: 'warning' as const, icon: '🔄', text: 'Connecting...' };
      case 'disconnected':
        return { variant: 'error' as const, icon: '❌', text: 'Disconnected' };
      case 'processing':
        return { variant: 'info' as const, icon: '🤖', text: 'Processing' };
      case 'error':
        return { variant: 'error' as const, icon: '⚠️', text: 'Error' };
      default:
        return { variant: 'secondary' as const, icon: '❓', text: 'Unknown' };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} size="sm">
      {config.icon} {children || config.text}
    </Badge>
  );
};

export default Badge; 