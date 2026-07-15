import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, UserCheck, CalendarDays, Activity,
    Clock, CheckCircle2, AlertCircle, TrendingUp,
    RefreshCw, ShieldAlert, Stethoscope, DoorOpen, Building2
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
    waiting:         'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    triaged:         'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    in_consultation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed:       'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    approved:        'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    admitted:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    rejected:        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
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

// ─── Room status badge colours ─────────────────────────────────────────────────
const ROOM_STATUS_BADGE = {
    available: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    occupied:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    inactive:  'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};


// ══════════════════════════════════════════════════════════════════════════════
//  DoctorDashboard
// ══════════════════════════════════════════════════════════════════════════════
export default function DoctorDashboard() {
    const token      = localStorage.getItem('access_token');
    const userRoleId = useSelector((state) => state.auth?.user?.data?.user?.role_id);
    const isDoctor   = (userRoleId || []).map(Number).includes(3);
    const isDark     = useIsDarkMode();

    const [data, setData]               = useState(null);
    const [loading, setLoading]         = useState(true);
    const [lastFetched, setLastFetched] = useState(null);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}dashboard/getDoctorOverview`, {
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

    // Non-doctors see an access-denied message
    if (!isDoctor) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-10 shadow-sm">
                    <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Access Denied</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This page is restricted to doctors.</p>
                </div>
            </div>
        );
    }

    const myRoom     = data?.my_room              ?? null;
    const myRoomV    = data?.my_room_visits        ?? {};
    const myApt      = data?.my_appointments       ?? {};
    const v          = data?.visits               ?? {};
    const apt        = data?.appointments         ?? {};
    const dr         = data?.doctors              ?? {};
    const rooms      = data?.rooms                ?? [];
    const deptVisits = data?.visits_by_department ?? [];

    return (
        <SkeletonTheme
            baseColor={isDark ? '#374151' : '#e5e7eb'}
            highlightColor={isDark ? '#4b5563' : '#f3f4f6'}
        >
            <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Doctor Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Your overview &bull;{' '}
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

                {/* ══ YOUR ROOM ══ */}
                <Section icon={DoorOpen} label="Your Room" color="bg-violet-600">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} height={88} className="rounded-2xl" />)}
                        </div>
                    ) : myRoom ? (
                        <>
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                                <DoorOpen className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                                        {myRoom.room_name}
                                    </p>
                                    <p className="text-xs text-violet-600 dark:text-violet-400">
                                        Room #{myRoom.room_number}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <StatCard
                                    icon={Clock}
                                    label="Room Visits Today"
                                    value={myRoomV.today}
                                    loading={loading}
                                    iconBg="bg-violet-100 dark:bg-violet-900/40"
                                    iconColor="text-violet-600 dark:text-violet-400"
                                />
                                <StatCard
                                    icon={CalendarDays}
                                    label="Room Visits This Month"
                                    value={myRoomV.this_month}
                                    loading={loading}
                                    iconBg="bg-purple-100 dark:bg-purple-900/40"
                                    iconColor="text-purple-600 dark:text-purple-400"
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    label="Room Visits This Year"
                                    value={myRoomV.this_year}
                                    loading={loading}
                                    iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/40"
                                    iconColor="text-fuchsia-600 dark:text-fuchsia-400"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-300 dark:border-gray-600">
                            <DoorOpen className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No room currently assigned.</p>
                        </div>
                    )}
                </Section>

                {/* ══ YOUR APPOINTMENTS ══ */}
                <Section icon={CalendarDays} label="Your Appointments" color="bg-emerald-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            icon={Clock}
                            label="Your Appointments Today"
                            value={myApt.today}
                            loading={loading}
                            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                            iconColor="text-emerald-600 dark:text-emerald-400"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Upcoming (Scheduled / Confirmed)"
                            value={myApt.upcoming_count}
                            loading={loading}
                            iconBg="bg-green-100 dark:bg-green-900/40"
                            iconColor="text-green-600 dark:text-green-400"
                        />
                    </div>
                </Section>

                {/* ══ FACILITY VISITS ══ */}
                <Section
                    icon={Activity}
                    label="Facility Visits"
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={Clock}
                            label="Visits Today"
                            value={v.today}
                            loading={loading}
                            iconBg="bg-blue-100 dark:bg-blue-900/40"
                            iconColor="text-blue-600 dark:text-blue-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="Visits This Month"
                            value={v.this_month}
                            loading={loading}
                            iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                            iconColor="text-indigo-600 dark:text-indigo-400"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Visits This Year"
                            value={v.this_year}
                            loading={loading}
                            iconBg="bg-cyan-100 dark:bg-cyan-900/40"
                            iconColor="text-cyan-600 dark:text-cyan-400"
                        />
                    </div>
                </Section>

                {/* ══ FACILITY APPOINTMENTS ══ */}
                <Section icon={CalendarDays} label="Facility Appointments" color="bg-sky-600">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={Clock}
                            label="Appointments Today"
                            value={apt.today}
                            loading={loading}
                            iconBg="bg-sky-100 dark:bg-sky-900/40"
                            iconColor="text-sky-600 dark:text-sky-400"
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Scheduled"
                            value={apt.scheduled}
                            loading={loading}
                            iconBg="bg-teal-100 dark:bg-teal-900/40"
                            iconColor="text-teal-600 dark:text-teal-400"
                        />
                        <StatCard
                            icon={CalendarDays}
                            label="This Month"
                            value={apt.this_month}
                            loading={loading}
                            iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                            iconColor="text-indigo-600 dark:text-indigo-400"
                        />
                    </div>
                </Section>

                {/* ══ VISITS BY DEPARTMENT ══ */}
                <Section icon={Building2} label="Visits by Department" color="bg-orange-500">
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} height={44} className="rounded-xl" />)}
                        </div>
                    ) : deptVisits.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                            No department visit data available.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-3">
                                            Department
                                        </th>
                                        <th className="text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-3">
                                            Visits
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                    {deptVisits.map((d) => (
                                        <tr key={d.department_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                                            <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-200 font-medium">
                                                {d.department_name}
                                            </td>
                                            <td className="py-2.5 text-right">
                                                <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                                    {d.visit_count}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>

                {/* ══ DOCTORS & ROOMS ══ */}
                <Section icon={Stethoscope} label="Doctors & Rooms" color="bg-teal-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            icon={Stethoscope}
                            label="Total Doctors"
                            value={dr.total}
                            loading={loading}
                            iconBg="bg-teal-100 dark:bg-teal-900/40"
                            iconColor="text-teal-600 dark:text-teal-400"
                        />
                        <StatCard
                            icon={UserCheck}
                            label="Currently in a Room"
                            value={dr.currently_in_room}
                            loading={loading}
                            iconBg="bg-green-100 dark:bg-green-900/40"
                            iconColor="text-green-600 dark:text-green-400"
                        />
                    </div>

                    {/* Rooms breakdown table */}
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <Skeleton key={i} height={48} className="rounded-xl" />)}
                        </div>
                    ) : rooms.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-3">
                                            Room
                                        </th>
                                        <th className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-3">
                                            Status
                                        </th>
                                        <th className="text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-3">
                                            Doctors
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                    {rooms.map((room) => {
                                        const badgeCls = ROOM_STATUS_BADGE[room.status] ?? ROOM_STATUS_BADGE.inactive;
                                        return (
                                            <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                                                <td className="py-2.5 pr-4">
                                                    <p className="font-medium text-gray-700 dark:text-gray-200">{room.room_name}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">#{room.room_number}</p>
                                                </td>
                                                <td className="py-2.5 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${badgeCls}`}>
                                                        {room.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 text-right">
                                                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                                                        {room.doctor_count}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>

            </div>
        </SkeletonTheme>
    );
}
