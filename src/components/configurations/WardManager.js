// WardManager.js
// Manages wards and their physical beds.
// Each ward row can be expanded to show/manage that ward's beds inline.
//
// Endpoints:
//   POST   /config/createWard
//   GET    /config/getWards
//   POST   /config/updateWard
//   POST   /config/beds/create
//   GET    /config/beds/for-ward
//   POST   /config/beds/update
//   DELETE /config/beds/delete

import { useState, useEffect, useRef } from "react";
import {
  Building2, Plus, Search, X, Edit2, ChevronRight, ChevronDown,
  Users, Hash, AlertCircle, CheckCircle, XCircle, Loader2,
  BedDouble, RefreshCw, Trash2, Wrench, Circle
} from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import { fetchActiveFacilityBranches, fetchWardsData } from "../general/helpers";

const getToken = () => localStorage.getItem("access_token");

const apiHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
  Accept: "application/json",
});

// ─── Ward status config ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  available: {
    label: "Available",
    icon: CheckCircle,
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    classes: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  },
  maintenance: {
    label: "Maintenance",
    icon: AlertCircle,
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
};

// ─── Bed status config ─────────────────────────────────────────────────────────
const BED_STATUS = {
  available:   { label: "Available",   classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  occupied:    { label: "Occupied",    classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  maintenance: { label: "Maintenance", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
};

const EMPTY_WARD_FORM = { name: "", number: "", branch_id: "", capacity: "", status: "available", daily_rate: "" };

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-gray-400";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Inline bed panel ─────────────────────────────────────────────────────────
function BedPanel({ ward, onToast }) {
  const [beds, setBeds]             = useState([]);
  const [loading, setLoading]       = useState(false);
  // Uncontrolled ref for the add-bed number input — avoids any re-render/stale-closure
  // issue that would silently drop characters in a controlled input.
  const addBedNumRef = useRef(null);
  const [addStatus, setAddStatus]   = useState("available");
  const [addError, setAddError]     = useState("");
  const [adding, setAdding]         = useState(false);

  const [editingBed, setEditingBed] = useState(null);
  const [editBedNum, setEditBedNum] = useState("");
  const [editStatus, setEditStatus] = useState("available");
  const [editError, setEditError]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(null);

  // Plain effect — just depends on ward.id, no useCallback complexity.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `${API_BASE_URL}config/beds/for-ward?ward_id=${ward.id}`,
          { headers: apiHeaders() }
        );
        const data = await res.json();
        if (!cancelled) setBeds(data.data?.beds ?? []);
      } catch {
        if (!cancelled) onToast("Failed to load beds", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ward.id]);

  const reload = async () => {
    setLoading(true);
    try {
      const res  = await fetch(
        `${API_BASE_URL}config/beds/for-ward?ward_id=${ward.id}`,
        { headers: apiHeaders() }
      );
      const data = await res.json();
      setBeds(data.data?.beds ?? []);
    } catch {
      onToast("Failed to load beds", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Add bed ──
  const handleAdd = async () => {
    const bedNumber = addBedNumRef.current?.value?.trim() ?? "";
    if (!bedNumber) { setAddError("Bed number is required."); return; }
    setAdding(true);
    setAddError("");
    try {
      const res  = await fetch(`${API_BASE_URL}config/beds/create`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ ward_id: ward.id, bed_number: bedNumber, status: addStatus }),
      });
      const data = await res.json();
      if (data.success) {
        onToast("Bed added!");
        if (addBedNumRef.current) addBedNumRef.current.value = "";
        setAddStatus("available");
        reload();
      } else {
        setAddError(data.message || "Failed to add bed.");
      }
    } catch {
      setAddError("Network error.");
    } finally {
      setAdding(false);
    }
  };

  // ── Edit bed ──
  const openEdit = (bed) => {
    setEditingBed(bed);
    setEditBedNum(bed.bed_number);
    setEditStatus(bed.status === "occupied" ? "available" : bed.status);
    setEditError("");
  };

  const handleUpdate = async () => {
    if (!editBedNum.trim()) { setEditError("Bed number is required."); return; }
    setSaving(true);
    setEditError("");
    try {
      const res  = await fetch(`${API_BASE_URL}config/beds/update`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ bed_id: editingBed.id, bed_number: editBedNum.trim(), status: editStatus }),
      });
      const data = await res.json();
      if (data.success) {
        onToast("Bed updated!");
        setEditingBed(null);
        reload();
      } else {
        setEditError(data.message || "Failed to update bed.");
      }
    } catch {
      setEditError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete bed ──
  const handleDelete = async (bed) => {
    if (bed.status === "occupied") {
      onToast("Cannot delete an occupied bed — discharge the patient first.", "error");
      return;
    }
    setDeleting(bed.id);
    try {
      const res  = await fetch(`${API_BASE_URL}config/beds/delete`, {
        method: "DELETE",
        headers: apiHeaders(),
        body: JSON.stringify({ bed_id: bed.id }),
      });
      const data = await res.json();
      if (data.success) {
        onToast("Bed deleted.");
        reload();
      } else {
        onToast(data.message || "Failed to delete bed.", "error");
      }
    } catch {
      onToast("Network error.", "error");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 px-2 text-gray-400 text-[12px]">
        <Loader2 size={13} className="animate-spin" /> Loading beds…
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
      {/* Bed list */}
      {beds.length === 0 ? (
        <p className="text-[12px] text-gray-400 dark:text-gray-500 italic px-1">
          No beds registered for this ward yet. Add one below.
        </p>
      ) : (
        <div className="space-y-1.5">
          {beds.map((bed) => {
            const bStatus = BED_STATUS[bed.status] ?? BED_STATUS.available;
            const isEditing = editingBed?.id === bed.id;

            if (isEditing) {
              return (
                <div key={bed.id} className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-3 space-y-2">
                  {editError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle size={11} /> {editError}
                    </p>
                  )}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Bed number</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={editBedNum}
                      onChange={e => setEditBedNum(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleUpdate()}
                      placeholder="Bed number"
                      className="w-full px-3.5 py-2 rounded-lg border border-blue-300 dark:border-blue-700
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                        text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg border border-blue-300 dark:border-blue-700
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                          text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="available">Available</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div className="pt-5 flex gap-2">
                      <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold disabled:opacity-50 transition"
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingBed(null)}
                        className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[12px] font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={bed.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <BedDouble size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
                    Bed {bed.bed_number}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${bStatus.classes}`}>
                    {bStatus.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(bed)}
                    disabled={bed.status === "occupied"}
                    title={bed.status === "occupied" ? "Discharge patient first" : "Edit bed"}
                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(bed)}
                    disabled={deleting === bed.id || bed.status === "occupied"}
                    title={bed.status === "occupied" ? "Discharge patient first" : "Delete bed"}
                    className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    {deleting === bed.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Trash2 size={12} />
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add bed form */}
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Plus size={11} /> Add New Bed
        </p>

        {addError && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle size={11} /> {addError}
          </p>
        )}

        {/* Bed number — full width so it's easy to click and type */}
        <div>
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
            Bed number <span className="text-rose-500">*</span>
          </label>
          <input
            ref={addBedNumRef}
            type="text"
            autoComplete="off"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. B-01, Bed 1, Room 2A…"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
              text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500
              placeholder-gray-400 dark:placeholder-gray-500 transition"
          />
        </div>

        {/* Status + button side by side */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              Initial status
            </label>
            <select
              value={addStatus}
              onChange={e => setAddStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="pt-5">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700
                text-white text-[13px] font-semibold disabled:opacity-50 transition whitespace-nowrap"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {adding ? "Adding…" : "Add Bed"}
            </button>
          </div>
        </div>
      </div>

      {/* Summary counts */}
      {beds.length > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 px-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {beds.filter(b => b.status === "available").length} available
          </span>
          <span>·</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {beds.filter(b => b.status === "occupied").length} occupied
          </span>
          <span>·</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">
            {beds.filter(b => b.status === "maintenance").length} maintenance
          </span>
          <span>·</span>
          <span>{beds.length} total</span>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  WardManager — main component
// ═══════════════════════════════════════════════════════════════════════════════
export default function WardManager() {
  const [wards, setWards]           = useState([]);
  const [branches, setBranches]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [form, setForm]             = useState(EMPTY_WARD_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [toast, setToast]           = useState(null);

  // Which ward rows have their bed panel expanded
  const [expandedWards, setExpandedWards] = useState(new Set());

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchWards = async () => {
    setLoading(true);
    const data = await fetchWardsData(getToken());
    setWards(data ?? []);
    setLoading(false);
  };

  const loadBranches = async () => {
    const data = await fetchActiveFacilityBranches(getToken());
    setBranches(data ?? []);
  };

  useEffect(() => {
    fetchWards();
    loadBranches();
  }, []);

  const openCreate = () => {
    setEditingWard(null);
    setForm(EMPTY_WARD_FORM);
    setError("");
    setDrawerOpen(true);
  };

  const openEdit = (ward) => {
    setEditingWard(ward);
    setForm({
      name: ward.name,
      number: ward.number,
      branch_id: ward.branch_id,
      capacity: ward.capacity,
      status: ward.status,
      daily_rate: ward.daily_rate ?? "",
    });
    setError("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingWard(null);
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.number.trim() || !form.capacity || !form.daily_rate) {
      setError("Name, number, capacity, and daily rate are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const url = editingWard
      ? `${API_BASE_URL}config/updateWard`
      : `${API_BASE_URL}config/createWard`;
    const payload = editingWard
      ? { id: editingWard.id, ...form, capacity: Number(form.capacity), daily_rate: Number(form.daily_rate) }
      : { ...form, capacity: Number(form.capacity), daily_rate: Number(form.daily_rate) };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingWard ? "Ward updated!" : "Ward created!");
        closeDrawer();
        fetchWards();
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBedPanel = (wardId) => {
    setExpandedWards(prev => {
      const next = new Set(prev);
      next.has(wardId) ? next.delete(wardId) : next.add(wardId);
      return next;
    });
  };

  const filtered = wards.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.number.toLowerCase().includes(search.toLowerCase()) ||
      w.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 font-sans text-[13px]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-[13px] font-medium transition-all
          ${toast.type === "success"
            ? "bg-emerald-600 text-white"
            : "bg-rose-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow">
              <BedDouble size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">Ward Management</h1>
              <p className="text-gray-500 dark:text-gray-400 text-[12px] mt-0.5">
                {loading ? "Loading..." : `${wards.length} ward${wards.length !== 1 ? "s" : ""} registered`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchWards}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[13px] shadow transition"
            >
              <Plus size={15} />
              Add Ward
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Wards", value: wards.length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Available", value: wards.filter(w => w.status === "available").length, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Closed", value: wards.filter(w => w.status === "closed").length, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
            { label: "Total Capacity", value: wards.reduce((s, w) => s + (w.capacity || 0), 0), color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl p-4 ${stat.bg} border border-transparent`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-500 dark:text-gray-400 text-[12px] mt-0.5 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, number or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Ward List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={30} className="animate-spin text-blue-500" />
            <span className="text-[13px]">Loading wards…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Building2 size={36} />
            <span className="text-[13px]">{search ? "No wards match your search." : "No wards found. Add one to get started."}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ward) => {
              const status = STATUS_CONFIG[ward.status] || STATUS_CONFIG.available;
              const StatusIcon = status.icon;
              const bedsOpen = expandedWards.has(ward.id);

              return (
                <div
                  key={ward.id}
                  className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition group"
                >
                  {/* Ward row */}
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 shrink-0">
                        <BedDouble size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 text-[14px] truncate">{ward.name}</span>
                          <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[12px]">
                            <Hash size={11} />{ward.number}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${status.classes}`}>
                            <StatusIcon size={11} />
                            {status.label}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-[12px]">
                            <Users size={11} /> {ward.capacity} capacity
                          </span>
                          <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[12px]">
                            <Building2 size={11} /> {ward.branch?.name || "—"}
                          </span>
                          {ward.daily_rate != null && (
                            <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 text-[12px] font-semibold">
                              UGX {Number(ward.daily_rate).toLocaleString()}/day
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100">
                      {/* Manage beds toggle */}
                      <button
                        onClick={() => toggleBedPanel(ward.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition
                          ${bedsOpen
                            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                          }`}
                      >
                        <BedDouble size={13} />
                        Beds
                        {bedsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>

                      {/* Edit ward */}
                      <button
                        onClick={() => openEdit(ward)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-500 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-[12px] font-medium transition"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    </div>
                  </div>

                  {/* Bed panel — inline, not a drawer */}
                  {bedsOpen && (
                    <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                      <BedPanel ward={ward} onToast={showToast} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Ward create/edit drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={closeDrawer}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-full border-l border-gray-200 dark:border-gray-700 z-10">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  {editingWard ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-50">
                    {editingWard ? "Update Ward" : "New Ward"}
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {editingWard ? `Editing: ${editingWard.name}` : "Fill in the details below"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-3 text-[12px]">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <Field label="Ward Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ward A"
                  className={inputClass}
                />
              </Field>

              <Field label="Ward Number" required>
                <input
                  type="text"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="e.g. W-101"
                  className={inputClass}
                />
              </Field>

              <Field label="Capacity (beds)" required>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="e.g. 25"
                  className={inputClass}
                />
              </Field>

              <Field label="Daily Rate (UGX)" required>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.daily_rate}
                  onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
                  placeholder="e.g. 50000"
                  className={inputClass}
                />
              </Field>

              <Field label="Status" required>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={inputClass}
                >
                  <option value="available">Available</option>
                  <option value="closed">Closed</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </Field>

              <Field label="Branch" required>
                <select
                  value={form.branch_id || ""}
                  onChange={(e) => setForm({ ...form, branch_id: Number(e.target.value) })}
                  className={inputClass}
                >
                  <option value="">Select Branch</option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={closeDrawer}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-[13px] transition shadow"
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving…</>
                ) : (
                  <><ChevronRight size={15} /> {editingWard ? "Update Ward" : "Create Ward"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
