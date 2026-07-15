import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "./../../general/constants";

// ── Predefined quick-reason chips ──────────────────────────────
const QUICK_REASONS = [
  "Scheduling mistake",
  "Patient request",
  "Doctor unavailable",
  "Patient no-show",
  "Duplicate booking",
  "Emergency rescheduling",
];


export default function CancelAppointment({ appointment, onClose, onCancelled }) {
  const token = localStorage.getItem("access_token");

  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(false); // drives CSS transition
  const textareaRef = useRef(null);

  // Animate in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Close with slide-out animation
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleQuickReason = (r) => {
    setReason(r);
    textareaRef.current?.focus();
  };

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError("Please provide a cancellation reason.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}appointments/cancelAppointment`,
        { id: appointment.id, cancel_reason: reason.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setVisible(false);
          setTimeout(() => onCancelled(), 300);
        }, 1200);
      } else {
        throw new Error(data.message || "Cancellation failed.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "An error occurred.");
    }
    setSaving(false);
  };

  if (!appointment) return null;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* ── Drawer ── */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] bg-white dark:bg-gray-900 shadow-2xl shadow-black/15 dark:shadow-black/50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)]"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* ── Red top accent bar ── */}
        <div className="h-[3px] w-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-400 flex-shrink-0" />

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-50 tracking-tight leading-tight">
                Cancel Appointment
              </h2>
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                This action cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-[18px] leading-none font-light flex-shrink-0 mt-0.5"
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Appointment summary card */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4 space-y-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
              Appointment Details
            </div>

            <div className="flex items-center gap-3">
              {/* Avatar placeholder */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0">
                {appointment.patient?.name?.charAt(0) ?? "P"}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                  {appointment.patient?.name}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500">
                  Patient ID #{appointment.patient?.id}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                {
                  icon: (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  ),
                  label: "Date",
                  value: appointment.appointment_date,
                },
                {
                  icon: (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  ),
                  label: "Time",
                  value: `${appointment.start_time?.slice(0, 5)} – ${appointment.end_time?.slice(0, 5)}`,
                },
                {
                  icon: (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ),
                  label: "Doctor",
                  value: appointment.doctor?.name,
                },
                {
                  icon: (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  ),
                  label: "Type",
                  value: appointment.type,
                },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-start gap-2 bg-white dark:bg-gray-800/60 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-700/50"
                >
                  <span className="mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</span>
                  <div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                      {label}
                    </div>
                    <div className="text-[12px] font-medium text-gray-700 dark:text-gray-200 capitalize mt-0.5 leading-tight">
                      {value || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick reasons */}
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5">
              Quick Reason
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => handleQuickReason(r)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all duration-150 ${
                    reason === r
                      ? "bg-red-50 dark:bg-red-900/25 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500 dark:hover:text-red-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Reason textarea */}
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
              Cancellation Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
              rows={4}
              placeholder="Describe why this appointment is being cancelled…"
              className="w-full px-3.5 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 outline-none transition-all duration-150 focus:border-red-400 focus:ring-2 focus:ring-red-400/10 placeholder:text-gray-300 dark:placeholder:text-gray-600 resize-none leading-relaxed"
            />
            <div className="flex justify-between items-center mt-1.5">
              {error ? (
                <span className="text-[11px] text-red-500">{error}</span>
              ) : (
                <span />
              )}
              <span className={`text-[11px] ${reason.length > 200 ? "text-red-400" : "text-gray-300 dark:text-gray-600"}`}>
                {reason.length}/250
              </span>
            </div>
          </div>

          {/* Warning notice */}
          <div className="flex gap-3 px-3.5 py-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50 rounded-xl">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Cancelling will notify the patient and doctor. The appointment slot will be freed for rebooking.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={handleClose}
            disabled={saving || success}
            className="flex-1 py-2.5 text-[13px] font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            Keep Appointment
          </button>
          <button
            onClick={handleCancel}
            disabled={saving || success || !reason.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold bg-red-500 hover:bg-red-600 active:scale-[.98] text-white rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-500/20"
          >
            {success ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Cancelled
              </>
            ) : saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Cancelling…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                Confirm Cancellation
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}