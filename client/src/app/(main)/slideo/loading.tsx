import { Loader2 } from 'lucide-react';

export default function SlideoLoading() {
  return (
    <div className="slideo-h flex flex-col items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4 text-white/70">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm font-semibold">Slideo yükleniyor...</span>
      </div>
    </div>
  );
}
