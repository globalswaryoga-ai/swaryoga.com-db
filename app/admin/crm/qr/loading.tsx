export default function QrPageLoading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Chat list sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white p-4 space-y-3 hidden md:block">
        <div className="h-9 w-full bg-gray-100 rounded-lg mb-4" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <div className="h-10 w-10 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-3 w-40 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      {/* Chat content */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full" />
          <div className="h-5 w-32 bg-gray-200 rounded" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`h-12 rounded-xl ${i % 2 === 0 ? 'w-48 bg-gray-100' : 'w-40 bg-indigo-100'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
