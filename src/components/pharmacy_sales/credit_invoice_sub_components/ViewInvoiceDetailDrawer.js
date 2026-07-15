import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, FileText, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';
import Skeleton from 'react-loading-skeleton';

const STATUS_LABELS = {
    draft: 'Draft',
    issued: 'Issued',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
};

function statusBadgeClass(status) {
    const map = {
        draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
        issued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        partially_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        cancelled: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    };
    return map[status] || map.draft;
}

const fmt = (v) => `UGX ${Number(v || 0).toLocaleString()}`;

export function ViewInvoiceDetailDrawer({ isOpen, onClose, invoiceId, token, onSuccess, onEdit, onRecordPayment }) {
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [issuing, setIssuing] = useState(false);

    const [showIssueConfirm, setShowIssueConfirm] = useState(false);

    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfFileName, setPdfFileName] = useState('');

    const fetchInvoice = useCallback(async () => {
        if (!invoiceId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}credit-invoices/show`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { invoice_id: invoiceId },
            });
            console.log('SHOW response:', res.data);
            setInvoice(res.data);
        } catch (err) {
            toast.error('Failed to load invoice details');
        } finally {
            setLoading(false);
        }
    }, [invoiceId, token]);

    useEffect(() => {
        if (isOpen && invoiceId) fetchInvoice();
    }, [isOpen, invoiceId, fetchInvoice]);

    const confirmIssue = async () => {
        setShowIssueConfirm(false);
        setIssuing(true);
        try {
            await axios.post(
                `${API_BASE_URL}credit-invoices/issue`,
                { invoice_id: invoice.id },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success('Invoice issued successfully');
            await fetchInvoice();
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to issue invoice');
        } finally {
            setIssuing(false);
        }
    };

    const closePdfModal = () => {
        setShowPdfModal(false);
        setPdfLoading(false);
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
        setPdfFileName('');
    };

    const openPdfPreview = async () => {
        if (!invoice?.id) return;
        setPdfUrl(null);
        setPdfFileName(`${invoice.invoice_number}.pdf`);
        setPdfLoading(true);
        setShowPdfModal(true);
        try {
            const response = await axios.post(
                `${API_BASE_URL}credit-invoices/pdf`,
                { invoice_id: invoice.id },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );
            const blob = new Blob([response.data], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
        } catch (err) {
            toast.error('Failed to generate PDF');
            closePdfModal();
        } finally {
            setPdfLoading(false);
        }
    };

    if (!isOpen) return null;

    const status = invoice?.status;
    const canEdit = status === 'draft' && typeof onEdit === 'function';
    const canIssue = status === 'draft';
    const canPay = ['issued', 'partially_paid', 'overdue'].includes(status) && typeof onRecordPayment === 'function';

    return (
        <>
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative ml-auto h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-right">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-base">
                                {loading ? <Skeleton width={140} /> : (invoice?.invoice_number || 'Invoice Details')}
                            </h2>
                            {invoice && (
                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(status)}`}>
                                    {STATUS_LABELS[status] || status}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(6)].map((_, i) => <Skeleton key={i} height={36} />)}
                        </div>
                    ) : !invoice ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <AlertCircle className="w-10 h-10 mb-2" />
                            <p className="text-sm">Could not load invoice</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Customer & meta ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { label: 'Customer', value: `${invoice.customer?.name || '—'} (${invoice.customer?.phone_number || '—'})` },
                                    { label: 'Due Date', value: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—' },
                                    { label: 'Issued At', value: invoice.issued_at ? new Date(invoice.issued_at).toLocaleString() : 'Not yet issued' },
                                    { label: 'Total', value: fmt(invoice.total_amount) },
                                    { label: 'Amount Paid', value: fmt(invoice.amount_paid) },
                                    { label: 'Balance Due', value: fmt(invoice.balance_due) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mt-0.5">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {invoice.notes && (
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{invoice.notes}</p>
                                </div>
                            )}

                            {/* ── Line items ── */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Products</p>
                                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                {['Product', 'Qty', 'UOM', 'Multiplier', 'Unit Price', 'Subtotal'].map(h => (
                                                    <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                            {(invoice.products || []).map((line, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                                    <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-100">{line.name}</td>
                                                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{line.quantity_of_uom_selected}</td>
                                                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{line.selected_uom_name}</td>
                                                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{line.selected_uom_multiplier}</td>
                                                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{fmt(line.unit_price)}</td>
                                                    <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-100">{fmt(line.sub_total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── Payment history ── */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Payment History</p>
                                {(invoice.payments || []).length === 0 ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">No payments recorded yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {invoice.payments.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800">
                                                <div>
                                                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">{fmt(p.amount)}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {p.payment_method}{p.reference ? ` · ${p.reference}` : ''} · {p.recorded_by?.name || '—'}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer actions ── */}
                {invoice && (
                    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        {/* PDF preview button — always visible once invoice is loaded */}
                        <div className="px-6 pt-4 pb-0">
                            <button
                                onClick={openPdfPreview}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                            >
                                <FileText className="w-4 h-4" />
                                Preview Invoice PDF
                            </button>
                        </div>

                        {(canEdit || canPay) && (
                            <div className="flex gap-3 px-6 py-4">
                                {canEdit && (
                                    <>
                                        <button
                                            onClick={() => onEdit(invoice)}
                                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                        >
                                            Edit Draft
                                        </button>
                                        <button
                                            onClick={() => setShowIssueConfirm(true)}
                                            disabled={issuing}
                                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-200 dark:shadow-blue-900/40"
                                        >
                                            {issuing ? 'Issuing…' : 'Issue Invoice'}
                                        </button>
                                    </>
                                )}
                                {canPay && (
                                    <button
                                        onClick={() => onRecordPayment(invoice)}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition shadow-md shadow-green-200 dark:shadow-green-900/40"
                                    >
                                        Record Payment
                                    </button>
                                )}
                            </div>
                        )}
                        {!canEdit && !canPay && <div className="pb-4" />}
                    </div>
                )}
            </div>

            {showIssueConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-fade-in">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-base">Issue this invoice?</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Issuing this invoice confirms that the products have been released to the customer. The corresponding quantities will be deducted from inventory, and this action cannot be reversed.
                            </p>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                type="button"
                                onClick={() => setShowIssueConfirm(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmIssue}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition"
                            >
                                Yes, Issue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </div>

        {/* ── PDF Preview Modal ── */}
        {showPdfModal && (
            <div className="fixed inset-0 z-[70] flex flex-col bg-black/80">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {pdfFileName || 'Invoice PDF'}
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
                            <span className="text-sm">Generating PDF&hellip;</span>
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
