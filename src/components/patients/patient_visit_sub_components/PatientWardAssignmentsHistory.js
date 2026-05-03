import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    X,
    Calendar,
    Filter,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Loader2,
    BedDouble,
    ClipboardList,
    User,
    UserCheck,
    MapPin,
    Hash,
    StickyNote,
    BadgeCheck,
    Clock,
    AlertCircle,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

import { API_BASE_URL } from '../../general/constants';

/* ─── Status badge helper ──────────────────────────────────────────────── */
function StatusBadge({ status }) {
    const map = {
        pending:    { icon: Clock,        color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-200 dark:border-amber-800',  label: 'Pending'    },
        active:     { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', label: 'Active' },
        discharged: { icon: BadgeCheck,   color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-200 dark:border-blue-800',    label: 'Discharged' },
        cancelled:  { icon: XCircle,      color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-200 dark:border-red-800',      label: 'Cancelled'  },
    };
    const s = map[status?.toLowerCase()] ?? map.pending;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${s.color} ${s.bg} ${s.border}`}>
            <Icon className="w-3 h-3" />
            {s.label}
        </span>
    );
}

/* ─── Single ward assignment card ─────────────────────────────────────── */
function WardAssignmentCard({ assignment, index }) {
    const assignedBy   = assignment.assigned_by?.name   ?? '—';
    const assignedTo   = assignment.assigned_to?.name   ?? assignment.assigned_user?.name ?? 'Unassigned';
    const wardName     = assignment.ward?.name           ?? '—';
    const visitNumber  = assignment.visit?.visit_number  ?? '—';
    const notes        = assignment.notes;
    const createdAt    = assignment.created_at
        ? new Date(assignment.created_at).toLocaleString('en-UG', {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : '—';

    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900
            shadow-sm hover:shadow-md transition-shadow overflow-hidden">

            {/* card header */}
            <div className="flex items-center justify-between px-4 py-2.5
                bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20
                border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center
                        text-[10px] font-bold text-white flex-shrink-0">
                        {index}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{visitNumber}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={assignment.status} />
                </div>
            </div>

            {/* card body */}
            <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">

                {/* Ward */}
                <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Ward</p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{wardName}</p>
                    </div>
                </div>

                {/* Date */}
                <div className="flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Assigned On</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{createdAt}</p>
                    </div>
                </div>

                {/* Assigned By */}
                <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Assigned By</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{assignedBy}</p>
                    </div>
                </div>

                {/* Assigned To */}
                <div className="flex items-start gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Assigned To</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{assignedTo}</p>
                    </div>
                </div>

                {/* Notes — full width if present */}
                {notes && (
                    <div className="col-span-2 flex items-start gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                        <StickyNote className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Notes</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{notes}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Main exported component ──────────────────────────────────────────── */
export function PatientWardAssignmentsHistory({
    isOpen,
    onClose,
    visit,   // PatientVisit row — we read visit.patient_id + visit.patient?.name
    token,
}) {
    const today = new Date().toISOString().slice(0, 10);
    const y     = new Date().getFullYear();

    const [assignments,  setAssignments]  = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [startDate,    setStartDate]    = useState(`${y}-01-01`);
    const [endDate,      setEndDate]      = useState(today);
    const [currentPage,  setCurrentPage]  = useState(1);
    const [totalPages,   setTotalPages]   = useState(1);
    const [total,        setTotal]        = useState(0);

    const patientName = visit?.patient?.name ?? 'Patient';
    const initials    = patientName
        .split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');

    /* ── Fetch ─────────────────────────────────────────────────────────── */
    const fetchAssignments = useCallback(async (page = 1) => {
        if (!visit?.patient_id || !token) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}visitAssign/getPatientWardAssignments`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                    params: {
                        patient_id: visit.patient_id, //we send patient id, to get all assignments from patient level
                        start_date: startDate,
                        end_date:   endDate,
                        page,
                    },
                }
            );
            const d = res.data?.data;
            setAssignments(d?.data         ?? []);
            setCurrentPage(d?.current_page ?? 1);
            setTotalPages( d?.last_page    ?? 1);
            setTotal(      d?.total        ?? 0);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load ward assignment history');
        } finally {
            setLoading(false);
        }
    }, [visit?.patient_id, token, startDate, endDate]);


    /* fetch on open */
    useEffect(() => {
        if (isOpen) fetchAssignments(1);
    }, [isOpen, fetchAssignments]);

    if (!isOpen) return null;


    /* ── Render ────────────────────────────────────────────────────────── */
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl
                bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 pt-5 pb-4 bg-gradient-to-r from-teal-600 to-cyan-600">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center
                                text-white font-bold text-sm flex-shrink-0">
                                {initials}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <BedDouble className="w-4 h-4" /> Patient Ward Assignment History
                                </h2>
                                <p className="text-teal-200 text-xs mt-0.5">{patientName}</p>
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition flex-shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Date filters ───────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/60">
                    <div className="flex flex-wrap items-end gap-3">

                        <div className="flex-1 min-w-[130px]">
                            <label className="block text-[10px] font-bold uppercase tracking-widest
                                text-gray-400 dark:text-gray-500 mb-1">From</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input type="date" value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200
                                        dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800
                                        dark:text-gray-200 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-[130px]">
                            <label className="block text-[10px] font-bold uppercase tracking-widest
                                text-gray-400 dark:text-gray-500 mb-1">To</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input type="date" value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200
                                        dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800
                                        dark:text-gray-200 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                            </div>
                        </div>

                        <button onClick={() => fetchAssignments(1)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                                text-white bg-teal-600 hover:bg-teal-700 transition shadow-sm
                                shadow-teal-200 dark:shadow-teal-900/40">
                            <Filter className="w-3.5 h-3.5" /> Apply
                        </button>

                        <button onClick={() => {
                            setStartDate(`${y}-01-01`);
                            setEndDate(today);
                            setTimeout(() => fetchAssignments(1), 0);
                        }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                                text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800
                                border border-gray-200 dark:border-gray-700
                                hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <RefreshCw className="w-3.5 h-3.5" /> Reset
                        </button>
                    </div>
                </div>

                {/* ── Summary bar ────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-2 border-b border-gray-100 dark:border-gray-800
                    flex items-center gap-2">
                    <BedDouble className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {loading ? 'Loading…' : (
                            total === 0
                                ? 'No ward assignments found'
                                : `${total} assignment${total !== 1 ? 's' : ''} found · showing page ${currentPage} of ${totalPages}`
                        )}
                    </span>
                </div>

                {/* ── Body ───────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16
                            text-gray-400 dark:text-gray-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-sm">Loading ward assignments…</p>
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16
                            text-gray-400 dark:text-gray-600">
                            <ClipboardList className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No ward assignments found for this period</p>
                            <p className="text-xs opacity-60">Try adjusting the date range above</p>
                        </div>
                    ) : (
                        assignments.map((assignment, i) => (
                            <WardAssignmentCard
                                key={assignment.id}
                                assignment={assignment}
                                index={((currentPage - 1) * 3) + i + 1}
                            />
                        ))
                    )}
                </div>

                {/* ── Pagination footer ───────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-800
                        bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between gap-3">

                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Page {currentPage} of {totalPages}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchAssignments(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                    hover:bg-gray-200 dark:hover:bg-gray-700
                                    disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>

                            {/* page number pills */}
                            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .reduce((acc, p, i, arr) => {
                                    if (i > 0 && arr[i - 1] !== p - 1) acc.push('…');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === '…' ? (
                                        <span key={`e${i}`} className="text-xs text-gray-400 px-1">…</span>
                                    ) : (
                                        <button key={p}
                                            onClick={() => fetchAssignments(p)}
                                            disabled={loading}
                                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition
                                                ${p === currentPage
                                                    ? 'bg-teal-600 text-white shadow-sm'
                                                    : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}>
                                            {p}
                                        </button>
                                    )
                                )
                            }

                            <button
                                onClick={() => fetchAssignments(currentPage + 1)}
                                disabled={currentPage === totalPages || loading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                    hover:bg-gray-200 dark:hover:bg-gray-700
                                    disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}