export default function LandingPagesLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 w-44 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg ml-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-44 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-56 bg-gray-100 rounded" />
              <div className="flex gap-2 mt-3">
                <div className="h-8 w-20 bg-gray-200 rounded-md" />
                <div className="h-8 w-20 bg-gray-200 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
