import React from 'react';

export function Slider({ 
  value = [0], 
  onValueChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  className = '', 
  ...props 
}) {
  const val = value[0];
  const percentage = ((val - min) / (max - min)) * 100;

  const handleChange = (e) => {
    const newVal = parseFloat(e.target.value);
    if (onValueChange) {
      onValueChange([newVal]);
    }
  };

  return (
    <div className={`sads-slider-container ${className}`} {...props}>
      <div className="sads-slider-track-bg"></div>
      <div 
        className="sads-slider-track-fill" 
        style={{ width: `${percentage}%` }}
      >
        <div className="sads-slider-glow"></div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={handleChange}
        className="sads-slider-input"
      />
      <div 
        className="sads-slider-thumb"
        style={{ left: `calc(${percentage}% - 6px)` }}
      />
    </div>
  );
}
