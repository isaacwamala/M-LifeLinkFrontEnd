import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FlaskConical, Calendar, Filter, RefreshCw, TestTube } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast, ToastContainer } from 'react-toastify';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
    Math.round(Number(n ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const monthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const monthEnd = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
};

// ── Main component ────────────────────────────────────────────────────────────
export function ReportsLabBreakdown() {
    const token = localStorage.getItem('access_token');

    const [from, setFrom] = useState(monthStart);
    const [to, setTo]     = useState(monthEnd);
    const [appliedFrom, setAppliedFrom] = useState(monthStart);
    const [appliedTo, setAppliedTo]     = useState(monthEnd);

    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async (f, t) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}reports/labBreakdown`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { from: f, to: t },
            });
            setData(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load lab breakdown report');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchData(appliedFrom, appliedTo); }, [fetchData, appliedFrom, appliedTo]);

    const applyFilter = () => { setAppliedFrom(from); setAppliedTo(to); };

    const resetFilter = () => {
        const f = monthStart(); const t = monthEnd();
        setFrom(f); setTo(t); setAppliedFrom(f); setAppliedTo(t);
    };

    return (
        <>
            <ToastContainer position="top-right" autoClose={4000} />

            {/* Date filter */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <button onClick={applyFilter}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                        <Filter className="w-4 h-4" /> Apply
                    </button>
                    <button onClick={resetFilter}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        <RefreshCw className="w-4 h-4" /> Reset
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 flex flex-col gap-8">

                {/* Revenue stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {loading ? (
                        <>
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <Skeleton height={20} className="mb-2" />
                                <Skeleton height={36} />
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <Skeleton height={20} className="mb-2" />
                                <Skeleton height={36} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-purple-200 dark:border-purple-800 p-5">
                                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                                    Billed Revenue
                                </p>
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                    UGX {fmt(data?.billed_revenue)}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {data?.billed_count ?? 0} confirmed lab items
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                                    Collected Revenue
                                </p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    UGX {fmt(data?.collected_revenue)}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Proportionally allocated from payments
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Status funnel */}
                <section>
                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">Test Status Pipeline</h2>
                    {loading ? (
                        <div className="flex flex-wrap gap-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="w-36 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                    <Skeleton height={16} className="mb-2" />
                                    <Skeleton height={28} />
                                </div>
                            ))}
                        </div>
                    ) : !data?.status_funnel?.length ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400 dark:text-gray-600">
                            <FlaskConical className="w-8 h-8" />
                            <span className="text-sm">No lab test data for this period</span>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {data.status_funnel.map((s, i) => (
                                <div key={i}
                                    className="flex flex-col gap-1 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 min-w-[120px]">
                                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                        {s.status_name}
                                    </span>
                                    <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                        {s.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Top test types */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <TestTube className="w-5 h-5 text-purple-500" />
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Top Test Types by Revenue</h2>
                        <span className="text-xs text-gray-400 dark:text-gray-500">(top 10)</span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                        Test Type
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                        Revenue (UGX)
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                        Count
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i}>
                                            {[1, 2, 3].map((j) => (
                                                <td key={j} className="px-6 py-4"><Skeleton /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : !data?.top_test_types?.length ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                                                <TestTube className="w-8 h-8" />
                                                <span className="text-sm">No test type data for this period</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data.top_test_types.map((row, idx) => (
                                        <tr key={idx}
                                            className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                                                {row.test_type_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right font-semibold text-gray-800 dark:text-gray-100">
                                                {fmt(row.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                                                {row.count}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>
        </>
    );
}
