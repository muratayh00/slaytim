export default function TopicsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-8 animate-pulse">
      <div className="skeleton h-7 w-48 rounded-xl mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="skeleton h-5 w-3/4 rounded-lg" />
            <div className="skeleton h-4 w-full rounded-lg" />
            <div className="skeleton h-4 w-2/3 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
