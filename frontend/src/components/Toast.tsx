import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styleConfig = {
    success: {
      bg: 'bg-white border-sage-border text-sage-dark shadow-elevated',
      icon: <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0" />,
      tag: 'bg-sage-light text-sage-dark',
    },
    error: {
      bg: 'bg-white border-crimson-border text-crimson-dark shadow-elevated',
      icon: <AlertCircle className="w-4 h-4 text-crimson flex-shrink-0" />,
      tag: 'bg-crimson-light text-crimson-dark',
    },
    info: {
      bg: 'bg-white border-paper-300 text-ink-800 shadow-elevated',
      icon: <Info className="w-4 h-4 text-accent flex-shrink-0" />,
      tag: 'bg-accent-light text-accent-dark',
    },
  }[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border animate-fade-in ${styleConfig.bg}`}
    >
      {styleConfig.icon}
      <span className="text-xs font-medium pr-1 text-ink-800">{message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="p-1 rounded-md text-ink-400 hover:text-ink-700 hover:bg-paper-100 transition-colors ml-auto"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
