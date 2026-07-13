import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { fetchDoctors, fetchBasicPatientsInfoForDropDowns } from "../patients/patients_helper";
import CancelAppointment from "./appointments_sub_components/CancelAppointment";
import RescheduleAppointment from "./appointments_sub_components/RescheduleAppointment";
import ConfirmAppointment from "./appointments_sub_components/ConfirmAppointment";
import MarkAppointmentAsNotShownUp from "./appointments_sub_components/MarkAppointmentAsNotShownUp";
import CompleteMarkAppointment from "./appointments_sub_components/CompleteMarkAppointment";

// ─── Helpers ──────────────────────────────────────────────────
const fmtTime = (t) => (t ? t.slice(0, 5) : "—");
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthAgoStr = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); };
const emptyForm = () => ({ patient_id: "", appointment_date: todayStr(), start_time: "", end_time: "", doctor_id: "", type: "consultation", priority: "routine", source: "internal", notes: "" });

// ─── Status constants ──────────────────────────────────────────
const STATUS_ALL        = "all";
const STATUS_SCHEDULED  = "scheduled";
const STATUS_CONFIRMED  = "confirmed";
const STATUS_CHECKED_IN = "checked_in";
const STATUS_IN_PROGRESS = "in_progress";
const STATUS_COMPLETED  = "completed";
const STATUS_CANCELLED  = "cancelled";
const STATUS_NO_SHOW    = "no_show";

// ─── Tab definitions ───────────────────────────────────────────
const TABS = [
  { key: STATUS_ALL,         label: "All" },
  { key: STATUS_SCHEDULED,   label: "Scheduled" },
  { key: STATUS_CONFIRMED,   label: "Confirmed" },
  { key: STATUS_CHECKED_IN,  label: "Checked In" },
  { key: STATUS_IN_PROGRESS, label: "In Progress" },
  { key: STATUS_COMPLETED,   label: "Completed" },
  { key: STATUS_CANCELLED,   label: "Cancelled" },
  { key: STATUS_NO_SHOW,     label: "No Show" },
];

// ─── Helper: status badge classes ─────────────────────────────
const statusClass = (s) =>
({
  [STATUS_SCHEDULED]:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  [STATUS_CONFIRMED]:   "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  [STATUS_CHECKED_IN]:  "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  [STATUS_IN_PROGRESS]: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  [STATUS_COMPLETED]:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  [STATUS_CANCELLED]:   "bg-red-50 text-red-600 ring-1 ring-red-200",
  [STATUS_NO_SHOW]:     "bg-orange-50 text-orange-600 ring-1 ring-orange-200",
}[s] ?? "bg-gray-100 text-gray-500 ring-1 ring-gray-200");

const statusDot = (s) =>
({
  [STATUS_SCHEDULED]:   "bg-blue-500",
  [STATUS_CONFIRMED]:   "bg-violet-500",
  [STATUS_CHECKED_IN]:  "bg-cyan-500",
  [STATUS_IN_PROGRESS]: "bg-amber-500",
  [STATUS_COMPLETED]:   "bg-emerald-500",
  [STATUS_CANCELLED]:   "bg-red-500",
  [STATUS_NO_SHOW]:     "bg-orange-500",
}[s] ?? "bg-gray-400");

// ─── Helper: tab accent color (underline / active bg) ─────────
const tabAccent = (key) =>
({
  [STATUS_ALL]:         "border-gray-700 dark:border-gray-200 text-gray-800 dark:text-gray-100",
  [STATUS_SCHEDULED]:   "border-blue-500 text-blue-700 dark:text-blue-400",
  [STATUS_CONFIRMED]:   "border-violet-500 text-violet-700 dark:text-violet-400",
  [STATUS_CHECKED_IN]:  "border-cyan-500 text-cyan-700 dark:text-cyan-400",
  [STATUS_IN_PROGRESS]: "border-amber-500 text-amber-700 dark:text-amber-400",
  [STATUS_COMPLETED]:   "border-emerald-500 text-emerald-700 dark:text-emerald-400",
  [STATUS_CANCELLED]:   "border-red-500 text-red-600 dark:text-red-400",
  [STATUS_NO_SHOW]:     "border-orange-500 text-orange-600 dark:text-orange-400",
}[key] ?? "border-gray-500 text-gray-600");

// ─── Helper: tab count badge color ────────────────────────────
const tabCountClass = (key) =>
({
  [STATUS_ALL]:         "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  [STATUS_SCHEDULED]:   "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
  [STATUS_CONFIRMED]:   "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400",
  [STATUS_CHECKED_IN]:  "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400",
  [STATUS_IN_PROGRESS]: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
  [STATUS_COMPLETED]:   "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
  [STATUS_CANCELLED]:   "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  [STATUS_NO_SHOW]:     "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
}[key] ?? "bg-gray-100 text-gray-500");

// ─── Helper: priority badge classes ───────────────────────────
const priorityClass = (p) =>
({
  routine:   "bg-gray-100 text-gray-500",
  normal:    "bg-indigo-50 text-indigo-600",
  urgent:    "bg-amber-50 text-amber-700",
  emergency: "bg-red-50 text-red-600",
}[p] ?? "bg-gray-100 text-gray-500");

// ─── STAT META ─────────────────────────────────────────────────
const STAT_META = [
  { key: STATUS_SCHEDULED,   label: "Scheduled",   accent: "bg-blue-500",    num: "text-blue-600 dark:text-blue-400" },
  { key: STATUS_CONFIRMED,   label: "Confirmed",   accent: "bg-violet-500",  num: "text-violet-600 dark:text-violet-400" },
  { key: STATUS_COMPLETED,   label: "Completed",   accent: "bg-emerald-500", num: "text-emerald-600 dark:text-emerald-400" },
  { key: STATUS_CANCELLED,   label: "Cancelled",   accent: "bg-red-500",     num: "text-red-500 dark:text-red-400" },
];

// ── Reusable field wrapper ──────────────────────────────────
const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
      {label}
    </label>
    {children}
  </div>
);

// ─── Action button config per status ──────────────────────────
// Returns array of action descriptors for a given appointment
const getActions = (a, handlers) => {
  const {
    openEdit,
    setCancelTarget,
    setRescheduleTarget,
    setConfirmTarget,
    setConfirmMarkNoShowTarget,
    setCompleteMarkTarget,
  } = handlers;

  const actions = [];

  // Edit — always visible
  actions.push({
    key: "edit",
    title: "Edit",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    color: "hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400",
    onClick: () => openEdit(a),
  });

  // Reschedule — scheduled or confirmed
  if (a.status === STATUS_SCHEDULED || a.status === STATUS_CONFIRMED) {
    actions.push({
      key: "reschedule",
      title: "Reschedule",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      ),
      color: "hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400",
      onClick: () => setRescheduleTarget(a),
    });
  }

  // Confirm — only for scheduled appointments
  if (a.status === STATUS_SCHEDULED) {
    actions.push({
      key: "confirm",
      title: "Confirm",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" />
        </svg>
      ),
      color: "hover:border-green-300 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400",
      onClick: () => setConfirmTarget(a),
    });
  }

  // Mark as No-Show — only for scheduled or confirmed appointments
  if (a.status === STATUS_SCHEDULED || a.status === STATUS_CONFIRMED) {
    actions.push({
      key: "noshow",
      title: "No-Show",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "hover:border-yellow-300 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400",
      onClick: () => setConfirmMarkNoShowTarget(a),
    });
  }

  // Mark as Complete — only for confirmed appointments
  if (a.status === STATUS_CONFIRMED) {
    actions.push({
      key: "complete",
      title: "Complete",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l3 3 5-5" />
        </svg>
      ),
      color: "hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400",
      onClick: () => setCompleteMarkTarget(a),
    });
  }

  // Cancel — hidden for already-cancelled appointments
  if (a.status !== STATUS_CANCELLED) {
    actions.push({
      key: "cancel",
      title: "Cancel",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      ),
      color: "hover:border-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400",
      onClick: () => setCancelTarget(a),
    });
  }

  return actions;
};

// ─── Per-row dropdown action menu (portal-based) ──────────────
// Renders the dropdown into document.body via a portal so that no
// parent overflow:hidden / overflow-x:auto can clip it.
const itemColour = {
  edit:       "text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400",
  reschedule: "text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-400",
  confirm:    "text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400",
  noshow:     "text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400",
  complete:   "text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400",
  cancel:     "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
};

function ActionMenu({ actions }) {
  const [open, setOpen]     = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef              = useRef(null);
  const dropRef             = useRef(null);

  const mainActions  = actions.filter((a) => a.key !== "cancel");
  const cancelAction = actions.find((a) => a.key === "cancel");

  // Position the portal dropdown relative to the trigger button
  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        // Place below the button; flip upward handled by CSS if near viewport bottom
        top:  rect.bottom + window.scrollY + 4,
        left: rect.right  + window.scrollX - 192, // 192 = w-48 in px
      });
    }
    setOpen((o) => !o);
  };

  // Close on outside click (works across the portal boundary)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on scroll so the menu doesn't drift away from its trigger
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  const dropdown = open && ReactDOM.createPortal(
    <div
      ref={dropRef}
      style={{ top: coords.top, left: coords.left }}
      className="
        fixed z-[9999] w-48
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40
        py-1 overflow-hidden
        animate-fadeInDown
      "
    >
      {mainActions.map((action) => (
        <button
          key={action.key}
          onClick={() => { action.onClick(); setOpen(false); }}
          className={`
            w-full flex items-center gap-2.5 px-3.5 py-2.5
            text-[12.5px] font-medium text-left
            transition-colors duration-100
            ${itemColour[action.key] ?? "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"}
          `}
        >
          <span className="flex-shrink-0 opacity-70">{action.icon}</span>
          {action.title}
        </button>
      ))}

      {cancelAction && (
        <>
          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button
            onClick={() => { cancelAction.onClick(); setOpen(false); }}
            className={`
              w-full flex items-center gap-2.5 px-3.5 py-2.5
              text-[12.5px] font-medium text-left
              transition-colors duration-100
              ${itemColour.cancel}
            `}
          >
            <span className="flex-shrink-0 opacity-70">{cancelAction.icon}</span>
            {cancelAction.title}
          </button>
        </>
      )}
    </div>,
    document.body
  );

  return (
    <div className="flex justify-end">
      <button
        ref={btnRef}
        onClick={openMenu}
        className={`
          w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150
          ${open
            ? "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
          }
        `}
        title="Actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5"  r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────
export default function AppointmentsManager() {
  const token = localStorage.getItem("access_token");
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // List state
  const [appointments, setAppointments] = useState([]);
  const [meta, setMeta] = useState({ total: 0, per_page: 15, current_page: 1, last_page: 1, from: 0, to: 0 });
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  // ── Active status tab ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState(STATUS_ALL);

  // Filters
  const [dateFrom, setDateFrom] = useState(monthAgoStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [page, setPage] = useState(1);

  // Dropdowns
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);

  // Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Drawer states ─────────────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState(null);           // appointment object | null
  const [rescheduleTarget, setRescheduleTarget] = useState(null);   // appointment object | null
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmMarkNoShowTarget, setConfirmMarkNoShowTarget] = useState(null);
  const [completeMarkTarget, setCompleteMarkTarget] = useState(null);

  // ── Load doctors & patients once ────────────────────────────
  useEffect(() => {
    fetchDoctors(token).then(setDoctors).catch(() => { });
    fetchBasicPatientsInfoForDropDowns(token).then(setPatients);
  }, []);

  // ── Fetch appointments ───────────────────────────────────────
  const fetchAppointments = useCallback(async (p = 1) => {
    setLoading(true);
    setListError("");
    try {
      const { data } = await axios.get(`${API_BASE_URL}appointments/getAppointments`, {
        params: { page: p, date_from: dateFrom, date_to: dateTo },
        headers: authHeaders,
      });
      if (data.success) {
        setAppointments(data.data.data);
        setMeta({
          total: data.data.total,
          per_page: data.data.per_page,
          current_page: data.data.current_page,
          last_page: data.data.last_page,
          from: data.data.from,
          to: data.data.to,
        });
      }
    } catch (err) {
      setListError(err?.response?.data?.message || "Failed to load appointments.");
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchAppointments(page); }, [page, fetchAppointments]);

  // ── Filtered appointments by active tab ─────────────────────
  const filteredAppointments = activeTab === STATUS_ALL
    ? appointments
    : appointments.filter((a) => a.status === activeTab);

  // ── Tab count helper ─────────────────────────────────────────
  const tabCount = (key) =>
    key === STATUS_ALL ? appointments.length : appointments.filter((a) => a.status === key).length;

  // ── Modal helpers ────────────────────────────────────────────
  const openAdd = () => { setForm(emptyForm()); setEditTarget(null); setFormError(""); setFormSuccess(""); setShowModal(true); };
  const openEdit = (appt) => {
    setEditTarget(appt);
    setForm({ patient_id: appt.patient.id, appointment_date: appt.appointment_date, start_time: fmtTime(appt.start_time), end_time: fmtTime(appt.end_time), doctor_id: appt.doctor.id, type: appt.type, priority: appt.priority, source: appt.source, notes: appt.notes || "" });
    setFormError(""); setFormSuccess(""); setShowModal(true);
  };

  const resetFilters = () => { setDateFrom(monthAgoStr()); setDateTo(todayStr()); setPage(1); };

  // ── Save / Update ────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.patient_id || !form.appointment_date || !form.start_time || !form.end_time || !form.doctor_id) {
      setFormError("Please fill all required fields."); return;
    }
    setSaving(true); setFormError(""); setFormSuccess("");
    try {
      const isEdit = !!editTarget;
      const url = isEdit ? `${API_BASE_URL}appointments/updateAppointment` : `${API_BASE_URL}appointments/saveNewAppointment`;
      const payload = isEdit ? { id: editTarget.id, ...form } : { ...form };
      const { data } = await axios.post(url, payload, { headers: authHeaders });
      if (data.success) {
        setFormSuccess(isEdit ? "Appointment updated successfully!" : "Appointment created successfully!");
        setTimeout(() => { setShowModal(false); fetchAppointments(page); }, 1000);
      } else throw new Error(data.message || "Request failed.");
    } catch (err) {
      console.error(err);
      setFormError(err?.response?.data?.message || err.message || "An error occurred.");
    }
    setSaving(false);
  };

  // ── Pagination pages ─────────────────────────────────────────
  const pageNumbers = () => Array.from({ length: meta.last_page }, (_, i) => i + 1);

  const inputBase =
    "w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-300 dark:placeholder:text-gray-600";

  const selectBase = inputBase + " appearance-none cursor-pointer";

  // ── Action handlers object passed to getActions ──────────────
  const actionHandlers = {
    openEdit,
    setCancelTarget,
    setRescheduleTarget,
    setConfirmTarget,
    setConfirmMarkNoShowTarget,
    setCompleteMarkTarget,
  };

  // ─── UI ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F6F3] dark:bg-gray-950 px-5 py-7 font-['Sora',sans-serif]">
      <div className="w-full space-y-4">

        {/* ── Top bar ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-gray-900 dark:text-gray-50">
             General  Appointments
            </h1>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5">
              {meta.total} total records
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[.98] text-white text-[13px] font-medium rounded-xl transition-all duration-150 shadow-sm shadow-blue-500/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Appointment
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_META.map(({ key, label, accent, num }) => (
            <div
              key={key}
              className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4 overflow-hidden"
            >
              <span className={`absolute top-0 left-5 right-5 h-[2px] rounded-b-full ${accent}`} />
              <div className={`text-[28px] font-semibold tracking-tight leading-none mt-1 ${num}`}>
                {appointments.filter((a) => a.status === key).length}
              </div>
              <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1.5">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-3.5 flex items-center gap-3 flex-wrap">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mr-1">
            Filter
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400 dark:text-gray-500 whitespace-nowrap">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400 dark:text-gray-500 whitespace-nowrap">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
          <button
            onClick={() => { setPage(1); fetchAppointments(1); }}
            className="px-3.5 py-1.5 text-[12px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
          >
            Apply
          </button>
          <button
            onClick={resetFilters}
            className="px-3.5 py-1.5 text-[12px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Reset
          </button>
        </div>

        {/* ── List error ── */}
        {listError && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl">
            {listError}
          </div>
        )}

        {/* ── Table card ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">

          {/* ── Status Tabs ── */}
          <div className="border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
            <div className="flex items-end min-w-max px-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const count = tabCount(tab.key);
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setPage(1); }}
                    className={`
                      relative group flex items-center gap-2 px-4 py-3.5 text-[12.5px] font-medium whitespace-nowrap transition-all duration-150
                      ${isActive
                        ? `${tabAccent(tab.key)} border-b-2 -mb-px`
                        : "text-gray-400 dark:text-gray-500 border-b-2 border-transparent hover:text-gray-600 dark:hover:text-gray-300"
                      }
                    `}
                  >
                    {tab.label}
                    {/* Count badge — only show if there are appointments in that bucket */}
                    {count > 0 && (
                      <span
                        className={`
                          inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold
                          ${isActive ? tabCountClass(tab.key) : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}
                        `}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#FAFAF8] dark:bg-gray-800/50">
                  {["#", "Patient", "Doctor", "Date & Time", "Status", "Priority", "Actions"].map((h, i) => (
                    <th
                      key={i}
                      className={`px-5 py-3 text-left text-[10.5px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap border-b border-gray-100 dark:border-gray-800 ${i === 6 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-[13px]">Loading appointments…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20">
                      <div className="text-4xl mb-3 opacity-60">📅</div>
                      <div className="text-[14px] font-semibold text-gray-700 dark:text-gray-300">No appointments found</div>
                      <div className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">
                        {activeTab === STATUS_ALL
                          ? "Try adjusting your date range or add a new appointment."
                          : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} appointments in this period.`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((a) => {
                    const actions = getActions(a, actionHandlers);
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-[#FAFAF8] dark:hover:bg-gray-800/20 transition-colors duration-100"
                      >
                        {/* # */}
                        <td className="px-5 py-3.5">
                          <span className="font-['DM_Mono',monospace] text-[11px] text-gray-350 dark:text-gray-500 tracking-wide">
                            {a.appointment_number}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="px-5 py-3.5">
                          <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100 leading-tight">
                            {a.patient?.name}
                          </div>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            ID #{a.patient?.id}
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] text-gray-600 dark:text-gray-300">{a.doctor?.name}</span>
                        </td>

                        {/* Date & Time */}
                        <td className="px-5 py-3.5">
                          <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100 leading-tight">
                            {a.appointment_date}
                          </div>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {fmtTime(a.start_time)} – {fmtTime(a.end_time)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusClass(a.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(a.status)}`} />
                            {a.status.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${priorityClass(a.priority)}`}>
                            {a.priority}
                          </span>
                        </td>

                        {/* Actions — kebab dropdown */}
                        <td className="px-5 py-3.5">
                          <ActionMenu actions={actions} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {!loading && filteredAppointments.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 flex-wrap gap-3">
              <span className="text-[12px] text-gray-400 dark:text-gray-500">
                Showing <span className="font-medium text-gray-600 dark:text-gray-300">{meta.from}–{meta.to}</span> of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span> appointments
              </span>
              <div className="flex gap-1">
                <button
                  disabled={meta.current_page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {pageNumbers().map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12px] font-medium border transition-all duration-150 ${n === meta.current_page
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/25"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                  >
                    {n}
                  </button>
                ))}

                <button
                  disabled={meta.current_page === meta.last_page}
                  onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit / Add Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/10 dark:shadow-black/40 border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
                  {editTarget ? "Update Appointment" : "New Appointment"}
                </h2>
                <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {editTarget ? "Modify the details below" : "Fill in the appointment details"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-[18px] leading-none font-light"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="px-3.5 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-[13px] rounded-xl">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[13px] rounded-xl">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Patient *">
                  <select
                    value={form.patient_id}
                    onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                    className={`${inputBase} disabled:bg-gray-50 dark:disabled:bg-gray-800/30 disabled:text-gray-400 disabled:cursor-not-allowed`}
                  >
                    <option value="">— Select a patient —</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Doctor *">
                  <select
                    value={form.doctor_id}
                    onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                    className={selectBase}
                  >
                    <option value="">Select doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date *">
                  <input type="date" value={form.appointment_date} onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))} className={inputBase} />
                </Field>
                <Field label="Start Time *">
                  <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className={inputBase} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="End Time *">
                  <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} className={inputBase} />
                </Field>
                <Field label="Type">
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={selectBase}>
                    {["consultation", "emergency", "checkup", "surgery", "follow-up"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}

                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={selectBase}>
                    {["routine", "urgent", "emergency"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Source">
                  <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className={selectBase}>
                    {["internal", "walk_in", "referral", "online"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  placeholder="Optional notes…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className={`${inputBase} resize-y leading-relaxed`}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-[13px] font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium bg-blue-600 hover:bg-blue-700 active:scale-[.98] text-white rounded-xl transition-all duration-150 disabled:opacity-60 shadow-sm shadow-blue-500/20"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? "Saving…" : editTarget ? "Update Appointment" : "Save Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Appointment Drawer ── */}
      {cancelTarget && (
        <CancelAppointment
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => {
            setCancelTarget(null);
            fetchAppointments(page);
          }}
        />
      )}

      {/* The reschedule Appointment Drawer */}
      {rescheduleTarget && (
        <RescheduleAppointment
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onReschedule={() => {
            setRescheduleTarget(null);
            fetchAppointments(page);
          }}
        />
      )}

      {/* The confirm Appointment Drawer */}
      {confirmTarget && (
        <ConfirmAppointment
          appointment={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onConfirmed={() => {
            setConfirmTarget(null);
            fetchAppointments(page);
          }}
        />
      )}

      {/* The mark as no-show Drawer */}
      {confirmMarkNoShowTarget && (
        <MarkAppointmentAsNotShownUp
          appointment={confirmMarkNoShowTarget}
          onClose={() => setConfirmMarkNoShowTarget(null)}
          onMarked={() => {
            setConfirmMarkNoShowTarget(null);
            fetchAppointments(page);
          }}
        />
      )}

      {/* The mark as completed Drawer */}
      {completeMarkTarget && (
        <CompleteMarkAppointment
          appointment={completeMarkTarget}
          onClose={() => setCompleteMarkTarget(null)}
          onMarked={() => {
            setCompleteMarkTarget(null);
            fetchAppointments(page);
          }}
        />
      )}
    </div>
  );
}