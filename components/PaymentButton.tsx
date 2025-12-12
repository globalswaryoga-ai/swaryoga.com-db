import React from 'react';

interface PaymentButtonProps {
  href: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function PaymentButton({
  href,
  label = 'Add to Cart',
  className = '',
  style = {},
}: PaymentButtonProps) {
  const buttonStyle: React.CSSProperties = {
    width: '135px',
    backgroundColor: '#1065b7',
    textAlign: 'center',
    fontWeight: '800',
    padding: '11px 0px',
    color: 'white',
    fontSize: '12px',
    display: 'inline-block',
    textDecoration: 'none',
    borderRadius: '3.229px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    ...style,
  };

  return (
    <div className={className}>
      <a href={href} style={buttonStyle} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </div>
  );
}
