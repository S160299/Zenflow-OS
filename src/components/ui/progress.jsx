import React from 'react';

export function Progress({ value = 0, className = '', ...props }) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  
  return (
    <div className={`sads-progress ${className}`} {...props}>
      <div
        className="sads-progress-fill"
        style={{ transform: `scaleX(${clampedValue / 100})` }}
      >
        <span className="sads-progress-shimmer"></span>
      </div>
    </div>
  );
}
