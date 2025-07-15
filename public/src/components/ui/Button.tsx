import React from 'react';
import styled, { css } from 'styled-components';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'primary':
      return css`
        background: var(--primary-600);
        color: white;
        border: 1px solid var(--primary-600);
        
        &:hover:not(:disabled) {
          background: var(--primary-700);
          border-color: var(--primary-700);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
      `;
    case 'secondary':
      return css`
        background: white;
        color: var(--neutral-700);
        border: 1px solid var(--neutral-300);
        
        &:hover:not(:disabled) {
          background: var(--neutral-50);
          border-color: var(--neutral-400);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
      `;
    case 'success':
      return css`
        background: var(--success-600);
        color: white;
        border: 1px solid var(--success-600);
        
        &:hover:not(:disabled) {
          background: var(--success-700);
          transform: translateY(-1px);
        }
      `;
    case 'error':
      return css`
        background: var(--error-600);
        color: white;
        border: 1px solid var(--error-600);
        
        &:hover:not(:disabled) {
          background: var(--error-700);
          transform: translateY(-1px);
        }
      `;
    case 'ghost':
      return css`
        background: transparent;
        color: var(--neutral-600);
        border: 1px solid transparent;
        
        &:hover:not(:disabled) {
          background: var(--neutral-100);
          color: var(--neutral-700);
        }
      `;
    default:
      return '';
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return css`
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        border-radius: var(--radius-sm);
        min-height: 32px;
      `;
    case 'md':
      return css`
        padding: var(--space-3) var(--space-4);
        font-size: var(--text-base);
        border-radius: var(--radius-md);
        min-height: 40px;
      `;
    case 'lg':
      return css`
        padding: var(--space-4) var(--space-6);
        font-size: var(--text-lg);
        border-radius: var(--radius-lg);
        min-height: 48px;
      `;
    default:
      return '';
  }
};

const StyledButton = styled.button<{ 
  $variant: ButtonVariant; 
  $size: ButtonSize; 
  $loading: boolean 
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-family-sans);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  text-decoration: none;
  white-space: nowrap;
  
  ${props => getVariantStyles(props.$variant)}
  ${props => getSizeStyles(props.$size)}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  ${props => props.$loading && css`
    color: transparent !important;
    
    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  `}
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  style,
  className,
  type = 'button',
  title
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $loading={loading}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      className={className}
      type={type}
      title={title}
    >
      {children}
    </StyledButton>
  );
};

export default Button; 