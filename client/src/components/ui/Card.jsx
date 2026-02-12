/**
 * Card component - basis voor alle card layouts
 */
export function Card({
  children,
  title,
  subtitle,
  hoverable = false,
  className = '',
  ...props
}) {
  const baseClasses = 'bg-white rounded-lg shadow-md';
  const hoverClasses = hoverable ? 'hover:shadow-lg transition-shadow cursor-pointer' : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`} {...props}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-200">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
