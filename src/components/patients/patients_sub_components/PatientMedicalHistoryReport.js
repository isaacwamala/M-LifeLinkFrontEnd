// Shared self-fetching report component used in two places:
//   A) Inside a modal launched from the Patients.js expanded row
//   B) Inline inside the PatientMedicalHistoryPage (/patient_medical_history)
//
// Props:
//   patientId   (required) — the patient to load history for
//   patientName (optional) — shown in the header while loading / passed to PDF modal
//   onClose     (optional) — if provided, a "Close" button is rendered in the footer;
//                            omit when used inline (the standalone page) where there's no modal to close

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    CalendarDays, Stethoscope, FlaskConical, Activity,
    Pill, BedDouble, FileText, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../general/constants';
import { PatientMedicalHistoryPdfModal } from './PatientMedicalHistoryPdfModal';

// ── Detect Tailwind's `dark` class on <html> so skeletons match the theme ─────
function useIsDarkMode() {
    const [isDark, setIsDark] = useState(
        () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    );
    useEffect(() => {
        const root   = document.documentElement;
        const update = () => setIsDark(root.classList.contains('dark'));
        update();
        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

// ── UGX formatter (whole-number, no decimals) ─────────────────────────────────
const fmtUGX = (n) =>
    'UGX ' + Math.round(Number(n ?? 0)).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

// ── Info row (label left / value right) ───────────────────────────────────────
const InfoRow = ({ label, value }) => (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
        <span className={`text-xs font-medium text-right truncate max-w-[60%] ${value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
            {value ?? '—'}
        </span>
    </div>
);

// ── Note field row (label above / value below) ────────────────────────────────
const NoteField = ({ label, value }) => {
    if (!value) return null;
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{value}</p>
        </div>
    );
};

// ── Visit status pill ─────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
    const colors = {
        waiting:         'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
        triaged:         'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        in_consultation: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
        completed:       'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
        referred:        'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${colors[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
            {status?.replace(/_/g, ' ') ?? '—'}
        </span>
    );
};

// ── Stat tile ─────────────────────────────────────────────────────────────────
const ACCENT = {
    blue:   { bg: 'bg-blue-50   dark:bg-blue-900/20',   iconBg: 'bg-blue-100   dark:bg-blue-900/40',   icon: 'text-blue-600   dark:text-blue-400',   val: 'text-blue-700   dark:text-blue-300'   },
    teal:   { bg: 'bg-teal-50   dark:bg-teal-900/20',   iconBg: 'bg-teal-100   dark:bg-teal-900/40',   icon: 'text-teal-600   dark:text-teal-400',   val: 'text-teal-700   dark:text-teal-300'   },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', iconBg: 'bg-violet-100 dark:bg-violet-900/40', icon: 'text-violet-600 dark:text-violet-400', val: 'text-violet-700 dark:text-violet-300' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', icon: 'text-indigo-600 dark:text-indigo-400', val: 'text-indigo-700 dark:text-indigo-300' },
    amber:  { bg: 'bg-amber-50  dark:bg-amber-900/20',  iconBg: 'bg-amber-100  dark:bg-amber-900/40',  icon: 'text-amber-600  dark:text-amber-400',  val: 'text-amber-700  dark:text-amber-300'  },
    rose:   { bg: 'bg-rose-50   dark:bg-rose-900/20',   iconBg: 'bg-rose-100   dark:bg-rose-900/40',   icon: 'text-rose-600   dark:text-rose-400',   val: 'text-rose-700   dark:text-rose-300'   },
};
const StatTile = ({ icon: Icon, label, value, accent }) => {
    const s = ACCENT[accent] ?? ACCENT.blue;
    return (
        <div className={`rounded-xl border border-gray-100 dark:border-gray-800 p-4 ${s.bg} flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                <Icon className={`w-4 h-4 ${s.icon}`} />
            </div>
            <div>
                <p className={`text-xl font-bold leading-none ${s.val}`}>{value ?? '—'}</p>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5 leading-tight">{label}</p>
            </div>
        </div>
    );
};

// ── Section card wrapper ───────────────────────────────────────────────────────
const SectionCard = ({ title, children }) => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// ── Department sub-card ───────────────────────────────────────────────────────
const DEPT_ACCENT = {
    teal:   { border: 'border-teal-200   dark:border-teal-800',   bg: 'bg-teal-50   dark:bg-teal-900/10',   hdr: 'bg-teal-600',   row: 'bg-teal-50   dark:bg-teal-900/10',   cell: 'border-teal-100   dark:border-teal-900/30'   },
    violet: { border: 'border-violet-200 dark:border-violet-800', bg: 'bg-violet-50 dark:bg-violet-900/10', hdr: 'bg-violet-600', row: 'bg-violet-50 dark:bg-violet-900/10', cell: 'border-violet-100 dark:border-violet-900/30' },
    amber:  { border: 'border-amber-200  dark:border-amber-800',  bg: 'bg-amber-50  dark:bg-amber-900/10',  hdr: 'bg-amber-600',  row: 'bg-amber-50  dark:bg-amber-900/10',  cell: 'border-amber-100  dark:border-amber-900/30'  },
    blue:   { border: 'border-blue-200   dark:border-blue-800',   bg: 'bg-blue-50   dark:bg-blue-900/10',   hdr: 'bg-blue-600',   row: 'bg-blue-50   dark:bg-blue-900/10',   cell: 'border-blue-100   dark:border-blue-900/30'   },
};
const DeptCard = ({ accent, title, children, badge }) => {
    const s = DEPT_ACCENT[accent] ?? DEPT_ACCENT.blue;
    return (
        <div className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-2.5 ${s.hdr}`}>
                <p className="text-xs font-bold text-white uppercase tracking-wide">{title}</p>
                {badge && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/30">
                        {badge}
                    </span>
                )}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
};

// ── Department breakdown renderer ─────────────────────────────────────────────
const DeptBreakdown = ({ breakdown, showMostRecentBadge = false }) => {
    if (!breakdown || breakdown.length === 0) {
        return <p className="text-xs text-gray-400 dark:text-gray-500 italic">This visit was not routed to any department or ward.</p>;
    }

    return (
        <div className="space-y-4">
            {showMostRecentBadge && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <span className="text-amber-500 dark:text-amber-400 text-base leading-none mt-px">&#9432;</span>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                        Each section below shows the <span className="font-semibold">most recent</span> activity for that department on this visit.
                        For Laboratory this means the latest routing assignment and all its tests;
                        for Pharmacy, each prescription is listed separately as its own entry.
                    </p>
                </div>
            )}
            {breakdown.map((entry, idx) => {
                const s = DEPT_ACCENT[
                    entry.department === 'laboratory' ? 'teal'   :
                    entry.department === 'radiology'  ? 'violet' :
                    entry.department === 'pharmacy'   ? 'amber'  : 'blue'
                ] ?? DEPT_ACCENT.blue;

                // ── Laboratory ───────────────────────────────────────────────
                if (entry.department === 'laboratory') {
                    return (
                        <DeptCard key={idx} accent="teal" title={`Laboratory — ${entry.routing_status ?? ''}`} badge={showMostRecentBadge ? 'Most Recent' : null}>
                            {entry.assigned_to && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    <span className="font-medium">Assigned to:</span> {entry.assigned_to}
                                </p>
                            )}
                            {entry.notes && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                    <span className="font-medium">Notes:</span> {entry.notes}
                                </p>
                            )}
                            {!entry.tests || entry.tests.length === 0 ? (
                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">No tests created yet.</p>
                            ) : (
                                <table className="w-full text-xs border-collapse text-gray-700 dark:text-gray-200">
                                    <thead>
                                        <tr className="bg-teal-600 text-white">
                                            <th className="text-left px-3 py-2">Test Name</th>
                                            <th className="text-left px-3 py-2">Specimen</th>
                                            <th className="text-left px-3 py-2">Status</th>
                                            <th className="text-left px-3 py-2">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entry.tests.map((t, ti) => (
                                            <tr key={ti} className={ti % 2 === 0 ? 'bg-white dark:bg-gray-800' : s.row}>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{t.test_name ?? '—'}</td>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{t.specimen_type ?? '—'}</td>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{t.status ?? '—'}</td>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{t.test_date ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </DeptCard>
                    );
                }

                // ── Radiology ────────────────────────────────────────────────
                if (entry.department === 'radiology') {
                    return (
                        <DeptCard key={idx} accent="violet" title={`Radiology — ${entry.routing_status ?? ''}`} badge={showMostRecentBadge ? 'Most Recent' : null}>
                            {entry.assigned_to && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    <span className="font-medium">Assigned to:</span> {entry.assigned_to}
                                </p>
                            )}
                            {entry.notes && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    <span className="font-medium">Notes:</span> {entry.notes}
                                </p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">
                                Detailed radiology results are not yet tracked in this system.
                            </p>
                        </DeptCard>
                    );
                }

                // ── Pharmacy ─────────────────────────────────────────────────
                if (entry.department === 'pharmacy') {
                    return (
                        <DeptCard key={idx} accent="amber" title={`Pharmacy — Rx ${entry.prescription_number ?? ''} (${entry.prescription_status ?? ''})`}>
                            <div className="flex gap-6 mb-3 text-xs text-gray-600 dark:text-gray-400">
                                <span><span className="font-medium">Prescriber:</span> {entry.prescriber ?? '—'}</span>
                                <span><span className="font-medium">Date:</span> {entry.prescription_date ?? '—'}</span>
                            </div>
                            {!entry.items || entry.items.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No prescription items.</p>
                            ) : (
                                <table className="w-full text-xs border-collapse text-gray-700 dark:text-gray-200">
                                    <thead>
                                        <tr className="bg-amber-600 text-white">
                                            <th className="text-left px-3 py-2">Drug</th>
                                            <th className="text-left px-3 py-2">Strength</th>
                                            <th className="text-left px-3 py-2">Qty</th>
                                            <th className="text-left px-3 py-2">Instructions</th>
                                            <th className="text-left px-3 py-2">Disp. Qty</th>
                                            <th className="text-left px-3 py-2">Unit Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entry.items.map((item, ii) => (
                                            <tr key={ii} className={ii % 2 === 0 ? 'bg-white dark:bg-gray-800' : s.row}>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{item.drug ?? '—'}</td>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{item.strength ?? '—'}</td>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{item.quantity ?? '—'}</td>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{item.instructions ?? '—'}</td>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>{item.dispensed_quantity ?? '—'}</td>
                                                <td className={`px-3 py-1.5 border ${s.cell}`}>
                                                    {item.dispensed_unit_price > 0 ? fmtUGX(item.dispensed_unit_price) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </DeptCard>
                    );
                }

                // ── Ward ─────────────────────────────────────────────────────
                if (entry.department === 'ward') {
                    return (
                        <DeptCard key={idx} accent="blue" title={`Ward — ${entry.ward_name ?? 'Unknown'} (${entry.status ?? ''})`}>
                            <div className="grid grid-cols-2 gap-x-6">
                                <InfoRow label="Ward"          value={entry.ward_name} />
                                <InfoRow label="Bed"           value={entry.bed_number} />
                                <InfoRow label="Status"        value={entry.status} />
                                <InfoRow label="Admitted At"   value={entry.admitted_at ?? 'Not yet admitted'} />
                                <InfoRow label="Discharged At" value={entry.discharged_at ?? 'Not yet discharged'} />
                            </div>
                        </DeptCard>
                    );
                }

                return null;
            })}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
//  VisitDetailCard — shared sub-component used by both the "Last Visit" section
//  and each card in the paginated "Full Visit History" section.
//  Props:
//    visit           — { visit_info, last_examination, department_breakdown }
//    showMostRecent  — whether to show the "Most Recent" amber callout in DeptBreakdown
//    isLastVisit     — highlights the card header with an indigo accent
// ══════════════════════════════════════════════════════════════════════════════
const VisitDetailCard = ({ visit, showMostRecent = false, isLastVisit = false }) => {
    const [expanded, setExpanded] = useState(isLastVisit); // last visit starts open

    const info = visit?.visit_info ?? {};
    const exam = visit?.last_examination;
    const dept = visit?.department_breakdown ?? [];

    return (
        <div className={`rounded-xl border overflow-hidden ${isLastVisit ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900`}>
            {/* Header — always visible, click to expand/collapse */}
            <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition
                    ${isLastVisit
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                        : 'bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLastVisit ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
                    <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isLastVisit ? 'text-indigo-800 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-200'}`}>
                            Visit #{info.visit_number ?? '—'}
                            {isLastVisit && <span className="ml-2 text-[10px] font-semibold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">Latest</span>}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                            {info.visit_date ?? '—'} &middot; {info.visit_category ?? '—'} &middot; Dr. {info.assigned_doctor ?? '—'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <StatusPill status={info.status} />
                    {expanded
                        ? <ChevronLeft className="w-4 h-4 text-gray-400 rotate-90" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                    }
                </div>
            </button>

            {/* Body — conditionally visible */}
            {expanded && (
                <div className="p-4 space-y-4 border-t border-gray-100 dark:border-gray-800">

                    {/* Visit summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                        <InfoRow label="Visit No."  value={info.visit_number} />
                        <InfoRow label="Category"   value={info.visit_category} />
                        <InfoRow label="Date"       value={info.visit_date} />
                        <InfoRow label="Room"       value={info.room} />
                        <InfoRow label="Doctor"     value={info.assigned_doctor} />
                        <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Status</span>
                            <StatusPill status={info.status} />
                        </div>
                    </div>

                    {/* Examination */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Doctor Examination</p>
                        {!exam ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No examination recorded for this visit.</p>
                        ) : (
                            <div className="space-y-2.5 pl-3 border-l-2 border-gray-100 dark:border-gray-800">
                                <div className="grid grid-cols-2 gap-x-8">
                                    <InfoRow label="Examining Doctor" value={exam.doctor} />
                                    <InfoRow label="Date"            value={exam.created_at} />
                                </div>
                                <NoteField label="Chief Complaint"      value={exam.note?.chief_complaint} />
                                <NoteField label="History of Illness"   value={exam.note?.history_of_illness} />
                                <NoteField label="Examination Findings" value={exam.note?.examination_findings} />
                                <NoteField label="Diagnosis"            value={exam.note?.diagnosis} />
                                <NoteField label="Treatment Plan"       value={exam.note?.treatment_plan} />
                                <NoteField
                                    label="Department Routing Plan"
                                    value={
                                        Array.isArray(exam.note?.visit_department_plan) && exam.note.visit_department_plan.length
                                            ? exam.note.visit_department_plan.join(', ')
                                            : null
                                    }
                                />
                                <NoteField label="Additional Notes" value={exam.note?.notes} />
                            </div>
                        )}
                    </div>

                    {/* Department breakdown */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Department Breakdown</p>
                        <DeptBreakdown breakdown={dept} showMostRecentBadge={showMostRecent} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
//  PatientMedicalHistoryReport — main export
// ══════════════════════════════════════════════════════════════════════════════
export function PatientMedicalHistoryReport({ patientId, patientName, onClose }) {
    const token  = localStorage.getItem('access_token');
    const isDark = useIsDarkMode();

    // ── Summary data (patient info + stats + last visit) ─────────────────────
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const [pdfOpen, setPdfOpen] = useState(false);

    // ── Paginated visit history ───────────────────────────────────────────────
    const [historyPage,    setHistoryPage]    = useState(1);
    const [historyData,    setHistoryData]    = useState(null);  // { visits, current_page, last_page, total }
    const [historyLoading, setHistoryLoading] = useState(false);

    // ── Fetch summary ─────────────────────────────────────────────────────────
    const fetchHistory = useCallback(async () => {
        if (!patientId) return;
        setLoading(true);
        setData(null);
        try {
            const res = await axios.get(`${API_BASE_URL}reports/patientMedicalHistory`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params:  { patient_id: patientId },
            });
            setData(res.data?.data ?? null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load medical history');
        } finally {
            setLoading(false);
        }
    }, [patientId, token]);

    // ── Fetch paginated visits ────────────────────────────────────────────────
    const fetchVisitHistory = useCallback(async (page) => {
        if (!patientId) return;
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}reports/patientMedicalHistory/visits`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params:  { patient_id: patientId, page, per_page: 5 },
            });
            setHistoryData(res.data?.data ?? null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load visit history');
        } finally {
            setHistoryLoading(false);
        }
    }, [patientId, token]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);
    useEffect(() => { fetchVisitHistory(historyPage); }, [fetchVisitHistory, historyPage]);

    // Reset paginator when patient changes
    useEffect(() => { setHistoryPage(1); setHistoryData(null); }, [patientId]);

    const patient = data?.patient    ?? {};
    const stats   = data?.statistics ?? {};
    const lv      = data?.last_visit;

    return (
        <SkeletonTheme
            baseColor={isDark ? '#374151' : '#e5e7eb'}
            highlightColor={isDark ? '#4b5563' : '#f3f4f6'}
        >
        <div className="space-y-5">

            {/* ── 1. Patient info ──────────────────────────────────────────── */}
            {loading ? (
                <Skeleton height={110} borderRadius={12} />
            ) : (
                <SectionCard title="Patient Information">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                        <InfoRow label="Patient No."    value={patient.patient_number} />
                        <InfoRow label="Full Name"      value={patient.name} />
                        <InfoRow label="Date of Birth"  value={patient.dob} />
                        <InfoRow label="Age"            value={patient.age ? `${patient.age} yrs` : null} />
                        <InfoRow label="Nationality"    value={patient.nationality} />
                        <InfoRow label="Address"        value={patient.address} />
                        <InfoRow label="Admission Date" value={patient.admission_date} />
                    </div>
                </SectionCard>
            )}

            {/* ── 2. Lifetime statistics ────────────────────────────────────── */}
            {loading ? (
                <Skeleton height={88} borderRadius={12} />
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatTile icon={CalendarDays} label="Total Visits"         value={stats.total_visits}               accent="blue"   />
                    <StatTile icon={Stethoscope}  label="Examined Visits"      value={stats.examined_visits}            accent="teal"   />
                    <StatTile icon={FlaskConical} label="Routed to Lab"        value={stats.visits_routed_to_lab}       accent="violet" />
                    <StatTile icon={Activity}     label="Routed to Radiology"  value={stats.visits_routed_to_radiology} accent="indigo" />
                    <StatTile icon={Pill}         label="Routed to Pharmacy"   value={stats.visits_routed_to_pharmacy}  accent="amber"  />
                    <StatTile icon={BedDouble}    label="Admitted to Ward"     value={stats.visits_admitted_to_ward}    accent="rose"   />
                </div>
            )}

            {/* ── 3. Last visit (using VisitDetailCard) ─────────────────────── */}
            {loading ? (
                <>
                    <Skeleton height={54} borderRadius={12} />
                    <Skeleton height={140} borderRadius={12} />
                </>
            ) : lv === null || lv === undefined ? (
                <SectionCard title="Last Visit">
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400 dark:text-gray-600">
                        <CalendarDays className="w-8 h-8 opacity-30" />
                        <p className="text-sm">No visits recorded yet for this patient.</p>
                    </div>
                </SectionCard>
            ) : (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 px-1">
                        Last Visit — Summary &amp; Department Breakdown
                    </h3>
                    <VisitDetailCard visit={lv} showMostRecent isLastVisit />
                </div>
            )}

            {/* ── 4. Full visit history (paginated) ────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300">
                        Full Visit History
                        {historyData && (
                            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                                ({historyData.total} total visit{historyData.total !== 1 ? 's' : ''})
                            </span>
                        )}
                    </h3>
                </div>

                {historyLoading ? (
                    <div className="space-y-3">
                        <Skeleton height={54} borderRadius={12} />
                        <Skeleton height={54} borderRadius={12} />
                        <Skeleton height={54} borderRadius={12} />
                    </div>
                ) : !historyData || historyData.visits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400 dark:text-gray-600 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <CalendarDays className="w-7 h-7 opacity-30" />
                        <p className="text-sm">No visit history available.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {historyData.visits.map((visit, idx) => (
                                <VisitDetailCard
                                    key={visit.visit_info?.id ?? idx}
                                    visit={visit}
                                    showMostRecent={false}
                                    isLastVisit={false}
                                />
                            ))}
                        </div>

                        {/* Pagination controls */}
                        {historyData.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                    disabled={historyPage <= 1}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                        text-gray-500 dark:text-gray-400
                                        hover:bg-gray-100 dark:hover:bg-gray-800
                                        disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {Array.from({ length: historyData.last_page }, (_, i) => i + 1).map(pg => (
                                    <button
                                        key={pg}
                                        onClick={() => setHistoryPage(pg)}
                                        className={`w-7 h-7 rounded-full text-xs font-semibold transition
                                            ${pg === historyPage
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        {pg}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setHistoryPage(p => Math.min(historyData.last_page, p + 1))}
                                    disabled={historyPage >= historyData.last_page}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                        text-gray-500 dark:text-gray-400
                                        hover:bg-gray-100 dark:hover:bg-gray-800
                                        disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── 5. Footer actions ─────────────────────────────────────────── */}
            {!loading && data && (
                <div className="flex items-center justify-between pt-2 pb-1">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300
                                bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            Close
                        </button>
                    )}
                    <button
                        onClick={() => setPdfOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-gradient-to-r from-blue-600 to-indigo-600
                            hover:from-blue-700 hover:to-indigo-700
                            transition shadow-sm shadow-blue-200 dark:shadow-blue-900/40 ml-auto"
                    >
                        <FileText className="w-4 h-4" /> View / Download PDF
                    </button>
                </div>
            )}

            {/* PDF preview modal */}
            <PatientMedicalHistoryPdfModal
                isOpen={pdfOpen}
                onClose={() => setPdfOpen(false)}
                patientId={patientId}
                patientName={patientName ?? patient.name}
            />
        </div>
        </SkeletonTheme>
    );
}
