import { Skeleton } from '@/components/ui/animations';

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-32 bg-slate-200 rounded-lg animate-pulse" />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-10" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
