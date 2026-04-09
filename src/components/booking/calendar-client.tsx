'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS } from '@/config/constants';
import type { BookingStatus } from '@/types/database';

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  seat_count: number;
  is_available: boolean;
}

interface CalendarBooking {
  id: string;
  purpose: string;
  trip_date: string;
  pickup_time: string;
  end_time: string | null;
  requester_name: string;
  requester_department: string;
  passenger_count: number;
  status: BookingStatus;
  vehicle_id: string | null;
  driver?: { full_name: string; phone: string } | null;
  vehicle?: { plate_number: string; vehicle_type: string } | null;
}

interface Props {
  vehicles: Vehicle[];
  bookings: CalendarBooking[];
}

type ViewMode = 'week' | 'month';

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1)); // Thứ Hai
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getMonthDates(baseDate: Date): Date[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }
  return dates;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtShort(d: Date): string {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function isToday(d: Date): boolean {
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function CalendarClient({ vehicles, bookings }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [baseDate, setBaseDate] = useState(new Date());
  const [selected, setSelected] = useState<CalendarBooking | null>(null);

  const dates = useMemo(
    () => viewMode === 'week' ? getWeekDates(baseDate) : getMonthDates(baseDate),
    [viewMode, baseDate]
  );

  // Index bookings by vehicle_id + date
  const bookingMap = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {};
    bookings.forEach(b => {
      if (!b.vehicle_id) return;
      const key = `${b.vehicle_id}_${b.trip_date}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  // Unassigned bookings (no vehicle)
  const unassigned = bookings.filter(b => !b.vehicle_id);

  function navigate(dir: number) {
    const next = new Date(baseDate);
    if (viewMode === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    setBaseDate(next);
  }

  function goToday() {
    setBaseDate(new Date());
  }

  const headerLabel = viewMode === 'week'
    ? `${fmtShort(dates[0])} — ${fmtShort(dates[dates.length - 1])}`
    : `Tháng ${baseDate.getMonth() + 1}/${baseDate.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Thanh điều khiển */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">{headerLabel}</span>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronRight size={18} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium">
            Hôm nay
          </button>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Tuần
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Tháng
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-500 w-40 z-10">
                Phương tiện
              </th>
              {dates.map(d => (
                <th
                  key={fmtDate(d)}
                  className={`border-b border-r border-slate-200 px-2 py-2 text-center text-xs font-medium min-w-[100px] ${
                    isToday(d) ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  {fmtShort(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id} className="hover:bg-slate-50/50">
                <td className="sticky left-0 bg-white border-b border-r border-slate-200 px-3 py-2 z-10">
                  <div className="text-sm font-medium text-slate-800">{v.vehicle_type}</div>
                  <div className="text-xs text-slate-400">{v.plate_number} — {v.seat_count} chỗ</div>
                </td>
                {dates.map(d => {
                  const key = `${v.id}_${fmtDate(d)}`;
                  const cellBookings = bookingMap[key] || [];
                  return (
                    <td
                      key={fmtDate(d)}
                      className={`border-b border-r border-slate-200 px-1 py-1 align-top ${
                        isToday(d) ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {cellBookings.map(b => (
                        <button
                          key={b.id}
                          onClick={() => setSelected(b)}
                          className={`w-full mb-0.5 px-1.5 py-1 rounded text-[10px] leading-tight text-left truncate block ${
                            STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'
                          }`}
                          title={`${b.pickup_time} ${b.purpose}`}
                        >
                          <span className="font-medium">{b.pickup_time}</span>{' '}
                          <span className="opacity-75">{b.purpose}</span>
                        </button>
                      ))}
                      {cellBookings.length === 0 && (
                        <div className="h-8 flex items-center justify-center">
                          <span className="text-[10px] text-slate-200">—</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chưa phân công */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Chưa phân công xe ({unassigned.length} yêu cầu)
          </h3>
          <div className="space-y-1">
            {unassigned.map(b => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className="w-full text-left px-3 py-2 bg-white rounded-lg border border-amber-200 text-sm hover:bg-amber-50 transition"
              >
                <span className="font-medium text-slate-800">{b.trip_date} {b.pickup_time}</span>
                <span className="text-slate-500 mx-2">—</span>
                <span className="text-slate-600">{b.purpose}</span>
                <span className="text-slate-400 mx-2">|</span>
                <span className="text-slate-500">{b.requester_department}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chi tiết booking */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">{selected.purpose}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3"><span className="text-slate-400 w-24">Ngày đi</span><span className="text-slate-800">{selected.trip_date}</span></div>
              <div className="flex gap-3"><span className="text-slate-400 w-24">Giờ</span><span className="text-slate-800">{selected.pickup_time}{selected.end_time ? ' — ' + selected.end_time : ''}</span></div>
              <div className="flex gap-3"><span className="text-slate-400 w-24">Người yêu cầu</span><span className="text-slate-800">{selected.requester_name}</span></div>
              <div className="flex gap-3"><span className="text-slate-400 w-24">Phòng ban</span><span className="text-slate-800">{selected.requester_department}</span></div>
              <div className="flex gap-3"><span className="text-slate-400 w-24">Số lượng</span><span className="text-slate-800">{selected.passenger_count} người</span></div>
              {selected.driver && <div className="flex gap-3"><span className="text-slate-400 w-24">Tài xế</span><span className="text-slate-800">{selected.driver.full_name} — {selected.driver.phone}</span></div>}
              {selected.vehicle && <div className="flex gap-3"><span className="text-slate-400 w-24">Xe</span><span className="text-slate-800">{selected.vehicle.vehicle_type} — {selected.vehicle.plate_number}</span></div>}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
