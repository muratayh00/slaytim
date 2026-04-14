export default function SlideoDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      <div className="skeleton aspect-video rounded-2xl mb-6" />
      <div className="skeleton h-7 w-2/3 rounded-xl mb-3" />
      <div className="skeleton h-4 w-full rounded-xl mb-2" />
      <div className="skeleton h-4 w-3/4 rounded-xl mb-6" />
      <div className="flex gap-3">
        <div className="skeleton h-9 w-20 rounded-xl" />
        <div className="skeleton h-9 w-20 rounded-xl" />
        <div className="skeleton h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}
