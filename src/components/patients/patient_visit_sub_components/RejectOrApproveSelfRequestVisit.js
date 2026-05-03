import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, CheckCircle2, XCircle, AlertTriangle, Loader2,
    FileText, User, Calendar, ArrowRight, ShieldCheck,
    MessageSquare, ClipboardList, Info
} from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';

// ── small helpers ──────────────────────────────────────────────────────────────

const DECISIONS = [
    {
        value: 'approved',
        label: 'Approve',
        desc: 'Allow this visit to proceed through normal workflow',
        icon: CheckCircle2,
        activeBg:     'bg-emerald-50 dark:bg-emerald-900/20',
        activeBorder: 'border-emerald-400 dark:border-emerald-600',
        activeText:   'text-emerald-700 dark:text-emerald-300',
        activeIcon:   'text-emerald-500',
        dot:          'bg-emerald-500',
    },
    {
        value: 'rejected',
        label: 'Reject',
        desc: 'Decline this self-requested visit with a reason',
        icon: XCircle,
        activeBg:     'bg-rose-50 dark:bg-rose-900/20',
        activeBorder: 'border-rose-400 dark:border-rose-600',
        activeText:   'text-rose-700 dark:text-rose-300',
        activeIcon:   'text-rose-500',
        dot:          'bg-rose-500',
    },
];

const inputCls =
    'w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white ' +
    'border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 ' +
    'focus:border-transparent focus:outline-none text-sm transition-all ' +
    'placeholder-gray-400 dark:placeholder-gray-500';

// ── InfoRow (reused pattern) ───────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
    <div className="flex items-start justify-between gap-3 py-1.5
        border-b border-gray-50 dark:border-gray-800 last:border-0">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">{label}</span>
        <span className="text-[11px] text-right text-gray-700 dark:text-gray-300 font-medium capitalize">{value || '—'}</span>
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export function RejectOrApproveSelfRequestVisit({
    isOpen,
    onClose,
    visit,        // full PatientVisit row — needs visit.id, visit.patient, visit.visit_reason, etc.
    token,
    onSuccess,    // called after successful approval or rejection
}) {
    const [decision,         setDecision]         = useState('');      // 'approved' | 'rejected'
    const [notes,            setNotes]            = useState('');
    const [rejectionReason,  setRejectionReason]  = useState('');
    const [submitting,       setSubmitting]        = useState(false);

    // reset every time drawer opens/closes or visit changes
    useEffect(() => {
        if (!isOpen) {
            setDecision('');
            setNotes('');
            setRejectionReason('');
        }
    }, [isOpen]);

    if (!isOpen || !visit) return null;

    const isApproved  = decision === 'approved';
    const isRejected  = decision === 'rejected';
    const canSubmit   = !!decision && (!isRejected || rejectionReason.trim().length > 0);

    // Function to handle the submission 
    const handleSubmit = async () => {
        if (!canSubmit) {
            toast.error(isRejected ? 'Please enter a rejection reason.' : 'Please select a decision.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = isApproved
                ? { patient_visit_id: visit.id, decision: 'approved',  notes: notes.trim() || undefined }
                : { patient_visit_id: visit.id, decision: 'rejected',  request_rejection_reason: rejectionReason.trim() };

            await axios.post(
                `${API_BASE_URL}visitAssign/rejectOrApprovePatientVisitSelfRequest`,
                payload,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );

            toast.success(isApproved ? 'Visit approved successfully.' : 'Visit rejected successfully.');
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedCfg = DECISIONS.find(d => d.value === decision);

    return (
        <>
            {/* ── Backdrop ── */}
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* ── Drawer ── */}
            <div className="fixed inset-y-0 right-0 z-50 w-full w-full max-w-xl z-50 flex flex-col
                bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800
                shadow-2xl animate-slide-in-right">

                {/* Header */}
                <div className="flex-shrink-0 px-5 pt-5 pb-4
                    bg-gradient-to-r from-indigo-600 to-violet-600">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> Visit Request Decision
                            </h2>
                            <p className="text-indigo-200 text-xs mt-0.5">
                                Self-requested visit · {visit.patient?.name ?? `Patient #${visit.patient_id}`}
                            </p>
                        </div>
                        <button onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                    {/* ── Visit summary card ── */}
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800
                        bg-gray-50/60 dark:bg-gray-900/60 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30
                                flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="text-xs font-bold uppercase tracking-widest
                                text-gray-500 dark:text-gray-400">Visit Summary</h4>
                        </div>
                        <div className="space-y-0">
                            <InfoRow label="Visit No."   value={
                                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                    {visit.visit_number}
                                </span>
                            } />
                            <InfoRow label="Patient"     value={visit.patient?.name} />
                            <InfoRow label="Category"    value={visit.visit_category ?? visit.visit_type} />
                            <InfoRow label="Origin"      value="Self Request" />
                            <InfoRow label="Visit Date"  value={visit.visit_date} />
                            <InfoRow label="Visit Reason" value={visit.visit_reason} />
                        </div>
                    </div>

                    {/* ── Decision selector ── */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest
                            text-gray-500 dark:text-gray-400 mb-3">
                            Select Decision <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {DECISIONS.map(opt => {
                                const Icon    = opt.icon;
                                const active  = decision === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setDecision(opt.value)}
                                        className={`relative p-4 rounded-xl border-2 text-left transition-all
                                            ${active
                                                ? `${opt.activeBg} ${opt.activeBorder} shadow-md`
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-2 ${active ? opt.activeIcon : 'text-gray-400'}`} />
                                        <p className={`font-bold text-sm ${active ? opt.activeText : 'text-gray-700 dark:text-gray-200'}`}>
                                            {opt.label}
                                        </p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                                            {opt.desc}
                                        </p>
                                        {active && (
                                            <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${opt.dot}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Conditional form fields ── */}

                    {/* APPROVED — optional notes */}
                    {isApproved && (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800
                            bg-emerald-50/40 dark:bg-emerald-900/10 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                    Approval Notes
                                </p>
                                <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 italic">
                                    Optional
                                </span>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest
                                    text-gray-400 dark:text-gray-500 mb-1.5">
                                    Additional Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="e.g. Patient approved for consultation, room 4 available…"
                                    className={`${inputCls} resize-none`}
                                />
                            </div>
                            <div className="flex items-start gap-2 p-3 rounded-lg
                                bg-emerald-100/60 dark:bg-emerald-900/20
                                border border-emerald-200 dark:border-emerald-800">
                                <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                                    Approving will allow this visit to continue through the normal clinical workflow.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* REJECTED — required rejection reason */}
                    {isRejected && (
                        <div className="rounded-xl border border-rose-200 dark:border-rose-800
                            bg-rose-50/40 dark:bg-rose-900/10 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                                    Rejection Details
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest
                                    text-gray-400 dark:text-gray-500 mb-1.5">
                                    Rejection Reason <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={4}
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                    placeholder="e.g. No available slots today, patient directed to return tomorrow…"
                                    className={`${inputCls} resize-none
                                        ${!rejectionReason.trim()
                                            ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-400'
                                            : 'border-gray-200 dark:border-gray-700'}`}
                                />
                                {!rejectionReason.trim() && (
                                    <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> A rejection reason is required.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-start gap-2 p-3 rounded-lg
                                bg-rose-100/60 dark:bg-rose-900/20
                                border border-rose-200 dark:border-rose-800">
                                <Info className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                                    The rejection reason will be recorded against this visit for audit and patient communication purposes.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* No decision yet — placeholder */}
                    {!decision && (
                        <div className="flex flex-col items-center justify-center gap-2 py-8
                            text-gray-300 dark:text-gray-700 text-center">
                            <ClipboardList className="w-10 h-10 opacity-40" />
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                Select a decision above to continue
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/80 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                            text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800
                            border border-gray-200 dark:border-gray-700
                            hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
                            text-white transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed
                            ${isRejected
                                ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-200 dark:shadow-rose-900/40'
                                : isApproved
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200 dark:shadow-emerald-900/40'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/40'
                            }`}
                    >
                        {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                        ) : isApproved ? (
                            <><CheckCircle2 className="w-4 h-4" /> Confirm Approval</>
                        ) : isRejected ? (
                            <><XCircle className="w-4 h-4" /> Confirm Rejection</>
                        ) : (
                            'Submit Decision'
                        )}
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