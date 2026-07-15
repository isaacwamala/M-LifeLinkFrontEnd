import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../general/constants";

const token = localStorage.getItem("access_token");

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt12 = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`;
};

const TYPE_COLORS = {
    consultation: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    follow_up: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    emergency: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    procedure: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    walk_in: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
    review: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
};

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">{value}</p>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompleteMarkAppointment({ appointment, onClose, onComplete }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);

    if (!appointment) return null;

    //   Handle the completion of appointment
    const handleComplete = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await apiClient.post("appointments/completeAppointment", {
                id: appointment.id,
                status: "confirmed",
            });

            if (data.success) {
                setDone(true);
                setTimeout(() => {
                    onComplete?.();
                }, 1200);
            } else {
                setError(data.message || "Failed to complete mark appointment.");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Network error — please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Format type label
    const typeLabel = appointment.type
        ? appointment.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "—";

    return (
        <>
            {/* ── Backdrop ── */}
            <div
                className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 transition-opacity"
                onClick={!loading ? onClose : undefined}
            />

            {/* ── Modal ── */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                    {/* ── Success state ── */}
                    {done ? (
                        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Appointment Confirmed</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {appointment.patient?.name}'s appointment has been confirmed successfully.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ── Header ── */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Complete Appointment</h2>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.appointment_number}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* ── Body ── */}
                            <div className="px-5 py-4 space-y-4">

                                {/* Intent message */}
                                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <svg className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        You are about to mark this appointment as complete. The status will be updated to <span className="font-semibold">Confirmed</span>.
                                    </p>
                                </div>

                                {/* Appointment details */}
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-1">
                                    <DetailRow
                                        label="Patient"
                                        value={appointment.patient?.name ?? "—"}
                                        icon={
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        }
                                    />
                                    <DetailRow
                                        label="Doctor"
                                        value={appointment.doctor?.name ?? "—"}
                                        icon={
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        }
                                    />
                                    <DetailRow
                                        label="Date"
                                        value={appointment.appointment_date ?? "—"}
                                        icon={
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        }
                                    />
                                    <DetailRow
                                        label="Time"
                                        value={`${fmt12(appointment.start_time)} – ${fmt12(appointment.end_time)} (${appointment.duration_minutes ?? "—"} min)`}
                                        icon={
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        }
                                    />
                                    <DetailRow
                                        label="Type"
                                        value={
                                            <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${TYPE_COLORS[appointment.type] ?? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                                                {typeLabel}
                                            </span>
                                        }
                                        icon={
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
                                            </svg>
                                        }
                                    />
                                    {appointment.notes && (
                                        <DetailRow
                                            label="Notes"
                                            value={appointment.notes}
                                            icon={
                                                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            }
                                        />
                                    )}
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-300">
                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* ── Footer ── */}
                            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-sm font-medium text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Completing appointment…
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Yes, Complete Appointment
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </>
    );
}