/**
 * Loading Spinner component
 * Vervangt alle duplicate spinner code
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  return (
    <div
      className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Laden"
    />
  );
}
