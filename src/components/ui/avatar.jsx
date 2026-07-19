import React, { useState } from 'react';

export function Avatar({ children, className = '', glow = false, ...props }) {
  const glowClass = glow ? 'sads-avatar-glow' : '';
  return (
    <div className={`sads-avatar ${glowClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AvatarImage({ src, alt = '', className = '', ...props }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`sads-avatar-img ${className}`}
      {...props}
    />
  );
}

export function AvatarFallback({ children, className = '', ...props }) {
  return (
    <div className={`sads-avatar-fallback ${className}`} {...props}>
      {children}
    </div>
  );
}
