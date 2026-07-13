import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, FileBarChart, Eye, AlertCircle, Download, RefreshCw, FileText } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';
import Skeleton from 'react-loading-skeleton';
import { ViewInvoiceDetailDrawer } from '../credit_invoice_sub_components/ViewInvoiceDetailDrawer';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
    draft:          'Draft',
    issued:         'Issued',
    partially_paid: 'Partially Paid',
    paid:           'Paid',
    overdue:        'Overdue',
    cancelled:      'Cancelled',
};

function statusBadgeClass(status) {
    const map = {
        draft:          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
        issued:         'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        partially_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        paid:           'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        overdue:        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        cancelled:      'bg-gray-100 text-gray-400 line-through dark:bg-gray-800 dark:text-gray-500',
    };
    return map[status] || map.draft;
}

const fmt = (v) => `UGX ${Number(v || 0).toLocaleString()}`;

function saleStatusBadgeClass(status) {
    if (status === 'paid')    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'partial') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
}

function saleStatusLabel(status) {
    if (status === 'paid')    return 'Paid';
    if (status === 'partial') return 'Partial';
    return 'Unpaid';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ViewCreditStatementDrawer({ isOpen, onClose, customer, token }) {
    const [data,             setData]             = useState(null);
    const [loading,          setLoading]          = useState(false);
    const [isViewOpen,       setIsViewOpen]       = useState(false);
    const [viewingInvoiceId, setViewingInvoiceId] = useState(null);

    // PDF statement modal
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfUrl,       setPdfUrl]       = useState(null);
    const [pdfLoading,   setPdfLoading]   = useState(false);
    const [pdfFileName,  setPdfFileName]  = useState('');

    const fetchStatement = useCallback(async () => {
        if (!customer?.id) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}credit-invoices/getCustomerStatement`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { customer_id: customer.id },
            });
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load credit statement');
        } finally {
            setLoading(false);
        }
    }, [customer?.id, token]);

    useEffect(() => {
        if (isOpen && customer) fetchStatement();
        if (!isOpen) { setData(null); setIsViewOpen(false); setViewingInvoiceId(null); }
    }, [isOpen, customer, fetchStatement]);

    const closePdfModal = () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
        setShowPdfModal(false);
        setPdfFileName('');
        setPdfLoading(false);
    };

    const openStatementPdf = async () => {
        if (!customer?.id) return;
        const name = (customer.name || 'customer').replace(/\s+/g, '_');
        setPdfUrl(null);
        setPdfFileName(`${name}_statement.pdf`);
        setPdfLoading(true);
        setShowPdfModal(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}credit-invoices/downloadCustomerStatementPdf`,
                { customer_id: customer.id },
                { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
            );
            const blob = new Blob([res.data], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
        } catch (err) {
            toast.error('Failed to generate statement PDF');
            closePdfModal();
        } finally {
            setPdfLoading(false);
        }
    };

    if (!isOpen) return null;

    const invoices = data?.invoices || [];

    return (
        <>
            {/* ── Statement drawer ── */}
            <div className="fixed inset-0 z-50 flex">
                <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                <div className="relative ml-auto h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-right">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <FileBarChart className="w-5 h-5 text-teal-600" />
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-white text-base">
                                    Customer Statement
                                </h2>
                                {customer && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {customer.name}{customer.phone_number ? ` · ${customer.phone_number}` : ''}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={openStatementPdf}
                                disabled={!data}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Download Statement
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                        {/* ── Summary cards ── */}
                        {loading ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3].map(i => <Skeleton key={i} height={72} className="rounded-xl" />)}
                                </div>
                                {[...Array(4)].map((_, i) => <Skeleton key={i} height={44} />)}
                            </div>
                        ) : !data ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <AlertCircle className="w-10 h-10 mb-2" />
                                <p className="text-sm">Could not load statement</p>
                            </div>
                        ) : (
                            <>
                                {/* Row 1 — credit track */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Credit Limit</span>
                                        <span className="text-base font-bold text-gray-800 dark:text-gray-100">{fmt(data.credit_limit)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                                        <span className="text-[10px] font-semibold text-red-400 dark:text-red-500 uppercase tracking-wider">Credit Used</span>
                                        <span className="text-base font-bold text-red-700 dark:text-red-300">{fmt(data.credit_balance)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                                        <span className="text-[10px] font-semibold text-green-500 dark:text-green-400 uppercase tracking-wider">Available</span>
                                        <span className="text-base font-bold text-green-700 dark:text-green-300">{fmt(data.available_credit)}</span>
                                    </div>
                                </div>

                                {/* Row 2 — pharmacy / deposit track */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                                        <span className="text-[10px] font-semibold text-green-500 dark:text-green-400 uppercase tracking-wider">Deposit Balance</span>
                                        <span className="text-base font-bold text-green-700 dark:text-green-300">{fmt(data.account_deposit_amount)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                                        <span className="text-[10px] font-semibold text-red-400 dark:text-red-500 uppercase tracking-wider">Owes Pharmacy</span>
                                        <span className={`text-base font-bold ${Number(data.account_sale_balance) > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {fmt(data.account_sale_balance)}
                                        </span>
                                    </div>
                                </div>

                                {/* ── Credit Invoices ── */}
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                        Credit Invoices
                                    </p>

                                    {invoices.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-600">
                                            <FileBarChart className="w-8 h-8 mb-2" />
                                            <p className="text-sm">No credit invoices for this customer yet</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 dark:bg-gray-800">
                                                    <tr>
                                                        {['Invoice #', 'Status', 'Total', 'Balance Due', 'Due Date', ''].map(h => (
                                                            <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                                    {invoices.map(inv => (
                                                        <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                                                            <td className="px-3 py-2.5 font-mono font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                                {inv.invoice_number}
                                                            </td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(inv.status)}`}>
                                                                    {STATUS_LABELS[inv.status] || inv.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                {fmt(inv.total_amount)}
                                                            </td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                                <span className={Number(inv.balance_due) > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}>
                                                                    {fmt(inv.balance_due)}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <button
                                                                    type="button"
                                                                    title="View invoice"
                                                                    onClick={() => { setViewingInvoiceId(inv.id); setIsViewOpen(true); }}
                                                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-transparent transition"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* ── Pharmacy Sales ── */}
                                <div>
                                    <p className="text-[11px] font-bold text-purple-400 dark:text-purple-500 uppercase tracking-widest mb-3">
                                        Pharmacy Sales
                                    </p>

                                    {(data.pharmacy_sales || []).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-purple-100 dark:border-purple-900 rounded-xl text-purple-300 dark:text-purple-700">
                                            <p className="text-sm">No pharmacy sales for this customer yet</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border border-purple-100 dark:border-purple-900">
                                            <table className="w-full text-sm">
                                                <thead className="bg-purple-50 dark:bg-purple-900/30">
                                                    <tr>
                                                        {['Sale #', 'Date', 'Total', 'Paid', 'Balance', 'Status'].map(h => (
                                                            <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-purple-50 dark:divide-purple-900/40 bg-white dark:bg-gray-900">
                                                    {(data.pharmacy_sales || []).map(sale => (
                                                        <tr key={sale.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-900/10 transition">
                                                            <td className="px-3 py-2.5 font-mono font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                                {sale.sale_number}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                {sale.payment_date ? new Date(sale.payment_date).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                {fmt(sale.total_amount)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                {fmt(sale.amount_paid)}
                                                            </td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                                <span className={Number(sale.balance) > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}>
                                                                    {fmt(sale.balance)}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${saleStatusBadgeClass(sale.payment_status)}`}>
                                                                    {saleStatusLabel(sale.payment_status)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Read-only invoice detail (no onEdit / onRecordPayment) ── */}
            <ViewInvoiceDetailDrawer
                isOpen={isViewOpen}
                onClose={() => { setIsViewOpen(false); setViewingInvoiceId(null); }}
                invoiceId={viewingInvoiceId}
                token={token}
                onSuccess={() => {}}
            />

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>

            {/* ── Statement PDF Modal ── */}
            {showPdfModal && (
                <div className="fixed inset-0 z-[70] flex flex-col bg-black/80">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {pdfFileName || 'Customer Statement'}
                        </h3>
                        <div className="flex items-center gap-3">
                            {pdfUrl && (
                                <a
                                    href={pdfUrl}
                                    download={pdfFileName}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                </a>
                            )}
                            <button
                                onClick={closePdfModal}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {pdfLoading ? (
                            <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                                <span className="text-sm">Generating statement&hellip;</span>
                            </div>
                        ) : pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                title={pdfFileName}
                                className="w-full h-full border-0"
                                style={{ minHeight: 0 }}
                            />
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
}
