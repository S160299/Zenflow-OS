import React, { createContext, useContext } from 'react';

const TabsContext = createContext(null);

export function Tabs({ 
  value, 
  defaultValue, 
  onValueChange, 
  children, 
  className = '', 
  ...props 
}) {
  const [localValue, setLocalValue] = React.useState(defaultValue);
  const activeValue = value !== undefined ? value : localValue;
  
  const handleValueChange = (newValue) => {
    if (onValueChange) {
      onValueChange(newValue);
    }
    if (value === undefined) {
      setLocalValue(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ activeValue, handleValueChange }}>
      <div className={`sads-tabs ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '', ...props }) {
  return (
    <div className={`sads-tabs-list ${className}`} {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = '', ...props }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used inside Tabs');
  
  const isActive = context.activeValue === value;
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`sads-tabs-trigger ${isActive ? 'active' : ''} ${className}`}
      onClick={() => context.handleValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '', ...props }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used inside Tabs');
  
  const isActive = context.activeValue === value;
  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      className={`sads-tabs-content ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
