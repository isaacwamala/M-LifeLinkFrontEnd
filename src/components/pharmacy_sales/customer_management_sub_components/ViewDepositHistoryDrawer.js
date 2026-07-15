import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, Calendar, Filter, RefreshCw, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export function ViewDepositHistoryDrawer({ isOpen, onClose, customer, token }) {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [dateFrom, setDateFrom] = useState(firstOfMonth);
    const [dateTo, setDateTo] = useState(today);
    const [deposits, setDeposits] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchHistory = useCallback(async (page = 1) => {
        if (!customer) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}customers/getCustomerDepositHistory`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { customer_id: customer.id, date_from: dateFrom, date_to: dateTo, page },
            });
            const data = res.data.data;
            setDeposits(data.data);
            setCurrentPage(data.current_page);
            setTotalPages(data.last_page);
            if (res.data.summary) setSummary(res.data.summary);
        } catch (err) {
            console.error('Failed to fetch deposit history:', err);
        } finally {
            setLoading(false);
        }
    }, [customer, token, dateFrom, dateTo]);

    useEffect(() => {
        if (isOpen && customer) fetchHistory(1);
    }, [isOpen, customer]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyFilter = () => fetchHistory(1);
    const resetFilter = () => {
        setDateFrom(firstOfMonth);
        setDateTo(today);
        setTimeout(() => fetchHistory(1), 0);
    };

    if (!isOpen || !customer) return null;

    const methodLabel = { cash: 'Cash', card: 'Card', mobile_money: 'Mobile Money' };
    const methodChipCls = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                            <h2 className="text-base font-semibold text-gray-800 dark:text-white">Deposit History</h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{customer.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-4">
                    {/* Summary cards */}
                    {summary && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50">
                                <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Total Deposited</p>
                                <p className="text-lg font-bold text-green-800 dark:text-green-300 mt-0.5">
                                    UGX {(summary.total_deposited || 0).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-green-600 dark:text-green-500 mt-0.5">{summary.deposit_count} deposit{summary.deposit_count !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
                                <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Current Balance</p>
                                <p className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mt-0.5">
                                    UGX {(summary.current_deposit_balance || customer.account_deposit_amount || 0).toLocaleString()}
                                </p>
                            </div>
                            {summary.by_method && Object.keys(summary.by_method).length > 0 && (
                                <div className="col-span-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">By Method</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(summary.by_method).map(([method, amount]) => (
                                            <span key={method} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                                                {methodLabel[method] || method}: <span className="font-bold">UGX {Number(amount).toLocaleString()}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Date filter */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="w-full pl-8 pr-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" />
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="w-full pl-8 pr-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" />
                        </div>
                        <button onClick={applyFilter} className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                            <Filter className="w-3.5 h-3.5" /> Apply
                        </button>
                        <button onClick={resetFilter} className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" /> Reset
                        </button>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <Skeleton count={3} />
                                </div>
                            ))
                        ) : deposits.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                                <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No deposits found for this period</p>
                            </div>
                        ) : (
                            deposits.map((dep, i) => (
                                <div key={dep.id ?? i} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                            + UGX {Number(dep.amount_deposited || 0).toLocaleString()}
                                        </span>
                                        <span className={methodChipCls}>{methodLabel[dep.payment_method] || dep.payment_method}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>By: <span className="font-medium text-gray-700 dark:text-gray-300">{dep.recorded_by?.name ?? '—'}</span></span>
                                        <span>{dep.shift_id ? `Shift #${dep.shift_id}` : <span className="italic">No shift</span>}</span>
                                    </div>
                                    {dep.additional_info && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{dep.additional_info}</p>
                                    )}
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                        {dep.created_at ? new Date(dep.created_at).toLocaleString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => fetchHistory(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button onClick={() => fetchHistory(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
