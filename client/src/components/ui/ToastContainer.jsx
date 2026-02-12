import { Toast } from './Toast';

/**
 * Toast container - beheert alle actieve toasts
 * Max 5 toasts tegelijk (laatste 5)
 */
export function ToastContainer({ toasts, onDismiss }) {
  // Limit to 5 toasts
  const visibleToasts = toasts.slice(-5);

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
