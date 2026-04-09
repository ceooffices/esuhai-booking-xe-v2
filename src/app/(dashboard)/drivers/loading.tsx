import { Skeleton } from '@/components/ui/animations';

export default function DriversLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse" />
      <Skeleton className="h-11 w-36" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
