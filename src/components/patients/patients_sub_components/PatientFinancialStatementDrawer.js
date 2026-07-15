// Drawer for viewing a patient's full financial statement across all visits.
// Slides in from the right. Includes an in-app PDF preview modal.
//
// Pagination:
//   Invoices and deposits are independently paginated (15 per page).
//   Summary totals are always computed server-side from the full dataset and
//   do NOT change when the user pages through either list.

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    X, FileText, Loader2, Download, AlertCircle, CheckCircle2, Clock, Ban,
    TrendingUp, CreditCard, Wallet, ReceiptText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';

// ── Invoice status badge ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
    open:           { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300',     icon: Clock,        label: 'Open'           },
    partially_paid: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: AlertCircle,  label: 'Partially Paid' },
    paid:           { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle2, label: 'Paid'           },
    void:           { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',         icon: Ban,          label: 'Void'           },
};

function InvoiceStatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
            <Icon className="w-3 h-3" /> {cfg.label}
        </span>
    );
}

function fmt(n) {
    return Number(n ?? 0).toLocaleString('en-UG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Reusable pagination bar ───────────────────────────────────────────────────
function Pager({ current, last, total, label, onChange }) {
    if (!last || last <= 1) return null;

    // Build the visible page numbers: always show first, last, and a window
    // around current; insert "…" gaps where pages are skipped.
    const near = new Set([1, last, current, current - 1, current + 1].filter(p => p >= 1 && p <= last));
    const pages = [...near].sort((a, b) => a - b);

    const btnBase = 'min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition';
    const btnActive = 'bg-blue-600 text-white';
    const btnIdle = 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700';
    const btnNav = `${btnBase} ${btnIdle} flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed`;

    return (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500">
                {label} &middot; page {current} of {last} &middot; {total} total
            </span>
            <div className="flex items-center gap-1">
                <button className={btnNav} disabled={current === 1} onClick={() => onChange(current - 1)}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {pages.map((p, i) => {
                    const showGap = i > 0 && p - pages[i - 1] > 1;
                    return (
                        <React.Fragment key={p}>
                            {showGap && <span className="text-xs text-gray-400 px-0.5">…</span>}
                            <button
                                onClick={() => onChange(p)}
                                className={`${btnBase} ${p === current ? btnActive : btnIdle}`}
                            >
                                {p}
                            </button>
                        </React.Fragment>
                    );
                })}
                <button className={btnNav} disabled={current === last} onClick={() => onChange(current + 1)}>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ── PDF preview modal ─────────────────────────────────────────────────────────
function PdfPreviewModal({ state, onClose, onDownload }) {
    if (!state.open) return null;
    return (
        <div className="fixed inset-0 bg-black/70 flex flex-col z-[80]">
            <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {state.filename}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onDownload}
                        disabled={!state.url}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700
                            text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 bg-gray-700 flex items-center justify-center">
                {state.loading ? (
                    <div className="flex flex-col items-center gap-3 text-white">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm">Generating preview…</span>
                    </div>
                ) : state.url ? (
                    <iframe src={state.url} title="PDF Preview" className="w-full h-full border-0" />
                ) : null}
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * PatientFinancialStatementDrawer
 *
 * Props:
 *   isOpen   : boolean
 *   onClose  : () => void
 *   patient  : { id, name, patient_number, ... }
 *   token    : string
 */
export function PatientFinancialStatementDrawer({ isOpen, onClose, patient, token }) {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);

    // Independent page cursors for the two paginated lists
    const [invoicesPage, setInvoicesPage] = useState(1);
    const [depositsPage, setDepositsPage] = useState(1);

    const [pdfPreview, setPdfPreview] = useState({
        open: false, loading: false, url: null, filename: '',
    });

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    // fetchStatement accepts explicit page args so it never reads stale state
    const fetchStatement = useCallback(async (iPage = 1, dPage = 1) => {
        if (!patient?.id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}billing/patient-statement`, {
                headers,
                params: { patient_id: patient.id, invoices_page: iPage, deposits_page: dPage },
            });
            setData(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Failed to load statement.');
        } finally {
            setLoading(false);
        }
    }, [patient?.id, token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset and fetch on open; clean up object URL on close
    useEffect(() => {
        if (isOpen) {
            setInvoicesPage(1);
            setDepositsPage(1);
            fetchStatement(1, 1);
        }
        if (!isOpen && pdfPreview.url) {
            window.URL.revokeObjectURL(pdfPreview.url);
            setPdfPreview({ open: false, loading: false, url: null, filename: '' });
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleInvoicesPage = (p) => {
        setInvoicesPage(p);
        fetchStatement(p, depositsPage);
    };

    const handleDepositsPage = (p) => {
        setDepositsPage(p);
        fetchStatement(invoicesPage, p);
    };

    // ── PDF preview ───────────────────────────────────────────────────────────
    const openPDFPreview = async () => {
        if (!patient?.id) return;
        const filename = `Statement_${patient.patient_number ?? patient.id}.pdf`;
        setPdfPreview({ open: true, loading: true, url: null, filename });
        try {
            const res = await axios.get(`${API_BASE_URL}billing/patient-statement/pdf`, {
                headers,
                params: { patient_id: patient.id },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            setPdfPreview({ open: true, loading: false, url, filename });
        } catch {
            setPdfPreview({ open: false, loading: false, url: null, filename: '' });
        }
    };

    const closePDFPreview = () => {
        if (pdfPreview.url) window.URL.revokeObjectURL(pdfPreview.url);
        setPdfPreview({ open: false, loading: false, url: null, filename: '' });
    };

    const downloadCurrentPDF = () => {
        if (!pdfPreview.url) return;
        const link = document.createElement('a');
        link.href = pdfPreview.url;
        link.setAttribute('download', pdfPreview.filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    if (!isOpen) return null;

    // Unpack paginator shape: { data: [], current_page, last_page, total }
    const totals        = data?.totals ?? {};
    const invoiceRows   = data?.invoices?.data ?? [];
    const invoiceMeta   = { current: data?.invoices?.current_page ?? 1, last: data?.invoices?.last_page ?? 1, total: data?.invoices?.total ?? 0 };
    const depositRows   = data?.deposits?.data ?? [];
    const depositMeta   = { current: data?.deposits?.current_page ?? 1, last: data?.deposits?.last_page ?? 1, total: data?.deposits?.total ?? 0 };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white dark:bg-gray-900 shadow-2xl z-[65]
                flex flex-col animate-slide-in-right">

                {/* ── Header ── */}
                <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-indigo-700 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ReceiptText className="w-5 h-5" /> Financial Statement
                        </h2>
                        {patient && (
                            <p className="text-blue-200 text-xs mt-0.5">
                                {patient.name}
                                {patient.patient_number && ` · ${patient.patient_number}`}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {data && (
                            <button
                                onClick={openPDFPreview}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30
                                    text-white text-xs font-semibold transition"
                            >
                                <FileText className="w-3.5 h-3.5" /> Preview PDF
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto">

                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <span className="text-sm">Loading statement…</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="m-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {!loading && data && (
                        <>
                            {/* ── Summary cards (always full-dataset totals, unaffected by page) ── */}
                            <div className="px-6 pt-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Billed</span>
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(totals.total_billed)}</p>
                                </div>

                                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        <span className="text-xs text-green-700 dark:text-green-400 font-medium">Total Paid</span>
                                    </div>
                                    <p className="text-xl font-bold text-green-700 dark:text-green-400">{fmt(totals.total_paid)}</p>
                                </div>

                                <div className={`rounded-xl border p-4 ${
                                    totals.total_outstanding > 0
                                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                                        : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                }`}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <AlertCircle className={`w-4 h-4 ${totals.total_outstanding > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`} />
                                        <span className={`text-xs font-medium ${totals.total_outstanding > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                            Outstanding
                                        </span>
                                    </div>
                                    <p className={`text-xl font-bold ${totals.total_outstanding > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                        {fmt(totals.total_outstanding)}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Deposit Balance</span>
                                    </div>
                                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{fmt(totals.deposit_balance)}</p>
                                </div>
                            </div>

                            {/* ── Invoices ── */}
                            <div className="px-6 pb-2">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                    Invoices
                                    <span className="text-xs font-normal text-gray-400">({invoiceMeta.total})</span>
                                </h3>

                                {invoiceMeta.total === 0 ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No invoices found.</p>
                                ) : (
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    <th className="px-4 py-2.5 text-left font-semibold">Invoice #</th>
                                                    <th className="px-4 py-2.5 text-left font-semibold">Visit #</th>
                                                    <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                                                    <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                                                    <th className="px-4 py-2.5 text-right font-semibold">Billed</th>
                                                    <th className="px-4 py-2.5 text-right font-semibold">Paid</th>
                                                    <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {invoiceRows.map(inv => (
                                                    <tr
                                                        key={inv.id}
                                                        className={`${inv.status === 'void' ? 'opacity-50' : ''}
                                                            hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                                                    >
                                                        <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                                                            {inv.invoice_number}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                                                            {inv.visit?.visit_number ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                            {new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <InvoiceStatusBadge status={inv.status} />
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                                            {fmt(inv.total_amount)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-xs font-medium text-green-700 dark:text-green-400">
                                                            {fmt(inv.paid_amount)}
                                                        </td>
                                                        <td className={`px-4 py-2.5 text-right text-xs font-semibold ${
                                                            inv.status === 'void'
                                                                ? 'text-gray-400'
                                                                : inv.balance_due > 0
                                                                    ? 'text-red-600 dark:text-red-400'
                                                                    : 'text-gray-500 dark:text-gray-400'
                                                        }`}>
                                                            {inv.status === 'void' ? '—' : fmt(inv.balance_due)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <Pager
                                            current={invoiceMeta.current}
                                            last={invoiceMeta.last}
                                            total={invoiceMeta.total}
                                            label="invoices"
                                            onChange={handleInvoicesPage}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* ── Deposit history ── */}
                            <div className="px-6 pt-4 pb-6">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-blue-600" />
                                    Deposit History
                                    <span className="text-xs font-normal text-gray-400">({depositMeta.total})</span>
                                </h3>

                                {depositMeta.total === 0 ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No deposits recorded.</p>
                                ) : (
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                                                    <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                                                    <th className="px-4 py-2.5 text-left font-semibold">Method</th>
                                                    <th className="px-4 py-2.5 text-left font-semibold">Recorded By</th>
                                                    <th className="px-4 py-2.5 text-left font-semibold">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {depositRows.map(dep => (
                                                    <tr key={dep.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                            {new Date(dep.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-xs font-semibold text-green-700 dark:text-green-400">
                                                            {fmt(dep.amount_deposited)}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                                {dep.payment_method?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                                                            {dep.recordedBy?.name ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                                                            {dep.additional_info ?? '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <Pager
                                            current={depositMeta.current}
                                            last={depositMeta.last}
                                            total={depositMeta.total}
                                            label="deposits"
                                            onChange={handleDepositsPage}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <PdfPreviewModal
                state={pdfPreview}
                onClose={closePDFPreview}
                onDownload={downloadCurrentPDF}
            />
        </>
    );
}
