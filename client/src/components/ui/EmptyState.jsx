/**
 * Empty state component voor lege lijsten/data
 */
export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="text-center py-12">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
