import React, { createContext, useContext, useEffect } from 'react';
import { X } from 'lucide-react';

const DialogContext = createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  const [localOpen, setLocalOpen] = React.useState(false);
  const isOpen = open !== undefined ? open : localOpen;

  const handleOpenChange = (val) => {
    if (onOpenChange) {
      onOpenChange(val);
    }
    if (open === undefined) {
      setLocalOpen(val);
    }
  };

  // Prevent scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <DialogContext.Provider value={{ isOpen, handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ asChild, children, ...props }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogTrigger must be used inside Dialog');

  const handleClick = (e) => {
    if (children.props?.onClick) {
      children.props.onClick(e);
    }
    context.handleOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      ...props
    });
  }

  return (
    <button type="button" onClick={() => context.handleOpenChange(true)} {...props}>
      {children}
    </button>
  );
}

export function DialogContent({ children, className = '', ...props }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogContent must be used inside Dialog');

  if (!context.isOpen) return null;

  return (
    <div className="sads-dialog-overlay" onClick={() => context.handleOpenChange(false)}>
      <div 
        className={`sads-dialog-content ${className}`} 
        onClick={(e) => e.stopPropagation()} 
        {...props}
      >
        {children}
        <button 
          className="sads-dialog-close-btn" 
          onClick={() => context.handleOpenChange(false)}
          title="Close dialog"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function DialogHeader({ children, className = '', ...props }) {
  return (
    <div className={`sads-dialog-header ${className}`} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = '', ...props }) {
  return (
    <h2 className={`sads-dialog-title ${className}`} {...props}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className = '', ...props }) {
  return (
    <p className={`sads-dialog-description ${className}`} {...props}>
      {children}
    </p>
  );
}

export function DialogClose({ children, ...props }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogClose must be used inside Dialog');

  const handleClick = (e) => {
    if (children.props?.onClick) {
      children.props.onClick(e);
    }
    context.handleOpenChange(false);
  };

  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      ...props
    });
  }

  return (
    <button type="button" onClick={() => context.handleOpenChange(false)} {...props}>
      {children}
    </button>
  );
}
