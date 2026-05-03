// THIS IS THE LOGIC AND INTERFACE FOR THE
// "ADD PATIENT TRIAGE" DRAWER IN THE PATIENT VISIT PAGE
// IT WILL BE CALLED FROM PATIENT VISIT

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, ClipboardList, CheckCircle2, Loader2, ChevronDown, ChevronUp,
    AlertCircle, HeartPulse, Thermometer, Activity, ShieldAlert, StickyNote, Gauge
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
        orange: {
            header: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/60',
            icon: 'text-orange-600 dark:text-orange-400',
            iconBg: 'bg-orange-100 dark:bg-orange-900/40',
            border: 'border-orange-100 dark:border-orange-800/40',
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
const selectCls = "w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm transition-all";

const URGENCY_OPTIONS = [
    { value: '',          label: '— Select Urgency Level —' },
    { value: 'emergency', label: '🔴  Emergency'            },
    { value: 'urgent',    label: '🟠  Urgent'               },
    { value: 'routine',   label: '🟢  Routine'              },
];

// ══════════════════════════════════════════════════════════════════════════════
//  AddTriageDrawer
//  Props:
//    isOpen       – boolean
//    onClose      – () => void
//    visit        – the full visit object (we only need visit.id + visit.visit_number + patient.name)
//    token        – JWT string
//    onSuccess    – (triage) => void   (optional callback after successful save)
// This component is a drawer that slides in from the right when adding triage
//  data to a patient visit.
// ══════════════════════════════════════════════════════════════════════════════
export function AddTriageToPatientVisit({ isOpen, onClose, visit, token, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);

    const emptyForm = {
        // Triage assessment
        urgency_level: '',
        chief_complaint: '',
        // Vitals
        blood_pressure: '',
        temperature: '',
        pulse_rate: '',
        oxygen_saturation: '',
        weight: '',
        height: '',
        // Additional
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
        if (!form.urgency_level) {
            toast.error('Urgency level is required');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                patient_visit_id: visit.id,
                urgency_level: form.urgency_level,
                chief_complaint: form.chief_complaint,
                blood_pressure: form.blood_pressure,
                temperature: form.temperature,
                pulse_rate: form.pulse_rate,
                oxygen_saturation: form.oxygen_saturation,
                weight: form.weight,
                height: form.height,
                notes: form.notes,
            };

            const res = await axios.post(
                `${API_BASE_URL}visitAssign/addPatientVisitTriage`,
                payload,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
            );

            toast.success('Triage data saved successfully');
            onSuccess?.(res.data?.data ?? res.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save triage data');
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
                    bg-gradient-to-r from-orange-500 to-rose-500 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5" />
                            Patient Triage
                        </h2>
                        <p className="text-orange-100 text-xs mt-1">
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
                            Record the patient's vital signs and triage assessment below. Fields marked <span className="font-bold text-red-500">*</span> are required.
                            Vital signs are optional but strongly recommended for a complete triage record.
                        </p>
                    </div>

                    {/* Triage Priority & Chief Complaint */}
                    <Section icon={<ShieldAlert className="w-4 h-4" />} title="Triage Assessment" accent="rose">
                        <Field label="Urgency Level" required hint="Assign a clinical urgency level based on the patient's condition">
                            <select
                                value={form.urgency_level}
                                onChange={set('urgency_level')}
                                className={selectCls}
                            >
                                {URGENCY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Chief Complaint" required hint="The patient's primary presenting symptom at triage">
                            <textarea
                                rows={3}
                                value={form.chief_complaint}
                                onChange={set('chief_complaint')}
                                placeholder="e.g. Chest pain radiating to the left arm, onset 30 minutes ago…"
                                className={textareaCls}
                            />
                        </Field>
                    </Section>

                    {/* Vitals */}
                    <Section icon={<Activity className="w-4 h-4" />} title="Vital Signs" accent="teal">
                        {/* Temperature & O2 Sat */}
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Temperature (°C)" hint="Oral / axillary / rectal">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={form.temperature}
                                    onChange={set('temperature')}
                                    placeholder="e.g. 37.2"
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="O₂ Saturation (%)" hint="Pulse oximetry reading">
                                <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    value={form.oxygen_saturation}
                                    onChange={set('oxygen_saturation')}
                                    placeholder="e.g. 98"
                                    className={inputCls}
                                />
                            </Field>
                        </div>

                        {/* Blood Pressure — single string field e.g. "120/80" */}
                        <Field label="Blood Pressure (mmHg)" hint="Enter as Systolic/Diastolic e.g. 120/80">
                            <input
                                type="text"
                                value={form.blood_pressure}
                                onChange={set('blood_pressure')}
                                placeholder="e.g. 120/80"
                                className={inputCls}
                            />
                        </Field>

                        {/* Pulse Rate */}
                        <Field label="Pulse Rate (bpm)" hint="Beats per minute">
                            <input
                                type="number"
                                value={form.pulse_rate}
                                onChange={set('pulse_rate')}
                                placeholder="e.g. 72"
                                className={inputCls}
                            />
                        </Field>

                        {/* Weight & Height */}
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Weight (kg)" hint="Patient's current weight">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={form.weight}
                                    onChange={set('weight')}
                                    placeholder="e.g. 70.5"
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Height (cm)" hint="Patient's height">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={form.height}
                                    onChange={set('height')}
                                    placeholder="e.g. 175"
                                    className={inputCls}
                                />
                            </Field>
                        </div>
                    </Section>

                    {/* Additional Notes */}
                    <Section icon={<StickyNote className="w-4 h-4" />} title="Additional Notes" accent="amber" collapsible>
                        <Field label="Notes" hint="Any other observations, nursing notes, or instructions for the attending clinician">
                            <textarea
                                rows={3}
                                value={form.notes}
                                onChange={set('notes')}
                                placeholder="e.g. Patient arrived by ambulance, appears anxious, escort present…"
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
                            bg-gradient-to-r from-orange-500 to-rose-500
                            hover:from-orange-600 hover:to-rose-600
                            disabled:opacity-50 transition shadow-lg shadow-orange-200 dark:shadow-orange-900/50"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><CheckCircle2 className="w-4 h-4" /> Save Triage</>
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