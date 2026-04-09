import { StatCardSkeleton, Skeleton } from '@/components/ui/animations';

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-28 bg-slate-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
