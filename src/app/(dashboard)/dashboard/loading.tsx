import { StatCardSkeleton, BookingCardSkeleton } from '@/components/ui/animations';

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse" />

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <BookingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
