import React from 'react';
import styled from 'styled-components';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  style?: React.CSSProperties;
}

const StyledButton = styled.button<{
  $variant: string;
  $size: string;
  disabled?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: all var(--transition-fast);
  cursor: pointer;
  border: 1px solid transparent;
  
  /* Size variants */
  ${props => {
    switch (props.$size) {
      case 'sm':
        return `
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-sm);
          height: 32px;
        `;
      case 'lg':
        return `
          padding: var(--space-4) var(--space-6);
          font-size: var(--text-lg);
          height: 48px;
        `;
      default:
        return `
          padding: var(--space-3) var(--space-4);
          font-size: var(--text-base);
          height: 40px;
        `;
    }
  }}
  
  /* Color variants */
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: var(--primary-600);
          color: white;
          &:hover:not(:disabled) {
            background: var(--primary-700);
          }
          &:active:not(:disabled) {
            background: var(--primary-800);
          }
        `;
      case 'secondary':
        return `
          background: var(--neutral-100);
          color: var(--neutral-900);
          &:hover:not(:disabled) {
            background: var(--neutral-200);
          }
          &:active:not(:disabled) {
            background: var(--neutral-300);
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: var(--neutral-700);
          border-color: var(--neutral-300);
          &:hover:not(:disabled) {
            background: var(--neutral-50);
            border-color: var(--neutral-400);
          }
          &:active:not(:disabled) {
            background: var(--neutral-100);
          }
        `;
      case 'destructive':
        return `
          background: var(--red-600);
          color: white;
          &:hover:not(:disabled) {
            background: var(--red-700);
          }
          &:active:not(:disabled) {
            background: var(--red-800);
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: var(--neutral-700);
          &:hover:not(:disabled) {
            background: var(--neutral-100);
          }
          &:active:not(:disabled) {
            background: var(--neutral-200);
          }
        `;
      case 'warning':
        return `
          background: var(--orange-600);
          color: white;
          &:hover:not(:disabled) {
            background: var(--orange-700);
          }
          &:active:not(:disabled) {
            background: var(--orange-800);
          }
        `;
      case 'error':
        return `
          background: var(--red-600);
          color: white;
          &:hover:not(:disabled) {
            background: var(--red-700);
          }
          &:active:not(:disabled) {
            background: var(--red-800);
          }
        `;
      default:
        return `
          background: var(--primary-600);
          color: white;
          &:hover:not(:disabled) {
            background: var(--primary-700);
          }
        `;
    }
  }}
  
  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className,
  type = 'button',
  title,
  style,
  ...props
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      disabled={disabled}
      onClick={onClick}
      className={className}
      type={type}
      title={title}
      style={style}
      {...props}
    >
      {children}
    </StyledButton>
  );
};