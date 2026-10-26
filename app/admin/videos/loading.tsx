export default function VideosLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 w-36 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg ml-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-40 bg-gray-200 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 bg-gray-300 rounded-full" />
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
