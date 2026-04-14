export default function CategoriesLoading() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-8 animate-pulse">
      <div className="skeleton h-7 w-40 rounded-xl mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-2">
            <div className="skeleton h-8 w-8 rounded-lg mb-3" />
            <div className="skeleton h-5 w-3/4 rounded-lg" />
            <div className="skeleton h-4 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
