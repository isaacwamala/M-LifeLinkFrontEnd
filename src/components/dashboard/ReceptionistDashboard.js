import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ClipboardList, Clock, CalendarDays, Users,
    UserPlus, CheckCircle2, XCircle, DoorOpen,
    RefreshCw, ShieldAlert, AlertTriangle, LayoutGrid,
    CalendarCheck, UserCheck,
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

// ─── Section wrapper ──────────────────────────────────────────────────────────
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

// ─── Visit status colour map — mirrors AdminDashboard.js STATUS_COLORS ─────────
const VISIT_STATUS_COLORS = {
    waiting:         'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    triaged:         'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    in_consultation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed:       'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    approved:        'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    admitted:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    rejected:        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// ─── Appointment status colour map ────────────────────────────────────────────
const APPT_STATUS_COLORS = {
    scheduled:   'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    confirmed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    checked_in:  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    completed:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    cancelled:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    no_show:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    rescheduled: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
};

// ─── Generic status pill (label + count) ──────────────────────────────────────
function StatusPill({ statusKey, count, colorMap, loading }) {
    const cls = colorMap[statusKey] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    const label = statusKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return (
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${cls} ring-1 ring-inset ring-black/5 dark:ring-white/5`}>
            <span className="text-xs font-semibold leading-none">{label}</span>
            <span className="text-sm font-black ml-2 tabular-nums">
                {loading ? <Skeleton width={24} /> : count}
            </span>
        </div>
    );
}

// ─── Category badge (OPD / Departmental / etc.) ───────────────────────────────
function CategoryPill({ category, count, loading }) {
    const colors = {
        opd:          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        departmental: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    };
    const cls = colors[category] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return (
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${cls} ring-1 ring-inset ring-black/5 dark:ring-white/5`}>
            <span className="text-xs font-semibold leading-none">{label}</span>
            <span className="text-sm font-black ml-2 tabular-nums">
                {loading ? <Skeleton width={24} /> : count}
            </span>
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
//  ReceptionistDashboard
// ══════════════════════════════════════════════════════════════════════════════
export default function ReceptionistDashboard() {
    const token        = localStorage.getItem('access_token');
    const userRoleId   = useSelector((state) => state.auth?.user?.data?.user?.role_id);
    const isReceptionist = (userRoleId || []).map(Number).includes(9);
    const isDark       = useIsDarkMode();

    const [data, setData]               = useState(null);
    const [loading, setLoading]         = useState(true);
    const [lastFetched, setLastFetched] = useState(null);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}dashboard/getReceptionistOverview`, {
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

    // Non-receptionists see an access-denied message
    if (!isReceptionist) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-6">
                <div className="text-center max-w-xs w-full">
                    <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6 shadow-lg ring-1 ring-red-100 dark:ring-red-900/50">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Access Denied</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">This page is restricted to receptionists.</p>
                </div>
            </div>
        );
    }

    const visits  = data?.visits       ?? {};
    const patients = data?.patients    ?? {};
    const apts    = data?.appointments ?? {};
    const rooms   = data?.rooms        ?? {};

    const visitStatusEntries  = Object.entries(visits.by_status  ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const visitCategoryEntries = Object.entries(visits.by_category ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const aptStatusEntries    = Object.entries(apts.by_status    ?? {}).sort(([a], [b]) => a.localeCompare(b));

    return (
        <SkeletonTheme
            baseColor={isDark ? '#374151' : '#e5e7eb'}
            highlightColor={isDark ? '#4b5563' : '#f3f4f6'}
        >
            <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

                {/* ── Page header ── */}
                <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-700 to-blue-800" />
                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-blue-300/10 pointer-events-none" />
                    <div className="absolute right-20 bottom-0 w-24 h-24 rounded-full bg-sky-300/10 pointer-events-none" />
                    <div className="relative px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 bg-white/10 text-xs font-semibold text-white/80 px-3 py-1 rounded-full border border-white/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" />
                                    Live Overview
                                </span>
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Receptionist Dashboard</h1>
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

                {/* ══ VISITS ══ */}
                <Section
                    icon={ClipboardList}
                    label="Visits"
                    color="bg-blue-600"
                    extra={
                        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800 space-y-4">
                            {/* Pending self-requests alert bar */}
                            {(loading || visits.pending_self_requests > 0) && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex-1">
                                        Pending Self-Requests
                                    </span>
                                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                        {loading ? <Skeleton width={24} /> : visits.pending_self_requests}
                                    </span>
                                </div>
                            )}

                            {/* By status */}
                            {(loading || visitStatusEntries.length > 0) && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                        By Status
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {loading
                                            ? [1, 2, 3, 4].map(i => <Skeleton key={i} height={44} className="rounded-xl" />)
                                            : visitStatusEntries.map(([status, count]) => (
                                                <StatusPill
                                                    key={status}
                                                    statusKey={status}
                                                    count={count}
                                                    colorMap={VISIT_STATUS_COLORS}
                                                    loading={loading}
                                                />
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {/* By category */}
                            {(loading || visitCategoryEntries.length > 0) && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                        By Category
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {loading
                                            ? [1, 2].map(i => <Skeleton key={i} height={44} className="rounded-xl" />)
                                            : visitCategoryEntries.map(([cat, count]) => (
                                                <CategoryPill key={cat} category={cat} count={count} loading={loading} />
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={Clock}
                            label="Visits Today"
                            value={visits.today}
                            loading={loading}
                            iconBg="bg-blue-100 dark:bg-blue-900/40"
                            iconColor="text-blue-600 dark:text-blue-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="Visits This Week"
                            value={visits.this_week}
                            loading={loading}
                            iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                            iconColor="text-indigo-600 dark:text-indigo-400"
                        />
                        <StatCard
                            icon={LayoutGrid}
                            label="Visits This Month"
                            value={visits.this_month}
                            loading={loading}
                            iconBg="bg-violet-100 dark:bg-violet-900/40"
                            iconColor="text-violet-600 dark:text-violet-400"
                        />
                    </div>
                </Section>

                {/* ══ PATIENTS ══ */}
                <Section icon={Users} label="Patients" color="bg-emerald-600">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={UserPlus}
                            label="New Patients Today"
                            value={patients.new_today}
                            loading={loading}
                            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                            iconColor="text-emerald-600 dark:text-emerald-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="New This Month"
                            value={patients.new_this_month}
                            loading={loading}
                            iconBg="bg-green-100 dark:bg-green-900/40"
                            iconColor="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                            icon={Users}
                            label="Total Patients"
                            value={patients.total}
                            loading={loading}
                            iconBg="bg-teal-100 dark:bg-teal-900/40"
                            iconColor="text-teal-600 dark:text-teal-400"
                        />
                    </div>
                </Section>

                {/* ══ APPOINTMENTS ══ */}
                <Section
                    icon={CalendarCheck}
                    label="Appointments"
                    color="bg-sky-600"
                    extra={(loading || aptStatusEntries.length > 0) && (
                        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                By Status
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {loading
                                    ? [1, 2, 3, 4].map(i => <Skeleton key={i} height={44} className="rounded-xl" />)
                                    : aptStatusEntries.map(([status, count]) => (
                                        <StatusPill
                                            key={status}
                                            statusKey={status}
                                            count={count}
                                            colorMap={APPT_STATUS_COLORS}
                                            loading={loading}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    )}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            icon={Clock}
                            label="Appointments Today"
                            value={apts.today}
                            loading={loading}
                            iconBg="bg-sky-100 dark:bg-sky-900/40"
                            iconColor="text-sky-600 dark:text-sky-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="Appointments This Week"
                            value={apts.this_week}
                            loading={loading}
                            iconBg="bg-cyan-100 dark:bg-cyan-900/40"
                            iconColor="text-cyan-600 dark:text-cyan-400"
                        />
                    </div>
                </Section>

                {/* ══ ROOMS ══ */}
                <Section icon={DoorOpen} label="Rooms" color="bg-slate-600">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={DoorOpen}
                            label="Total Rooms"
                            value={rooms.total}
                            loading={loading}
                            iconBg="bg-slate-100 dark:bg-slate-700"
                            iconColor="text-slate-600 dark:text-slate-300"
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Available"
                            value={rooms.available}
                            loading={loading}
                            iconBg="bg-green-100 dark:bg-green-900/40"
                            iconColor="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                            icon={UserCheck}
                            label="Occupied"
                            value={rooms.occupied}
                            loading={loading}
                            iconBg="bg-orange-100 dark:bg-orange-900/40"
                            iconColor="text-orange-600 dark:text-orange-400"
                        />
                    </div>
                </Section>

            </div>
        </SkeletonTheme>
    );
}
