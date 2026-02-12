import { useEffect } from 'react';

/**
 * Toast component - individuele toast notification
 */
export function Toast({ id, message, variant = 'info', onDismiss }) {
  const variants = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✓'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '✕'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ'
    }
  };

  const style = variants[variant];

  useEffect(() => {
    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      className={`${style.bg} ${style.border} ${style.text} border-l-4 p-4 rounded shadow-lg mb-2 flex items-center justify-between animate-slide-in`}
      role="alert"
    >
      <div className="flex items-center">
        <span className="font-bold mr-2 text-lg">{style.icon}</span>
        <span>{message}</span>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="ml-4 text-gray-500 hover:text-gray-700 font-bold"
      >
        ×
      </button>
    </div>
  );
}
