import { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Search, X, Edit2, ChevronRight,
  Users, Hash, AlertCircle, CheckCircle, XCircle, Loader2,
  BedDouble, RefreshCw
} from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import { fetchActiveFacilityBranches, fetchWardsData } from "../general/helpers";

const token = localStorage.getItem("access_token");

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

const EMPTY_FORM = { name: "", number: "", branch_id: 1, capacity: "", status: "available" };

export default function WardManager() {
  const [wards, setWards] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);


  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };



  //Fetch wards using helper from general/helpers
  const fetchWards = async () => {
  setLoading(true);
  const data = await fetchWardsData(token);
  console.log("Fetched wards:", data);
  setWards(data);
  setLoading(false);
};

  const loadBranches = async () => {
    const data = await fetchActiveFacilityBranches(token);
    setBranches(data);
  };

  useEffect(() => {
    fetchWards();
    loadBranches();
  }, [token]);

  const openCreate = () => {
    setEditingWard(null);
    setForm(EMPTY_FORM);
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
    if (!form.name.trim() || !form.number.trim() || !form.capacity) {
      setError("Name, number, and capacity are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const url = editingWard
      ? `${API_BASE_URL}config/updateWard`
      : `${API_BASE_URL}config/createWard`;
    const payload = editingWard
      ? { id: editingWard.id, ...form, capacity: Number(form.capacity) }
      : { ...form, capacity: Number(form.capacity) };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
    } catch (error) {
      setError("Network error. Please try again.");
      console.error("Error submitting ward:", error);
    } finally {
      setSubmitting(false);
    }
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
              return (
                <div
                  key={ward.id}
                  className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 hover:border-blue-400 dark:hover:border-blue-500 transition group"
                >
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
                          <Users size={11} /> {ward.capacity} beds
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[12px]">
                          <Building2 size={11} /> {ward.branch?.name || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(ward)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-500 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-[12px] font-medium transition opacity-80 group-hover:opacity-100"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer Overlay */}
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
                  onChange={(e) =>
                    setForm({ ...form, branch_id: Number(e.target.value) })
                  }
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