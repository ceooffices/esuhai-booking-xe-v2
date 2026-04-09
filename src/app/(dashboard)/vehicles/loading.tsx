import { Skeleton } from '@/components/ui/animations';

export default function VehiclesLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-44 bg-slate-200 rounded-lg animate-pulse" />
      <Skeleton className="h-11 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
