import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Select from "react-select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchRfqs, createRfq, updateRfq, deleteRfq, fetchRfqPdfBlob } from "./rfq_helper";
import { fetchSuppliers } from "../products/products_helper";
import { getSelectClassNames } from "../general/searchSelectStyles";

// ── Date helpers ──────────────────────────────────────────────────────────────

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .split("T")[0];
const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  .toISOString()
  .split("T")[0];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG = {
  draft: {
    label: "Draft",
    cls: "bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300",
  },
  sent: {
    label: "Sent",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  closed: {
    label: "Closed",
    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

// ── Blank item factory ────────────────────────────────────────────────────────

const blankItem = () => ({
  _key: Math.random(),
  id: null,
  description: "",
  quantity: "",
  uom: "",
  estimated_unit_price: "",
  item_notes: "",
});

// ── Main component ────────────────────────────────────────────────────────────

export function RFQManagement() {
  const token = localStorage.getItem("access_token");

  // ── List state ──────────────────────────────────────────────────────────────
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── Supplier dropdown ───────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
  });

  // ── Form / modal state ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingRfq, setEditingRfq] = useState(null); // null = create mode
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    delivery_date: "",
    delivery_address: "",
    due_date: "",
    notes: "",
    status: "draft",
  });
  const [items, setItems] = useState([blankItem()]);

  // ── Delete confirm ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── PDF preview ─────────────────────────────────────────────────────────────
  const [pdfPreview, setPdfPreview] = useState({
    open: false,
    loading: false,
    url: null,
    filename: "",
  });

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSuppliers(token).then(setSuppliers);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch list ──────────────────────────────────────────────────────────────

  const loadRfqs = useCallback(
    async (page = 1, filters = appliedFilters) => {
      setLoading(true);
      const result = await fetchRfqs(token, {
        page,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        // supplier_id sent for forward-compat; filtering is client-side for now
      });
      setLoading(false);
      if (result) {
        setRfqs(result.data.data);
        setTotalPages(result.data.last_page);
        setTotalCount(result.data.total);
        setCurrentPage(result.data.current_page);
      }
    },
    [appliedFilters, token]
  );

  useEffect(() => {
    loadRfqs(1, appliedFilters);
  }, [appliedFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client-side supplier filter ─────────────────────────────────────────────
  // NOTE: getRFQ does not support server-side supplier_id filtering. The supplier
  // dropdown filters the rows on the current page only. For full server-side
  // support, add ->when($request->supplier_id, fn($q,$id)=>$q->where('supplier_id',$id))
  // to getRFQ in RfqController and it will just work without any frontend changes.
  const displayedRfqs = supplierFilter
    ? rfqs.filter((r) => String(r.supplier_id) === String(supplierFilter))
    : rfqs;

  // ── Filters ─────────────────────────────────────────────────────────────────

  const handleApply = () => {
    setAppliedFilters({ fromDate, toDate });
  };

  const handleReset = () => {
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setSupplierFilter("");
    setAppliedFilters({ fromDate: defaultFrom, toDate: defaultTo });
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    loadRfqs(page, appliedFilters);
  };

  // ── Estimated total helper ───────────────────────────────────────────────────

  const rfqTotal = (rfq) =>
    (rfq.items ?? []).reduce(
      (sum, item) => sum + Number(item.estimated_total_price ?? 0),
      0
    );

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingRfq(null);
    setFormData({
      supplier_id: "",
      delivery_date: "",
      delivery_address: "",
      due_date: "",
      notes: "",
      status: "draft",
    });
    setItems([blankItem()]);
    setFormOpen(true);
  };

  const openEdit = (rfq) => {
    setEditingRfq(rfq);
    setFormData({
      supplier_id: String(rfq.supplier_id ?? ""),
      delivery_date: rfq.delivery_date
        ? rfq.delivery_date.split("T")[0]
        : "",
      delivery_address: rfq.delivery_address ?? "",
      due_date: rfq.due_date ? rfq.due_date.split("T")[0] : "",
      notes: rfq.notes ?? "",
      status: rfq.status ?? "draft",
    });
    setItems(
      (rfq.items ?? []).map((item) => ({
        _key: item.id,
        id: item.id,
        description: item.description ?? "",
        quantity: item.quantity ?? "",
        uom: item.uom ?? "",
        estimated_unit_price: item.estimated_unit_price ?? "",
        item_notes: item.item_notes ?? "",
      }))
    );
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingRfq(null);
  };

  // ── Item row helpers ─────────────────────────────────────────────────────────

  const updateItem = (key, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item._key === key ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () => setItems((prev) => [...prev, blankItem()]);

  const removeItem = (key) => {
    setItems((prev) => {
      if (prev.length === 1) return prev; // keep at least one row
      return prev.filter((i) => i._key !== key);
    });
  };

  const itemEstTotal = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.estimated_unit_price) || 0;
    return qty * price;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error("At least one item is required.");
      return;
    }
    for (const item of items) {
      if (!item.description.trim()) {
        toast.error("Each item must have a description.");
        return;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        toast.error("Each item must have a quantity greater than 0.");
        return;
      }
      if (!item.uom.trim()) {
        toast.error("Each item must have a unit of measure.");
        return;
      }
    }

    setSubmitting(true);

    const itemsPayload = items.map((item) => {
      const estTotal = itemEstTotal(item);
      const obj = {
        description: item.description,
        quantity: parseFloat(item.quantity),
        uom: item.uom,
        estimated_unit_price: item.estimated_unit_price !== "" ? parseFloat(item.estimated_unit_price) : null,
        estimated_total_price: estTotal > 0 ? estTotal : null,
        item_notes: item.item_notes || null,
      };
      if (item.id) obj.id = item.id; // existing items carry their id for sync
      return obj;
    });

    let result;
    if (editingRfq) {
      result = await updateRfq(token, {
        id: editingRfq.id,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : undefined,
        delivery_date: formData.delivery_date || null,
        delivery_address: formData.delivery_address || null,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        status: formData.status,
        items: itemsPayload,
      });
    } else {
      result = await createRfq(token, {
        supplier_id: parseInt(formData.supplier_id),
        delivery_date: formData.delivery_date || null,
        delivery_address: formData.delivery_address || null,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        items: itemsPayload,
      });
    }

    setSubmitting(false);

    if (result?.success) {
      toast.success(result.message);
      closeForm();
      loadRfqs(currentPage, appliedFilters);
    } else if (result) {
      // Backend returned a structured error (e.g. 422 from closed-RFQ guard)
      toast.error(result.message || "Operation failed.");
    }
    // null result means rfq_helper already showed a toast
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteRfq(token, deleteTarget.id);
    setDeleteLoading(false);
    if (result?.success) {
      toast.success(result.message);
      setDeleteTarget(null);
      loadRfqs(currentPage, appliedFilters);
    } else if (result) {
      toast.error(result.message || "Failed to delete RFQ.");
    }
  };

  // ── PDF preview ──────────────────────────────────────────────────────────────

  const openPdfPreview = async (rfq) => {
    const filename = `${rfq.rfq_number}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.pdf`;
    setPdfPreview({ open: true, loading: true, url: null, filename });
    const blob = await fetchRfqPdfBlob(token, rfq.id);
    if (!blob) {
      setPdfPreview({ open: false, loading: false, url: null, filename: "" });
      return;
    }
    const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    setPdfPreview({ open: true, loading: false, url, filename });
  };

  const downloadPdf = () => {
    if (!pdfPreview.url) return;
    const link = document.createElement("a");
    link.href = pdfPreview.url;
    link.setAttribute("download", pdfPreview.filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const closePdfPreview = () => {
    if (pdfPreview.url) window.URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview({ open: false, loading: false, url: null, filename: "" });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const isClosedEdit = editingRfq?.status === "closed";

  return (
    <div className="p-4 sm:p-6">
      <ToastContainer position="top-right" autoClose={4000} />

      {/* Header */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Request for Quotation
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {totalCount} RFQ{totalCount !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New RFQ
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-400 text-xs shrink-0">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Supplier filter (client-side) */}
          <Select
            isClearable
            placeholder="All Suppliers"
            classNames={getSelectClassNames()}
            unstyled
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            value={
              supplierFilter
                ? suppliers
                    .filter((s) => String(s.id) === String(supplierFilter))
                    .map((s) => ({ value: s.id, label: s.name }))[0] ?? null
                : null
            }
            onChange={(opt) => setSupplierFilter(opt ? String(opt.value) : "")}
          />

          {/* Buttons */}
          <div className="flex items-center gap-2 lg:col-span-2">
            <button
              onClick={handleApply}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Filter className="w-4 h-4" /> Apply
            </button>
            <button
              onClick={handleReset}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
        {supplierFilter && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Supplier filter applies to the current page only. Use date range to narrow results first.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {[
                  "RFQ #",
                  "Supplier",
                  "Status",
                  "Delivery Date",
                  "Due Date",
                  "Est. Total",
                  "Created",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading RFQs…
                  </td>
                </tr>
              ) : displayedRfqs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No RFQs found for the selected filters.
                  </td>
                </tr>
              ) : (
                displayedRfqs.map((rfq) => (
                  <tr
                    key={rfq.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {rfq.rfq_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {rfq.supplier?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={rfq.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmtDate(rfq.delivery_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmtDate(rfq.due_date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {fmt(rfqTotal(rfq))}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmtDate(rfq.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(rfq)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openPdfPreview(rfq)}
                          title="Preview PDF"
                          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rfq)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-300">
              Showing {displayedRfqs.length} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl my-6 rounded-lg shadow-xl bg-white dark:bg-gray-900">
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10 rounded-t-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {editingRfq ? `Edit RFQ — ${editingRfq.rfq_number}` : "New Request for Quotation"}
                </h2>
                {editingRfq && <StatusBadge status={editingRfq.status} />}
              </div>
              <button
                onClick={closeForm}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Closed RFQ banner */}
            {isClosedEdit && (
              <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  This RFQ is <strong>closed</strong> and cannot be modified. All fields are read-only.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Header fields */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  RFQ Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Supplier */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <Select
                      isClearable
                      isDisabled={isClosedEdit}
                      placeholder="Search supplier…"
                      classNames={getSelectClassNames()}
                      unstyled
                      options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                      value={
                        formData.supplier_id
                          ? suppliers
                              .filter((s) => String(s.id) === String(formData.supplier_id))
                              .map((s) => ({ value: s.id, label: s.name }))[0] ?? null
                          : null
                      }
                      onChange={(opt) =>
                        setFormData((f) => ({ ...f, supplier_id: opt ? String(opt.value) : "" }))
                      }
                    />
                    {/* Hidden input so required validation fires on empty supplier */}
                    <input
                      tabIndex={-1}
                      required
                      value={formData.supplier_id}
                      onChange={() => {}}
                      style={{ opacity: 0, height: 0, position: "absolute", pointerEvents: "none" }}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Status
                    </label>
                    <select
                      disabled={isClosedEdit}
                      value={formData.status}
                      onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {/* Delivery date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      disabled={isClosedEdit}
                      value={formData.delivery_date}
                      onChange={(e) => setFormData((f) => ({ ...f, delivery_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Due date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      disabled={isClosedEdit}
                      value={formData.due_date}
                      onChange={(e) => setFormData((f) => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Delivery address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      disabled={isClosedEdit}
                      value={formData.delivery_address}
                      onChange={(e) => setFormData((f) => ({ ...f, delivery_address: e.target.value }))}
                      placeholder="Delivery address (optional)"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      disabled={isClosedEdit}
                      value={formData.notes}
                      onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Additional notes (optional)"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </section>

              {/* Line items */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Line Items <span className="text-red-500">*</span>
                  </h3>
                  {!isClosedEdit && (
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item._key}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/60"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Item {idx + 1}
                        </span>
                        {!isClosedEdit && items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item._key)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Description */}
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={255}
                            disabled={isClosedEdit}
                            value={item.description}
                            onChange={(e) => updateItem(item._key, "description", e.target.value)}
                            placeholder="Item description"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            disabled={isClosedEdit}
                            value={item.quantity}
                            onChange={(e) => updateItem(item._key, "quantity", e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* UOM */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Unit of Measure <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={50}
                            disabled={isClosedEdit}
                            value={item.uom}
                            onChange={(e) => updateItem(item._key, "uom", e.target.value)}
                            placeholder="e.g. boxes, kg, pcs"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Est. unit price */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Est. Unit Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={isClosedEdit}
                            value={item.estimated_unit_price}
                            onChange={(e) =>
                              updateItem(item._key, "estimated_unit_price", e.target.value)
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Est. total — read-only computed */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Est. Total <span className="text-gray-400 font-normal">(auto)</span>
                          </label>
                          <div className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                            {fmt(itemEstTotal(item))}
                          </div>
                        </div>

                        {/* Item notes */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Item Notes
                          </label>
                          <input
                            type="text"
                            disabled={isClosedEdit}
                            value={item.item_notes}
                            onChange={(e) => updateItem(item._key, "item_notes", e.target.value)}
                            placeholder="Optional notes"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Items total summary */}
                <div className="mt-3 flex justify-end">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Total Est. Value:{" "}
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {fmt(items.reduce((s, i) => s + itemEstTotal(i), 0))}
                    </span>
                  </div>
                </div>
              </section>

              {/* Submit */}
              {!isClosedEdit && (
                <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? "Saving…" : editingRfq ? "Save Changes" : "Create RFQ"}
                  </button>
                </div>
              )}

              {isClosedEdit && (
                <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-lg shadow-xl bg-white dark:bg-gray-900 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Delete RFQ?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Are you sure you want to delete{" "}
                  <strong>{deleteTarget.rfq_number}</strong>? This action cannot
                  be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Preview Modal ────────────────────────────────────────────────── */}
      {pdfPreview.open && (
        <div className="fixed inset-0 bg-black/70 flex flex-col z-[70]">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-xs">
                {pdfPreview.filename}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadPdf}
                disabled={!pdfPreview.url}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                onClick={closePdfPreview}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Preview area */}
          <div className="flex-1 bg-gray-700 flex items-center justify-center">
            {pdfPreview.loading ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">Generating preview…</span>
              </div>
            ) : pdfPreview.url ? (
              <iframe
                src={pdfPreview.url}
                title="RFQ PDF Preview"
                className="w-full h-full border-0"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default RFQManagement;
