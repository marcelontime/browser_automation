import React from 'react';
import styled, { css } from 'styled-components';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  rounded?: boolean;
}

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ButtonIcon = styled.span<{ position: 'left' | 'right' }>`
  display: inline-flex;
  align-items: center;
  ${props => props.position === 'left' ? 'margin-right: var(--space-2);' : 'margin-left: var(--space-2);'}
`;

const StyledButton = styled.button<{
  $variant: string;
  $size: string;
  $loading: boolean;
  $fullWidth: boolean;
  $rounded: boolean;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
  font-weight: var(--font-medium);
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: var(--transition-fast);
  outline: none;
  user-select: none;
  white-space: nowrap;
  
  ${props => props.$fullWidth && css`
    width: 100%;
  `}
  
  ${props => props.$rounded ? css`
    border-radius: var(--radius-full);
  ` : css`
    border-radius: var(--radius-lg);
  `}
  
  /* Focus styles */
  &:focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
  }
  
  /* Size variants */
  ${props => {
    switch (props.$size) {
      case 'xs':
        return css`
          padding: var(--space-1-5) var(--space-2-5);
          font-size: var(--text-xs);
          line-height: var(--leading-tight);
          min-height: 24px;
        `;
      case 'sm':
        return css`
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-sm);
          line-height: var(--leading-tight);
          min-height: 32px;
        `;
      case 'lg':
        return css`
          padding: var(--space-4) var(--space-6);
          font-size: var(--text-lg);
          line-height: var(--leading-normal);
          min-height: 48px;
        `;
      case 'xl':
        return css`
          padding: var(--space-5) var(--space-8);
          font-size: var(--text-xl);
          line-height: var(--leading-normal);
          min-height: 56px;
        `;
      default: // md
        return css`
          padding: var(--space-3) var(--space-4);
          font-size: var(--text-base);
          line-height: var(--leading-normal);
          min-height: 40px;
        `;
    }
  }}
  
  /* Color variants */
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return css`
          background: var(--primary-600);
          color: var(--neutral-0);
          box-shadow: var(--shadow-sm);
          
          &:hover:not(:disabled) {
            background: var(--primary-700);
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            background: var(--primary-800);
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
          }
        `;
        
      case 'secondary':
        return css`
          background: var(--neutral-100);
          color: var(--neutral-900);
          border-color: var(--neutral-200);
          box-shadow: var(--shadow-sm);
          
          &:hover:not(:disabled) {
            background: var(--neutral-200);
            border-color: var(--neutral-300);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }
          
          &:active:not(:disabled) {
            background: var(--neutral-300);
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
          }
        `;
        
      case 'outline':
        return css`
          background: transparent;
          color: var(--neutral-700);
          border-color: var(--neutral-300);
          
          &:hover:not(:disabled) {
            background: var(--neutral-50);
            border-color: var(--neutral-400);
            color: var(--neutral-800);
          }
          
          &:active:not(:disabled) {
            background: var(--neutral-100);
            border-color: var(--neutral-500);
          }
        `;
        
      case 'ghost':
        return css`
          background: transparent;
          color: var(--neutral-700);
          border-color: transparent;
          
          &:hover:not(:disabled) {
            background: var(--neutral-100);
            color: var(--neutral-800);
          }
          
          &:active:not(:disabled) {
            background: var(--neutral-200);
          }
        `;
        
      case 'destructive':
        return css`
          background: var(--error-600);
          color: var(--neutral-0);
          box-shadow: var(--shadow-sm);
          
          &:hover:not(:disabled) {
            background: var(--error-700);
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            background: var(--error-800);
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
          }
        `;
        
      case 'success':
        return css`
          background: var(--success-600);
          color: var(--neutral-0);
          box-shadow: var(--shadow-sm);
          
          &:hover:not(:disabled) {
            background: var(--success-700);
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            background: var(--success-800);
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
          }
        `;
        
      case 'warning':
        return css`
          background: var(--warning-600);
          color: var(--neutral-0);
          box-shadow: var(--shadow-sm);
          
          &:hover:not(:disabled) {
            background: var(--warning-700);
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            background: var(--warning-800);
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
          }
        `;
        
      case 'gradient':
        return css`
          background: var(--gradient-primary);
          color: var(--neutral-0);
          border: none;
          box-shadow: var(--shadow-md);
          position: relative;
          overflow: hidden;
          
          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, var(--primary-700) 0%, var(--secondary-700) 100%);
            opacity: 0;
            transition: var(--transition-fast);
          }
          
          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
            
            &::before {
              opacity: 1;
            }
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: var(--shadow-md);
          }
          
          /* Ensure content is above overlay */
          & > * {
            position: relative;
            z-index: 1;
          }
        `;
        
      default:
        return css`
          background: var(--primary-600);
          color: var(--neutral-0);
        `;
    }
  }}
  
  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  /* Loading state */
  ${props => props.$loading && css`
    cursor: wait;
    
    /* Hide text when loading */
    color: transparent;
    
    /* Show spinner */
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      color: ${props.$variant === 'outline' || props.$variant === 'ghost' ? 'var(--primary-600)' : 'var(--neutral-0)'};
    }
  `}
`;

export const EnhancedButton: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className,
  type = 'button',
  title,
  style,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  rounded = false,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    onClick?.(e);
  };

  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $loading={loading}
      $fullWidth={fullWidth}
      $rounded={rounded}
      disabled={disabled || loading}
      onClick={handleClick}
      className={className}
      type={type}
      title={title}
      style={style}
      {...props}
    >
      {!loading && icon && iconPosition === 'left' && (
        <ButtonIcon position="left">{icon}</ButtonIcon>
      )}
      
      {children}
      
      {!loading && icon && iconPosition === 'right' && (
        <ButtonIcon position="right">{icon}</ButtonIcon>
      )}
    </StyledButton>
  );
};