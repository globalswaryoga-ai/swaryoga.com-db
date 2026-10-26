export default function CommunityWorkspaceLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-8 w-32 bg-gray-200 rounded-lg ml-auto" />
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <div className="h-32 bg-gray-100 rounded-lg" />
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-56 bg-gray-100 rounded" />
            <div className="flex gap-2">
              <div className="h-7 w-16 bg-gray-200 rounded-md" />
              <div className="h-7 w-16 bg-gray-200 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
