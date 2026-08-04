// ADD / EDIT PATIENT TRIAGE DRAWER
// Supports two modes:
//  CREATE — no existingTriage prop  → POST visitAssign/registerPatientVisitTriage
//  UPDATE — existingTriage provided → POST visitAssign/updatePatientVisitTriage

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, ClipboardList, CheckCircle2, Loader2, ChevronDown, ChevronUp,
    AlertCircle, Activity, ShieldAlert, StickyNote, Edit3, Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../general/constants';

import BloodPressureRow from './triage_widgets/BloodPressureRow';
import PulseRateRow     from './triage_widgets/PulseRateRow';
import TemperatureRow   from './triage_widgets/TemperatureRow';
import BmiCalculatorPanel from './triage_widgets/BmiCalculatorPanel';

// ─── Field wrapper ──────────────────────────────────────────────────────────────
const Field = ({ label, required, hint, children }) => (
    <div>
        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && <p className="mt-1 text-[11px] italic text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
);

// ─── Section card ───────────────────────────────────────────────────────────────
const Section = ({ icon, title, accent = 'indigo', collapsible = false, children }) => {
    const [open, setOpen] = useState(true);
    const accentMap = {
        indigo: { header: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/60', icon: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', border: 'border-indigo-100 dark:border-indigo-800/40' },
        teal:   { header: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800/60',         icon: 'text-teal-600 dark:text-teal-400',     iconBg: 'bg-teal-100 dark:bg-teal-900/40',   border: 'border-teal-100 dark:border-teal-800/40'   },
        amber:  { header: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/60',     icon: 'text-amber-600 dark:text-amber-400',   iconBg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-100 dark:border-amber-800/40' },
        violet: { header: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800/60', icon: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-100 dark:border-violet-800/40' },
        rose:   { header: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/60',         icon: 'text-rose-600 dark:text-rose-400',     iconBg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-100 dark:border-rose-800/40'   },
        orange: { header: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/60', icon: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-100 dark:border-orange-800/40' },
        emerald:{ header: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/60', icon: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-100 dark:border-emerald-800/40' },
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
const inputCls    = "w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500";
const selectCls   = "w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm transition-all";

const URGENCY_OPTIONS = [
    { value: '',          label: '— Select Urgency Level —' },
    { value: 'emergency', label: '🔴  Emergency'            },
    { value: 'urgent',    label: '🟠  Urgent'               },
    { value: 'routine',   label: '🟢  Routine'              },
];

/* ─── Helper: render existing readings as chip list with optional remove toggle ─ */
function ReadingChips({ readings = [], pendingRemoveIdx, onToggleRemove, formatFn = v => v }) {
    if (!readings.length) return <p className="text-xs text-gray-400 italic">No readings recorded</p>;
    return (
        <div className="flex flex-wrap gap-1.5 mb-2">
            {readings.map((r, idx) => {
                const isMarked = pendingRemoveIdx === idx;
                return (
                    <span
                        key={idx}
                        onClick={() => onToggleRemove(isMarked ? null : idx)}
                        title={isMarked ? 'Click to un-mark' : 'Click to mark for removal'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all
                            ${isMarked
                                ? 'bg-rose-100 text-rose-700 line-through border border-rose-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-rose-300 hover:bg-rose-50'}`}
                    >
                        {formatFn(r)}
                        {isMarked ? <X className="w-3 h-3 text-rose-500" /> : <Trash2 className="w-3 h-3 opacity-40" />}
                    </span>
                );
            })}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
//  AddTriageToPatientVisit
//  Props:
//    isOpen         – boolean
//    onClose        – () => void
//    visit          – full visit object
//    token          – JWT string
//    onSuccess      – (triage) => void  (optional)
//    existingTriage – PatientTriage object  (undefined = CREATE mode)
// ══════════════════════════════════════════════════════════════════════════════
export function AddTriageToPatientVisit({ isOpen, onClose, visit, token, onSuccess, existingTriage }) {
    const isUpdateMode = !!existingTriage;
    const [submitting, setSubmitting] = useState(false);

    // ── Scalar triage fields ──────────────────────────────────────────────────
    const emptyScalars = {
        urgency_level:     '',
        chief_complaint:   '',
        oxygen_saturation: '',
        weight:            '',
        standing_height:   '',
        sitting_height:    '',
        waist:             '',
        hip:               '',
        muac:              '',
        notes:             '',
    };

    const [scalars, setScalars]   = useState(emptyScalars);
    const setScalar = field => e => setScalars(prev => ({ ...prev, [field]: e.target.value }));

    // ── CREATE mode: single first reading per vital ───────────────────────────
    const [createBp,   setCreateBp]   = useState('');           // "120.00/80.00"
    const [createPr,   setCreatePr]   = useState('');           // "72.00"
    const [createTemp, setCreateTemp] = useState({ method: 'axillary', value: '' });

    // ── UPDATE mode: pending add/remove per vital ─────────────────────────────
    const [removeBpIdx,   setRemoveBpIdx]   = useState(null);
    const [removePrIdx,   setRemovePrIdx]   = useState(null);
    const [removeTempIdx, setRemoveTempIdx] = useState(null);
    const [addBp,         setAddBp]         = useState('');
    const [addPr,         setAddPr]         = useState('');
    const [addTemp,       setAddTemp]       = useState({ method: 'axillary', value: '' });

    // ── Reset when drawer opens ───────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setRemoveBpIdx(null); setRemovePrIdx(null); setRemoveTempIdx(null);
        setAddBp(''); setAddPr(''); setAddTemp({ method: 'axillary', value: '' });
        setCreateBp(''); setCreatePr(''); setCreateTemp({ method: 'axillary', value: '' });

        if (existingTriage) {
            setScalars({
                urgency_level:     existingTriage.urgency_level     ?? '',
                chief_complaint:   existingTriage.chief_complaint   ?? '',
                oxygen_saturation: existingTriage.oxygen_saturation ?? '',
                weight:            existingTriage.weight            ?? '',
                standing_height:   existingTriage.standing_height   ?? '',
                sitting_height:    existingTriage.sitting_height    ?? '',
                waist:             existingTriage.waist             ?? '',
                hip:               existingTriage.hip               ?? '',
                muac:              existingTriage.muac              ?? '',
                notes:             existingTriage.notes             ?? '',
            });
        } else {
            setScalars(emptyScalars);
        }
    }, [isOpen, existingTriage]);

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!scalars.chief_complaint.trim()) { toast.error('Chief complaint is required'); return; }
        if (!scalars.urgency_level)          { toast.error('Urgency level is required'); return; }

        setSubmitting(true);
        try {
            let res;

            if (isUpdateMode) {
                const payload = {
                    triage_id:         existingTriage.id,
                    urgency_level:     scalars.urgency_level     || undefined,
                    chief_complaint:   scalars.chief_complaint   || undefined,
                    oxygen_saturation: scalars.oxygen_saturation || undefined,
                    weight:            scalars.weight            || undefined,
                    standing_height:   scalars.standing_height   || undefined,
                    sitting_height:    scalars.sitting_height    || undefined,
                    waist:             scalars.waist             || undefined,
                    hip:               scalars.hip               || undefined,
                    muac:              scalars.muac              || undefined,
                    notes:             scalars.notes             || undefined,
                };

                // Blood pressure
                if (removeBpIdx !== null) payload.blood_pressure_remove_index = removeBpIdx;
                if (addBp)               payload.blood_pressure_add = addBp;

                // Pulse rate
                if (removePrIdx !== null) payload.pulse_rate_remove_index = removePrIdx;
                if (addPr)               payload.pulse_rate_add = addPr;

                // Temperature
                if (removeTempIdx !== null) payload.temperature_remove_index = removeTempIdx;
                if (addTemp.value)          payload.temperature_add = addTemp;

                res = await axios.post(
                    `${API_BASE_URL}visitAssign/updatePatientVisitTriage`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
                );
                toast.success('Triage updated successfully');
            } else {
                const payload = {
                    patient_visit_id:  visit.id,
                    urgency_level:     scalars.urgency_level,
                    chief_complaint:   scalars.chief_complaint,
                    oxygen_saturation: scalars.oxygen_saturation || undefined,
                    weight:            scalars.weight            || undefined,
                    standing_height:   scalars.standing_height   || undefined,
                    sitting_height:    scalars.sitting_height    || undefined,
                    waist:             scalars.waist             || undefined,
                    hip:               scalars.hip               || undefined,
                    muac:              scalars.muac              || undefined,
                    notes:             scalars.notes             || undefined,
                };

                if (createBp)         payload.blood_pressure = createBp;
                if (createPr)         payload.pulse_rate     = createPr;
                if (createTemp.value) payload.temperature    = createTemp;

                res = await axios.post(
                    `${API_BASE_URL}visitAssign/registerPatientVisitTriage`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
                );
                toast.success('Triage saved successfully');
            }

            onSuccess?.(res.data?.data ?? res.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save triage');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Existing readings arrays (only meaningful in UPDATE mode)
    const existingBp   = Array.isArray(existingTriage?.blood_pressure) ? existingTriage.blood_pressure : [];
    const existingPr   = Array.isArray(existingTriage?.pulse_rate)     ? existingTriage.pulse_rate     : [];
    const existingTemp = Array.isArray(existingTriage?.temperature)     ? existingTriage.temperature    : [];

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 flex flex-col
                bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800
                animate-slide-in-right">

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800
                    bg-gradient-to-r from-orange-500 to-rose-500 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            {isUpdateMode ? <Edit3 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                            {isUpdateMode ? 'Edit Triage' : 'Patient Triage'}
                        </h2>
                        <p className="text-orange-100 text-xs mt-1">
                            Visit: <span className="font-semibold">{visit?.visit_number}</span>
                            {visit?.patient?.name && <> &mdash; {visit.patient.name}</>}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/20 text-white transition mt-0.5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            {isUpdateMode
                                ? 'Update scalar fields directly. For array vitals, click an existing reading to mark it for removal, then enter a new reading to add.'
                                : 'Record vital signs and triage assessment. Fields marked * are required.'}
                        </p>
                    </div>

                    {/* ── Triage Assessment ── */}
                    <Section icon={<ShieldAlert className="w-4 h-4" />} title="Triage Assessment" accent="rose">
                        <Field label="Urgency Level" required hint="Assign a clinical urgency level">
                            <select value={scalars.urgency_level} onChange={setScalar('urgency_level')} className={selectCls}>
                                {URGENCY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Chief Complaint" required hint="Primary presenting symptom at triage">
                            <textarea
                                rows={3}
                                value={scalars.chief_complaint}
                                onChange={setScalar('chief_complaint')}
                                placeholder="e.g. Chest pain radiating to the left arm, onset 30 minutes ago…"
                                className={textareaCls}
                            />
                        </Field>
                    </Section>

                    {/* ── Vital Signs ── */}
                    <Section icon={<Activity className="w-4 h-4" />} title="Vital Signs" accent="teal">

                        {/* Blood Pressure */}
                        <Field label="Blood Pressure" hint="mmHg — Systolic / Diastolic">
                            {isUpdateMode && (
                                <ReadingChips
                                    readings={existingBp}
                                    pendingRemoveIdx={removeBpIdx}
                                    onToggleRemove={setRemoveBpIdx}
                                />
                            )}
                            <div className="space-y-1">
                                {isUpdateMode && <p className="text-[11px] text-gray-400">New reading to add:</p>}
                                <BloodPressureRow
                                    value={isUpdateMode ? addBp : createBp}
                                    onChange={isUpdateMode ? setAddBp : setCreateBp}
                                />
                            </div>
                        </Field>

                        {/* Pulse Rate */}
                        <Field label="Pulse Rate" hint="bpm">
                            {isUpdateMode && (
                                <ReadingChips
                                    readings={existingPr}
                                    pendingRemoveIdx={removePrIdx}
                                    onToggleRemove={setRemovePrIdx}
                                    formatFn={v => `${v} bpm`}
                                />
                            )}
                            <div className="space-y-1">
                                {isUpdateMode && <p className="text-[11px] text-gray-400">New reading to add:</p>}
                                <PulseRateRow
                                    value={isUpdateMode ? addPr : createPr}
                                    onChange={isUpdateMode ? setAddPr : setCreatePr}
                                />
                            </div>
                        </Field>

                        {/* Temperature */}
                        <Field label="Temperature" hint="°C">
                            {isUpdateMode && (
                                <ReadingChips
                                    readings={existingTemp}
                                    pendingRemoveIdx={removeTempIdx}
                                    onToggleRemove={setRemoveTempIdx}
                                    formatFn={r => `${r?.value ?? r}°C (${r?.method ?? ''})`}
                                />
                            )}
                            <div className="space-y-1">
                                {isUpdateMode && <p className="text-[11px] text-gray-400">New reading to add:</p>}
                                <TemperatureRow
                                    value={isUpdateMode ? addTemp : createTemp}
                                    onChange={isUpdateMode ? setAddTemp : setCreateTemp}
                                />
                            </div>
                        </Field>

                        {/* O₂ Saturation */}
                        <Field label="O₂ Saturation (%)" hint="Pulse oximetry reading">
                            <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                value={scalars.oxygen_saturation}
                                onChange={setScalar('oxygen_saturation')}
                                placeholder="e.g. 98"
                                className={inputCls}
                            />
                        </Field>

                    </Section>

                    {/* ── Anthropometrics + BMI ── */}
                    <Section icon={<ClipboardList className="w-4 h-4" />} title="Anthropometrics & BMI" accent="emerald">

                        {/* Weight + Standing Height feed BmiCalculatorPanel */}
                        <BmiCalculatorPanel
                            weight={scalars.weight}
                            standingHeight={scalars.standing_height}
                            onWeightChange={v => setScalars(p => ({ ...p, weight: v }))}
                            onHeightChange={v => setScalars(p => ({ ...p, standing_height: v }))}
                        />

                        {/* Remaining anthropometrics */}
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <Field label="Sitting Height (cm)">
                                <input type="number" step="0.1" min="0" value={scalars.sitting_height} onChange={setScalar('sitting_height')} placeholder="e.g. 90" className={inputCls} />
                            </Field>
                            <Field label="Waist (cm)">
                                <input type="number" step="0.1" min="0" value={scalars.waist} onChange={setScalar('waist')} placeholder="e.g. 85" className={inputCls} />
                            </Field>
                            <Field label="Hip (cm)">
                                <input type="number" step="0.1" min="0" value={scalars.hip} onChange={setScalar('hip')} placeholder="e.g. 95" className={inputCls} />
                            </Field>
                            <Field label="MUAC (cm)" hint="Mid-upper arm circumference">
                                <input type="number" step="0.1" min="0" value={scalars.muac} onChange={setScalar('muac')} placeholder="e.g. 28" className={inputCls} />
                            </Field>
                        </div>
                    </Section>

                    {/* ── Notes ── */}
                    <Section icon={<StickyNote className="w-4 h-4" />} title="Additional Notes" accent="amber" collapsible>
                        <Field label="Notes" hint="Nursing observations or instructions for the attending clinician">
                            <textarea
                                rows={3}
                                value={scalars.notes}
                                onChange={setScalar('notes')}
                                placeholder="e.g. Patient arrived by ambulance, appears anxious…"
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
                            : <><CheckCircle2 className="w-4 h-4" /> {isUpdateMode ? 'Update Triage' : 'Save Triage'}</>
                        }
                    </button>
                </div>

            </div>

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </>
    );
}
