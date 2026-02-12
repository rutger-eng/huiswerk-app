/**
 * Skeleton loader voor card layouts
 * Vervangt loading spinners met betere UX
 */
export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 animate-pulse ${className}`}>
      {/* Title skeleton */}
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-4"></div>

      {/* Content lines skeleton */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 bg-gray-200 rounded mb-2 ${
            i === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  );
}
