import React, { useState, useCallback } from "react";
import axios from "axios";
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Loader2,
  FileText,
  X,
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

const PAYMENT_PAGE_SIZE = 8;

// ── Main component ────────────────────────────────────────────────────────────

export function PaymentReceipts() {
  const token = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Invoice list state
  const [invoices, setInvoices] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listPage, setListPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [applied, setApplied] = useState(null); // null = not yet searched

  // Selected invoice + payments
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentsData, setPaymentsData] = useState(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // PDF preview
  const [pdfPreview, setPdfPreview] = useState({ open: false, loading: false, url: null, filename: "" });

  // ── Fetch invoice list ────────────────────────────────────────────────────

  const fetchInvoices = useCallback(async (filters) => {
    setListLoading(true);
    setListPage(1);
    setSelectedInvoice(null);
    setPaymentsData(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.fromDate) params.set("from_date", filters.fromDate);
      if (filters.toDate) params.set("to_date", filters.toDate);

      const { data } = await axios.get(
        `${API_BASE_URL}billing/invoices/lightweight?${params.toString()}`,
        { headers }
      );
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to load invoices.");
    } finally {
      setListLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    const f = { search, fromDate, toDate };
    setApplied(f);
    fetchInvoices(f);
  };

  const handleReset = () => {
    setSearch("");
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setApplied(null);
    setInvoices([]);
    setSelectedInvoice(null);
    setPaymentsData(null);
  };

  // ── Select invoice → load its payments ───────────────────────────────────

  const selectInvoice = async (inv) => {
    setSelectedInvoice(inv);
    setPaymentsData(null);
    setPaymentsLoading(true);
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}billing/invoices/${inv.id}/payments`,
        { headers }
      );
      if (data.success) {
        setPaymentsData(data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Failed to load payments.");
    } finally {
      setPaymentsLoading(false);
    }
  };

  // ── PDF preview helpers ───────────────────────────────────────────────────

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

  // ── Pagination helpers for invoice list ──────────────────────────────────

  const totalPages = Math.ceil(invoices.length / PAYMENT_PAGE_SIZE);
  const pagedInvoices = invoices.slice(
    (listPage - 1) * PAYMENT_PAGE_SIZE,
    listPage * PAYMENT_PAGE_SIZE
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6">
      <ToastContainer position="top-right" autoClose={4000} />

      {/* Header */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Payment Receipts
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select an invoice to view its payments and download a receipt
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── Left panel: invoice picker ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filter bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Invoice number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApply()}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="flex-1 px-2 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-xs shrink-0">–</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="flex-1 px-2 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Filter className="w-3 h-3" /> Search
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Invoice list */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {listLoading ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading invoices…
              </div>
            ) : applied === null ? (
              <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-xs">
                Use the filters above and click Search to find invoices.
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-xs">
                No invoices found for the selected filters.
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pagedInvoices.map((inv) => (
                    <li
                      key={inv.id}
                      onClick={() => selectInvoice(inv)}
                      className={`px-3 py-3 cursor-pointer transition-colors ${
                        selectedInvoice?.id === inv.id
                          ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {inv.invoice_number}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {inv.visit?.patient?.name ?? "—"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <InvoiceStatusBadge status={inv.status} />
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mt-1">
                            {fmt(inv.total_amount)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Mini pagination */}
                {totalPages > 1 && (
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {invoices.length} invoices
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setListPage((p) => Math.max(1, p - 1))}
                        disabled={listPage === 1}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                      </button>
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        {listPage}/{totalPages}
                      </span>
                      <button
                        onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                        disabled={listPage === totalPages}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right panel: payments detail ───────────────────────────────── */}
        <div className="lg:col-span-3">
          {!selectedInvoice ? (
            <div className="h-full min-h-[200px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
              Select an invoice on the left to view its payments
            </div>
          ) : paymentsLoading ? (
            <div className="flex items-center justify-center min-h-[200px] text-gray-500 dark:text-gray-400 text-sm gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading payments…
            </div>
          ) : paymentsData ? (
            <div className="space-y-4">
              {/* Invoice summary card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                      {paymentsData.invoice.invoice_number}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {paymentsData.invoice.patient?.name ?? "—"}
                      {paymentsData.invoice.visit_number
                        ? ` · Visit ${paymentsData.invoice.visit_number}`
                        : ""}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={paymentsData.invoice.status} />
                </div>

                {/* Amounts */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                      {fmt(paymentsData.invoice.total_amount)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400">Paid</p>
                    <p className="text-sm font-bold text-green-700 dark:text-green-400 mt-0.5">
                      {fmt(paymentsData.invoice.paid_amount)}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-2.5 text-center ${
                      Number(paymentsData.invoice.balance_due) > 0
                        ? "bg-red-50 dark:bg-red-900/20"
                        : "bg-gray-50 dark:bg-gray-700"
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        Number(paymentsData.invoice.balance_due) > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      Balance
                    </p>
                    <p
                      className={`text-sm font-bold mt-0.5 ${
                        Number(paymentsData.invoice.balance_due) > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {fmt(paymentsData.invoice.balance_due)}
                    </p>
                  </div>
                </div>

                {/* Preview / download button */}
                {paymentsData.payments.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() =>
                        openPDFPreview(
                          `billing/invoices/${selectedInvoice.id}/receipt-pdf`,
                          `Receipt_${selectedInvoice.invoice_number}.pdf`
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> Preview Receipt PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Payments table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Payment History ({paymentsData.payments.length})
                  </h2>
                </div>

                {paymentsData.payments.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                    No payments recorded for this invoice yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                        <tr>
                          {["Date", "Amount", "Method", "Received By", "Reference"].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {paymentsData.payments.map((pmt) => (
                          <tr
                            key={pmt.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                          >
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {pmt.payment_date
                                ? new Date(pmt.payment_date).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                              {fmt(pmt.amount)}
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300 capitalize whitespace-nowrap">
                              {pmt.payment_method?.replace("_", " ")}
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              {pmt.received_by?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                              {pmt.reference_number ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
