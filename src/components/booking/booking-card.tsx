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
      className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow active:bg-slate-50"
    >
      {/* Tiêu đề */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900">{b.purpose}</h3>
            {b.is_external_vehicle && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                Xe ngoài
              </span>
            )}
            {b.category === 'Đối tác' && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                Đối tác
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {b.requester_name} — {b.requester_department}
          </p>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {/* Chi tiết */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-blue-400 shrink-0" />
          <span className="font-medium">{b.trip_date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-400 shrink-0" />
          <span className="font-medium">{b.pickup_time}{b.end_time ? ` — ${b.end_time}` : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-400 shrink-0" />
          <span>{b.passenger_count} người</span>
        </div>
        {b.flight_number && (
          <div className="flex items-center gap-2">
            <Plane size={16} className="text-blue-400 shrink-0" />
            <span className="font-medium">{b.flight_number}</span>
          </div>
        )}
      </div>

      {/* Lịch trình */}
      {b.itinerary && (
        <div className="mt-3 flex items-start gap-2 text-sm text-slate-500">
          <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <span className="line-clamp-2 leading-relaxed">{b.itinerary}</span>
        </div>
      )}

      {/* Thông tin tài xế / xe */}
      {b.driver && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
            TX
          </div>
          <div>
            <span className="font-semibold text-slate-700">{b.driver.full_name}</span>
            <span className="text-slate-400 mx-2">|</span>
            <span className="text-slate-500">{b.driver.phone}</span>
          </div>
        </div>
      )}
      {b.vehicle && !b.driver && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
          Xe: {b.vehicle.vehicle_type} — {b.vehicle.plate_number}
        </div>
      )}
    </div>
  );
}
