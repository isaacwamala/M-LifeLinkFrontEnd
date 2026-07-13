import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Download,
  Receipt,
  Loader2,
  Banknote,
  Smartphone,
  Shield,
  CreditCard,
  Wallet,
  Info,
  Stethoscope,
  FlaskConical,
  Pill,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "../general/constants";

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .split("T")[0];
const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  .toISOString()
  .split("T")[0];

const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SOURCE_TYPE_LABELS = {
  consultation: "Consultation",
  PatientLabTest: "Lab Test",
  PrescriptionItem: "Prescription / Drug",
  PatientVisitWard: "Ward Stay",
};

const sourceLabel = (type) => SOURCE_TYPE_LABELS[type] ?? type;

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300",
    icon: <Clock className="w-3 h-3" />,
    label: "Open",
  },
  partially_paid: {
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: <AlertCircle className="w-3 h-3" />,
    label: "Partially Paid",
  },
  paid: {
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: "Paid",
  },
  void: {
    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    icon: <Ban className="w-3 h-3" />,
    label: "Void",
  },
};

const InvoiceStatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export function Invoices() {
  // List state
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [statusFilter, setStatusFilter] = useState("");

  // Applied filters (only updated when user clicks Apply)
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    fromDate: defaultFrom,
    toDate: defaultTo,
    statusFilter: "",
  });

  // Detail modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // PDF preview
  const [pdfPreview, setPdfPreview] = useState({ open: false, loading: false, url: null, filename: "" });

  const token = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ── Fetch list ──────────────────────────────────────────────────────────────

  const fetchInvoices = useCallback(
    async (page = 1, filters = appliedFilters) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page });
        if (filters.search) params.set("search", filters.search);
        if (filters.fromDate) params.set("from_date", filters.fromDate);
        if (filters.toDate) params.set("to_date", filters.toDate);
        if (filters.statusFilter) params.set("status", filters.statusFilter);

        const { data } = await axios.get(
          `${API_BASE_URL}billing/invoices?${params.toString()}`,
          { headers }
        );
        if (data.success) {
          setInvoices(data.data.data);
          setTotalPages(data.data.last_page);
          setTotalCount(data.data.total);
          setCurrentPage(data.data.current_page);
        }
      } catch (err) {
        toast.error(err.response?.data?.message ?? "Failed to load invoices.");
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    fetchInvoices(1, appliedFilters);
  }, [appliedFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter handlers ─────────────────────────────────────────────────────────

  const handleApply = () => {
    const next = { search, fromDate, toDate, statusFilter };
    setAppliedFilters(next);
  };

  const handleReset = () => {
    setSearch("");
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setStatusFilter("");
    setAppliedFilters({ search: "", fromDate: defaultFrom, toDate: defaultTo, statusFilter: "" });
  };

  // ── Pagination ──────────────────────────────────────────────────────────────

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    fetchInvoices(page, appliedFilters);
  };

  // ── Detail view ─────────────────────────────────────────────────────────────

  const openDetail = async (id) => {
    setIsDetailOpen(true);
    setSelectedInvoice(null);
    setDetailLoading(true);
    resetPaymentForm();
    try {
      const { data } = await axios.get(`${API_BASE_URL}billing/invoices/${id}`, { headers });
      if (data.success) {
        setSelectedInvoice(data.data);
        setPaymentAmount(String(data.data.balance_due > 0 ? Number(data.data.balance_due).toFixed(2) : ""));
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to load invoice details.");
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedInvoice(null);
    resetPaymentForm();
  };

  // ── Payment ─────────────────────────────────────────────────────────────────

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentRef("");
    setPaymentNotes("");
  };

  const balanceDue = selectedInvoice?.balance_due ?? 0;
  const amountExceedsBalance =
    paymentAmount !== "" && Number(paymentAmount) > Number(balanceDue);

  const creditAmount = Number(selectedInvoice?.visit?.patient?.deposited_amount ?? 0);
  const exceedsCredit =
    paymentMethod === "account_credit" &&
    paymentAmount !== "" &&
    Number(paymentAmount) > creditAmount;

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentSubmitting(true);
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}billing/invoices/record-payment`,
        {
          invoice_id: selectedInvoice.id,
          amount: Number(paymentAmount),
          payment_method: paymentMethod,
          reference_number: paymentRef || undefined,
          notes: paymentNotes || undefined,
        },
        { headers }
      );
      if (data.success) {
        toast.success("Payment recorded successfully.");
        resetPaymentForm();
        // Refresh the detail view in place
        const refreshed = await axios.get(
          `${API_BASE_URL}billing/invoices/${selectedInvoice.id}`,
          { headers }
        );
        if (refreshed.data.success) {
          setSelectedInvoice(refreshed.data.data);
          setPaymentAmount(
            String(
              refreshed.data.data.balance_due > 0
                ? Number(refreshed.data.data.balance_due).toFixed(2)
                : ""
            )
          );
        }
        // Refresh the list quietly in the background
        fetchInvoices(currentPage, appliedFilters);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg) {
        toast.error(msg);
      } else {
        toast.error("Failed to record payment.");
      }
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // ── PDF preview ─────────────────────────────────────────────────────────────

  const openPDFPreview = async (endpoint, filename) => {
    setPdfPreview({ open: true, loading: true, url: null, filename });
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      setPdfPreview({ open: true, loading: false, url, filename });
    } catch (err) {
      setPdfPreview({ open: false, loading: false, url: null, filename: "" });
      let msg = "Failed to load PDF preview.";
      try {
        const text = await err.response?.data?.text();
        msg = JSON.parse(text)?.message ?? msg;
      } catch {}
      toast.error(msg);
    }
  };

  const downloadCurrentPDF = () => {
    if (!pdfPreview.url) return;
    const link = document.createElement("a");
    link.href = pdfPreview.url;
    link.setAttribute("download", pdfPreview.filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const closePDFPreview = () => {
    if (pdfPreview.url) window.URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview({ open: false, loading: false, url: null, filename: "" });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6">
      <ToastContainer position="top-right" autoClose={4000} />

      {/* Header */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">INVOICES</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {totalCount} invoice{totalCount !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          View patient invoices and record payments against outstanding balances.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Invoice number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-gray-400 text-xs shrink-0">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleApply}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors"
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
      </div>

      {/* How invoices are generated */}
      <div className="flex flex-wrap items-start gap-2 mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
          <Info className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold whitespace-nowrap">Auto-generated from visits:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-700 text-gray-700 dark:text-gray-300">
            <Stethoscope className="w-3 h-3 text-emerald-500 shrink-0" />
            <span><strong className="font-semibold">Consultation</strong> — when the doctor saves examination notes (within revisit window)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-700 text-gray-700 dark:text-gray-300">
            <FlaskConical className="w-3 h-3 text-violet-500 shrink-0" />
            <span><strong className="font-semibold">Lab</strong> — when a visit is routed to the lab, based on tests requested and their set prices</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-700 text-gray-700 dark:text-gray-300">
            <Pill className="w-3 h-3 text-amber-500 shrink-0" />
            <span><strong className="font-semibold">Pharmacy</strong> — when a visit is routed to pharmacy, based on the doctor's prescription</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {[
                  "Invoice #",
                  "Patient / Visit",
                  "Branch",
                  "Total",
                  "Paid",
                  "Balance Due",
                  "Status",
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
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading invoices…
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No invoices found for the selected filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {inv.visit?.patient?.name ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {inv.visit?.visit_number ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {inv.branch?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {fmt(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {fmt(inv.paid_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                      <span
                        className={
                          Number(inv.balance_due) > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-500 dark:text-gray-400"
                        }
                      >
                        {fmt(inv.balance_due)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => openDetail(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
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
              Showing {invoices.length} of {totalCount}
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

      {/* ── Invoice Detail Modal ───────────────────────────────────────────────── */}
      {isDetailOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl bg-white dark:bg-gray-900">
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {detailLoading ? "Loading…" : selectedInvoice?.invoice_number ?? "Invoice Detail"}
                </h2>
                {selectedInvoice && (
                  <InvoiceStatusBadge status={selectedInvoice.status} />
                )}
              </div>
              <button
                onClick={closeDetail}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                Loading invoice details…
              </div>
            ) : selectedInvoice ? (
              <div className="p-6 space-y-6">
                {/* Invoice meta */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <InfoField label="Invoice #" value={selectedInvoice.invoice_number} mono />
                  <InfoField label="Visit #" value={selectedInvoice.visit?.visit_number} />
                  <InfoField label="Patient" value={selectedInvoice.visit?.patient?.name} />
                  <InfoField label="Patient Phone" value={selectedInvoice.visit?.patient?.phone ?? "—"} />
                  <InfoField label="Branch" value={selectedInvoice.branch?.name ?? "—"} />
                  <InfoField label="Created By" value={selectedInvoice.created_by_user?.name ?? selectedInvoice.created_by?.name ?? "—"} />
                  <InfoField
                    label="Created"
                    value={
                      selectedInvoice.created_at
                        ? new Date(selectedInvoice.created_at).toLocaleString()
                        : "—"
                    }
                  />
                  <InfoField label="Total Amount" value={fmt(selectedInvoice.total_amount)} />
                </div>

                {/* Balance */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex flex-wrap gap-6">
                  <BalanceStat label="Total" value={fmt(selectedInvoice.total_amount)} />
                  <BalanceStat label="Amount Paid" value={fmt(selectedInvoice.paid_amount)} green />
                  <BalanceStat
                    label="Balance Due"
                    value={fmt(selectedInvoice.balance_due)}
                    red={Number(selectedInvoice.balance_due) > 0}
                  />
                </div>

                {/* PDF actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      openPDFPreview(
                        `billing/invoices/${selectedInvoice.id}/pdf`,
                        `Invoice_${selectedInvoice.invoice_number}.pdf`
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> Preview Invoice PDF
                  </button>

                  {selectedInvoice.payments?.length > 0 && (
                    <button
                      onClick={() =>
                        openPDFPreview(
                          `billing/invoices/${selectedInvoice.id}/receipt-pdf`,
                          `Receipt_${selectedInvoice.invoice_number}.pdf`
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5" /> Preview Receipt PDF
                    </button>
                  )}
                </div>

                {/* Line items */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Line Items
                  </h3>
                  {selectedInvoice.items?.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No items on this invoice.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                          <tr>
                            {["Description", "Type", "Unit Price", "Qty", "Amount", "Status"].map(
                              (h) => (
                                <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {selectedInvoice.items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.description}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                {sourceLabel(item.source_type)}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {fmt(item.unit_price)}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.quantity}</td>
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                                {fmt(item.amount)}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    item.status === "confirmed"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Payment history */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Payment History
                  </h3>
                  {selectedInvoice.payments?.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No payments recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                          <tr>
                            {["Amount", "Method", "Received By", "Date", "Reference"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {selectedInvoice.payments.map((pmt) => (
                            <tr key={pmt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                              <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                {fmt(pmt.amount)}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 capitalize whitespace-nowrap">
                                {pmt.payment_method?.replace("_", " ")}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                {pmt.received_by?.name ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {pmt.payment_date
                                  ? new Date(pmt.payment_date).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-mono text-xs">
                                {pmt.reference_number ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Record payment section */}
                <section className="border-t border-gray-200 dark:border-gray-700 pt-5">
                  {selectedInvoice.status === "paid" ? (
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      This invoice is fully paid.
                    </p>
                  ) : selectedInvoice.status === "void" ? (
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      This invoice has been voided.
                    </p>
                  ) : (
                    <>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Record Payment
                      </h3>
                      <form onSubmit={handleRecordPayment} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Amount */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              required
                              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                                amountExceedsBalance
                                  ? "border-red-400 focus:ring-red-400"
                                  : "border-gray-300 dark:border-gray-600 focus:ring-emerald-500"
                              }`}
                            />
                            {amountExceedsBalance && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                Amount exceeds remaining balance of {fmt(balanceDue)}.
                              </p>
                            )}
                          </div>

                          {/* Payment method cards */}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Payment Method
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                              {[
                                { value: "cash", label: "Cash", icon: <Banknote className="w-4 h-4" /> },
                                { value: "mobile_money", label: "Mobile Money", icon: <Smartphone className="w-4 h-4" /> },
                                { value: "insurance", label: "Insurance", icon: <Shield className="w-4 h-4" /> },
                                { value: "card", label: "Card", icon: <CreditCard className="w-4 h-4" /> },
                                { value: "account_credit", label: "Account Credit", icon: <Wallet className="w-4 h-4" /> },
                              ].map(({ value, label, icon }) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setPaymentMethod(value)}
                                  className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-all ${
                                    paymentMethod === value
                                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-sm"
                                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600/50"
                                  }`}
                                >
                                  {icon}
                                  <span className="leading-tight text-center">{label}</span>
                                </button>
                              ))}
                            </div>
                            {paymentMethod === "account_credit" && (
                              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                Available credit: UGX {fmt(creditAmount)}
                              </p>
                            )}
                            {exceedsCredit && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                Amount exceeds available credit of UGX {fmt(creditAmount)}.
                              </p>
                            )}
                          </div>

                          {/* Reference */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Reference Number <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <input
                              type="text"
                              maxLength={100}
                              value={paymentRef}
                              onChange={(e) => setPaymentRef(e.target.value)}
                              placeholder="e.g. transaction ID"
                              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Notes <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <textarea
                              maxLength={500}
                              value={paymentNotes}
                              onChange={(e) => setPaymentNotes(e.target.value)}
                              rows={2}
                              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={paymentSubmitting || amountExceedsBalance || exceedsCredit || !paymentAmount}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {paymentSubmitting ? "Recording…" : "Record Payment"}
                        </button>
                      </form>
                    </>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── PDF Preview Modal ──────────────────────────────────────────────── */}
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
                onClick={downloadCurrentPDF}
                disabled={!pdfPreview.url}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                onClick={closePDFPreview}
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
                title="PDF Preview"
                className="w-full h-full border-0"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────

function InfoField({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</dt>
      <dd
        className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function BalanceStat({ label, value, green = false, red = false }) {
  const color = green
    ? "text-green-700 dark:text-green-400"
    : red
    ? "text-red-600 dark:text-red-400"
    : "text-gray-900 dark:text-gray-100";

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
