import { useState, useEffect } from "react";
import {
  FlaskConical, Plus, Search, X, Edit2, AlertCircle,
  CheckCircle, Loader2, RefreshCw, ChevronRight, Trash2,
  FileText
} from "lucide-react";
import { API_BASE_URL } from "../general/constants";

const token = () => localStorage.getItem("access_token");

const EMPTY_FORM = { instrument_name: "", description: "" };

export default function InstrumentsManager() {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [toast, setToast]             = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // instrument to delete
  const [deleting, setDeleting]       = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInstruments = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}config/getInstruments`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) setInstruments(data.instruments || []);
      else showToast(data.message || "Failed to load instruments.", "error");
    } catch {
      showToast("Network error while loading instruments.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  /* ── Drawer helpers ── */
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setDrawerOpen(true);
  };

  const openEdit = (instrument) => {
    setEditing(instrument);
    setForm({
      instrument_name: instrument.instrument_name,
      description:     instrument.description || "",
    });
    setError("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setError("");
  };

  /* ── Create / Update ── */
  const handleSubmit = async () => {
    if (!form.instrument_name.trim()) {
      setError("Instrument name is required.");
      return;
    }
    setSubmitting(true);
    setError("");

    const url     = editing
      ? `${API_BASE_URL}config/updateInstrument`
      : `${API_BASE_URL}config/addInstrument`;
    const payload = editing
      ? { id: editing.id, ...form }
      : { ...form };

    try {
      const res  = await fetch(url, {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editing ? "Instrument updated!" : "Instrument added!");
        closeDrawer();
        fetchInstruments();
      } else {
        const firstError = data.errors
          ? Object.values(data.errors)[0]?.[0]
          : data.message;
        setError(firstError || "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res  = await fetch(`${API_BASE_URL}config/deleteInstrument`, {
        method:  "DELETE",
        headers: {
          Authorization:  `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: confirmDelete.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Instrument deleted.");
        setConfirmDelete(null);
        fetchInstruments();
      } else {
        showToast(data.message || "Failed to delete instrument.", "error");
        setConfirmDelete(null);
      }
    } catch {
      showToast("Network error. Please try again.", "error");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = instruments.filter(
    (i) =>
      i.instrument_name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 font-sans text-[13px]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-[13px] font-medium transition-all
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          {toast.type === "success"
            ? <CheckCircle size={16} />
            : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => !deleting && setConfirmDelete(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-50">Delete Instrument</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {confirmDelete.instrument_name}
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold text-[13px] transition shadow"
              >
                {deleting
                  ? <><Loader2 size={14} className="animate-spin" /> Deleting…</>
                  : <><Trash2 size={14} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">

        {/* Header */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow">
              <FlaskConical size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                Lab Instruments
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-[12px] mt-0.5">
                {loading
                  ? "Loading…"
                  : `${instruments.length} instrument${instruments.length !== 1 ? "s" : ""} registered`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInstruments}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[13px] shadow transition"
            >
              <Plus size={15} />
              Add Instrument
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Total Instruments",
              value: instruments.length,
              color: "text-indigo-600 dark:text-indigo-400",
              bg:    "bg-indigo-50 dark:bg-indigo-900/20",
            },
            {
              label: "With Description",
              value: instruments.filter((i) => i.description?.trim()).length,
              color: "text-emerald-600 dark:text-emerald-400",
              bg:    "bg-emerald-50 dark:bg-emerald-900/20",
            },
            {
              label: "Search Results",
              value: filtered.length,
              color: "text-blue-600 dark:text-blue-400",
              bg:    "bg-blue-50 dark:bg-blue-900/20",
            },
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
            placeholder="Search by name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={30} className="animate-spin text-indigo-500" />
            <span className="text-[13px]">Loading instruments…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <FlaskConical size={36} />
            <span className="text-[13px]">
              {search
                ? "No instruments match your search."
                : "No instruments found. Add one to get started."}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((instrument) => (
              <div
                key={instrument.id}
                className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FlaskConical size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-semibold text-gray-900 dark:text-gray-100 text-[14px] truncate">
                      {instrument.instrument_name}
                    </span>
                    {instrument.description ? (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-[12px] mt-0.5 truncate">
                        <FileText size={11} />
                        {instrument.description}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600 text-[12px] mt-0.5 italic">
                        No description
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEdit(instrument)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-400 dark:hover:border-indigo-500 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[12px] font-medium transition"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(instrument)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-400 dark:hover:border-rose-500 text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 text-[12px] font-medium transition"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
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
                <div className="p-2 rounded-lg bg-indigo-600 text-white">
                  {editing ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-50">
                    {editing ? "Update Instrument" : "New Instrument"}
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {editing ? `Editing: ${editing.instrument_name}` : "Fill in the details below"}
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

              <Field label="Instrument Name" required>
                <input
                  type="text"
                  value={form.instrument_name}
                  onChange={(e) => setForm({ ...form, instrument_name: e.target.value })}
                  placeholder="e.g. Hematology Analyzer"
                  className={inputClass}
                />
              </Field>

              <Field label="Description">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional — brief description of this instrument"
                  className={`${inputClass} resize-none`}
                />
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
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-[13px] transition shadow"
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving…</>
                ) : (
                  <><ChevronRight size={15} /> {editing ? "Update Instrument" : "Add Instrument"}</>
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
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder-gray-400";

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
