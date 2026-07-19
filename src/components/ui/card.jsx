import React from 'react';

export function Card({ className = '', children, glow = false, hoverEffect = true, ...props }) {
  const hoverClass = hoverEffect ? 'sads-card-hover' : '';
  const glowClass = glow ? 'sads-card-glow' : '';
  return (
    <div className={`sads-card ${hoverClass} ${glowClass} ${className}`} {...props}>
      {children}
      <div className="sads-card-border-glow"></div>
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={`sads-card-header ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3 className={`sads-card-title ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }) {
  return (
    <p className={`sads-card-description ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={`sads-card-content ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div className={`sads-card-footer ${className}`} {...props}>
      {children}
    </div>
  );
}
