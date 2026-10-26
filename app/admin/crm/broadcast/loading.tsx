export default function BroadcastLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 w-44 bg-gray-200 rounded-lg" />
        <div className="h-9 w-32 bg-gray-200 rounded-lg ml-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-24 w-full bg-gray-100 rounded-lg" />
        <div className="h-10 w-full bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
