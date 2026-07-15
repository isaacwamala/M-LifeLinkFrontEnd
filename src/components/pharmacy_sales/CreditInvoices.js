import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import {
    Search, Calendar, Filter, RefreshCw, Plus, Eye,
    ChevronLeft, ChevronRight, FileText,
} from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import { getSelectClassNames } from '../general/searchSelectStyles';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast, ToastContainer } from 'react-toastify';

import { CreateOrEditDraftInvoiceDrawer } from './credit_invoice_sub_components/CreateOrEditDraftInvoiceDrawer';
import { ViewInvoiceDetailDrawer }        from './credit_invoice_sub_components/ViewInvoiceDetailDrawer';
import { RecordInvoicePaymentModal }      from './credit_invoice_sub_components/RecordInvoicePaymentModal';

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: '',              label: 'All statuses' },
    { value: 'draft',         label: 'Draft' },
    { value: 'issued',        label: 'Issued' },
    { value: 'partially_paid',label: 'Partially Paid' },
    { value: 'paid',          label: 'Paid' },
    { value: 'overdue',       label: 'Overdue' },
    { value: 'cancelled',     label: 'Cancelled' },
];

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

// ── Component ─────────────────────────────────────────────────────────────────

export function CreditInvoices() {
    const token = localStorage.getItem('access_token');

    const today          = new Date().toISOString().split('T')[0];

    // ── Filter state ──────────────────────────────────────────────────────────
    const [invoiceNumber,   setInvoiceNumber]   = useState('');
    const [statusFilter,    setStatusFilter]    = useState('');
    const [customerFilter,  setCustomerFilter]  = useState(null);  // AsyncSelect option
    const [dateFrom,        setDateFrom]        = useState('');
    const [dateTo,          setDateTo]          = useState('');

    // ── Data state ────────────────────────────────────────────────────────────
    const [invoices,    setInvoices]    = useState([]);
    const [insights,    setInsights]    = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages,  setTotalPages]  = useState(1);

    // ── Drawer / modal state ──────────────────────────────────────────────────
    const [isCreateOpen,    setIsCreateOpen]    = useState(false);
    const [editingInvoice,  setEditingInvoice]  = useState(null);

    const [isViewOpen,       setIsViewOpen]      = useState(false);
    const [viewingInvoiceId, setViewingInvoiceId]= useState(null);

    const [isPaymentOpen,   setIsPaymentOpen]   = useState(false);
    const [paymentInvoice,  setPaymentInvoice]  = useState(null);

    const invoiceSearchDebounceRef = useRef(null);
    const customerDebounceRef      = useRef(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchInvoices = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page };
            if (invoiceNumber)             params.invoice_number = invoiceNumber;
            if (statusFilter)              params.status         = statusFilter;
            if (customerFilter?.value)     params.customer_id    = customerFilter.value;
            if (dateFrom)                  params.date_from      = dateFrom;
            if (dateTo)                    params.date_to        = dateTo;

            const res = await axios.get(`${API_BASE_URL}credit-invoices/getAll`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params,
            });

            setInvoices(res.data.invoices?.data || []);
            setCurrentPage(res.data.invoices?.current_page || 1);
            setTotalPages(res.data.invoices?.last_page    || 1);
            if (res.data.insights) setInsights(res.data.insights);
        } catch (err) {
            toast.error('Failed to fetch invoices');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, invoiceNumber, statusFilter, customerFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchInvoices(1);
    }, [statusFilter, customerFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced invoice number search
    const handleInvoiceNumberChange = (e) => {
        const val = e.target.value;
        setInvoiceNumber(val);
        clearTimeout(invoiceSearchDebounceRef.current);
        invoiceSearchDebounceRef.current = setTimeout(() => fetchInvoices(1), 400);
    };

    const applyDateFilter = () => fetchInvoices(1);

    const resetFilters = () => {
        setInvoiceNumber('');
        setStatusFilter('');
        setCustomerFilter(null);
        setDateFrom('');
        setDateTo('');
        // useEffect won't fire on setDateFrom/setDateTo reset since they're not deps,
        // so trigger manually:
        setTimeout(() => fetchInvoices(1), 0);
    };

    // ── Customer AsyncSelect ──────────────────────────────────────────────────
    const loadCustomerOptions = (inputValue) =>
        new Promise((resolve) => {
            if (inputValue.length < 2) { resolve([]); return; }
            if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
            customerDebounceRef.current = setTimeout(async () => {
                try {
                    const res = await axios.get(`${API_BASE_URL}customers/getLightWeightCustomers`, {
                        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                        params: { search: inputValue },
                    });
                    const data = res.data.customers || [];
                    resolve(data.map(c => ({
                        value:   c.id,
                        label:   `${c.name} (${c.phone_number})`,
                        payload: c,
                    })));
                } catch { resolve([]); }
            }, 300);
        });

    // ── Drawer coordination ───────────────────────────────────────────────────
    const handleViewOpen = (invoice) => {
        setViewingInvoiceId(invoice.id);
        setIsViewOpen(true);
    };

    const handleEdit = (invoice) => {
        setIsViewOpen(false);
        setEditingInvoice(invoice);
        setIsCreateOpen(true);
    };

    const handleRecordPayment = (invoice) => {
        setPaymentInvoice(invoice);
        setIsPaymentOpen(true);
    };

    const iconBtn = (title, Icon, colorCls, onClick) => (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`p-1.5 rounded-lg border transition-colors border-gray-200 dark:border-gray-700 ${colorCls} hover:border-transparent`}
        >
            <Icon className="w-3.5 h-3.5" />
        </button>
    );

    const customerSelectClassNames = {
        ...getSelectClassNames(),
        control: (state) =>
            '!rounded-lg !border !text-sm !shadow-none !transition-all !min-h-[42px] ' +
            (state.isFocused
                ? '!border-indigo-500 !ring-2 !ring-indigo-500/20 !bg-white dark:!bg-gray-800'
                : '!border-gray-300 dark:!border-gray-700 !bg-white dark:!bg-gray-800'),
        placeholder: () => '!text-gray-400 dark:!text-gray-500 !text-sm',
        singleValue: () => '!text-gray-900 dark:!text-white !text-sm',
        input:       () => '!text-gray-900 dark:!text-white !text-sm',
        valueContainer: () => '!px-3 !py-1',
    };

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <>
            <ToastContainer />

            {/* ── Drawers / modals ── */}
            <CreateOrEditDraftInvoiceDrawer
                isOpen={isCreateOpen}
                onClose={() => { setIsCreateOpen(false); setEditingInvoice(null); }}
                invoice={editingInvoice}
                token={token}
                onSuccess={() => fetchInvoices(currentPage)}
            />
            <ViewInvoiceDetailDrawer
                isOpen={isViewOpen}
                onClose={() => { setIsViewOpen(false); setViewingInvoiceId(null); }}
                invoiceId={viewingInvoiceId}
                token={token}
                onSuccess={() => fetchInvoices(currentPage)}
                onEdit={handleEdit}
                onRecordPayment={handleRecordPayment}
            />
            <RecordInvoicePaymentModal
                isOpen={isPaymentOpen}
                onClose={() => { setIsPaymentOpen(false); setPaymentInvoice(null); }}
                invoice={paymentInvoice}
                token={token}
                onSuccess={() => {
                    setIsPaymentOpen(false);
                    setIsViewOpen(false);
                    setPaymentInvoice(null);
                    fetchInvoices(currentPage);
                }}
            />

            {/* ── Main card ── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-8 transition-colors border-gray-200 dark:border-gray-700 mt-5">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">Credit Invoices</h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Manage formal credit invoices for credit-enabled customers.
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingInvoice(null); setIsCreateOpen(true); }}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5" /> Create Invoice
                    </button>
                </div>

                {/* ── Insights ── */}
                {insights && (
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Invoice Insights</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-3">
                            {[
                                { label: 'Total',    value: insights.total_invoices,          color: 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-700', text: 'text-gray-800 dark:text-gray-100', sub: 'text-gray-400' },
                                { label: 'Draft',    value: insights.draft_invoices,          color: 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-200', sub: 'text-gray-400' },
                                { label: 'Issued',   value: insights.issued_invoices,         color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',  text: 'text-blue-700 dark:text-blue-300',   sub: 'text-blue-400' },
                                { label: 'Part. Paid',value: insights.partially_paid_invoices,color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',text: 'text-amber-700 dark:text-amber-300', sub: 'text-amber-400' },
                                { label: 'Paid',     value: insights.paid_invoices,           color: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800',text: 'text-green-700 dark:text-green-300', sub: 'text-green-400' },
                                { label: 'Overdue',  value: insights.overdue_invoices,        color: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',       text: 'text-red-700 dark:text-red-300',    sub: 'text-red-400' },
                                { label: 'Cancelled',value: insights.cancelled_invoices,      color: 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-700',   text: 'text-gray-500 dark:text-gray-400',  sub: 'text-gray-400' },
                            ].map(({ label, value, color, text }) => (
                                <div key={label} className={`flex flex-col gap-1 p-3 rounded-xl border ${color}`}>
                                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
                                    <span className={`text-2xl font-bold ${text}`}>{value ?? 0}</span>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { label: 'Total Invoiced',   value: fmt(insights.total_invoice_amount), color: 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-700', text: 'text-gray-800 dark:text-gray-100' },
                                { label: 'Total Paid',       value: fmt(insights.total_paid_amount),    color: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800', text: 'text-green-700 dark:text-green-300' },
                                { label: 'Outstanding',      value: fmt(insights.total_balance_due),    color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',  text: 'text-amber-700 dark:text-amber-300' },
                            ].map(({ label, value, color, text }) => (
                                <div key={label} className={`flex flex-col gap-1 p-3 rounded-xl border ${color}`}>
                                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
                                    <span className={`text-lg font-bold ${text}`}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Filters ── */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-4">
                        {/* Invoice number search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by invoice number…"
                                value={invoiceNumber}
                                onChange={handleInvoiceNumberChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* Status filter */}
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 transition"
                            >
                                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>

                            {/* Customer filter */}
                            <AsyncSelect
                                loadOptions={loadCustomerOptions}
                                value={customerFilter}
                                onChange={setCustomerFilter}
                                isClearable
                                placeholder="Filter by customer…"
                                noOptionsMessage={({ inputValue }) => inputValue.length < 2 ? 'Type at least 2 characters…' : 'No customers found'}
                                loadingMessage={() => 'Searching…'}
                                unstyled
                                classNamePrefix="cf"
                                classNames={customerSelectClassNames}
                            />

                            {/* Date from */}
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            {/* Date to */}
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={applyDateFilter}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                                >
                                    <Filter className="w-4 h-4" /> Apply
                                </button>
                                <button
                                    onClick={resetFilters}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm"
                                >
                                    <RefreshCw className="w-4 h-4" /> Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {['Invoice #', 'Customer', 'Status', 'Total', 'Paid', 'Balance Due', 'Due Date', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-bold dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>
                                        {[...Array(8)].map((_, j) => (
                                            <td key={j} className="px-4 py-3"><Skeleton /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No invoices found — try adjusting the filters
                                    </td>
                                </tr>
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
                                        <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{inv.invoice_number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            <div>{inv.customer?.name || '—'}</div>
                                            <div className="text-xs text-gray-400">{inv.customer?.phone_number || ''}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(inv.status)}`}>
                                                {STATUS_LABELS[inv.status] || inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{fmt(inv.total_amount)}</td>
                                        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 whitespace-nowrap">{fmt(inv.amount_paid)}</td>
                                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                            <span className={Number(inv.balance_due) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}>
                                                {fmt(inv.balance_due)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {iconBtn('View invoice', Eye, 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30', () => handleViewOpen(inv))}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                        Showing {invoices.length} on page {currentPage} / {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchInvoices(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => fetchInvoices(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </>
    );
}
