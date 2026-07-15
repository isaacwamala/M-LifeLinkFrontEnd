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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                    {loading ? <Skeleton width={60} /> : (value ?? '—')}
                </p>
                {sub && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
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
        <section className="bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                    {label}
                </h2>
            </div>
            <div className="space-y-4">
                {children}
            </div>
            {extra}
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
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${info.cls}`}>
            <span className="text-xs font-semibold">{info.label}</span>
            <span className="text-sm font-bold ml-3">
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-10 shadow-sm">
                    <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Access Denied</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This page is restricted to laboratory technicians.</p>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laboratory Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Branch overview &bull;{' '}
                            {lastFetched
                                ? `Last refreshed ${lastFetched.toLocaleTimeString()}`
                                : 'Loading…'}
                        </p>
                    </div>
                    <button
                        onClick={fetchOverview}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                            text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                            disabled:opacity-40 transition shadow-sm self-start sm:self-auto"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
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
