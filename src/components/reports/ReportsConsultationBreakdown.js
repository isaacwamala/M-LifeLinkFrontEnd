import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Stethoscope, Calendar, Filter, RefreshCw, User, DoorOpen } from 'lucide-react';
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

const sortByBilled = (arr) => [...(arr ?? [])].sort((a, b) => b.billed - a.billed);

// ── Reusable table ────────────────────────────────────────────────────────────
function BreakdownTable({ rows, nameKey, nameLabel, icon: Icon, loading, colSpan = 4 }) {
    const sorted = sortByBilled(rows);

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            {nameLabel}
                        </th>
                        <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            Billed (UGX)
                        </th>
                        <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            Collected (UGX)
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
                                {[...Array(colSpan)].map((_, j) => (
                                    <td key={j} className="px-6 py-4"><Skeleton /></td>
                                ))}
                            </tr>
                        ))
                    ) : sorted.length === 0 ? (
                        <tr>
                            <td colSpan={colSpan} className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                                    <Icon className="w-8 h-8" />
                                    <span className="text-sm">No consultation data for this period</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        sorted.map((row, idx) => (
                            <tr key={idx} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                                    {row[nameKey] ?? '—'}
                                </td>
                                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-800 dark:text-gray-100">
                                    {fmt(row.billed)}
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                                    {fmt(row.collected)}
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                                    {row.count ?? 0}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ReportsConsultationBreakdown() {
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
            const res = await axios.get(`${API_BASE_URL}reports/consultationBreakdown`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { from: f, to: t },
            });
            setData(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load consultation breakdown report');
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

                {/* By Doctor */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-blue-500" />
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">By Doctor</h2>
                    </div>
                    <BreakdownTable
                        rows={data?.by_doctor}
                        nameKey="doctor_name"
                        nameLabel="Doctor"
                        icon={User}
                        loading={loading}
                    />
                </section>

                {/* By Room */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <DoorOpen className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">By Room</h2>
                    </div>
                    <BreakdownTable
                        rows={data?.by_room}
                        nameKey="room_name"
                        nameLabel="Room"
                        icon={DoorOpen}
                        loading={loading}
                    />
                </section>

            </div>
        </>
    );
}
