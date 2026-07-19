import React from 'react';

export function Switch({ 
  checked = false, 
  onCheckedChange, 
  className = '', 
  ...props 
}) {
  const handleToggle = () => {
    if (onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`sads-switch ${checked ? 'checked' : ''} ${className}`}
      onClick={handleToggle}
      {...props}
    >
      <span className="sads-switch-thumb" />
    </button>
  );
}
