import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, UserCheck, CalendarDays, FlaskConical, Pill,
    DoorOpen, BedDouble, Activity, Clock, CheckCircle2,
    AlertCircle, TrendingUp, RefreshCw, ShieldAlert, Stethoscope
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

// ─── Visit status pill ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
    waiting:        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    triaged:        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    in_consultation:'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    approved:       'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    admitted:       'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    rejected:       'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function StatusPill({ status, count, loading }) {
    const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    return (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${cls}`}>
            <span className="text-xs font-semibold capitalize">{status?.replace(/_/g, ' ') ?? '—'}</span>
            <span className="text-sm font-bold ml-3">
                {loading ? <Skeleton width={24} /> : count}
            </span>
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
//  AdminDashboard
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
    const token   = localStorage.getItem('access_token');
    const userRoleId = useSelector((state) => state.auth?.user?.data?.user?.role_id);
    const isAdmin = (userRoleId || []).map(Number).includes(1);
    const isDark = useIsDarkMode();

    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastFetched, setLastFetched] = useState(null);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}dashboard/getOverview`, {
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

    // Non-admins see an access-denied message
    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-10 shadow-sm">
                    <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Access Denied</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This page is restricted to administrators.</p>
                </div>
            </div>
        );
    }

    const v   = data?.visits        ?? {};
    const p   = data?.patients      ?? {};
    const apt = data?.appointments  ?? {};
    const lab = data?.lab_tests     ?? {};
    const rx  = data?.prescriptions ?? {};
    const rm  = data?.rooms         ?? {};
    const dr  = data?.doctors       ?? {};
    const wd  = data?.wards         ?? {};

    return (
        <SkeletonTheme
            baseColor={isDark ? '#374151' : '#e5e7eb'}
            highlightColor={isDark ? '#4b5563' : '#f3f4f6'}
        >
            <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Facility-wide overview &bull;{' '}
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

                {/* ══ VISITS ══ */}
                <Section
                    icon={Activity}
                    label="Patient Visits"
                    color="bg-blue-600"
                    extra={(loading || (v.by_status && Object.keys(v.by_status).length > 0)) && (
                        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                Visits by Status
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {loading
                                    ? [1, 2, 3, 4].map(i => <Skeleton key={i} height={44} className="rounded-xl" />)
                                    : Object.entries(v.by_status ?? {}).map(([status, count]) => (
                                        <StatusPill key={status} status={status} count={count} loading={loading} />
                                    ))
                                }
                            </div>
                        </div>
                    )}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={Activity}     label="Total Visits" value={v.total}      loading={loading} iconBg="bg-blue-100 dark:bg-blue-900/40"     iconColor="text-blue-600 dark:text-blue-400" />
                        <StatCard icon={Clock}        label="Visits Today" value={v.today}      loading={loading} iconBg="bg-indigo-100 dark:bg-indigo-900/40" iconColor="text-indigo-600 dark:text-indigo-400" />
                        <StatCard icon={TrendingUp}   label="This Week"    value={v.this_week}  loading={loading} iconBg="bg-cyan-100 dark:bg-cyan-900/40"     iconColor="text-cyan-600 dark:text-cyan-400" />
                        <StatCard icon={CalendarDays} label="This Month"   value={v.this_month} loading={loading} iconBg="bg-sky-100 dark:bg-sky-900/40"       iconColor="text-sky-600 dark:text-sky-400" />
                    </div>
                </Section>

                {/* ══ PATIENTS ══ */}
                <Section icon={Users} label="Patients" color="bg-purple-600">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard icon={Users}        label="Total Patients"  value={p.total}          loading={loading} iconBg="bg-purple-100 dark:bg-purple-900/40" iconColor="text-purple-600 dark:text-purple-400" />
                        <StatCard icon={TrendingUp}   label="New Today"       value={p.new_today}      loading={loading} iconBg="bg-rose-100 dark:bg-rose-900/40"     iconColor="text-rose-600 dark:text-rose-400" />
                        <StatCard icon={CalendarDays} label="New This Month"  value={p.new_this_month} loading={loading} iconBg="bg-pink-100 dark:bg-pink-900/40"     iconColor="text-pink-600 dark:text-pink-400" />
                    </div>
                </Section>

                {/* ══ APPOINTMENTS ══ */}
                <Section icon={CalendarDays} label="Appointments" color="bg-emerald-600">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard icon={CalendarDays} label="Total Appointments"  value={apt.total}     loading={loading} iconBg="bg-emerald-100 dark:bg-emerald-900/40" iconColor="text-emerald-600 dark:text-emerald-400" />
                        <StatCard icon={Clock}        label="Today"               value={apt.today}     loading={loading} iconBg="bg-green-100 dark:bg-green-900/40"    iconColor="text-green-600 dark:text-green-400" />
                        <StatCard icon={CheckCircle2} label="Scheduled (Pending)" value={apt.scheduled} loading={loading} iconBg="bg-teal-100 dark:bg-teal-900/40"      iconColor="text-teal-600 dark:text-teal-400" />
                    </div>
                </Section>

                {/* ══ LAB TESTS ══ */}
                <Section icon={FlaskConical} label="Lab Tests" color="bg-amber-500">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard icon={FlaskConical} label="Total Lab Tests" value={lab.total}   loading={loading} iconBg="bg-amber-100 dark:bg-amber-900/40"   iconColor="text-amber-600 dark:text-amber-400" />
                        <StatCard icon={Clock}        label="Requested Today" value={lab.today}   loading={loading} iconBg="bg-orange-100 dark:bg-orange-900/40" iconColor="text-orange-600 dark:text-orange-400" />
                        <StatCard icon={AlertCircle}  label="Pending Results" value={lab.pending} loading={loading} iconBg="bg-red-100 dark:bg-red-900/40"       iconColor="text-red-600 dark:text-red-400" />
                    </div>
                </Section>

                {/* ══ PRESCRIPTIONS ══ */}
                <Section icon={Pill} label="Prescriptions" color="bg-pink-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard icon={Pill}  label="Total Prescriptions" value={rx.total}   loading={loading} iconBg="bg-pink-100 dark:bg-pink-900/40"        iconColor="text-pink-600 dark:text-pink-400" />
                        <StatCard icon={Clock} label="Pending Dispensing"  value={rx.pending} loading={loading} iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/40" iconColor="text-fuchsia-600 dark:text-fuchsia-400" />
                    </div>
                </Section>

                {/* ══ DOCTORS ══ */}
                <Section icon={Stethoscope} label="Doctors" color="bg-teal-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard icon={Stethoscope} label="Total Doctors"       value={dr.total}            loading={loading} iconBg="bg-teal-100 dark:bg-teal-900/40"   iconColor="text-teal-600 dark:text-teal-400" />
                        <StatCard icon={UserCheck}   label="Currently in a Room" value={dr.assigned_to_room} loading={loading} iconBg="bg-green-100 dark:bg-green-900/40" iconColor="text-green-600 dark:text-green-400" />
                    </div>
                </Section>

                {/* ══ ROOMS & WARDS ══ */}
                <Section icon={DoorOpen} label="Rooms & Wards" color="bg-indigo-600">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard icon={DoorOpen}     label="Total Rooms"      value={rm.total}     sub={`${rm.available ?? '—'} available`} loading={loading} iconBg="bg-indigo-100 dark:bg-indigo-900/40"  iconColor="text-indigo-600 dark:text-indigo-400" />
                        <StatCard icon={CheckCircle2} label="Rooms Available"  value={rm.available} loading={loading} iconBg="bg-emerald-100 dark:bg-emerald-900/40" iconColor="text-emerald-600 dark:text-emerald-400" />
                        <StatCard icon={AlertCircle}  label="Rooms Occupied"   value={rm.occupied}  loading={loading} iconBg="bg-amber-100 dark:bg-amber-900/40"    iconColor="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <StatCard icon={BedDouble}    label="Total Wards"      value={wd.total}     sub={`${wd.available ?? '—'} available`} loading={loading} iconBg="bg-violet-100 dark:bg-violet-900/40" iconColor="text-violet-600 dark:text-violet-400" />
                        <StatCard icon={CheckCircle2} label="Wards Available"  value={wd.available} loading={loading} iconBg="bg-green-100 dark:bg-green-900/40"   iconColor="text-green-600 dark:text-green-400" />
                    </div>
                </Section>

            </div>
        </SkeletonTheme>
    );
}