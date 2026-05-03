// THIS IS THE LOGIC AND INTERFACE FOR THE 
// "ADD EXAMINATION NOTES" DRAWER IN THE PATIENT VISIT PAGE
//IT WILL BE CALLED FROM PATIENT VISIT

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, Stethoscope, ClipboardList, FileText, Lightbulb,
    Activity, StickyNote, CheckCircle2, Loader2, ChevronDown, ChevronUp,
    AlertCircle, FlaskConical, HeartPulse
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../general/constants';

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({ label, required, hint, children }) => (
    <div>
        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && <p className="mt-1 text-[11px] italic text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
);

// ─── Section card ──────────────────────────────────────────────────────────────
const Section = ({ icon, title, accent = 'indigo', collapsible = false, children }) => {
    const [open, setOpen] = useState(true);

    const accentMap = {
        indigo: {
            header: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/60',
            icon: 'text-indigo-600 dark:text-indigo-400',
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
            border: 'border-indigo-100 dark:border-indigo-800/40',
        },
        teal: {
            header: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800/60',
            icon: 'text-teal-600 dark:text-teal-400',
            iconBg: 'bg-teal-100 dark:bg-teal-900/40',
            border: 'border-teal-100 dark:border-teal-800/40',
        },
        amber: {
            header: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/60',
            icon: 'text-amber-600 dark:text-amber-400',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            border: 'border-amber-100 dark:border-amber-800/40',
        },
        violet: {
            header: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800/60',
            icon: 'text-violet-600 dark:text-violet-400',
            iconBg: 'bg-violet-100 dark:bg-violet-900/40',
            border: 'border-violet-100 dark:border-violet-800/40',
        },
        rose: {
            header: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/60',
            icon: 'text-rose-600 dark:text-rose-400',
            iconBg: 'bg-rose-100 dark:bg-rose-900/40',
            border: 'border-rose-100 dark:border-rose-800/40',
        },
    };

    const s = accentMap[accent] ?? accentMap.indigo;

    return (
        <div className={`rounded-2xl border ${s.border} overflow-hidden`}>
            <div
                className={`flex items-center justify-between px-4 py-3 border-b ${s.header} ${collapsible ? 'cursor-pointer select-none' : ''}`}
                onClick={() => collapsible && setOpen(v => !v)}
            >
                <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                        <span className={s.icon}>{icon}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{title}</p>
                </div>
                {collapsible && (
                    <span className="text-gray-400">
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                )}
            </div>
            {open && <div className="p-4 space-y-4">{children}</div>}
        </div>
    );
};

const textareaCls = "w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500 resize-none leading-relaxed";
const inputCls = "w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500";

// ══════════════════════════════════════════════════════════════════════════════
//  AddExaminationDrawer
//  Props:
//    isOpen       – boolean
//    onClose      – () => void
//    visit        – the full visit object (we only need visit.id + visit.visit_number + patient.name)
//    token        – JWT string
//    onSuccess    – (examination) => void   (optional callback after successful save)
// This component is a drawer that slides in from the right when adding examination notes to a patient visit.
//  And has parameters passed to it such as the visit object, a token for authentication, 
// and callbacks for closing the drawer and handling successful saves.
// ══════════════════════════════════════════════════════════════════════════════
export function AddExaminationDrawer({ isOpen, onClose, visit, token, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);

    const emptyForm = {
        chief_complaint: '',
        history_of_illness: '',
        examination_findings: '',
        diagnosis: '',
        treatment_plan: '',
        notes: '',
    };

    const [form, setForm] = useState(emptyForm);

    // Reset form whenever drawer is opened for a new visit
    useEffect(() => {
        if (isOpen) setForm(emptyForm);
    }, [isOpen, visit?.id]);

    const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async () => {
        // Basic validation
        if (!form.chief_complaint.trim()) {
            toast.error('Chief complaint is required');
            return;
        }
        if (!form.diagnosis.trim()) {
            toast.error('Diagnosis is required');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                //when the drawer is called, the visit object is passed to it,
                //  so we can get the visit id from there
                patient_visit_id: visit.id,
                chief_complaint: form.chief_complaint,
                history_of_illness: form.history_of_illness,
                examination_findings: form.examination_findings,
                diagnosis: form.diagnosis,
                treatment_plan: form.treatment_plan,
                notes: form.notes,
            };

            const res = await axios.post(
                `${API_BASE_URL}visitAssign/addPatientVisitExaminationNotes`,
                payload,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
            );
            
            toast.success('Examination notes saved successfully');
            onSuccess?.(res.data?.data ?? res.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save examination notes');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 flex flex-col
                bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800
                animate-slide-in-right">

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800
                    bg-gradient-to-r from-teal-600 to-emerald-600 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Stethoscope className="w-5 h-5" />
                            Doctor's Examination Notes
                        </h2>
                        <p className="text-teal-100 text-xs mt-1">
                            Visit: <span className="font-semibold">{visit?.visit_number}</span>
                            {visit?.patient?.name && <> &mdash; {visit.patient.name}</>}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-white/20 text-white transition mt-0.5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Fill in the examination details below. Fields marked <span className="font-bold text-red-500">*</span> are required.
                            All other fields are optional but recommended for a complete clinical record.
                        </p>
                    </div>

                    {/* Chief Complaint */}
                    <Section icon={<HeartPulse className="w-4 h-4" />} title="Chief Complaint" accent="rose">
                        <Field label="Chief Complaint" required hint="The patient's primary presenting symptom in their own words">
                            <textarea
                                rows={3}
                                value={form.chief_complaint}
                                onChange={set('chief_complaint')}
                                placeholder="e.g. Severe headache and dizziness for the past 2 days…"
                                className={textareaCls}
                            />
                        </Field>
                        <Field label="History of Present Illness" hint="Timeline, onset, progression and associated symptoms">
                            <textarea
                                rows={3}
                                value={form.history_of_illness}
                                onChange={set('history_of_illness')}
                                placeholder="e.g. Started 2 days ago, intermittent pain, worsens in the afternoon…"
                                className={textareaCls}
                            />
                        </Field>
                    </Section>

                    {/* Examination Findings */}
                    <Section icon={<Activity className="w-4 h-4" />} title="Examination Findings" accent="teal">
                        <Field label="Clinical Findings" hint="Objective findings from physical examination">
                            <textarea
                                rows={4}
                                value={form.examination_findings}
                                onChange={set('examination_findings')}
                                placeholder="e.g. Patient appears fatigued, mild dehydration observed. Pupils equal and reactive. No focal neurological deficit…"
                                className={textareaCls}
                            />
                        </Field>
                    </Section>

                    {/* Diagnosis & Treatment */}
                    <Section icon={<FlaskConical className="w-4 h-4" />} title="Diagnosis & Treatment Plan" accent="violet">
                        <Field label="Diagnosis" required hint="Working or confirmed diagnosis">
                            <textarea
                                rows={2}
                                value={form.diagnosis}
                                onChange={set('diagnosis')}
                                placeholder="e.g. Possible migraine with tension headache component…"
                                className={textareaCls}
                            />
                        </Field>
                        <Field label="Treatment Plan" hint="Proposed management and interventions">
                            <textarea
                                rows={3}
                                value={form.treatment_plan}
                                onChange={set('treatment_plan')}
                                placeholder="e.g. Analgesia + IV fluids for hydration, rest in dark quiet room, review in 24 hrs…"
                                className={textareaCls}
                            />
                        </Field>
                    </Section>

                    {/* Additional Notes */}
                    <Section icon={<StickyNote className="w-4 h-4" />} title="Additional Notes" accent="amber" collapsible>
                        <Field label="Notes" hint="Any other clinical observations, follow-up instructions or warnings">
                            <textarea
                                rows={3}
                                value={form.notes}
                                onChange={set('notes')}
                                placeholder="e.g. Monitor for 24 hours, return if symptoms worsen…"
                                className={textareaCls}
                            />
                        </Field>
                    </Section>

                </div>

                {/* ── Footer ── */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/80 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300
                            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                            hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-gradient-to-r from-teal-600 to-emerald-600
                            hover:from-teal-700 hover:to-emerald-700
                            disabled:opacity-50 transition shadow-lg shadow-teal-200 dark:shadow-teal-900/50"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><CheckCircle2 className="w-4 h-4" /> Save Examination</>
                        }
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