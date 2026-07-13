// THIS IS THE LOGIC AND INTERFACE FOR THE
// "VISIT ROUTING STATUS" DRAWER IN THE PATIENT VISIT PAGE
// READ-ONLY VIEW — shows where a visit is routed across departments and wards
// IT WILL BE CALLED FROM PATIENT VISIT

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, MapPin, Building2, BedDouble, FlaskConical, Pill, Scissors,
    Radiation, Stethoscope, CheckCircle2, Clock, AlertCircle,
    CalendarClock, LogIn, LogOut
} from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';

// ─── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        pending:    { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
        waiting:    { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
        ongoing:    { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
        completed:  { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
        admitted:   { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
        discharged: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
    };
    const cfg = map[status] ?? map.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} capitalize`}>
            {status ?? 'pending'}
        </span>
    );
};

// ─── Department icon helper ────────────────────────────────────────────────────
const deptIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('lab'))                            return <FlaskConical className="w-4 h-4" />;
    if (n.includes('pharm'))                          return <Pill className="w-4 h-4" />;
    if (n.includes('surg'))                           return <Scissors className="w-4 h-4" />;
    if (n.includes('radio') || n.includes('imaging')) return <Radiation className="w-4 h-4" />;
    return <Stethoscope className="w-4 h-4" />;
};

// ─── Date formatter ────────────────────────────────────────────────────────────
const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

// ─── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3
        bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-36 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-52 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  VisitRoutingStatus
//  Props:
//    isOpen   – boolean
//    onClose  – () => void
//    visit    – the full visit object (visit.id, visit.visit_number, patient.name)
//    token    – JWT string
//  Read-only view — no assign/edit/delete actions. To make changes, close this
//  and use AssignVisitToDepartments or AssignVisitToWard.
// ══════════════════════════════════════════════════════════════════════════════
export function VisitRoutingStatus({ isOpen, onClose, visit, token }) {
    const [routingData, setRoutingData] = useState(null);
    const [loading, setLoading]         = useState(false);

    useEffect(() => {
        if (isOpen && visit?.id) {
            setRoutingData(null);
            setLoading(true);
            axios.get(`${API_BASE_URL}visitAssign/getVisitRoutingStatus`, {
                params:  { visit_id: visit.id },
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            })
                .then(res => { if (res.data?.success) setRoutingData(res.data.data); })
                .catch(err => console.error('Failed to fetch visit routing status:', err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, visit?.id]);

    if (!isOpen) return null;

    const deptAssignments = routingData?.department_assignments ?? [];
    const wardAssignments = routingData?.ward_assignments ?? [];
    const bothEmpty       = !loading && routingData !== null && deptAssignments.length === 0 && wardAssignments.length === 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-3xl z-50 flex flex-col
                bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700
                animate-slide-in-right">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700
                    bg-gradient-to-r from-cyan-600 to-teal-600 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <MapPin className="w-5 h-5" /> Visit Routing Status
                        </h2>
                        <p className="text-cyan-100 text-xs mt-0.5">
                            Visit: <span className="font-semibold">{visit?.visit_number}</span>
                            {visit?.patient?.name && <> &mdash; {visit.patient.name}</>}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-white/20 text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                    {/* Info note */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20
                        border border-cyan-200 dark:border-cyan-800">
                        <AlertCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-cyan-800 dark:text-cyan-200">
                            This is a read-only view of where this visit is currently routed.
                            To make changes, close this panel and use <strong>Assign to Departments</strong> or <strong>Assign to Ward</strong>.
                        </p>
                    </div>

                    {/* ── Both empty state ── */}
                    {bothEmpty && (
                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-14 text-center">
                            <MapPin className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                This visit has not been routed to any department or ward yet.
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Use the Assign buttons in the visit actions to route this visit.
                            </p>
                        </div>
                    )}

                    {/* ── Department Routing ── */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-cyan-500" /> Department Routing
                            {!loading && deptAssignments.length > 0 && (
                                <span className="ml-auto bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300
                                    text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {deptAssignments.length}
                                </span>
                            )}
                        </h3>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : deptAssignments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-6 text-center">
                                <Building2 className="w-7 h-7 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 dark:text-gray-500">No department assignments</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {deptAssignments.map(a => (
                                    <div key={a.id}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800 p-4 flex items-start gap-3">
                                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-100
                                            dark:bg-cyan-900/40 flex items-center justify-center
                                            text-cyan-600 dark:text-cyan-400">
                                            {deptIcon(a.department?.department_name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                                    {a.department?.department_name ?? 'Unknown Department'}
                                                </p>
                                                <StatusBadge status={a.status} />
                                            </div>
                                            {a.assignedUser && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    Assigned to:{' '}
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                        {a.assignedUser.name}
                                                    </span>
                                                </p>
                                            )}
                                            {a.assignedBy && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                    <CalendarClock className="w-3 h-3" />
                                                    By {a.assignedBy.name} &bull; {fmtDate(a.created_at)}
                                                </p>
                                            )}
                                            {a.notes && (
                                                <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 italic
                                                    bg-white dark:bg-gray-900 px-2 py-1 rounded-md
                                                    border border-gray-200 dark:border-gray-700">
                                                    "{a.notes}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Ward Routing ── */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <BedDouble className="w-4 h-4 text-cyan-500" /> Ward Routing
                            {!loading && wardAssignments.length > 0 && (
                                <span className="ml-auto bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300
                                    text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {wardAssignments.length}
                                </span>
                            )}
                        </h3>

                        {loading ? (
                            <div className="space-y-3">
                                {[1].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : wardAssignments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-6 text-center">
                                <BedDouble className="w-7 h-7 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 dark:text-gray-500">No ward assignments</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {wardAssignments.map(a => (
                                    <div key={a.id}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800 p-4 flex items-start gap-3">
                                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-100
                                            dark:bg-cyan-900/40 flex items-center justify-center
                                            text-cyan-600 dark:text-cyan-400">
                                            <BedDouble className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                                    {a.ward?.name ?? 'Unknown Ward'}
                                                    {a.ward?.number && (
                                                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                                                            #{a.ward.number}
                                                        </span>
                                                    )}
                                                </p>
                                                <StatusBadge status={a.status} />
                                            </div>
                                            {a.bed && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    Bed: <span className="font-medium text-gray-700 dark:text-gray-300">{a.bed.bed_number}</span>
                                                </p>
                                            )}
                                            {!a.bed && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">No bed assigned yet</p>
                                            )}
                                            {a.admitted_at && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                    <LogIn className="w-3 h-3 text-green-500" />
                                                    Admitted: {fmtDate(a.admitted_at)}
                                                </p>
                                            )}
                                            {a.discharged_at && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                    <LogOut className="w-3 h-3 text-gray-400" />
                                                    Discharged: {fmtDate(a.discharged_at)}
                                                </p>
                                            )}
                                            {a.notes && (
                                                <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 italic
                                                    bg-white dark:bg-gray-900 px-2 py-1 rounded-md
                                                    border border-gray-200 dark:border-gray-700">
                                                    "{a.notes}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700
                            text-gray-700 dark:text-gray-300 text-sm font-medium
                            hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </>
    );
}
