import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Global Button Component
 * All buttons across the site use this component
 * Ensures consistent green color, rounded corners, and hover effects
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  // Variant classes
  const variantClasses = {
    // Primary: Solid green button
    primary: `
      bg-green-500 text-white font-semibold
      hover:bg-green-600 active:bg-green-700
      disabled:bg-gray-400 disabled:cursor-not-allowed
      transition-all duration-200 ease-in-out
      shadow-md hover:shadow-lg
    `,

    // Secondary: Light green background
    secondary: `
      bg-green-50 text-green-700 font-semibold
      hover:bg-green-100 active:bg-green-200
      disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
      transition-all duration-200 ease-in-out
    `,

    // Outline: Green border, white background
    outline: `
      bg-white text-green-600 font-semibold border-2 border-green-500
      hover:bg-green-50 hover:border-green-600 active:bg-green-100
      disabled:border-gray-400 disabled:text-gray-400 disabled:cursor-not-allowed
      transition-all duration-200 ease-in-out
    `,

    // Ghost: No background, green text
    ghost: `
      bg-transparent text-green-600 font-medium
      hover:bg-green-50 active:bg-green-100
      disabled:text-gray-400 disabled:cursor-not-allowed
      transition-all duration-200 ease-in-out
    `,
  };

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    rounded-lg font-medium
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
    whitespace-nowrap
  `;

  const fullWidthClass = fullWidth ? 'w-full' : '';
  const loadingClass = loading ? 'opacity-70 pointer-events-none' : '';

  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidthClass}
        ${loadingClass}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;
