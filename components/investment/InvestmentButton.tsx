/**
 * Investment Button Component
 * Styled buttons for investment system with theme colors
 */

import React from 'react';

interface InvestmentButtonProps {
  variant?: 'green' | 'blue' | 'red' | 'orange' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  green: 'bg-green-500 hover:bg-green-600 text-white',
  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  red: 'bg-red-500 hover:bg-red-600 text-white',
  orange: 'bg-orange-500 hover:bg-orange-600 text-white',
  ghost: 'bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-100',
};

const sizeStyles = {
  sm: 'px-3 py-1 text-sm rounded',
  md: 'px-4 py-2 text-base rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-lg',
};

export const InvestmentButton: React.FC<InvestmentButtonProps> = ({
  variant = 'blue',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  children,
  onClick,
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        transition-all duration-200
        font-medium
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? '⏳ Loading...' : children}
    </button>
  );
};
