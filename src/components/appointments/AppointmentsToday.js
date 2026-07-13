import { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    Clock,
    User,
    Stethoscope,
    Phone,
    ChevronDown,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Activity,
    UserCheck,
    Timer,
    ClipboardList,
    ArrowRight,
    Loader2,
    TrendingUp,
    Hash,
} from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import { fetchDoctors } from "../patients/patients_helper";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    scheduled: {
        label: "Scheduled",
        color: "text-blue-500 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/30",
        border: "border-blue-200 dark:border-blue-800",
        dot: "bg-blue-500",
        icon: ClipboardList,
    },
    confirmed: {
        label: "Confirmed",
        color: "text-emerald-500 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/30",
        border: "border-emerald-200 dark:border-emerald-800",
        dot: "bg-emerald-500",
        icon: CheckCircle2,
    },
    checked_in: {
        label: "Checked In",
        color: "text-violet-500 dark:text-violet-400",
        bg: "bg-violet-50 dark:bg-violet-900/30",
        border: "border-violet-200 dark:border-violet-800",
        dot: "bg-violet-500",
        icon: UserCheck,
    },
    in_progress: {
        label: "In Progress",
        color: "text-amber-500 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/30",
        border: "border-amber-200 dark:border-amber-800",
        dot: "bg-amber-500",
        icon: Activity,
    },
    completed: {
        label: "Completed",
        color: "text-teal-500 dark:text-teal-400",
        bg: "bg-teal-50 dark:bg-teal-900/30",
        border: "border-teal-200 dark:border-teal-800",
        dot: "bg-teal-500",
        icon: CheckCircle2,
    },
    no_show: {
        label: "No Show",
        color: "text-rose-500 dark:text-rose-400",
        bg: "bg-rose-50 dark:bg-rose-900/30",
        border: "border-rose-200 dark:border-rose-800",
        dot: "bg-rose-500",
        icon: XCircle,
    },
    cancelled: {
        label: "Cancelled",
        color: "text-gray-500 dark:text-gray-400",
        bg: "bg-gray-50 dark:bg-gray-800/50",
        border: "border-gray-200 dark:border-gray-700",
        dot: "bg-gray-400",
        icon: XCircle,
    },
};

const PRIORITY_CONFIG = {
    normal: { label: "Normal", color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
    urgent: { label: "Urgent", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/40" },
    emergency: { label: "Emergency", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/40" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(timeStr) {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
}

function calcAge(dob) {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function flattenAppointments(data) {
    if (!data) return [];
    return Object.values(data).flat();
}

// ── Summary Card ───────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, colorClass, bgClass }) {
    return (
        <div className={`rounded-2xl p-4 border ${bgClass} border-transparent flex items-center gap-3`}>
            <div className={`p-2 rounded-xl ${bgClass}`}>
                <Icon size={16} className={colorClass} />
            </div>
            <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
            </div>
        </div>
    );
}

// ── Appointment Card ───────────────────────────────────────────────────────────
function AppointmentCard({ appt }) {
    const [expanded, setExpanded] = useState(false);
    const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
    const priority = PRIORITY_CONFIG[appt.priority] || PRIORITY_CONFIG.normal;
    const StatusIcon = status.icon;
    const age = calcAge(appt.patient?.dob);

    return (
        <div
            className={`rounded-2xl border ${status.border} bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}
        >
            {/* Top strip */}
            <div className={`h-1 w-full ${status.dot}`} />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${status.bg} flex items-center justify-center flex-shrink-0`}>
                            <User size={18} className={status.color} />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                                {appt.patient?.name || "Unknown Patient"}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {age !== null ? `${age} yrs` : ""}
                                {appt.patient?.phone_number && (
                                    <span className="ml-2 inline-flex items-center gap-1">
                                        <Phone size={10} />
                                        {appt.patient.phone_number}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                            <StatusIcon size={11} />
                            {status.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.bg} ${priority.color}`}>
                            {priority.label}
                        </span>
                    </div>
                </div>

                {/* Time & type row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Clock size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium">{formatTime(appt.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <ArrowRight size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium">{formatTime(appt.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Timer size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium">{appt.duration_minutes} min</span>
                    </div>
                </div>

                {/* Type & source badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium capitalize">
                        {appt.type}
                    </span>
                    {appt.source && (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium capitalize">
                            via {appt.source}
                        </span>
                    )}
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-mono">
                        <Hash size={9} className="inline -mt-0.5" />
                        {appt.appointment_number?.slice(-9)}
                    </span>
                </div>

                {/* Expand toggle */}
                {appt.notes && (
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                        {expanded ? "Hide notes" : "View notes"}
                    </button>
                )}

                {expanded && appt.notes && (
                    <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{appt.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ doctorSelected }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Calendar size={28} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                {doctorSelected ? "No appointments today" : "Select a doctor to view today's schedule"}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
                {doctorSelected
                    ? "This doctor has no appointments scheduled for today."
                    : "Choose a doctor from the dropdown above to see their appointment schedule for today."}
            </p>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AppointmentsToday() {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const token = localStorage.getItem("access_token");
    const today = new Date().toLocaleDateString("en-UG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Load doctors
    useEffect(() => {
        fetchDoctors(token).then(setDoctors).catch(() => { });
    
    }, []);

    // Fetch appointments
    const fetchAppointments = useCallback(
        async (isRefresh = false) => {
            if (!selectedDoctor) return;

            isRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `${API_BASE_URL}appointments/appointmentsToday?doctor_id=${parseInt(selectedDoctor, 10)}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`);
                }

                const json = await res.json();
                setData(json);

            } catch (err) {
                setError(err.message || "Failed to fetch appointments");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [selectedDoctor, token]
    );

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const summary = data?.summary || {};
    const appointments = flattenAppointments(data?.data);
    const selectedDoctorName = doctors.find((d) => String(d.id) === String(selectedDoctor))?.name;

    const summaryItems = [
        { label: "Total", value: summary.total ?? 0, icon: TrendingUp, colorClass: "text-indigo-500 dark:text-indigo-400", bgClass: "bg-indigo-50 dark:bg-indigo-900/30" },
        { label: "Scheduled", value: summary.scheduled ?? 0, icon: ClipboardList, colorClass: "text-blue-500 dark:text-blue-400", bgClass: "bg-blue-50 dark:bg-blue-900/30" },
        { label: "Confirmed", value: summary.confirmed ?? 0, icon: CheckCircle2, colorClass: "text-emerald-500 dark:text-emerald-400", bgClass: "bg-emerald-50 dark:bg-emerald-900/30" },
        { label: "Checked In", value: summary.checked_in ?? 0, icon: UserCheck, colorClass: "text-violet-500 dark:text-violet-400", bgClass: "bg-violet-50 dark:bg-violet-900/30" },
        { label: "In Progress", value: summary.in_progress ?? 0, icon: Activity, colorClass: "text-amber-500 dark:text-amber-400", bgClass: "bg-amber-50 dark:bg-amber-900/30" },
        { label: "Completed", value: summary.completed ?? 0, icon: CheckCircle2, colorClass: "text-teal-500 dark:text-teal-400", bgClass: "bg-teal-50 dark:bg-teal-900/30" },
        { label: "No Show", value: summary.no_show ?? 0, icon: XCircle, colorClass: "text-rose-500 dark:text-rose-400", bgClass: "bg-rose-50 dark:bg-rose-900/30" },
        { label: "Cancelled", value: summary.cancelled ?? 0, icon: AlertCircle, colorClass: "text-gray-500 dark:text-gray-400", bgClass: "bg-gray-50 dark:bg-gray-800/50" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
            <div className="w-full px-4 py-8">

                {/* ── Page Header ── */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center">
                            <Stethoscope size={16} className="text-white" />
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Reception Desk</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">Today's Appointments</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5">
                        <Calendar size={13} />
                        {today}
                    </p>
                </div>

                {/* ── Doctor Selector ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-6">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Select Doctor
                    </label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Stethoscope size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                            <select
                                value={selectedDoctor}
                                onChange={(e) => { setSelectedDoctor(e.target.value); setData(null); }}
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent appearance-none transition-all cursor-pointer"
                            >
                                <option value="">— Choose a doctor —</option>
                                {doctors.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                        </div>
                        <button
                            onClick={() => fetchAppointments(true)}
                            disabled={!selectedDoctor || refreshing}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-2 text-sm font-semibold transition-all duration-150 shadow-sm"
                        >
                            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                            Refresh
                        </button>
                    </div>
                    {selectedDoctorName && (
                        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                            <User size={11} />
                            Viewing schedule for <span className="font-semibold text-indigo-500 dark:text-indigo-400">{selectedDoctorName}</span>
                        </p>
                    )}
                </div>

                {/* ── Error Banner ── */}
                {error && (
                    <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                        <AlertCircle size={18} className="text-rose-500 dark:text-rose-400 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Failed to load appointments</p>
                            <p className="text-xs text-rose-400 dark:text-rose-500 mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                {/* ── Loading ── */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 size={32} className="text-indigo-500 dark:text-indigo-400 animate-spin" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">Loading appointments…</p>
                    </div>
                )}

                {/* ── Content ── */}
                {!loading && (
                    <>
                        {/* Summary Grid */}
                        {data && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
                                {summaryItems.map((item) => (
                                    <SummaryCard key={item.label} {...item} />
                                ))}
                            </div>
                        )}

                        {/* Appointments list or Empty state */}
                        {!selectedDoctor || (!loading && !data) ? (
                            <EmptyState doctorSelected={!!selectedDoctor} />
                        ) : appointments.length === 0 ? (
                            <EmptyState doctorSelected={true} />
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Appointment List
                                    </h2>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full font-medium">
                                        {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {appointments.map((appt) => (
                                        <AppointmentCard key={appt.id} appt={appt} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}