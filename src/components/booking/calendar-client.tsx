'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, Users, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { STATUS_LABELS } from '@/config/constants';
import type { BookingStatus } from '@/types/database';

/* ================================================================
   TYPES
   ================================================================ */
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

type ViewMode = 'resource' | 'month' | 'list';

/* ================================================================
   STATUS STYLING FOR FULLCALENDAR
   ================================================================ */
const FC_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  cho_duyet:        { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  cho_duyet_cap2:   { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  cho_duyet_cap3:   { bg: '#fff7ed', border: '#ea580c', text: '#9a3412' },
  da_duyet:         { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  khong_duyet:      { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  cho_tx_xac_nhan:  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  tx_da_nhan:       { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  tx_tu_choi:       { bg: '#ffe4e6', border: '#f43f5e', text: '#9f1239' },
  san_sang:         { bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' },
  da_hoan_thanh:    { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' },
  da_huy:           { bg: '#f8fafc', border: '#cbd5e1', text: '#94a3b8' },
};

/* ================================================================
   HELPERS
   ================================================================ */
function getWeekDates(base: Date): Date[] {
  const start = new Date(base);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function fmtISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtShort(d: Date): string {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function isToday(d: Date): boolean {
  return d.toDateString() === new Date().toDateString();
}

// Lấy chữ cái đầu của tên gọi (từ cuối cùng) — handle tên 1 từ.
function avatarInitial(name: string | null | undefined): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase();
}

// Parse "HH:mm" thành phút trong ngày. Trả -1 nếu invalid.
function parseTimeMinutes(t: string | null | undefined): number {
  if (!t) return -1;
  const parts = t.split(':');
  if (parts.length < 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

// 2 booking trùng giờ thực sự (overlap), không phải chỉ trùng ngày.
// Nếu thiếu giờ kết thúc → giả định chuyến dài 60 phút để vẫn bắt được conflict.
function hasTimeOverlap(a: CalendarBooking, b: CalendarBooking): boolean {
  const aStart = parseTimeMinutes(a.pickup_time);
  const bStart = parseTimeMinutes(b.pickup_time);
  if (aStart < 0 || bStart < 0) return true; // không rõ giờ → coi như conflict
  let aEnd = parseTimeMinutes(a.end_time);
  let bEnd = parseTimeMinutes(b.end_time);
  if (aEnd <= aStart) aEnd = aStart + 60;
  if (bEnd <= bStart) bEnd = bStart + 60;
  return aStart < bEnd && bStart < aEnd;
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export function CalendarClient({ vehicles, bookings }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('resource');
  const [baseDate, setBaseDate] = useState(new Date());
  const [selected, setSelected] = useState<CalendarBooking | null>(null);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  // A11y: Escape đóng modal, lock body scroll khi modal mở
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected]);

  // Index bookings by vehicle + date
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

  const unassigned = bookings.filter(b => !b.vehicle_id);

  // Conflict detection: cùng xe + cùng ngày + GIỜ THỰC SỰ TRÙNG (overlap).
  // 1 xe có 2 chuyến 8h-10h và 14h-16h → KHÔNG phải conflict.
  const conflicts = useMemo(() => {
    const set = new Set<string>();
    Object.entries(bookingMap).forEach(([key, bks]) => {
      if (bks.length < 2) return;
      for (let i = 0; i < bks.length; i++) {
        for (let j = i + 1; j < bks.length; j++) {
          if (hasTimeOverlap(bks[i], bks[j])) {
            set.add(key);
            return;
          }
        }
      }
    });
    return set;
  }, [bookingMap]);

  // FullCalendar events
  const fcEvents = useMemo(() => {
    return bookings.map(b => {
      const colors = FC_COLORS[b.status] || FC_COLORS.cho_duyet;
      const startDate = b.trip_date + (b.pickup_time ? 'T' + b.pickup_time : '');
      const endDate = b.end_time ? b.trip_date + 'T' + b.end_time : undefined;
      return {
        id: b.id,
        title: `${b.pickup_time || ''} ${b.purpose}`,
        start: startDate,
        end: endDate,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: b,
      };
    });
  }, [bookings]);

  const navigate = useCallback((dir: number) => {
    setBaseDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + dir * 7);
      return next;
    });
  }, []);

  const headerLabel = `${fmtShort(weekDates[0])} — ${fmtShort(weekDates[6])}`;

  return (
    <div className="space-y-4">
      {/* ====== TOOLBAR ====== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Navigation (resource view only) */}
        {viewMode === 'resource' && (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 hover:shadow-sm transition-all">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <button onClick={() => setBaseDate(new Date())} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 transition-all hover:shadow-sm min-w-[200px] text-center">
              {headerLabel}
            </button>
            <button onClick={() => navigate(1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 hover:shadow-sm transition-all">
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>
        )}
        {viewMode !== 'resource' && <div />}

        {/* View toggle */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {([
            { key: 'resource' as ViewMode, icon: LayoutGrid, label: 'Xe' },
            { key: 'month' as ViewMode, icon: Calendar, label: 'Tháng' },
            { key: 'list' as ViewMode, icon: List, label: 'Danh sách' },
          ]).map(v => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all ${
                viewMode === v.key
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <v.icon size={14} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ====== STATS BAR ====== */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[
          { label: 'Chờ duyệt', count: bookings.filter(b => b.status === 'cho_duyet').length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Chờ tài xế', count: bookings.filter(b => b.status === 'cho_tx_xac_nhan').length, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Sẵn sàng', count: bookings.filter(b => b.status === 'san_sang' || b.status === 'tx_da_nhan').length, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { label: 'Chưa phân xe', count: unassigned.length, color: unassigned.length > 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-slate-400 bg-slate-50 border-slate-200' },
        ].map(s => (
          <div key={s.label} className={`flex-shrink-0 px-4 py-2.5 rounded-xl border ${s.color} flex items-center gap-2`}>
            <span className="text-xl font-extrabold">{s.count}</span>
            <span className="text-xs font-medium opacity-80">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ====== RESOURCE VIEW ====== */}
      {viewMode === 'resource' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-800 text-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-44 rounded-tl-2xl">
                  <div className="flex items-center gap-2">
                    <Users size={14} />
                    Phương tiện
                  </div>
                </th>
                {weekDates.map((d, i) => (
                  <th
                    key={fmtISO(d)}
                    className={`px-2 py-3 text-center text-xs font-semibold tracking-wide border-l border-slate-200 ${
                      isToday(d)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    } ${i === 6 ? 'rounded-tr-2xl' : ''}`}
                  >
                    <div className="text-[10px] uppercase opacity-70">{['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]}</div>
                    <div className="text-lg font-extrabold">{d.getDate()}</div>
                    <div className="text-[10px] opacity-60">{d.getMonth() + 1}/{d.getFullYear()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, vi) => (
                <tr key={v.id} className={`group transition-colors ${vi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30`}>
                  <td className={`sticky left-0 z-10 border-b border-r border-slate-200 px-4 py-3 ${vi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} group-hover:bg-blue-50/30`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold ${v.is_available ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'}`}>
                        {v.vehicle_type.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{v.vehicle_type}</div>
                        <div className="text-xs text-slate-400">{v.plate_number} · {v.seat_count} chỗ</div>
                        {!v.is_available && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-red-500 font-semibold">
                            <AlertTriangle size={10} /> Bảo trì
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {weekDates.map(d => {
                    const key = `${v.id}_${fmtISO(d)}`;
                    const cellBookings = bookingMap[key] || [];
                    const hasConflict = conflicts.has(key);
                    return (
                      <td
                        key={fmtISO(d)}
                        className={`border-b border-l border-slate-200 px-1.5 py-1.5 align-top min-w-[110px] ${
                          hasConflict ? 'bg-red-50' : isToday(d) ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {cellBookings.length > 0 ? (
                          <div className="space-y-1">
                            {cellBookings.map(b => {
                              const colors = FC_COLORS[b.status] || FC_COLORS.cho_duyet;
                              return (
                                <button
                                  key={b.id}
                                  onClick={() => setSelected(b)}
                                  className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] leading-snug transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer border"
                                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                                >
                                  <div className="font-bold flex items-center gap-1">
                                    <Clock size={10} /> {b.pickup_time}{b.end_time ? `–${b.end_time}` : ''}
                                  </div>
                                  <div className="truncate opacity-80 mt-0.5">{b.purpose}</div>
                                  {b.driver && (
                                    <div className="truncate opacity-60 mt-0.5 text-[10px]">
                                      Tài xế {b.driver.full_name}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-14 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                          </div>
                        )}
                        {hasConflict && (
                          <div className="text-[9px] text-red-500 font-bold text-center mt-1 flex items-center justify-center gap-0.5">
                            <AlertTriangle size={9} /> Trùng lịch
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
      )}

      {/* ====== MONTH VIEW (FullCalendar) ====== */}
      {viewMode === 'month' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 fc-custom">
          <style>{`
            .fc-custom .fc { font-family: inherit; }
            .fc-custom .fc-toolbar-title { font-size: 16px !important; font-weight: 700; }
            .fc-custom .fc-button { font-size: 12px !important; padding: 6px 12px !important; border-radius: 8px !important; }
            .fc-custom .fc-button-primary { background: #2563eb !important; border: none !important; }
            .fc-custom .fc-button-primary:not(.fc-button-active) { background: #f1f5f9 !important; color: #475569 !important; }
            .fc-custom .fc-event { border-radius: 6px !important; padding: 2px 4px !important; font-size: 11px !important; border-width: 2px !important; cursor: pointer; }
            .fc-custom .fc-daygrid-day-number { font-size: 13px; font-weight: 600; padding: 6px 8px; }
            .fc-custom .fc-day-today { background: #eff6ff !important; }
            .fc-custom .fc-col-header-cell { font-size: 12px; font-weight: 600; padding: 10px 0; }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="vi"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,listWeek',
            }}
            buttonText={{ today: 'Hôm nay', month: 'Tháng', week: 'Tuần', list: 'Danh sách' }}
            events={fcEvents}
            eventClick={(info) => {
              const b = info.event.extendedProps as CalendarBooking;
              setSelected(b);
            }}
            height="auto"
            dayMaxEvents={3}
            moreLinkText={(n) => `+${n} chuyến`}
            firstDay={1}
          />
        </div>
      )}

      {/* ====== LIST VIEW ====== */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {bookings.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Không có chuyến nào trong khoảng thời gian này</p>
            </div>
          ) : (
            bookings.map(b => {
              const colors = FC_COLORS[b.status] || FC_COLORS.cho_duyet;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all hover:border-blue-200 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {STATUS_LABELS[b.status]}
                        </span>
                        <span className="text-xs text-slate-400">{b.requester_department}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{b.purpose}</h4>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {b.trip_date}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {b.pickup_time}{b.end_time ? ` – ${b.end_time}` : ''}</span>
                        <span>{b.passenger_count} người</span>
                      </div>
                    </div>
                    {b.driver && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-slate-700">{b.driver.full_name}</div>
                        <div className="text-xs text-slate-400">{b.vehicle?.plate_number}</div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ====== UNASSIGNED ALERT ====== */}
      {unassigned.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
            <AlertTriangle size={16} />
            Chưa phân công xe — {unassigned.length} yêu cầu
          </h3>
          <div className="space-y-1.5">
            {unassigned.map(b => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className="w-full text-left px-4 py-3 bg-white/80 backdrop-blur rounded-xl border border-amber-100 text-sm hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{b.trip_date}</span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span className="font-medium text-blue-600">{b.pickup_time}</span>
                    <span className="text-slate-400 mx-2">—</span>
                    <span className="text-slate-600">{b.purpose}</span>
                  </div>
                  <span className="text-xs text-slate-400">{b.requester_department}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ====== DETAIL MODAL ====== */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in slide-in-from-bottom"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="calendar-modal-title" className="text-lg font-extrabold text-slate-900">{selected.purpose}</h3>
                <p className="text-sm text-slate-400 mt-0.5">{selected.requester_name} · {selected.requester_department}</p>
              </div>
              <span
                className="text-xs px-3 py-1 rounded-full font-bold flex-shrink-0"
                style={{
                  backgroundColor: (FC_COLORS[selected.status] || FC_COLORS.cho_duyet).bg,
                  color: (FC_COLORS[selected.status] || FC_COLORS.cho_duyet).text,
                }}
              >
                {STATUS_LABELS[selected.status]}
              </span>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Calendar, label: 'Ngày đi', value: selected.trip_date },
                { icon: Clock, label: 'Giờ', value: `${selected.pickup_time}${selected.end_time ? ' – ' + selected.end_time : ''}` },
                { icon: Users, label: 'Số lượng', value: `${selected.passenger_count} người` },
                { icon: MapPin, label: 'Phòng ban', value: selected.requester_department },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-0.5">
                    <item.icon size={11} /> {item.label}
                  </div>
                  <div className="text-sm font-semibold text-slate-800">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Driver + Vehicle */}
            {(selected.driver || selected.vehicle) && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                {selected.driver && (
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      {avatarInitial(selected.driver.full_name)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">Tài xế {selected.driver.full_name}</div>
                      <div className="text-xs text-slate-500">{selected.driver.phone}</div>
                    </div>
                  </div>
                )}
                {selected.vehicle && (
                  <div className="text-sm text-slate-600">
                    {selected.vehicle.vehicle_type} — <span className="font-mono font-bold">{selected.vehicle.plate_number}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
