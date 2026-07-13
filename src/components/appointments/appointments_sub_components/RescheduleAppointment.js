import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../general/constants";
import { fetchDoctors } from "../../patients/patients_helper";

// Create the axios instance WITHOUT baking in a token at module-load time.
// (Previously this referenced a `token` variable that was only declared
// inside the component function below — a module-scope ReferenceError on
// import. Also, even if it hadn't crashed, baking the token in once here
// would go stale exactly like the ConfirmAppointment bug.)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Attach a fresh token + content-type on every request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  config.headers.Authorization = `Bearer ${token}`;
  config.headers["Content-Type"] = "application/json";
  return config;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
//Format time from "HH:MM:SS" to "H:MM AM/PM"
const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`;
};

// Base styles for inputs and labels
const inputBase =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors";

const labelBase = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RescheduleAppointment({ appointment, onClose, onReschedule }) {
  const [doctors, setDoctors]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const token = localStorage.getItem("access_token");

  const [form, setForm] = useState({
    appointment_date: appointment?.appointment_date ?? "",
    start_time:       (appointment?.start_time ?? "").slice(0, 5),
    end_time:         (appointment?.end_time ?? "").slice(0, 5),
    doctor_id:        appointment?.doctor_id ?? "",
    notes:            "",
  });

  // Load doctors for dropdown once
  useEffect(() => {
    fetchDoctors(token).then(setDoctors).catch(() => {});
  }, []);

  // Keep form in sync if appointment prop changes
  useEffect(() => {
    if (!appointment) return;
    setForm({
      appointment_date: appointment.appointment_date ?? "",
      start_time:       (appointment.start_time ?? "").slice(0, 5),
      end_time:         (appointment.end_time ?? "").slice(0, 5),
      doctor_id:        appointment.doctor_id ?? "",
      notes:            "",
    });
    setError(null);
    setFieldErrors({});
  }, [appointment?.id]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});

    // Basic client-side guard
    if (!form.appointment_date) return setFieldErrors({ appointment_date: "Date is required." });
    if (!form.start_time)       return setFieldErrors({ start_time: "Start time is required." });
    if (!form.end_time)         return setFieldErrors({ end_time: "End time is required." });
    if (form.start_time >= form.end_time)
      return setFieldErrors({ end_time: "End time must be after start time." });

    setLoading(true);
    try {
      const payload = {
        id:               appointment.id,
        appointment_date: form.appointment_date,
        start_time:       form.start_time,
        end_time:         form.end_time,
        ...(form.doctor_id && { doctor_id: Number(form.doctor_id) }),
        ...(form.notes.trim() && { notes: form.notes.trim() }),
      };

      const { data } = await apiClient.post("appointments/rescheduleAppointment", payload);

      if (data.success) {
        onReschedule?.();
      } else {
        setError(data.message || "Failed to reschedule.");
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])
          )
        );
      }
      setError(err.response?.data?.message || "Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) return null;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* ── Drawer ── */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-white dark:bg-gray-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Reschedule Appointment</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.appointment_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current appointment summary */}
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Current schedule</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Patient: </span>{appointment.patient?.name}
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Doctor: </span>{appointment.doctor?.name ?? "—"}
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Date: </span>{appointment.appointment_date}
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Time: </span>
              {fmt12(appointment.start_time)} – {fmt12(appointment.end_time)}
            </span>
          </div>
        </div>

        {/* Form — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-300">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* New Date */}
          <div>
            <label className={labelBase}>New Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={form.appointment_date}
              min={new Date().toISOString().split("T")[0]}
              onChange={set("appointment_date")}
              className={inputBase}
            />
            {fieldErrors.appointment_date && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.appointment_date}</p>
            )}
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>Start Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={form.start_time}
                onChange={set("start_time")}
                className={inputBase}
              />
              {fieldErrors.start_time && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.start_time}</p>
              )}
            </div>
            <div>
              <label className={labelBase}>End Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={form.end_time}
                onChange={set("end_time")}
                className={inputBase}
              />
              {fieldErrors.end_time && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.end_time}</p>
              )}
            </div>
          </div>

          {/* Duration preview */}
          {form.start_time && form.end_time && form.start_time < form.end_time && (() => {
            const [sh, sm] = form.start_time.split(":").map(Number);
            const [eh, em] = form.end_time.split(":").map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            return (
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
                Duration: <span className="font-medium text-gray-700 dark:text-gray-300">{mins} min</span>
              </p>
            );
          })()}

          {/* Doctor */}
          <div>
            <label className={labelBase}>Doctor</label>
            <select
              value={form.doctor_id}
              onChange={set("doctor_id")}
              className={inputBase}
            >
              <option value="">Keep current doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {fieldErrors.doctor_id && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{fieldErrors.doctor_id}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelBase}>Reason / Notes</label>
            <textarea
              rows={3}
              placeholder="e.g. Patient requested earlier slot, doctor unavailable..."
              value={form.notes}
              onChange={set("notes")}
              className={`${inputBase} resize-none`}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{form.notes.length} / 2000</p>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-sm font-medium text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Rescheduling…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Reschedule
              </>
            )}
          </button>
        </div>

      </div>
    </>
  );
}