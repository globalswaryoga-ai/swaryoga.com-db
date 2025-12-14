import React from 'react';

type Props = React.PropsWithChildren<{
  className?: string;
}>;

type CardMediaProps = React.PropsWithChildren<{
  className?: string;
  imageUrl?: string;
  fallbackColor?: string;
  children?: React.ReactNode;
}>;

export default function Card({ children, className }: Props) {
  return <div className={`section-card-smooth ${className ?? ''}`.trim()}>{children}</div>;
}

export function CardMedia({ children, className, imageUrl, fallbackColor = 'from-blue-400 to-blue-600' }: CardMediaProps) {
  const hasImage = imageUrl && imageUrl.trim();
  
  return (
    <div 
      className={`card-media ${className ?? ''}`.trim()}
      style={hasImage ? { backgroundImage: `url('${imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {!hasImage && (
        <div className={`w-full h-full bg-gradient-to-br ${fallbackColor} flex items-center justify-center text-white text-5xl font-bold`}>
          {children}
        </div>
      )}
      {hasImage && children && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/0 flex items-start justify-between p-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function CardBody({ children, className }: Props) {
  return <div className={`${className ?? ''}`.trim()}>{children}</div>;
}

export function CardActions({ children, className }: Props) {
  return <div className={`flex gap-2 mt-3 ${className ?? ''}`.trim()}>{children}</div>;
}
