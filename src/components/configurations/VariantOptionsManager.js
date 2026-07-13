// VariantOptionsManager.js
// Admin screen for managing variant option names and their values.
// Each option name row can be expanded to show/manage its child values inline.
//
// Endpoints (all under /config/ prefix):
//   GET    /config/getAllVariantOptionNamesForAdmin
//   POST   /config/storeVariantOptionName
//   POST   /config/updateVariantOptionName
//   DELETE /config/deleteVariantOptionName/{id}
//   POST   /config/storeVariantOptionValue
//   POST   /config/updateVariantOptionValue
//   DELETE /config/deleteVariantOptionValue/{id}


import { useState, useEffect } from "react";
import {
  Tag, Plus, Search, X, Edit2, ChevronRight, ChevronDown,
  AlertCircle, CheckCircle, Loader2, RefreshCw, Trash2, ToggleLeft, ToggleRight
} from "lucide-react";
import {
  fetchAllVariantOptionNamesForAdmin,
  createVariantOptionName,
  updateVariantOptionName,
  deleteVariantOptionName,
  createVariantOptionValue,
  updateVariantOptionValue,
  deleteVariantOptionValue,
} from "../products/products_helper";

const getToken = () => localStorage.getItem("access_token");

// ── Badge helpers ──────────────────────────────────────────────────────────────
const ActiveBadge = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
      <CheckCircle size={10} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <X size={10} /> Inactive
    </span>
  );

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-gray-400";

// ── Confirm modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, body, confirmLabel = "Delete", onConfirm, onCancel, confirming }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 size={18} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-50">{title}</h3>
            <div className="text-[13px] text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{body}</div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold text-[13px] transition"
          >
            {confirming ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {confirming ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Value row (inline edit) ────────────────────────────────────────────────────
function ValueRow({ value, optionName, onToast, onRefresh }) {
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(value.value);
  const [saving, setSaving]     = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr]           = useState("");

  const handleSave = async () => {
    if (!editText.trim()) { setErr("Value cannot be empty."); return; }
    setSaving(true);
    setErr("");
    const res = await updateVariantOptionValue(getToken(), value.id, { value: editText.trim() });
    setSaving(false);
    if (res?.success) {
      onToast("Value updated!");
      setEditing(false);
      onRefresh();
    } else {
      setErr(res?.message || "Failed to update.");
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    const res = await updateVariantOptionValue(getToken(), value.id, { is_active: !value.is_active });
    setToggling(false);
    if (res?.success) {
      onToast(value.is_active ? "Value deactivated." : "Value activated!");
      onRefresh();
    } else {
      onToast(res?.message || "Failed to toggle.", "error");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteVariantOptionValue(getToken(), value.id);
    setDeleting(false);
    if (res?.success) {
      onToast("Value deleted.");
      setConfirm(false);
      onRefresh();
    } else {
      onToast(res?.message || "Failed to delete.", "error");
      setConfirm(false);
    }
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-3 space-y-2">
        {err && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle size={11} /> {err}
          </p>
        )}
        <input
          type="text"
          autoFocus
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          className="w-full px-3.5 py-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold disabled:opacity-50 transition"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
            Save
          </button>
          <button
            onClick={() => { setEditing(false); setEditText(value.value); setErr(""); }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[12px] hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        open={confirm}
        title="Remove this value?"
        body={
          <>
            Remove <strong>"{value.value}"</strong> from <strong>"{optionName}"</strong>? This only removes this specific value — the option name and its other values are unaffected.
          </>
        }
        confirmLabel="Remove Value"
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
        confirming={deleting}
      />

      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium text-gray-800 dark:text-gray-100 truncate">{value.value}</span>
          <ActiveBadge active={value.is_active} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { setEditing(true); setEditText(value.value); }}
            title="Edit value"
            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={value.is_active ? "Deactivate" : "Activate"}
            className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:opacity-30 transition"
          >
            {toggling
              ? <Loader2 size={12} className="animate-spin" />
              : value.is_active ? <ToggleRight size={14} className="text-emerald-500" /> : <ToggleLeft size={14} />
            }
          </button>
          <button
            onClick={() => setConfirm(true)}
            title="Delete value"
            className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Values panel (expanded under an option name row) ──────────────────────────
function ValuesPanel({ optionName, onToast, onRefresh }) {
  const [newValue, setNewValue]   = useState("");
  const [adding, setAdding]       = useState(false);
  const [addErr, setAddErr]       = useState("");

  const handleAdd = async () => {
    if (!newValue.trim()) { setAddErr("Value text is required."); return; }
    setAdding(true);
    setAddErr("");
    const res = await createVariantOptionValue(getToken(), optionName.id, newValue.trim());
    setAdding(false);
    if (res?.success) {
      onToast("Value added!");
      setNewValue("");
      onRefresh();
    } else {
      setAddErr(res?.message || "Failed to add value.");
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
      {/* Existing values */}
      {optionName.values?.length === 0 ? (
        <p className="text-[12px] text-gray-400 dark:text-gray-500 italic px-1">
          No values yet. Add one below.
        </p>
      ) : (
        <div className="space-y-1.5">
          {optionName.values.map(v => (
            <ValueRow
              key={v.id}
              value={v}
              optionName={optionName.name}
              onToast={onToast}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Add value form */}
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-2">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Plus size={11} /> Add New Value
        </p>
        {addErr && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle size={11} /> {addErr}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder={`e.g. Small, Red, 500ml…`}
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold disabled:opacity-50 transition whitespace-nowrap"
          >
            {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {/* Summary */}
      {optionName.values?.length > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 px-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {optionName.values.filter(v => v.is_active).length} active
          </span>
          <span>·</span>
          <span className="text-gray-400 dark:text-gray-500 font-semibold">
            {optionName.values.filter(v => !v.is_active).length} inactive
          </span>
          <span>·</span>
          <span>{optionName.values.length} total</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VariantOptionsManager — main component
// ═══════════════════════════════════════════════════════════════════════════════
export default function VariantOptionsManager() {
  const [optionNames, setOptionNames]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [expandedIds, setExpandedIds]     = useState(new Set());
  const [toast, setToast]                 = useState(null);

  // Drawer state (create / rename option name)
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [editingName, setEditingName]     = useState(null); // null = create mode
  const [nameForm, setNameForm]           = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [formErr, setFormErr]             = useState("");

  // Confirm delete option name
  const [deleteTarget, setDeleteTarget]   = useState(null); // { id, name, values }
  const [deleting, setDeleting]           = useState(false);

  // Toggle in-flight tracking
  const [toggling, setToggling]           = useState(null); // id being toggled

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    const data = await fetchAllVariantOptionNamesForAdmin(getToken());
    setOptionNames(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Expand / collapse ──
  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Drawer ──
  const openCreate = () => {
    setEditingName(null);
    setNameForm("");
    setFormErr("");
    setDrawerOpen(true);
  };

  const openEdit = (opt) => {
    setEditingName(opt);
    setNameForm(opt.name);
    setFormErr("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingName(null);
    setFormErr("");
  };

  const handleSubmit = async () => {
    if (!nameForm.trim()) { setFormErr("Name is required."); return; }
    setSubmitting(true);
    setFormErr("");
    const res = editingName
      ? await updateVariantOptionName(getToken(), editingName.id, { name: nameForm.trim() })
      : await createVariantOptionName(getToken(), nameForm.trim());
    setSubmitting(false);
    if (res?.success) {
      showToast(editingName ? "Option name updated!" : "Option name created!");
      closeDrawer();
      load();
    } else {
      setFormErr(res?.message || "Something went wrong.");
    }
  };

  // ── Toggle active ──
  const handleToggleName = async (opt) => {
    setToggling(opt.id);
    const res = await updateVariantOptionName(getToken(), opt.id, { is_active: !opt.is_active });
    setToggling(null);
    if (res?.success) {
      showToast(opt.is_active ? "Option deactivated." : "Option activated!");
      load();
    } else {
      showToast(res?.message || "Failed to toggle.", "error");
    }
  };

  // ── Delete option name ──
  const handleDeleteName = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteVariantOptionName(getToken(), deleteTarget.id);
    setDeleting(false);
    if (res?.success) {
      showToast("Option name deleted.");
      setDeleteTarget(null);
      // Also collapse if expanded
      setExpandedIds(prev => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      load();
    } else {
      showToast(res?.message || "Failed to delete.", "error");
      setDeleteTarget(null);
    }
  };

  // ── Filter ──
  const filtered = optionNames.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Delete modal body ──
  const deleteBody = deleteTarget ? (() => {
    const vals = deleteTarget.values ?? [];
    const count = vals.length;
    const examples = vals.slice(0, 3).map(v => `"${v.value}"`).join(", ");
    const more = count > 3 ? ` and ${count - 3} more` : "";
    return (
      <>
        <p>
          Deleting <strong>"{deleteTarget.name}"</strong> will also delete all{" "}
          <strong>{count} value{count !== 1 ? "s" : ""}</strong> under it
          {count > 0 && <> ({examples}{more})</>}.
          This cannot be undone from here.
        </p>
        <p className="mt-2 text-[12px] text-gray-500 dark:text-gray-500">
          Products that already have this option saved will keep their existing data — only
          future availability in dropdowns is affected.
        </p>
      </>
    );
  })() : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 font-sans text-[13px]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-[13px] font-medium transition-all
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete option name?"
        body={deleteBody}
        confirmLabel="Delete Option Name"
        onConfirm={handleDeleteName}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />

      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow">
              <Tag size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                Manage Variant Options
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-[12px] mt-0.5">
                {loading ? "Loading…" : `${optionNames.length} option name${optionNames.length !== 1 ? "s" : ""} configured`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[13px] shadow transition"
            >
              <Plus size={15} /> Add Option Name
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Total Option Names",
              value: optionNames.length,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
            {
              label: "Active",
              value: optionNames.filter(o => o.is_active).length,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
            },
            {
              label: "Total Values",
              value: optionNames.reduce((s, o) => s + (o.values?.length ?? 0), 0),
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-50 dark:bg-violet-900/20",
            },
          ].map(stat => (
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
            placeholder="Search option names…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Option Names List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={30} className="animate-spin text-blue-500" />
            <span className="text-[13px]">Loading option names…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Tag size={36} />
            <span className="text-[13px]">
              {search ? "No option names match your search." : "No option names yet. Add one to get started."}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(opt => {
              const expanded = expandedIds.has(opt.id);
              const isToggling = toggling === opt.id;

              return (
                <div
                  key={opt.id}
                  className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition group"
                >
                  {/* Option Name row */}
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 shrink-0">
                        <Tag size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 text-[14px] truncate">
                            {opt.name}
                          </span>
                          <ActiveBadge active={opt.is_active} />
                        </div>
                        <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {opt.values?.length ?? 0} value{(opt.values?.length ?? 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100">
                      {/* Expand/collapse */}
                      <button
                        onClick={() => toggleExpand(opt.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition
                          ${expanded
                            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600"
                          }`}
                      >
                        Values
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>

                      {/* Rename */}
                      <button
                        onClick={() => openEdit(opt)}
                        title="Rename"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-500 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-[12px] font-medium transition"
                      >
                        <Edit2 size={13} /> Rename
                      </button>

                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggleName(opt)}
                        disabled={isToggling}
                        title={opt.is_active ? "Deactivate" : "Activate"}
                        className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:opacity-30 transition"
                      >
                        {isToggling
                          ? <Loader2 size={15} className="animate-spin" />
                          : opt.is_active
                            ? <ToggleRight size={18} className="text-emerald-500" />
                            : <ToggleLeft size={18} />
                        }
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(opt)}
                        title="Delete option name"
                        className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Values panel — inline expansion */}
                  {expanded && (
                    <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                      <ValuesPanel optionName={opt} onToast={showToast} onRefresh={load} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / rename drawer ── */}
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
                  {editingName ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-50">
                    {editingName ? "Rename Option" : "New Option Name"}
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {editingName ? `Editing: ${editingName.name}` : "Choose a descriptive label (e.g. Size, Colour, Dosage Form)"}
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
              {formErr && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-3 text-[12px]">
                  <AlertCircle size={14} /> {formErr}
                </div>
              )}
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Option Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={nameForm}
                  onChange={e => setNameForm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="e.g. Size, Colour, Dosage Form, Flavour…"
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                  Must be unique. You will add specific values (Small, Red, 500mg…) after creating the name.
                </p>
              </div>
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
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><ChevronRight size={15} /> {editingName ? "Save Changes" : "Create Option Name"}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
