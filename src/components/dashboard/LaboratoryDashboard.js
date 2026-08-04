import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FlaskConical, Clock, CalendarDays, AlertCircle,
    CheckCircle2, XCircle, Settings, Wrench,
    Droplets, Building2, TrendingUp,
    RefreshCw, ShieldAlert
} from 'lucide-react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { API_BASE_URL } from '../general/constants';

// ─── Detect Tailwind's `dark` class on <html> so skeletons match the theme ────
function useIsDarkMode() {
    const [isDark, setIsDark] = useState(
        () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    );

    useEffect(() => {
        const root = document.documentElement;
        const update = () => setIsDark(root.classList.contains('dark'));
        update();

        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return isDark;
}

// ─── Small stat card ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, loading }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-800 p-5 flex items-start gap-4 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em] mb-1.5">{label}</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white leading-none tabular-nums">
                    {loading ? <Skeleton width={60} /> : (value ?? '—')}
                </p>
                {sub && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                        {loading ? <Skeleton width={80} /> : sub}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Section wrapper: header + card shell around a group of stats ─────────────
function Section({ icon: Icon, label, color, children, extra }) {
    return (
        <section className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-800 shadow-sm overflow-hidden">
            <div className={`flex items-center gap-3 px-6 py-4 ${color}`}>
                <Icon className="w-5 h-5 text-white" />
                <h2 className="text-xs font-bold text-white uppercase tracking-[0.15em]">{label}</h2>
            </div>
            <div className="p-6">
                <div className="space-y-4">
                    {children}
                </div>
                {extra}
            </div>
        </section>
    );
}

// ─── Lab test status display map — mirrors TABS config in PatientLabTestRequests.js ─
// Keys are the numeric test_status_id values as returned by the backend pluck.
const TEST_STATUS_DISPLAY = {
    2: { label: 'Specimen Collected', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    3: { label: 'Specimen Accepted',  cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
    4: { label: 'Pending',            cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
    5: { label: 'Started',            cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    6: { label: 'Completed',          cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    7: { label: 'Verified',           cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
    8: { label: 'Approved',           cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    9: { label: 'Rejected',           cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

// ─── Status pill for lab test statuses (uses numeric ID key) ──────────────────
function LabStatusPill({ statusId, count, loading }) {
    const id  = Number(statusId);
    const info = TEST_STATUS_DISPLAY[id] ?? {
        label: `Status ${statusId}`,
        cls:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    };
    return (
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${info.cls} ring-1 ring-inset ring-black/5 dark:ring-white/5`}>
            <span className="text-xs font-semibold leading-none">{info.label}</span>
            <span className="text-sm font-black ml-2 tabular-nums">
                {loading ? <Skeleton width={24} /> : count}
            </span>
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
//  LaboratoryDashboard
// ══════════════════════════════════════════════════════════════════════════════
export default function LaboratoryDashboard() {
    const token       = localStorage.getItem('access_token');
    const userRoleId  = useSelector((state) => state.auth?.user?.data?.user?.role_id);
    const isLabTech   = (userRoleId || []).map(Number).includes(6);
    const isDark      = useIsDarkMode();

    const [data, setData]               = useState(null);
    const [loading, setLoading]         = useState(true);
    const [lastFetched, setLastFetched] = useState(null);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}dashboard/getLaboratoryOverview`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            setData(res.data.data);
            setLastFetched(new Date());
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load dashboard data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOverview(); }, []);

    // Non-lab-techs see an access-denied message
    if (!isLabTech) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-6">
                <div className="text-center max-w-xs w-full">
                    <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6 shadow-lg ring-1 ring-red-100 dark:ring-red-900/50">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Access Denied</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">This page is restricted to laboratory technicians.</p>
                </div>
            </div>
        );
    }

    const pipeline = data?.test_pipeline  ?? {};
    const queue    = data?.turnaround     ?? {};
    const rej      = data?.rejections     ?? {};
    const cfg      = data?.configuration  ?? {};

    // Sort by_status entries in the natural status-ID order for consistent display
    const byStatusEntries = Object.entries(pipeline.by_status ?? {})
        .sort(([a], [b]) => Number(a) - Number(b));

    return (
        <SkeletonTheme
            baseColor={isDark ? '#374151' : '#e5e7eb'}
            highlightColor={isDark ? '#4b5563' : '#f3f4f6'}
        >
            <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

                {/* ── Page header ── */}
                <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-cyan-700" />
                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-cyan-300/10 pointer-events-none" />
                    <div className="absolute right-20 bottom-0 w-24 h-24 rounded-full bg-blue-300/10 pointer-events-none" />
                    <div className="relative px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 bg-white/10 text-xs font-semibold text-white/80 px-3 py-1 rounded-full border border-white/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                                    Live Overview
                                </span>
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Laboratory Dashboard</h1>
                            <p className="text-sm text-white/50 mt-1">
                                Branch overview &bull;{' '}
                                {lastFetched ? `Updated ${lastFetched.toLocaleTimeString()}` : 'Loading…'}
                            </p>
                        </div>
                        <button
                            onClick={fetchOverview}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                                bg-white/10 hover:bg-white/20 border border-white/15 text-white
                                transition-all duration-200 disabled:opacity-40 self-start sm:self-auto"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ══ TEST PIPELINE ══ */}
                <Section
                    icon={FlaskConical}
                    label="Test Pipeline"
                    color="bg-blue-600"
                    extra={(loading || byStatusEntries.length > 0) && (
                        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                Tests by Status
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {loading
                                    ? [1, 2, 3, 4].map(i => <Skeleton key={i} height={44} className="rounded-xl" />)
                                    : byStatusEntries.map(([statusId, count]) => (
                                        <LabStatusPill
                                            key={statusId}
                                            statusId={statusId}
                                            count={count}
                                            loading={loading}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    )}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={Clock}
                            label="Requested Today"
                            value={pipeline.requested_today}
                            loading={loading}
                            iconBg="bg-blue-100 dark:bg-blue-900/40"
                            iconColor="text-blue-600 dark:text-blue-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="Requested This Month"
                            value={pipeline.requested_this_month}
                            loading={loading}
                            iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                            iconColor="text-indigo-600 dark:text-indigo-400"
                        />
                        <StatCard
                            icon={AlertCircle}
                            label="Overdue Pending (> 2 hrs)"
                            value={pipeline.overdue_pending}
                            loading={loading}
                            iconBg="bg-red-100 dark:bg-red-900/40"
                            iconColor="text-red-600 dark:text-red-400"
                        />
                    </div>
                </Section>

                {/* ══ TURNAROUND QUEUE ══ */}
                <Section icon={TrendingUp} label="Turnaround Queue" color="bg-amber-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            icon={CheckCircle2}
                            label="Awaiting Verification"
                            value={queue.awaiting_verification}
                            sub="Results entered — not yet verified"
                            loading={loading}
                            iconBg="bg-purple-100 dark:bg-purple-900/40"
                            iconColor="text-purple-600 dark:text-purple-400"
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Awaiting Approval"
                            value={queue.awaiting_approval}
                            sub="Verified — not yet approved"
                            loading={loading}
                            iconBg="bg-amber-100 dark:bg-amber-900/40"
                            iconColor="text-amber-600 dark:text-amber-400"
                        />
                    </div>
                </Section>

                {/* ══ REJECTIONS ══ */}
                <Section icon={XCircle} label="Rejections" color="bg-red-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            icon={XCircle}
                            label="Rejected Today"
                            value={rej.rejected_today}
                            loading={loading}
                            iconBg="bg-red-100 dark:bg-red-900/40"
                            iconColor="text-red-600 dark:text-red-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="Rejected This Month"
                            value={rej.rejected_this_month}
                            loading={loading}
                            iconBg="bg-rose-100 dark:bg-rose-900/40"
                            iconColor="text-rose-600 dark:text-rose-400"
                        />
                    </div>
                </Section>

                {/* ══ LAB CONFIGURATION ══ */}
                <Section
                    icon={Settings}
                    label="Lab Configuration"
                    color="bg-slate-600"
                    extra={
                        <p className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                            These are facility-wide totals and are not specific to your branch.
                        </p>
                    }
                >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard
                            icon={FlaskConical}
                            label="Test Types"
                            value={cfg.total_test_types}
                            loading={loading}
                            iconBg="bg-blue-100 dark:bg-blue-900/40"
                            iconColor="text-blue-600 dark:text-blue-400"
                        />
                        <StatCard
                            icon={Droplets}
                            label="Specimen Types"
                            value={cfg.total_specimen_types}
                            loading={loading}
                            iconBg="bg-cyan-100 dark:bg-cyan-900/40"
                            iconColor="text-cyan-600 dark:text-cyan-400"
                        />
                        <StatCard
                            icon={Wrench}
                            label="Instruments"
                            value={cfg.total_instruments}
                            loading={loading}
                            iconBg="bg-slate-100 dark:bg-slate-700"
                            iconColor="text-slate-600 dark:text-slate-300"
                        />
                        <StatCard
                            icon={Building2}
                            label="Lab Sections"
                            value={cfg.total_lab_sections}
                            loading={loading}
                            iconBg="bg-teal-100 dark:bg-teal-900/40"
                            iconColor="text-teal-600 dark:text-teal-400"
                        />
                    </div>
                </Section>

            </div>
        </SkeletonTheme>
    );
}
