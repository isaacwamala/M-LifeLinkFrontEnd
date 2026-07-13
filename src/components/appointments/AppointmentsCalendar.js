import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";

// ─── Config ───────────────────────────────────────────────────────────────────
const TOKEN = localStorage.getItem("access_token");
const API_BASE = API_BASE_URL;
const apiClient = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
});

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const TYPE_CONFIG = {
    consultation: { label: "Consultation", pill: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
    follow_up: { label: "Follow-up", pill: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
    emergency: { label: "Emergency", pill: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300", dot: "bg-red-500" },
    procedure: { label: "Procedure", pill: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
    walk_in: { label: "Walk-in", pill: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300", dot: "bg-gray-400" },
    review: { label: "Review", pill: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
};

const PRIORITY_CONFIG = {
    routine: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
    urgent: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
    emergency: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
};

const STATUS_CONFIG = {
    scheduled: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700",
    confirmed: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700",
    cancelled: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-700",
    completed: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600",
    no_show: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const fmt12 = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`;
};
const today = () => {
    const n = new Date();
    return dateKey(n.getFullYear(), n.getMonth() + 1, n.getDate());
};

// ─── TypeBadge ────────────────────────────────────────────────────────────────
function TypeBadge({ type, small = false }) {
    const cfg = TYPE_CONFIG[type] || { label: type, pill: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" };
    return (
        <span className={`inline-block rounded-full font-medium ${small ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"} ${cfg.pill}`}>
            {cfg.label}
        </span>
    );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const cls = STATUS_CONFIG[status] || "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
    return (
        <span className={`inline-block rounded-full text-xs font-medium px-2.5 py-0.5 ${cls}`}>
            {status}
        </span>
    );
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────
function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );
}

// ─── DayPanel ─────────────────────────────────────────────────────────────────
function DayPanel({ dateStr, appointments, onClose }) {
    if (!dateStr) return null;

    const [y, m, d] = dateStr.split("-").map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString("en-UG", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    return (
        <>
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {appointments.length === 0
                                ? "No appointments"
                                : `${appointments.length} appointment${appointments.length > 1 ? "s" : ""}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
                    {appointments.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2">
                                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-400 dark:text-gray-500">No appointments scheduled for this day</p>
                        </div>
                    ) : (
                        appointments.map((appt) => (
                            <div key={appt.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* Time */}
                                    <div className="min-w-[80px] text-center">
                                        <div className="text-base font-semibold text-gray-800 dark:text-gray-100">{fmt12(appt.start_time)}</div>
                                        <div className="text-sm text-gray-400 dark:text-gray-500">{fmt12(appt.end_time)}</div>
                                        <div className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{appt.duration_minutes}min</div>
                                    </div>
                                    {/* Dot + line */}
                                    <div className="flex flex-col items-center pt-1 gap-1">
                                        <div className={`w-2.5 h-2.5 rounded-full ${TYPE_CONFIG[appt.type]?.dot || "bg-gray-400"}`} />
                                        <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 min-h-[24px]" />
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{appt.patient?.name}</span>
                                            <StatusBadge status={appt.status} />
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1.5">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {appt.doctor?.name}
                                            <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
                                            <span className="text-gray-400 dark:text-gray-500">{appt.appointment_number}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            <TypeBadge type={appt.type} small />
                                            {appt.priority && (
                                                <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[appt.priority]}`}>
                                                    {appt.priority}
                                                </span>
                                            )}
                                            {appt.source && (
                                                <span className="text-sm px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                                    via {appt.source}
                                                </span>
                                            )}
                                        </div>
                                        {appt.notes && (
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 italic line-clamp-2">{appt.notes}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>

    );
}

// ─── CalCell ──────────────────────────────────────────────────────────────────
function CalCell({ day, isCurrentMonth, dateStr, appointments, isToday, isSelected, onClick }) {
    const shown = appointments.slice(0, 2);
    const overflow = appointments.length - 2;

    return (
        <button
            onClick={onClick}
            className={[
                "relative min-h-[88px] p-2 text-left border-b border-r border-gray-100 dark:border-gray-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300 dark:focus:ring-blue-600",
                isCurrentMonth
                    ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                    : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800",
                isSelected ? "ring-2 ring-inset ring-blue-400 bg-blue-50 dark:bg-blue-900/20" : "",
            ].join(" ")}
        >
            <span
                className={[
                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1",
                    isToday
                        ? "bg-blue-600 text-white"
                        : isCurrentMonth
                            ? "text-gray-800 dark:text-gray-200"
                            : "text-gray-300 dark:text-gray-600",
                ].join(" ")}
            >
                {day}
            </span>

            <div className="space-y-0.5">
                {shown.map((a) => {
                    const cfg = TYPE_CONFIG[a.type] || { pill: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300", dot: "bg-gray-400" };
                    return (
                        <div
                            key={a.id}
                            className={`flex items-center gap-1 text-xs rounded px-1.5 py-0.5 truncate font-medium ${cfg.pill}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <span className="truncate">{fmt12(a.start_time)} {a.patient?.name?.split(" ")[0]}</span>
                        </div>
                    );
                })}
                {overflow > 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 pl-1 font-medium">+{overflow} more</div>
                )}
            </div>
        </button>
    );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                </div>
            ))}
        </div>
    );
}

// ─── MonthStats ───────────────────────────────────────────────────────────────
function MonthStats({ grouped }) {
    const all = Object.values(grouped).flat();
    const total = all.length;
    const byType = Object.entries(TYPE_CONFIG).map(([k, v]) => ({
        key: k, label: v.label, dot: v.dot,
        count: all.filter((a) => a.type === k).length,
    })).filter((x) => x.count > 0);

    if (total === 0) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-center">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            </div>
            {byType.slice(0, 3).map((t) => (
                <div key={t.key} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-center">
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.count}</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                        {t.label}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Main Calendar ────────────────────────────────────────────────────────────
export default function AppointmentCalendar({ doctorId = null, refreshTrigger = 0 }) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [grouped, setGrouped] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);

    const todayStr = today();

    const fetchCalendar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { year, month };
            if (doctorId) params.doctor_id = doctorId;
            const { data } = await apiClient.get("/appointments/getCalendarAppointments", { params });
            if (data.success) {
                setGrouped(data.data.appointments || {});
            } else {
                setError("Failed to load appointments.");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Network error — check your connection.");
        } finally {
            setLoading(false);
        }
    }, [year, month, doctorId]);

    useEffect(() => { fetchCalendar(); }, [fetchCalendar, refreshTrigger]);

    const prevMonth = () => {
        if (month === 1) { setYear((y) => y - 1); setMonth(12); }
        else setMonth((m) => m - 1);
        setSelected(null);
    };
    const nextMonth = () => {
        if (month === 12) { setYear((y) => y + 1); setMonth(1); }
        else setMonth((m) => m + 1);
        setSelected(null);
    };
    const goToday = () => {
        const n = new Date();
        setYear(n.getFullYear());
        setMonth(n.getMonth() + 1);
        setSelected(null);
    };

    const firstDow = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrev = new Date(year, month - 1, 0).getDate();
    const cells = [];

    for (let i = firstDow - 1; i >= 0; i--) {
        const d = daysInPrev - i;
        const pm = month - 1 < 1 ? 12 : month - 1;
        const py = month - 1 < 1 ? year - 1 : year;
        cells.push({ day: d, month: pm, year: py, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, month, year, current: true });
    }
    let next = 1;
    while (cells.length % 7 !== 0) {
        const nm = month + 1 > 12 ? 1 : month + 1;
        const ny = month + 1 > 12 ? year + 1 : year;
        cells.push({ day: next++, month: nm, year: ny, current: false });
    }

    const selectedAppts = selected ? (grouped[selected] || []) : [];

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden font-sans">

            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-1">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        aria-label="Previous month"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 min-w-[160px] text-center select-none">
                        {MONTH_NAMES[month - 1]} {year}
                    </h2>

                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        aria-label="Next month"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>


                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchCalendar}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <button
                        onClick={goToday}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                        Today
                    </button>
                </div>
            </div>

            {/* Day panel-Onclick it closes */}
            {selected && (
                <DayPanel
                    dateStr={selected}
                    appointments={selectedAppts}
                    onClose={() => setSelected(null)}
                />
            )}

            {/* Stats */}
            <MonthStats grouped={grouped} />

            {/* Legend */}
            <Legend />

            {/* Error */}
            {error && (
                <div className="mx-4 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Grid */}
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div>
                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                        {DAYS_SHORT.map((d) => (
                            <div
                                key={d}
                                className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-r border-gray-100 dark:border-gray-700/60 last:border-r-0 bg-white dark:bg-gray-900"
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Cells */}
                    <div className="grid grid-cols-7">
                        {cells.map((c, i) => {
                            const ds = dateKey(c.year, c.month, c.day);
                            const appts = c.current ? (grouped[ds] || []) : [];
                            return (
                                <CalCell
                                    key={i}
                                    day={c.day}
                                    dateStr={ds}
                                    isCurrentMonth={c.current}
                                    appointments={appts}
                                    isToday={ds === todayStr}
                                    isSelected={ds === selected}
                                    onClick={() => setSelected(ds === selected ? null : ds)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
}