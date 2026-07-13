import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Search, Calendar, Filter, RefreshCw, Plus, Edit2, Trash2,
    ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
    Users, UserX, Wallet, HandCoins,
    Eye, ClipboardList, CheckCircle2, XCircle, FileBarChart, Receipt,
} from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast, ToastContainer } from 'react-toastify';

// ── Sub-components ──────────────────────────────────────────────────────────────
import { RegisterCustomerDrawer } from './customer_management_sub_components/RegisterCustomerDrawer';
import { EditCustomerDrawer } from './customer_management_sub_components/EditCustomerDrawer';
import { AddAccountDepositDrawer } from './customer_management_sub_components/AddAccountDepositDrawer';
import { ViewDepositHistoryDrawer } from './customer_management_sub_components/ViewDepositHistoryDrawer';
import { RecordSaleBalancePaymentDrawer } from './customer_management_sub_components/RecordSaleBalancePaymentDrawer';
import { ViewSaleBalanceHistoryDrawer } from './customer_management_sub_components/ViewSaleBalanceHistoryDrawer';
import { ViewCreditStatementDrawer } from './customer_management_sub_components/ViewCreditStatementDrawer';
import { ViewSalesHistoryDrawer } from './customer_management_sub_components/ViewSalesHistoryDrawer';

export function CustomerManagement() {
    const token = localStorage.getItem('access_token');

    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [customers, setCustomers] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState(firstOfMonth);
    const [dateTo, setDateTo] = useState(today);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // ── Expand/collapse ─────────────────────────────────────────────────────────
    const [expandedRows, setExpandedRows] = useState(new Set());
    const toggleRow = (customerId) => {
        const s = new Set(expandedRows);
        s.has(customerId) ? s.delete(customerId) : s.add(customerId);
        setExpandedRows(s);
    };

    // ── Drawer open states ──────────────────────────────────────────────────────
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [depositCustomer, setDepositCustomer] = useState(null);

    const [isDepositHistOpen, setIsDepositHistOpen] = useState(false);
    const [depositHistCustomer, setDepositHistCustomer] = useState(null);

    const [isRepayOpen, setIsRepayOpen] = useState(false);
    const [repayCustomer, setRepayCustomer] = useState(null);

    const [isRepayHistOpen, setIsRepayHistOpen] = useState(false);
    const [repayHistCustomer, setRepayHistCustomer] = useState(null);

    const [isCreditStatementOpen, setIsCreditStatementOpen] = useState(false);
    const [creditStatementCustomer, setCreditStatementCustomer] = useState(null);

    const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false);
    const [salesHistoryCustomer, setSalesHistoryCustomer] = useState(null);

    // ── Fetch ───────────────────────────────────────────────────────────────────
    const fetchCustomers = useCallback(async (page = 1, overrideSearch) => {
        setLoading(true);
        const activeSearch = overrideSearch !== undefined ? overrideSearch : searchTerm;
        try {
            const params = { page };
            if (activeSearch) {
                params.search = activeSearch;
            } else {
                params.date_from = dateFrom;
                params.date_to = dateTo;
            }
            const res = await axios.get(`${API_BASE_URL}customers/getCustomers`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params,
            });
            setCustomers(res.data.data.data);
            setCurrentPage(res.data.data.current_page);
            setTotalPages(res.data.data.last_page);
            if (res.data.statistics) setStatistics(res.data.statistics);
        } catch (err) {
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    }, [token, dateFrom, dateTo, searchTerm]);

    useEffect(() => {
        fetchCustomers(1);
    }, [dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyDateFilter = () => fetchCustomers(1);
    const resetFilters = () => { setDateFrom(firstOfMonth); setDateTo(today); };

    // Debounced search
    const searchDebounceRef = useRef(null);
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            fetchCustomers(1, val);
        }, 400);
    };

    // ── Actions ─────────────────────────────────────────────────────────────────
    const handleDeactivate = async (customer) => {
        if (!window.confirm(`Deactivate account for ${customer.name}?`)) return;
        try {
            const res = await axios.post(`${API_BASE_URL}customers/deactivateCustomer`, { customer_id: customer.id }, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            toast.success(res.data.message || 'Customer deactivated');
            fetchCustomers(currentPage);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to deactivate customer');
        }
    };

    const handleDelete = async (customer) => {
        if (!window.confirm(`Permanently delete ${customer.name}? This cannot be undone.`)) return;
        try {
            const res = await axios.delete(`${API_BASE_URL}customers/deleteCustomer`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                data: { customer_id: customer.id },
            });
            toast.success(res.data.message || 'Customer deleted');
            fetchCustomers(currentPage);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete customer');
        }
    };

    // ── Helpers ─────────────────────────────────────────────────────────────────
    const iconBtn = (title, Icon, colorCls, onClick, disabled = false) => (
        <button
            type="button"
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`p-1.5 rounded-lg border transition-colors ${
                disabled
                    ? 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                    : `border-gray-200 dark:border-gray-700 ${colorCls} hover:border-transparent`
            }`}
        >
            <Icon className="w-3.5 h-3.5" />
        </button>
    );

    // ── Expanded-row action button ───────────────────────────────────────────────
    const actionBtn = (label, Icon, gradientCls, onClick, disabled = false, disabledTitle = '') => (
        <button
            type="button"
            title={disabled ? disabledTitle : label}
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-md ${
                disabled
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none'
                    : `text-white ${gradientCls}`
            }`}
        >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
        </button>
    );

    // ══════════════════════════════════════════════════════════════════════════════
    return (
        <>
            <ToastContainer />

            {/* ── Drawers ── */}
            <RegisterCustomerDrawer
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                token={token}
                onSuccess={() => fetchCustomers(1)}
            />
            <EditCustomerDrawer
                isOpen={isEditOpen}
                onClose={() => { setIsEditOpen(false); setEditingCustomer(null); }}
                customer={editingCustomer}
                token={token}
                onSuccess={() => fetchCustomers(currentPage)}
            />
            <AddAccountDepositDrawer
                isOpen={isDepositOpen}
                onClose={() => { setIsDepositOpen(false); setDepositCustomer(null); }}
                customer={depositCustomer}
                token={token}
                onSuccess={() => fetchCustomers(currentPage)}
            />
            <ViewDepositHistoryDrawer
                isOpen={isDepositHistOpen}
                onClose={() => { setIsDepositHistOpen(false); setDepositHistCustomer(null); }}
                customer={depositHistCustomer}
                token={token}
            />
            <RecordSaleBalancePaymentDrawer
                isOpen={isRepayOpen}
                onClose={() => { setIsRepayOpen(false); setRepayCustomer(null); }}
                customer={repayCustomer}
                token={token}
                onSuccess={() => fetchCustomers(currentPage)}
            />
            <ViewSaleBalanceHistoryDrawer
                isOpen={isRepayHistOpen}
                onClose={() => { setIsRepayHistOpen(false); setRepayHistCustomer(null); }}
                customer={repayHistCustomer}
                token={token}
            />
            <ViewCreditStatementDrawer
                isOpen={isCreditStatementOpen}
                onClose={() => { setIsCreditStatementOpen(false); setCreditStatementCustomer(null); }}
                customer={creditStatementCustomer}
                token={token}
            />
            <ViewSalesHistoryDrawer
                isOpen={isSalesHistoryOpen}
                onClose={() => { setIsSalesHistoryOpen(false); setSalesHistoryCustomer(null); }}
                customer={salesHistoryCustomer}
                token={token}
            />

            {/* ── Main card ── */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-8 transition-colors border-gray-200 dark:border-gray-700 mt-5">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">Customer Management</h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Manage pharmacy customers, account deposits, and outstanding balances.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsRegisterOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow text-white bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-5 h-5" /> Add Customer
                    </button>
                </div>

                {/* ── Statistics ── */}
                {statistics && (
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                            Customer Insights
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Customers</span>
                                <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{statistics.total_customers}</span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                                <span className="text-[10px] font-semibold text-green-500 dark:text-green-400 uppercase tracking-wider">Active</span>
                                <span className="text-2xl font-bold text-green-700 dark:text-green-300">{statistics.total_active}</span>
                                <span className="text-[10px] text-green-400 dark:text-green-500">Active accounts</span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                                <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">Inactive</span>
                                <span className="text-2xl font-bold text-red-700 dark:text-red-300">{statistics.total_inactive}</span>
                                <span className="text-[10px] text-red-400 dark:text-red-500">Deactivated accounts</span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                                <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">This Month</span>
                                <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{statistics.registered_this_month}</span>
                                <span className="text-[10px] text-indigo-400 dark:text-indigo-500">New registrations</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="text" placeholder="Search by name, phone, or email…" value={searchTerm} onChange={handleSearchChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <button onClick={applyDateFilter} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                                <Filter className="w-4 h-4" /> Apply
                            </button>
                            <button onClick={resetFilters} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                <RefreshCw className="w-4 h-4" /> Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {['Name', 'Phone', 'Email', 'Branch', 'Credit', 'Deposit Balance', 'Owes Pharmacy', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-bold dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>
                                        {[...Array(9)].map((_, j) => (
                                            <td key={j} className="px-4 py-3"><Skeleton /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No customers found — try adjusting the filters
                                    </td>
                                </tr>
                            ) : (
                                customers.map(customer => (
                                    <React.Fragment key={customer.id}>
                                        {/* ── Main row ── */}
                                        <tr
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition cursor-pointer"
                                            onClick={() => toggleRow(customer.id)}
                                        >
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{customer.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{customer.phone_number}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{customer.email || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{customer.branch?.name ?? '—'}</td>

                                            {/* Credit Status */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {customer.credit_enabled ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                                        <CheckCircle2 className="w-3 h-3" /> Enabled
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                        <XCircle className="w-3 h-3" /> Disabled
                                                    </span>
                                                )}
                                            </td>

                                            {/* Deposit Balance */}
                                            <td className="px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400 whitespace-nowrap">
                                                UGX {Number(customer.account_deposit_amount || 0).toLocaleString()}
                                            </td>

                                            {/* Owes Pharmacy */}
                                            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                                <span className={Number(customer.account_sale_balance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}>
                                                    UGX {Number(customer.account_sale_balance || 0).toLocaleString()}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {customer.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions: Edit + chevron only */}
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1.5">
                                                    {iconBtn('Edit customer', Edit2, 'text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30', (e) => { e.stopPropagation(); setEditingCustomer(customer); setIsEditOpen(true); })}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); toggleRow(customer.id); }}
                                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-transparent transition"
                                                    >
                                                        {expandedRows.has(customer.id)
                                                            ? <ChevronUp className="w-3.5 h-3.5" />
                                                            : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* ══ EXPANDED ROW ══ */}
                                        {expandedRows.has(customer.id) && (
                                            <tr>
                                                <td colSpan={9} className="p-0">
                                                    <div className="border-t border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60">
                                                        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-400 to-transparent opacity-50" />

                                                        <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-4">

                                                            {/* ── Section 1: Deposits ── */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <div className="w-6 h-6 rounded-md bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                                                        <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                                                    </div>
                                                                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Deposits</h4>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {actionBtn(
                                                                        'Add Deposit', Wallet,
                                                                        'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-200 dark:shadow-green-900/30',
                                                                        (e) => { e.stopPropagation(); setDepositCustomer(customer); setIsDepositOpen(true); }
                                                                    )}
                                                                    {actionBtn(
                                                                        'View Deposit History', Eye,
                                                                        'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-blue-200 dark:shadow-blue-900/30',
                                                                        (e) => { e.stopPropagation(); setDepositHistCustomer(customer); setIsDepositHistOpen(true); }
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* ── Section 2: Balance & Sales ── */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                                                        <HandCoins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                                    </div>
                                                                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Balance &amp; Sales</h4>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {actionBtn(
                                                                        'Record Repayment', HandCoins,
                                                                        'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200 dark:shadow-amber-900/30',
                                                                        (e) => { e.stopPropagation(); setRepayCustomer(customer); setIsRepayOpen(true); },
                                                                        Number(customer.account_sale_balance || 0) === 0,
                                                                        'No outstanding balance'
                                                                    )}
                                                                    {actionBtn(
                                                                        'View Repayment History', ClipboardList,
                                                                        'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-purple-200 dark:shadow-purple-900/30',
                                                                        (e) => { e.stopPropagation(); setRepayHistCustomer(customer); setIsRepayHistOpen(true); }
                                                                    )}
                                                                    {actionBtn(
                                                                        'Sales History', Receipt,
                                                                        'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-sky-200 dark:shadow-sky-900/30',
                                                                        (e) => { e.stopPropagation(); setSalesHistoryCustomer(customer); setIsSalesHistoryOpen(true); }
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* ── Section 3: Credit & Account ── */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                                                                        <FileBarChart className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                                                    </div>
                                                                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Credit &amp; Account</h4>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {actionBtn(
                                                                        'Credit Statement', FileBarChart,
                                                                        'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-teal-200 dark:shadow-teal-900/30',
                                                                        (e) => { e.stopPropagation(); setCreditStatementCustomer(customer); setIsCreditStatementOpen(true); }
                                                                    )}

                                                                    {/* Divider */}
                                                                    <div className="pt-1 pb-0.5">
                                                                        <div className="border-t border-gray-100 dark:border-gray-800" />
                                                                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2 mb-1 px-0.5">Account Actions</p>
                                                                    </div>

                                                                    {/* {customer.is_active && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); handleDeactivate(customer); }}
                                                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition
                                                                                text-amber-700 dark:text-amber-400
                                                                                bg-amber-50 dark:bg-amber-900/20
                                                                                border border-amber-200 dark:border-amber-800
                                                                                hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                                                        >
                                                                            <UserX className="w-4 h-4 flex-shrink-0" />
                                                                            Deactivate Customer
                                                                        </button>
                                                                    )} */}
                                                                    {/* <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete(customer); }}
                                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition
                                                                            text-red-600 dark:text-red-400
                                                                            bg-red-50 dark:bg-red-900/20
                                                                            border border-red-200 dark:border-red-800
                                                                            hover:bg-red-100 dark:hover:bg-red-900/40"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                                                                        Delete Customer
                                                                    </button> */}
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                        Showing {customers.length} of page {currentPage} / {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => fetchCustomers(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">Page {currentPage} of {totalPages}</span>
                        <button onClick={() => fetchCustomers(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
