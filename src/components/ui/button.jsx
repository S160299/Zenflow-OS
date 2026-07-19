import React from 'react';

export function Button({ 
  className = '', 
  variant = 'default', 
  size = 'md', 
  glow = false,
  children, 
  ...props 
}) {
  const baseClass = 'sads-btn';
  const variantClass = `sads-btn-${variant}`;
  const sizeClass = `sads-btn-${size}`;
  const glowClass = glow ? 'sads-btn-glow' : '';
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${sizeClass} ${glowClass} ${className}`}
      {...props}
    >
      <span className="sads-btn-content">{children}</span>
      <span className="sads-btn-shimmer"></span>
    </button>
  );
}
