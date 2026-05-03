import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    X, Search, Calendar, RefreshCw, Filter, ChevronLeft, ChevronRight,
    Stethoscope, User, FileText, Activity, AlertCircle, Loader2,
    Clock, ClipboardList, FlaskConical, Pill, BookOpen, Hash
} from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';

// ── helpers ────────────────────────────────────────────────────────────────────

const fmt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-UG', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-UG', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

const statusColors = {
    waiting:        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    ongoing:        'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
    in_consultation:'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
    completed:      'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
    triaged:        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const StatusPill = ({ status }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize
        ${statusColors[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
        {status?.replace('_', ' ') ?? '—'}
    </span>
);

// ── Note field row ─────────────────────────────────────────────────────────────
const NoteField = ({ icon: Icon, label, value, accent = 'indigo' }) => {
    const accentMap = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        teal:   'bg-teal-50   text-teal-600   dark:bg-teal-900/20   dark:text-teal-400',
        amber:  'bg-amber-50  text-amber-600  dark:bg-amber-900/20  dark:text-amber-400',
        rose:   'bg-rose-50   text-rose-600   dark:bg-rose-900/20   dark:text-rose-400',
        violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
        slate:  'bg-slate-50  text-slate-500  dark:bg-slate-800/40  dark:text-slate-400',
    };
    if (!value) return null;
    return (
        <div className="flex gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${accentMap[accent]}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{value}</p>
            </div>
        </div>
    );
};

// ── Single examination card ────────────────────────────────────────────────────
const ExaminationCard = ({ exam, index }) => {
    const [expanded, setExpanded] = useState(false);
    const note = exam.note ?? {};
    const doctorName = exam.doctor?.user?.name ?? exam.doctor?.name ?? '—';

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            {/* Card header — always visible */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
                {/* Index badge */}
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{index}</span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {note.chief_complaint || 'No chief complaint recorded'}
                        </p>
                        {exam.visit && <StatusPill status={exam.visit.status} />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                            <User className="w-3 h-3" /> Dr. {doctorName}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                            <Clock className="w-3 h-3" /> {fmt(exam.created_at)}
                        </span>
                        {exam.visit?.visit_date && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                <Hash className="w-3 h-3" /> Visit {fmtDate(exam.visit.visit_date)} · {exam.visit.visit_category ?? exam.visit.visit_type ?? '—'}
                            </span>
                        )}
                    </div>
                </div>

                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1">
                    {expanded
                        ? <ChevronLeft className="w-4 h-4 rotate-90" />
                        : <ChevronRight className="w-4 h-4 rotate-90" />}
                </span>
            </button>

            {/* Expanded body */}
            {expanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-3">
                    <NoteField icon={AlertCircle}    label="Chief complaint"      value={note.chief_complaint}        accent="rose" />
                    <NoteField icon={BookOpen}       label="History of illness"   value={note.history_of_illness}     accent="amber" />
                    <NoteField icon={FlaskConical}   label="Examination findings" value={note.examination_findings}   accent="teal" />
                    <NoteField icon={Activity}       label="Diagnosis"            value={note.diagnosis}              accent="indigo" />
                    <NoteField icon={Pill}           label="Treatment plan"       value={note.treatment_plan}         accent="violet" />
                    <NoteField icon={ClipboardList}  label="Additional notes"     value={note.notes}                  accent="slate" />
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export function PatientExaminationHistory({
    isOpen,
    onClose,
    visit,      // the PatientVisit row — we read visit.patient_id + visit.patient?.name
    token,
}) {
    const now   = new Date();
    const y     = now.getFullYear();
    const m     = String(now.getMonth() + 1).padStart(2, '0');
    const today = `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`;

    const [exams,       setExams]       = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages,  setTotalPages]  = useState(1);
    const [total,       setTotal]       = useState(0);

    // date filter state lives on this modal
    const [startDate,   setStartDate]   = useState(`${y}-01-01`);
    const [endDate,     setEndDate]     = useState(today);

    // ── fetch  Examinations made ────────────────────────────────────────────────────────────────
    const fetchExams = useCallback(async (page = 1) => {
        if (!visit?.patient_id || !token) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}visitAssign/getPatientExaminations`,
                {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                    params: {
                        //Pass the patient_id as a query parameter
                        //the endpoint doesnt care about the visit but patient, so acts upon patient id is passed
                        patient_id: visit.patient_id, 
                        start_date: startDate,
                        end_date:   endDate,
                        page,
                    },
                }
            );
            const d = res.data?.data;
            setExams(d?.data ?? []);
            setCurrentPage(d?.current_page ?? 1);
            setTotalPages(d?.last_page ?? 1);
            setTotal(d?.total ?? 0);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load examination history');
        } finally {
            setLoading(false);
        }
    }, [visit?.patient_id, token, startDate, endDate]);

    
    // load when modal opens (or visit changes)
    useEffect(() => {
        if (isOpen) {
            setCurrentPage(1);
            fetchExams(1);
        } else {
            // reset on close so stale data doesn't flash next open
            setExams([]);
            setCurrentPage(1);
            setTotalPages(1);
            setTotal(0);
        }
    }, [isOpen, visit?.patient_id]);   // intentionally only re-run on open/patient change

    if (!isOpen) return null;

    const patientName = visit?.patient?.name ?? `Patient #${visit?.patient_id}`;
    const initials    = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl
                bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 pt-5 pb-4 bg-gradient-to-r from-indigo-600 to-violet-600">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {initials}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4" /> Examination History
                                </h2>
                                <p className="text-indigo-200 text-xs mt-0.5">{patientName}</p>
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition flex-shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Date filters ───────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[130px]">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                                From
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700
                                        bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-[130px]">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                                To
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700
                                        bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                            </div>
                        </div>
                        <button onClick={() => fetchExams(1)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white
                                bg-indigo-600 hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40">
                            <Filter className="w-3.5 h-3.5" /> Apply
                        </button>
                        <button onClick={() => {
                            setStartDate(`${y}-01-01`);
                            setEndDate(today);
                            setTimeout(() => fetchExams(1), 0);
                        }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300
                                bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <RefreshCw className="w-3.5 h-3.5" /> Reset
                        </button>
                    </div>
                </div>

                {/* ── Summary bar ────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {loading ? 'Loading…' : (
                            total === 0
                                ? 'No examinations found'
                                : `${total} examination${total !== 1 ? 's' : ''} found · showing page ${currentPage} of ${totalPages}`
                        )}
                    </span>
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-sm">Loading examinations…</p>
                        </div>
                    ) : exams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-600">
                            <ClipboardList className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No examinations found for this period</p>
                            <p className="text-xs opacity-60">Try adjusting the date range above</p>
                        </div>
                    ) : (
                        exams.map((exam, i) => (
                            <ExaminationCard
                                key={exam.id}
                                exam={exam}
                                index={((currentPage - 1) * 3) + i + 1}
                            />
                        ))
                    )}
                </div>

                {/* ── Pagination footer ───────────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-800
                        bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchExams(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                    hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
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
                                        <button key={p} onClick={() => fetchExams(p)}
                                            disabled={loading}
                                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition
                                                ${p === currentPage
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}>
                                            {p}
                                        </button>
                                    )
                                )
                            }

                            <button
                                onClick={() => fetchExams(currentPage + 1)}
                                disabled={currentPage === totalPages || loading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                    hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

