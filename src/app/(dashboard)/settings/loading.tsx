import { Skeleton } from '@/components/ui/animations';

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-44 bg-slate-200 rounded-lg animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}
