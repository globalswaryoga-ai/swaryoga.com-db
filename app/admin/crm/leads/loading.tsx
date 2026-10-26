export default function LeadsLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 w-32 bg-gray-200 rounded-lg" />
        <div className="h-9 w-40 bg-gray-100 rounded-lg ml-auto" />
        <div className="h-9 w-24 bg-gray-200 rounded-lg" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b flex gap-2">
          {['All', 'New', 'Hot', 'Qualified'].map((f) => (
            <div key={f} className="h-8 w-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50">
            <div className="h-4 w-4 bg-gray-200 rounded" />
            <div className="h-9 w-9 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-40 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
