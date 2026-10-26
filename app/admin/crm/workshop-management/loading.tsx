export default function WorkshopManagementLoading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Left sidebar - cohort list */}
      <div className="w-72 border-r border-gray-200 bg-white p-4 space-y-3 hidden md:block">
        <div className="h-6 w-40 bg-gray-200 rounded-lg mb-4" />
        <div className="h-9 w-full bg-gray-100 rounded-lg mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-gray-50 space-y-2">
            <div className="h-4 w-36 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 p-6 space-y-6">
        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-6">
          {['Students', 'Recordings', 'Settings', 'Analytics'].map((tab) => (
            <div key={tab} className="h-9 w-24 bg-gray-200 rounded-lg" />
          ))}
        </div>

        {/* Student list skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="h-5 w-28 bg-gray-200 rounded" />
            <div className="h-8 w-48 bg-gray-100 rounded-lg ml-auto" />
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50">
              <div className="h-9 w-9 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-100 rounded" />
              </div>
              <div className="h-7 w-16 bg-gray-200 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
