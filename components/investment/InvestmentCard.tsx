/**
 * Investment Card Component
 * Reusable card for displaying investment data
 */

import React from 'react';

interface InvestmentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}

export const InvestmentCard: React.FC<InvestmentCardProps> = ({
  title,
  children,
  className = '',
  onClick,
  href,
}) => {
  const content = (
    <div
      className={`
        bg-white rounded-lg shadow-md border border-gray-200
        p-6 transition-all duration-200 cursor-pointer
        hover:shadow-lg hover:border-blue-400
        ${className}
      `}
      onClick={onClick}
    >
      <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
      <div className="text-gray-700">{children}</div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block no-underline">
        {content}
      </a>
    );
  }

  return content;
};
