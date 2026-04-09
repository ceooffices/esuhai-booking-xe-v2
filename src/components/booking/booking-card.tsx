'use client';

import { StatusBadge } from './status-badge';
import { Calendar, Clock, Users, MapPin, Plane } from 'lucide-react';
import type { BookingStatus } from '@/types/database';

interface BookingCardProps {
  booking: {
    id: string;
    requester_name: string;
    requester_department: string;
    purpose: string;
    category: string;
    trip_date: string;
    pickup_time: string;
    end_time: string | null;
    passenger_count: number;
    itinerary: string | null;
    flight_number: string | null;
    member_names: string | null;
    staff_in_charge: string | null;
    status: BookingStatus;
    is_external_vehicle: boolean;
    driver?: { full_name: string; phone: string } | null;
    vehicle?: { plate_number: string; vehicle_type: string } | null;
  };
  onSelect: (id: string) => void;
}

export function BookingCard({ booking, onSelect }: BookingCardProps) {
  const b = booking;

  return (
    <div
      onClick={() => onSelect(b.id)}
      className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow active:bg-slate-50"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{b.purpose}</h3>
            {b.is_external_vehicle && (
              <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                Xe ngoai
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {b.requester_name} — {b.requester_department}
          </p>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {/* Details */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-400" />
          {b.trip_date}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-slate-400" />
          {b.pickup_time}{b.end_time ? ` - ${b.end_time}` : ''}
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-slate-400" />
          {b.passenger_count} nguoi
        </div>
        {b.flight_number && (
          <div className="flex items-center gap-1.5">
            <Plane size={14} className="text-slate-400" />
            {b.flight_number}
          </div>
        )}
      </div>

      {/* Itinerary */}
      {b.itinerary && (
        <div className="mt-2 flex items-start gap-1.5 text-sm text-slate-500">
          <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{b.itinerary}</span>
        </div>
      )}

      {/* Driver/Vehicle info */}
      {b.driver && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-sm">
          <span className="text-slate-500">TX:</span>{' '}
          <span className="font-medium text-slate-700">{b.driver.full_name}</span>
          {b.vehicle && (
            <>
              <span className="text-slate-300 mx-1.5">|</span>
              <span className="text-slate-500">{b.vehicle.vehicle_type} — {b.vehicle.plate_number}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
