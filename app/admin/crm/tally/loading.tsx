export default function TallyLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="flex gap-2 ml-auto">
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Ledger table skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="h-5 w-36 bg-gray-200 rounded" />
          <div className="h-8 w-40 bg-gray-100 rounded-lg ml-auto" />
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded flex-1" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
