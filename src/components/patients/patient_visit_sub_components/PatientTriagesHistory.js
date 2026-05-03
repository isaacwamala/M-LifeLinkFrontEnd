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
    ClipboardList,
    Activity,
    Thermometer,
    Heart,
    Wind,
    Weight,
    Ruler,
    AlertTriangle,
    ShieldCheck,
    Zap,
    User,
    Hash,
    StickyNote,
    MessageSquare,
} from 'lucide-react';

import { API_BASE_URL } from '../../general/constants';

/* ─── Urgency badge ────────────────────────────────────────────────────── */
function UrgencyBadge({ level }) {
    const map = {
        immediate:   { icon: Zap,          color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-900/20',    border: 'border-red-200 dark:border-red-800',    label: 'Immediate'   },
        urgent:      { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', label: 'Urgent' },
        routine:     { icon: ShieldCheck,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', label: 'Routine' },
        non_urgent:  { icon: ShieldCheck,   color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-900/20',  border: 'border-blue-200 dark:border-blue-800',  label: 'Non-Urgent'  },
    };
    const s = map[level?.toLowerCase()] ?? map.routine;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${s.color} ${s.bg} ${s.border}`}>
            <Icon className="w-3 h-3" />
            {s.label}
        </span>
    );
}

/* ─── Vital sign pill ──────────────────────────────────────────────────── */
function VitalPill({ icon: Icon, label, value, unit }) {
    if (value === null || value === undefined) return null;
    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60
            border border-gray-100 dark:border-gray-700">
            <Icon className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 leading-none mb-0.5">
                    {label}
                </p>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-none">
                    {value}{unit ? <span className="text-[10px] font-normal text-gray-400 ml-0.5">{unit}</span> : null}
                </p>
            </div>
        </div>
    );
}

/* ─── Single triage card ───────────────────────────────────────────────── */
function TriageCard({ triage, index }) {
    const triagedBy     = triage.triaged_by?.name ?? '—';
    const visitNumber   = triage.visit?.visit_number ?? '—';
    const triageDate    = triage.triage_date
        ? new Date(triage.triage_date).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';

    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900
            shadow-sm hover:shadow-md transition-shadow overflow-hidden">

            {/* card header */}
            <div className="flex items-center justify-between px-4 py-2.5
                bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20
                border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center
                        text-[10px] font-bold text-white flex-shrink-0">
                        {index}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{visitNumber}</span>
                    </div>
                </div>
                <UrgencyBadge level={triage.urgency_level} />
            </div>

            {/* meta row — triaged by + date */}
            <div className="flex items-center gap-4 px-4 pt-3 pb-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <User className="w-3 h-3 text-rose-400" />
                    <span>Triaged by <span className="font-semibold text-gray-700 dark:text-gray-300">{triagedBy}</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3 text-rose-400" />
                    <span>{triageDate}</span>
                </div>
            </div>

            {/* chief complaint */}
            {triage.chief_complaint && (
                <div className="flex items-start gap-2 mx-4 mb-3 px-3 py-2 rounded-lg
                    bg-rose-50 dark:bg-rose-900/15 border border-rose-100 dark:border-rose-900/30">
                    <MessageSquare className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-0.5">Chief Complaint</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{triage.chief_complaint}</p>
                    </div>
                </div>
            )}

            {/* vitals grid */}
            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <VitalPill icon={Heart}       label="Blood Pressure"    value={triage.blood_pressure}    unit="" />
                <VitalPill icon={Thermometer} label="Temperature"       value={triage.temperature}       unit="°C" />
                <VitalPill icon={Activity}    label="Pulse Rate"        value={triage.pulse_rate}         unit="bpm" />
                <VitalPill icon={Wind}        label="O₂ Saturation"     value={triage.oxygen_saturation} unit="%" />
                <VitalPill icon={Weight}      label="Weight"            value={triage.weight}            unit="kg" />
                <VitalPill icon={Ruler}       label="Height"            value={triage.height}            unit="cm" />
            </div>

            {/* notes */}
            {triage.notes && (
                <div className="flex items-start gap-2 mx-4 mb-3 px-3 py-2 rounded-lg
                    border border-gray-100 dark:border-gray-700">
                    <StickyNote className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Notes</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{triage.notes}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Main exported component ──────────────────────────────────────────── */
export function PatientTriagesHistory({
    isOpen,
    onClose,
    visit,   // PatientVisit row — we read visit.patient_id + visit.patient?.name
    token,
}) {
    const today = new Date().toISOString().slice(0, 10);
    const y     = new Date().getFullYear();

    const [triages,      setTriages]      = useState([]);
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
    const fetchTriages = useCallback(async (page = 1) => {
        if (!visit?.patient_id || !token) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}visitAssign/getPatientTriages`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                    params: {
                        patient_id: visit.patient_id,
                        start_date: startDate,
                        end_date:   endDate,
                        page,
                    },
                }
            );
            const d = res.data?.data;
            setTriages(    d?.data         ?? []);
            setCurrentPage(d?.current_page ?? 1);
            setTotalPages( d?.last_page    ?? 1);
            setTotal(      d?.total        ?? 0);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load triage history');
        } finally {
            setLoading(false);
        }
    }, [visit?.patient_id, token, startDate, endDate]);

    /* fetch on open */
    useEffect(() => {
        if (isOpen) fetchTriages(1);
    }, [isOpen, fetchTriages]);

    if (!isOpen) return null;

    /* ── Render ────────────────────────────────────────────────────────── */
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl
                bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 pt-5 pb-4 bg-gradient-to-r from-rose-600 to-pink-600">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center
                                text-white font-bold text-sm flex-shrink-0">
                                {initials}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Triage History
                                </h2>
                                <p className="text-rose-200 text-xs mt-0.5">{patientName}</p>
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
                                        dark:text-gray-200 focus:ring-2 focus:ring-rose-500 focus:outline-none" />
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
                                        dark:text-gray-200 focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                            </div>
                        </div>

                        <button onClick={() => fetchTriages(1)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                                text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm
                                shadow-rose-200 dark:shadow-rose-900/40">
                            <Filter className="w-3.5 h-3.5" /> Apply
                        </button>

                        <button onClick={() => {
                            setStartDate(`${y}-01-01`);
                            setEndDate(today);
                            setTimeout(() => fetchTriages(1), 0);
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
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {loading ? 'Loading…' : (
                            total === 0
                                ? 'No triages found'
                                : `${total} triage${total !== 1 ? 's' : ''} found · showing page ${currentPage} of ${totalPages}`
                        )}
                    </span>
                </div>

                {/* ── Body ───────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16
                            text-gray-400 dark:text-gray-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-sm">Loading triage history…</p>
                        </div>
                    ) : triages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16
                            text-gray-400 dark:text-gray-600">
                            <ClipboardList className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No triages found for this period</p>
                            <p className="text-xs opacity-60">Try adjusting the date range above</p>
                        </div>
                    ) : (
                        triages.map((triage, i) => (
                            <TriageCard
                                key={triage.id}
                                triage={triage}
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
                                onClick={() => fetchTriages(currentPage - 1)}
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
                                            onClick={() => fetchTriages(p)}
                                            disabled={loading}
                                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition
                                                ${p === currentPage
                                                    ? 'bg-rose-600 text-white shadow-sm'
                                                    : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}>
                                            {p}
                                        </button>
                                    )
                                )
                            }

                            <button
                                onClick={() => fetchTriages(currentPage + 1)}
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