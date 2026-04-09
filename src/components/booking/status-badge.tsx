import { STATUS_LABELS, STATUS_COLORS } from '@/config/constants';
import type { BookingStatus } from '@/types/database';

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
        STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
