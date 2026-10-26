export default function FunnelManageLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 w-36 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg ml-auto" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="min-w-[260px] bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="h-5 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-12 bg-gray-100 rounded" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-3 w-36 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
