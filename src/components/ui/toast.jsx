import React, { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext(null);

let toastCount = 0;
let listeners = [];

export const toast = (options) => {
  const id = toastCount++;
  const newToast = {
    id,
    title: options.title || '',
    description: options.description || '',
    variant: options.variant || 'default', // 'default' | 'success' | 'destructive' | 'info'
    duration: options.duration || 4000,
  };
  
  listeners.forEach(cb => cb(newToast));
  return id;
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const addToast = (newToast) => {
      setToasts(prev => [...prev, newToast]);
      
      // Auto remove
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, newToast.duration);
    };

    listeners.push(addToast);
    return () => {
      listeners = listeners.filter(cb => cb !== addToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, removeToast }}>
      {children}
      <div className="sads-toast-container">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`sads-toast sads-toast-${t.variant}`}
            onClick={() => removeToast(t.id)}
          >
            <div className="sads-toast-content">
              {t.title && <div className="sads-toast-title">{t.title}</div>}
              {t.description && <div className="sads-toast-desc">{t.description}</div>}
            </div>
            <button className="sads-toast-close" onClick={(e) => {
              e.stopPropagation();
              removeToast(t.id);
            }}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return {
    toast,
    toasts: context.toasts,
    dismiss: context.removeToast
  };
}
