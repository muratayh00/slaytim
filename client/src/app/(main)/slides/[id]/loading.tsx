export default function SlideLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="skeleton h-5 w-48 mb-6 rounded-xl" />
      <div className="skeleton aspect-video rounded-2xl mb-6" />
      <div className="skeleton h-8 w-2/3 rounded-xl mb-4" />
      <div className="skeleton h-4 w-full rounded-xl mb-2" />
      <div className="skeleton h-4 w-3/4 rounded-xl mb-8" />
      <div className="flex gap-3">
        <div className="skeleton h-9 w-24 rounded-xl" />
        <div className="skeleton h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}
