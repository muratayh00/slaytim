import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />;
}

export function TopicCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      <div className="h-1 w-full skeleton rounded-none" />
      <div className="p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-5 w-[85%]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <div className="flex gap-4">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SlideCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      <Skeleton className="aspect-video rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
