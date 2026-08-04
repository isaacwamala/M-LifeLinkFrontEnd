import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart3, Calendar, Filter, RefreshCw, Trophy,
    TrendingUp, TrendingDown, Minus, AlertTriangle, Info,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast, ToastContainer } from 'react-toastify';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
    Math.round(Number(n ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtPct = (n) => Number(n ?? 0).toFixed(1) + '%';

const monthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const monthEnd = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
};

const DEPT_META = {
    consultation: {
        label: 'Consultation',
        cardCls: 'border-blue-200 dark:border-blue-800',
        badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        billedCls: 'text-blue-700 dark:text-blue-300',
        accentCls: 'bg-blue-50 dark:bg-blue-900/20',
    },
    PatientLabTest: {
        label: 'Laboratory',
        cardCls: 'border-purple-200 dark:border-purple-800',
        badgeCls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        billedCls: 'text-purple-700 dark:text-purple-300',
        accentCls: 'bg-purple-50 dark:bg-purple-900/20',
    },
    PrescriptionItem: {
        label: 'Pharmacy',
        cardCls: 'border-green-200 dark:border-green-800',
        badgeCls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        billedCls: 'text-green-700 dark:text-green-300',
        accentCls: 'bg-green-50 dark:bg-green-900/20',
    },
};

const RANK_LABEL = ['#1', '#2', '#3'];

function computeRankedDepts(raw) {
    if (!raw?.length) return [];
    const maxRevenue = Math.max(...raw.map((d) => d.billed_amount), 0.001);
    const maxVolume  = Math.max(...raw.map((d) => d.billed_count), 0.001);

    return raw
        .map((d) => ({
            ...d,
            outstanding:     d.billed_amount - d.collected_amount,
            collection_rate: d.billed_amount > 0 ? (d.collected_amount / d.billed_amount) * 100 : 0,
            avg_revenue:     d.billed_count  > 0 ? d.billed_amount / d.billed_count : 0,
            score: 0.70 * (d.billed_amount / maxRevenue) + 0.30 * (d.billed_count / maxVolume),
        }))
        .sort((a, b) => b.score - a.score);
}

// ── Rank badge ─────────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
    if (rank === 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                <Trophy className="w-3.5 h-3.5" /> #1
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
            {RANK_LABEL[rank]}
        </span>
    );
}

// ── Department card ───────────────────────────────────────────────────────────
function DeptCard({ dept, rank }) {
    const meta = DEPT_META[dept.source_type] ?? {
        label: dept.source_type,
        cardCls: 'border-gray-200 dark:border-gray-700',
        badgeCls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        billedCls: 'text-gray-700 dark:text-gray-300',
        accentCls: 'bg-gray-50 dark:bg-gray-800',
    };

    const hasOutstanding = dept.outstanding > 0.01;

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-xl border-2 ${meta.cardCls} p-5 flex flex-col gap-4`}>
            {/* Card header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit ${meta.badgeCls}`}>
                        {meta.label}
                    </span>
                </div>
                <RankBadge rank={rank} />
            </div>

            {/* Billed */}
            <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-0.5">
                    Billed Revenue
                </p>
                <p className={`text-2xl font-bold ${meta.billedCls}`}>
                    UGX {fmt(dept.billed_amount)}
                </p>
            </div>

            {/* Collected + outstanding */}
            <div className={`rounded-lg px-3 py-2.5 ${meta.accentCls} flex flex-col gap-1.5`}>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Collected</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        UGX {fmt(dept.collected_amount)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Outstanding</span>
                    <span className={`text-sm font-semibold ${hasOutstanding ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {hasOutstanding && <AlertTriangle className="inline w-3 h-3 mr-0.5 mb-0.5" />}
                        UGX {fmt(dept.outstanding)}
                    </span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Collection rate</span>
                    <span className={`text-sm font-bold ${dept.collection_rate >= 80 ? 'text-green-600 dark:text-green-400' : dept.collection_rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {fmtPct(dept.collection_rate)}
                    </span>
                </div>
            </div>

            {/* Volume + avg + score */}
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Volume</span>
                    <span className="text-base font-bold text-gray-800 dark:text-gray-100">{dept.billed_count}</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Avg/event</span>
                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-100">{fmt(dept.avg_revenue)}</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Score</span>
                    <span className="text-base font-bold text-gray-800 dark:text-gray-100">{(dept.score * 100).toFixed(0)}</span>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ReportsOverview() {
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
            const res = await axios.get(`${API_BASE_URL}reports/departmentPerformance`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { from: f, to: t },
            });
            setData(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load department performance report');
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

    const [howOpen, setHowOpen] = useState(false);

    const ranked = computeRankedDepts(data?.departments ?? []);

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

            {/* How "Collected" is computed — collapsible */}
            <div className="px-4 sm:px-6 pt-5">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">

                    {/* Header row — always visible, click to expand */}
                    <button
                        onClick={() => setHowOpen((o) => !o)}
                        className="w-full flex items-start gap-3 p-4 cursor-pointer text-left"
                    >
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="flex-1 text-sm">
                            <strong>How Collected is calculated:</strong> Payments are recorded per invoice, not per service line.
                            When one invoice covers multiple departments (e.g. a consultation + a lab test),
                            each payment is split proportionally — so if Lab is 80% of the invoice total,
                            it gets 80% of every payment against that invoice.
                            <em className="ml-1 not-italic font-medium">Collected ≠ what was paid for that department alone; it is that department's fair share of all payments received.</em>
                        </span>
                        {howOpen
                            ? <ChevronUp   className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        }
                    </button>

                    {/* Expanded: Mr. Joshua worked example */}
                    {howOpen && (
                        <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-800 text-sm">
                            <p className="mt-3 mb-2">
                                <strong>Example:</strong> Mr. Joshua's visit is billed{' '}
                                <strong>UGX 20,000</strong> for consultation,{' '}
                                <strong>50,000</strong> for lab tests, and{' '}
                                <strong>50,000</strong> for pharmacy —
                                invoice total <strong>120,000</strong>.
                            </p>
                            <p className="mb-3">
                                He pays <strong>60,000</strong> (half the invoice).
                                Each department receives its proportional share which is (its billed amount/invoice total)*100. And then payment allocation is considered from (%share*totalAmountPaidOnInvoice)
                            </p>
                            <table className="w-full text-xs border-collapse mb-3">
                                <thead>
                                    <tr className="border-b border-blue-200 dark:border-blue-700">
                                        <th className="text-left py-1.5 font-semibold">Department</th>
                                        <th className="text-right py-1.5 font-semibold">Share of invoice</th>
                                        <th className="text-right py-1.5 font-semibold">Allocated from payment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-blue-100 dark:border-blue-900">
                                        <td className="py-1.5">Consultation</td>
                                        <td className="text-right py-1.5">16.67%</td>
                                        <td className="text-right py-1.5 font-semibold">UGX 10,000</td>
                                    </tr>
                                    <tr className="border-b border-blue-100 dark:border-blue-900">
                                        <td className="py-1.5">Laboratory</td>
                                        <td className="text-right py-1.5">41.67%</td>
                                        <td className="text-right py-1.5 font-semibold">UGX 25,000</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5">Pharmacy</td>
                                        <td className="text-right py-1.5">41.67%</td>
                                        <td className="text-right py-1.5 font-semibold">UGX 25,000</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="text-xs text-blue-700 dark:text-blue-400">
                                Each department gets its proportional share of every payment — not a fixed amount —
                                so collected figures rise gradually as more payments come in.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
                {/* Grand totals strip */}
                {!loading && data && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Total Billed
                            </span>
                            <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                UGX {fmt(data.total_billed)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Total Collected
                            </span>
                            <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                UGX {fmt(data.total_collected)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Department cards */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <Skeleton height={24} className="mb-3" />
                                <Skeleton height={36} className="mb-3" />
                                <Skeleton height={80} className="mb-3" />
                                <Skeleton height={50} />
                            </div>
                        ))}
                    </div>
                ) : ranked.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                        <BarChart3 className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            No revenue data for this period. Try adjusting the date range.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {ranked.map((dept, i) => (
                            <DeptCard key={dept.source_type} dept={dept} rank={i} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
