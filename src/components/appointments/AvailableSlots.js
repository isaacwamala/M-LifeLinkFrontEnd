import { useState, useEffect, useCallback } from "react";
import {
  Stethoscope,
  CalendarDays,
  Timer,
  ChevronDown,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  SunMedium,
  Sunset,
  Moon,
  RefreshCw,
  CalendarCheck,
} from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import { fetchDoctors } from "../patients/patients_helper";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getShift(startTime) {
  const h = parseInt(startTime.split(":")[0], 10);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const SHIFT_META = {
  morning: {
    label: "Morning",
    icon: SunMedium,
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-100 dark:border-amber-800/40",
  },
  afternoon: {
    label: "Afternoon",
    icon: Sunset,
    color: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-100 dark:border-orange-800/40",
  },
  evening: {
    label: "Evening",
    icon: Moon,
    color: "text-indigo-500 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-100 dark:border-indigo-800/40",
  },
};

function groupSlotsByShift(slots) {
  const groups = { morning: [], afternoon: [], evening: [] };
  slots.forEach((s) => groups[getShift(s.start_time)].push(s));
  return groups;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

// ── Slot Pill ─────────────────────────────────────────────────────────────────
function SlotPill({ slot, selected, onSelect }) {
  const isSelected = selected?.start_time === slot.start_time;
  return (
    <button
      onClick={() => onSelect(isSelected ? null : slot)}
      className={`group relative flex flex-col items-center gap-0.5 px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-all duration-200 cursor-pointer
        ${
          isSelected
            ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 scale-105"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:scale-105"
        }
      `}
    >
      {isSelected && (
        <CheckCircle2 size={12} className="absolute top-1.5 right-1.5 text-white/80" />
      )}
      <span className="text-base font-bold leading-tight">{formatTime(slot.start_time)}</span>
      <span className={`text-xs font-normal flex items-center gap-1 ${isSelected ? "text-white/70" : "text-gray-400 dark:text-gray-500"}`}>
        <ArrowRight size={10} />
        {formatTime(slot.end_time)}
      </span>
    </button>
  );
}

// ── Shift Section ─────────────────────────────────────────────────────────────
function ShiftSection({ shift, slots, selected, onSelect }) {
  const meta = SHIFT_META[shift];
  const Icon = meta.icon;
  if (!slots.length) return null;
  return (
    <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-4 mb-4`}>
      <div className={`flex items-center gap-2 mb-3 ${meta.color}`}>
        <Icon size={15} />
        <span className="text-xs font-bold uppercase tracking-widest">{meta.label}</span>
        <span className="ml-auto text-xs font-semibold bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full">
          {slots.length} slot{slots.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <SlotPill key={s.start_time} slot={s} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── Selected Slot Banner ──────────────────────────────────────────────────────
function SelectedBanner({ slot, doctorName }) {
  if (!slot) return null;
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 mb-6">
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <CalendarCheck size={20} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-0.5">Selected Slot</p>
        <p className="font-bold text-lg leading-tight">
          {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
        </p>
        {doctorName && <p className="text-xs text-white/70">with Dr. {doctorName} · {slot.duration} min</p>}
      </div>
      <Sparkles size={20} className="text-white/50" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AvailableSlots({ onSlotConfirm }) {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ doctor_id: "", date: "", duration: 60 });
  const [customDuration, setCustomDuration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const token = localStorage.getItem("access_token");

  // Today's date as default min
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
     fetchDoctors(token).then(setDoctors).catch(() => { });
  }, []);

  const isFormReady = form.doctor_id && form.date && form.duration > 0;

  //Fetch available appointment slots based on selected doctors
  const fetchSlots = useCallback(async () => {
    if (!isFormReady) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSelectedSlot(null);
    try {
      const res = await fetch(`${API_BASE_URL}appointments/showAvailableSlots`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctor_id: parseInt(form.doctor_id, 10),
          date: form.date,
          duration: parseInt(form.duration, 10),
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || "Failed to fetch available slots");
    } finally {
      setLoading(false);
    }
  }, [form, isFormReady, token]);

  const selectedDoctorName = doctors.find((d) => String(d.id) === String(form.doctor_id))?.name;
  const grouped = data ? groupSlotsByShift(data.slots || []) : null;

  const handleConfirm = () => {
    if (selectedSlot && onSlotConfirm) {
      onSlotConfirm({ ...selectedSlot, doctor_id: form.doctor_id, date: form.date });
    }
  };

  const inputBase =
    "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <div className="w-full px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center">
              <Clock size={16} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
              Slot Finder
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">Available Appointment Time Slots</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Select a doctor, date, and appointment duration to view free slots.
          </p>
        </div>

        {/* ── Form Card ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-6">
          <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
            Appointment Parameters
          </h2>

          <div className="grid gap-5 sm:grid-cols-3">
            {/* Doctor */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Stethoscope size={12} /> Doctor
              </label>
              <div className="relative">
                <select
                  value={form.doctor_id}
                  onChange={(e) => { setForm((f) => ({ ...f, doctor_id: e.target.value })); setData(null); }}
                  className={`${inputBase} pl-4 pr-8 appearance-none cursor-pointer`}
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <CalendarDays size={12} /> Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={form.date}
                onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); setData(null); }}
                className={inputBase}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Timer size={12} /> Duration (minutes)
              </label>
              {!customDuration ? (
                <div className="relative">
                  <select
                    value={form.duration}
                    onChange={(e) => {
                      if (e.target.value === "custom") { setCustomDuration(true); return; }
                      setForm((f) => ({ ...f, duration: parseInt(e.target.value, 10) }));
                      setData(null);
                    }}
                    className={`${inputBase} pr-8 appearance-none cursor-pointer`}
                  >
                    {DURATION_PRESETS.map((d) => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                    <option value="custom">Custom…</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    placeholder="e.g. 75"
                    value={form.duration || ""}
                    onChange={(e) => { setForm((f) => ({ ...f, duration: parseInt(e.target.value, 10) || "" })); setData(null); }}
                    className={inputBase}
                  />
                  <button
                    onClick={() => { setCustomDuration(false); setForm((f) => ({ ...f, duration: 60 })); }}
                    className="px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Button */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={fetchSlots}
              disabled={!isFormReady || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-sm shadow-teal-200 dark:shadow-teal-900/40"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? "Searching…" : "Find Free Slots"}
            </button>
            {data && (
              <button
                onClick={fetchSlots}
                className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <AlertCircle size={18} className="text-rose-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Could not load slots</p>
              <p className="text-xs text-rose-400 dark:text-rose-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 animate-pulse">
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
                <div className="flex gap-2 flex-wrap">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-16 w-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Results ── */}
        {!loading && data && (
          <>
            {/* Results header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles size={14} className="text-teal-500 dark:text-teal-400" />
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                    Free Slots Available
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {data.total} free slot{data.total !== 1 ? "s" : ""} found
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {selectedDoctorName && <>Dr. {selectedDoctorName} · </>}
                  {new Date(data.date + "T00:00:00").toLocaleDateString("en-UG", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })} · {form.duration} min slots
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-100 dark:border-teal-800/50">
                  <Clock size={11} />
                  {form.duration} min each
                </span>
              </div>
            </div>

            {/* No slots */}
            {data.total === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Clock size={24} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No free slots</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
                  This doctor is fully booked for the selected date and duration. Try a different date or shorter duration.
                </p>
              </div>
            )}

            {/* Selected slot banner */}
            <SelectedBanner slot={selectedSlot} doctorName={selectedDoctorName} />

            {/* Shift groups */}
            {["morning", "afternoon", "evening"].map((shift) => (
              <ShiftSection
                key={shift}
                shift={shift}
                slots={grouped[shift]}
                selected={selectedSlot}
                onSelect={setSelectedSlot}
              />
            ))}

            {/* Confirm button */}
            {selectedSlot && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40"
                >
                  <CalendarCheck size={16} />
                  Use {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}