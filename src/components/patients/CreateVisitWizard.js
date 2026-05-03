// WIZARD TO CREATE PATIENT VISIT, 
//THIS IS A SHARED FILE CONTAINING TO BE USED WHEN CREATING AVISIT(STEP BY STEP IN PATIENT VISITS)
//AND AT THE SAME TIME WHEN CREATING AVISIT FOR REGISTERED PATIENT IN PATIENTS COMPONENT


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus, X, User, FileText, Clock, DoorOpen, ShieldAlert, CheckCircle2,
    ChevronLeft, ChevronRight, Loader2, ArrowRight, UserCheck, Stethoscope,
    FlaskConical, BedDouble, Info, Activity, Thermometer, Heart, Wind, Hash,
    AlertTriangle, Zap, Circle, Building2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../general/constants';

// ─── Constants ─────────────────────────────────────────────────────────────────
export const URGENCY_LEVELS = [
    { value: 'routine', label: 'Routine', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500', icon: <Circle className="w-3.5 h-3.5" />, desc: 'Non-urgent, standard care' },
    { value: 'urgent', label: 'Urgent', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', dot: 'bg-amber-500', icon: <AlertTriangle className="w-3.5 h-3.5" />, desc: 'Needs prompt attention' },
    { value: 'emergency', label: 'Emergency', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', dot: 'bg-red-500', icon: <Zap className="w-3.5 h-3.5" />, desc: 'Immediate intervention' },
];

//Wizard steps for anew patient(Patients component) and existing Patient(PatientVisits component)
export const WIZARD_STEPS_FULL = ['Patient', 'Visit Info', 'Room & Doctor', 'Triage', 'Review'];
export const WIZARD_STEPS_NO_PATIENT = ['Visit Info', 'Room & Doctor', 'Triage', 'Review'];

// ─── Sub-components ────────────────────────────────────────────────────────────
export const WizardField = ({ label, required, hint, children }) => (
    <div>
        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && <p className="mt-1 text-[11px] italic text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
);

export const WizardCard = ({ icon, title, subtitle, accent = 'indigo', children }) => {
    const styles = {
        indigo: 'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-900/10',
        teal: 'border-teal-200 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-900/10',
        violet: 'border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-900/10',
        amber: 'border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-900/10',
        rose: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-900/10',
    };
    return (
        <div className={`rounded-2xl border p-5 ${styles[accent]}`}>
            <div className="flex items-start gap-3 mb-4">
                <div className={`p-2 rounded-xl ${styles[accent]}`}>{icon}</div>
                <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{title}</p>
                    {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
};

export const inputCls = "w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500";


// ══════════════════════════════════════════════════════════════════════════════
//  CREATE VISIT WIZARD [TO CREATE VISIT IN PatientVisits and Patients Component]
//  Props:
//    isOpen        - boolean
//    onClose       - fn
//    onSuccess     - fn(newVisit)
//    token         - string
//    patients      - array  (ignored when lockedPatient is provided)
//    rooms         - array
//    loadingRooms  - boolean
//    lockedPatient - object|null  → pre-selected patient, hides step 0
// ══════════════════════════════════════════════════════════════════════════════
export function CreateVisitWizard({ isOpen, onClose, onSuccess, token, patients = [], rooms = [], loadingRooms = false, lockedPatient = null }) {

    // When lockedPatient is provided we skip the "Patient" step entirely
    const WIZARD_STEPS = lockedPatient ? WIZARD_STEPS_NO_PATIENT : WIZARD_STEPS_FULL;

    const [step, setStep] = useState(0);
    const [submitting, setSub] = useState(false);

    const [form, setForm] = useState({
        patient_id: '', visit_category: '', request_origin: '',
        status: 'waiting', room_id: '', visit_reason: '',
        visit_date: new Date().toISOString().split('T')[0],
        assigned_doctor_id: '',
    });
    const [addTriage, setAddTriage] = useState(false);
    const [triage, setTriage] = useState({
        urgency_level: 'routine', chief_complaint: '',
        temperature: '', pulse_rate: '', oxygen_saturation: '',
        blood_pressure: '', respiratory_rate: '',
    });

    // Sync lockedPatient into form whenever it changes
    useEffect(() => {
        if (lockedPatient) {
            setForm(f => ({ ...f, patient_id: String(lockedPatient.id) }));
        }
    }, [lockedPatient]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setStep(0); setAddTriage(false);
            setForm({
                patient_id: lockedPatient ? String(lockedPatient.id) : '',
                visit_category: '', request_origin: '', status: 'waiting',
                room_id: '', visit_reason: '',
                visit_date: new Date().toISOString().split('T')[0],
                assigned_doctor_id: ''
            });
            setTriage({ urgency_level: 'routine', chief_complaint: '', temperature: '', pulse_rate: '', oxygen_saturation: '', blood_pressure: '', respiratory_rate: '' });
        }
    }, [isOpen, lockedPatient]);

    const effectivePatient = lockedPatient || patients.find(p => String(p.id) === String(form.patient_id));
    const selectedRoom = rooms.find(r => String(r.id) === String(form.room_id));
    const roomDoctors = selectedRoom?.doctors ?? [];
    const isOPD = form.visit_category === 'OPD';
    const isOthers = form.visit_category === 'Others';
    const selectedUrgency = URGENCY_LEVELS.find(u => u.value === triage.urgency_level);

    // Map logical step index to step name (accounts for skipped patient step)
    const currentStepName = WIZARD_STEPS[step];

    const canNext = (s) => {
        const name = WIZARD_STEPS[s];
        if (name === 'Patient') return !!form.patient_id;
        if (name === 'Visit Info') {
            if (!form.visit_category || !form.visit_date || !form.visit_reason.trim()) return false;
            if (isOthers && !form.request_origin) return false;
            return true;
        }
        if (name === 'Room & Doctor') return !!form.room_id;
        return true;
    };

    const goNext = () => {
        if (!canNext(step)) { toast.error('Please fill all required fields before proceeding.'); return; }
        setStep(s => Math.min(WIZARD_STEPS.length - 1, s + 1));
    };
    const goBack = () => setStep(s => Math.max(0, s - 1));

    //Function to register patient visit
    const handleSubmit = async () => {
        setSub(true);
        try {
            const payload = {
                patient_id: Number(form.patient_id),
                status: form.status,
                visit_category: form.visit_category,
                room_id: Number(form.room_id),
                visit_reason: form.visit_reason,
                visit_date: form.visit_date,
                ...(form.assigned_doctor_id && { assigned_doctor_id: Number(form.assigned_doctor_id) }),
                ...(isOthers && { request_origin: form.request_origin }),
                ...(addTriage && {
                    triage: Object.fromEntries(
                        Object.entries(triage).filter(([, v]) => v !== '' && v !== null)
                    ),
                }),
            };
            const res = await axios.post(
                `${API_BASE_URL}patient/registerPatientVisit`, payload,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success('Patient visit registered successfully');
            onSuccess?.(res.data?.visit ?? res.data?.data);
            onClose();
        } catch (err) {
            const data = err.response?.data;

            if (data?.errors) {
                // Flatten all validation error arrays into one readable list
                const messages = Object.entries(data.errors)
                    .map(([field, msgs]) => {
                        // Convert "triage.chief_complaint" → "Chief Complaint"
                        const label = field
                            .replace('triage.', '')
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, c => c.toUpperCase());
                        return `${label}: ${Array.isArray(msgs) ? msgs[0] : msgs}`;
                    });

                // Show each error as its own toast
                messages.forEach(msg => toast.error(msg, { autoClose: 6000 }));

            } else {
                // Generic fallback
                toast.error(data?.message || 'Failed to register visit');
            }

            console.error('Visit registration errors:', data?.errors ?? err);
        } finally {
            setSub(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[95vh] flex flex-col rounded-2xl shadow-2xl
                bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">

                {/* Header */}
                <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-indigo-600 to-violet-600 flex-shrink-0">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5" />
                                {lockedPatient
                                    ? `Register Visit — ${lockedPatient.name}`
                                    : 'Register New Patient Visit'}
                            </h2>
                            <p className="text-indigo-200 text-xs mt-0.5">
                                Step {step + 1} of {WIZARD_STEPS.length} — <span className="font-semibold">{currentStepName}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }} />
                    </div>

                    {/* Locked patient pill */}
                    {lockedPatient && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 w-fit">
                            <User className="w-3.5 h-3.5 text-white/80" />
                            <span className="text-xs font-semibold text-white">{lockedPatient.name}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        </div>
                    )}

                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                        {WIZARD_STEPS.map((s, i) => (
                            <span key={i} className={`
                                flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors
                                ${i === step ? 'bg-white text-indigo-700' : i < step ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50'}
                            `}>
                                {i < step ? '✓ ' : ''}{s}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Step: Patient (only shown when no lockedPatient) */}
                    {currentStepName === 'Patient' && (
                        <WizardCard icon={<User className="w-4 h-4 text-indigo-600" />} title="Patient Selection" subtitle="Search and select the patient for this visit" accent="indigo">
                            <WizardField label="Patient" required hint="Search by name, phone or address">
                                <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className={inputCls}>
                                    <option value="">— Select a patient —</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} — {p.phone_number}{p.address ? ` — ${p.address}` : ''}</option>
                                    ))}
                                </select>
                            </WizardField>
                            {effectivePatient && (
                                <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {effectivePatient.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm text-gray-800 dark:text-white">{effectivePatient.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{effectivePatient.phone_number}</p>
                                    </div>
                                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                </div>
                            )}
                        </WizardCard>
                    )}

                    {/* Step: Visit Info */}
                    {currentStepName === 'Visit Info' && (
                        <div className="space-y-5">
                            <WizardCard icon={<FileText className="w-4 h-4 text-teal-600" />} title="Visit Category" subtitle="Select the type of visit" accent="teal">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'OPD', longLabel: 'OPD — Outpatient', icon: <Stethoscope className="w-5 h-5" />, desc: 'General consultation, doctor-led', color: 'indigo' },
                                        { value: 'Others', longLabel: 'Others — Services/departments', icon: <FlaskConical className="w-5 h-5" />, desc: 'Lab, pharmacy, radiology, etc.', color: 'teal' },
                                    ].map(cat => (
                                        <button key={cat.value} type="button"
                                            onClick={() => setForm({ ...form, visit_category: cat.value, request_origin: '' })}
                                            className={`relative p-4 rounded-xl border-2 text-left transition-all
                                                ${form.visit_category === cat.value
                                                    ? `border-${cat.color}-400 bg-${cat.color}-50 dark:bg-${cat.color}-900/20 shadow-md`
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800/50'}`}
                                        >
                                            <div className={`mb-2 ${form.visit_category === cat.value ? `text-${cat.color}-600 dark:text-${cat.color}-400` : 'text-gray-400'}`}>{cat.icon}</div>
                                            <p className={`font-bold text-sm ${form.visit_category === cat.value ? `text-${cat.color}-700 dark:text-${cat.color}-300` : 'text-gray-700 dark:text-gray-200'}`}>{cat.longLabel}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.desc}</p>
                                            {form.visit_category === cat.value && <CheckCircle2 className={`absolute top-3 right-3 w-4 h-4 text-${cat.color}-500`} />}
                                        </button>
                                    ))}
                                </div>
                            </WizardCard>

                            {isOthers && (
                                <WizardCard icon={<ArrowRight className="w-4 h-4 text-violet-600" />} title="Request Origin" subtitle="Who initiated this service request?" accent="violet">
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { value: 'self_request', label: 'Self Request', icon: <User className="w-4 h-4" />, desc: 'Patient requested directly' },
                                            { value: 'doctor_request', label: 'Doctor Referral', icon: <UserCheck className="w-4 h-4" />, desc: 'Referred by a clinician' },
                                        ].map(orig => (
                                            <button key={orig.value} type="button"
                                                onClick={() => setForm({ ...form, request_origin: orig.value })}
                                                className={`relative p-4 rounded-xl border-2 text-left transition-all
                                                    ${form.request_origin === orig.value
                                                        ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-md'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800/50'}`}
                                            >
                                                <div className={`mb-2 ${form.request_origin === orig.value ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'}`}>{orig.icon}</div>
                                                <p className={`font-bold text-sm ${form.request_origin === orig.value ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-200'}`}>{orig.label}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{orig.desc}</p>
                                                {form.request_origin === orig.value && <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-violet-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </WizardCard>
                            )}

                            <WizardCard icon={<Clock className="w-4 h-4 text-amber-600" />} title="Visit Details" subtitle="Date, status and reason for this visit" accent="amber">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <WizardField label="Visit Date" required>
                                            <input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} className={inputCls} />
                                        </WizardField>
                                        <WizardField label="Status">
                                            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                                                <option value="waiting">Waiting</option>
                                                <option value="ongoing">Ongoing</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </WizardField>
                                    </div>
                                    <WizardField label="Visit Reason" required>
                                        <textarea rows={3} value={form.visit_reason}
                                            onChange={e => setForm({ ...form, visit_reason: e.target.value })}
                                            placeholder={
                                                isOPD ? 'e.g. General consultation, follow-up…'
                                                    : form.request_origin === 'doctor_request' ? 'e.g. Doctor referred for scan, blood work…'
                                                        : 'e.g. Request for lab test, pharmacy refill…'
                                            }
                                            className={`${inputCls} resize-none`} />
                                    </WizardField>
                                </div>
                            </WizardCard>
                        </div>
                    )}

                    {/* Step: Room & Doctor */}
                    {currentStepName === 'Room & Doctor' && (
                        <div className="space-y-5">
                            <WizardCard icon={<DoorOpen className="w-4 h-4 text-indigo-600" />} title="Room Assignment" subtitle="Select the consultation or service room" accent="indigo">
                                <WizardField label="Room" required hint="Selecting a room will reveal doctors assigned to it">
                                    {loadingRooms ? (
                                        <div className="flex items-center gap-2 py-3 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading rooms…</div>
                                    ) : (
                                        <select value={form.room_id}
                                            onChange={e => setForm({ ...form, room_id: e.target.value, assigned_doctor_id: '' })}
                                            className={inputCls}>
                                            <option value="">— Select a room —</option>
                                            {rooms.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.room_name} ({r.room_number})
                                                    {r.doctors?.length > 0 ? ` · ${r.doctors.length} doctor${r.doctors.length > 1 ? 's' : ''}` : ' · No doctors'}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </WizardField>
                                {selectedRoom && (
                                    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                                        <BedDouble className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                        <div className="flex-1">
                                            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{selectedRoom.room_name}</span>
                                            <span className="mx-1.5 text-gray-300">·</span>
                                            <span className="text-xs text-gray-400">{selectedRoom.room_number}</span>
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                                            ${selectedRoom.status === 'available'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                            {selectedRoom.status}
                                        </span>
                                    </div>
                                )}
                            </WizardCard>

                            {selectedRoom && (
                                <WizardCard
                                    icon={<Stethoscope className="w-4 h-4 text-teal-600" />}
                                    title="Assign Doctor (Optional)"
                                    subtitle={roomDoctors.length > 0
                                        ? `${roomDoctors.length} doctor${roomDoctors.length > 1 ? 's' : ''} currently in ${selectedRoom.room_name}`
                                        : `No doctors assigned to ${selectedRoom.room_name}`}
                                    accent="teal"
                                >
                                    {roomDoctors.length === 0 ? (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                            <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                            <p className="text-xs text-amber-700 dark:text-amber-300">No doctors in this room. You can proceed without assigning one.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <button type="button"
                                                onClick={() => setForm({ ...form, assigned_doctor_id: '' })}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                                                    ${!form.assigned_doctor_id
                                                        ? 'border-gray-400 bg-gray-50 dark:bg-gray-800'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800/50'}`}
                                            >
                                                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No specific doctor</p>
                                                    <p className="text-xs text-gray-400">Skip doctor assignment</p>
                                                </div>
                                                {!form.assigned_doctor_id && <CheckCircle2 className="w-4 h-4 text-gray-400 ml-auto" />}
                                            </button>
                                            {roomDoctors.map(doc => (
                                                <button key={doc.id} type="button"
                                                    onClick={() => setForm({ ...form, assigned_doctor_id: String(doc.id) })}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                                                        ${String(form.assigned_doctor_id) === String(doc.id)
                                                            ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/20 shadow-md'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800/50'}`}
                                                >
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                                                        ${String(form.assigned_doctor_id) === String(doc.id)
                                                            ? 'bg-teal-600 text-white'
                                                            : 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'}`}>
                                                        {doc.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-semibold ${String(form.assigned_doctor_id) === String(doc.id) ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                                            Dr. {doc.name}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            Assigned {new Date(doc.pivot?.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    {String(form.assigned_doctor_id) === String(doc.id) && <CheckCircle2 className="w-4 h-4 text-teal-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </WizardCard>
                            )}
                        </div>
                    )}

                    {/* Step: Triage */}
                    {currentStepName === 'Triage' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-white">Add Triage Assessment</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Optional — record vital signs and clinical urgency</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setAddTriage(v => !v)}
                                    className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${addTriage ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${addTriage ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {addTriage && (
                                <>
                                    <WizardCard icon={<ShieldAlert className="w-4 h-4 text-rose-500" />} title="Urgency Level" subtitle="Select the clinical urgency of this patient" accent="rose">
                                        <div className="grid grid-cols-3 gap-3">
                                            {URGENCY_LEVELS.map(u => (
                                                <button key={u.value} type="button"
                                                    onClick={() => setTriage({ ...triage, urgency_level: u.value })}
                                                    className={`relative p-3 rounded-xl border-2 text-center transition-all
                                                        ${triage.urgency_level === u.value ? `${u.border} ${u.bg} shadow-md` : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300'}`}
                                                >
                                                    <div className={`flex justify-center mb-1.5 ${triage.urgency_level === u.value ? u.color : 'text-gray-400'}`}>{u.icon}</div>
                                                    <p className={`text-xs font-bold ${triage.urgency_level === u.value ? u.color : 'text-gray-600 dark:text-gray-300'}`}>{u.label}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{u.desc}</p>
                                                    {triage.urgency_level === u.value && <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${u.dot}`} />}
                                                </button>
                                            ))}
                                        </div>
                                    </WizardCard>
                                    <WizardCard icon={<FileText className="w-4 h-4 text-rose-500" />} title="Chief Complaint" subtitle="Primary presenting symptom" accent="teal">
                                        <WizardField label="Chief Complaint">
                                            <textarea rows={2} value={triage.chief_complaint}
                                                onChange={e => setTriage({ ...triage, chief_complaint: e.target.value })}
                                                placeholder="e.g. Severe headache for 2 days, chest pain on exertion…"
                                                className={`${inputCls} resize-none`} />
                                        </WizardField>
                                    </WizardCard>
                                    <WizardCard icon={<Activity className="w-4 h-4 text-rose-500" />} title="Vital Signs" subtitle="All vital fields are optional" accent="amber">
                                        <div className="grid grid-cols-2 gap-4">
                                            <WizardField label="Temperature (°C)" hint="Normal: 36.1–37.2°C">
                                                <div className="relative">
                                                    <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                                                    <input type="number" step="0.1" value={triage.temperature} onChange={e => setTriage({ ...triage, temperature: e.target.value })} placeholder="38.2" className={`${inputCls} pl-9`} />
                                                </div>
                                            </WizardField>
                                            <WizardField label="Pulse Rate (bpm)" hint="Normal: 60–100 bpm">
                                                <div className="relative">
                                                    <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                                                    <input type="number" value={triage.pulse_rate} onChange={e => setTriage({ ...triage, pulse_rate: e.target.value })} placeholder="95" className={`${inputCls} pl-9`} />
                                                </div>
                                            </WizardField>
                                            <WizardField label="O₂ Saturation (%)" hint="Normal: 95–100%">
                                                <div className="relative">
                                                    <Wind className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                                    <input type="number" value={triage.oxygen_saturation} onChange={e => setTriage({ ...triage, oxygen_saturation: e.target.value })} placeholder="98" className={`${inputCls} pl-9`} />
                                                </div>
                                            </WizardField>
                                            <WizardField label="Blood Pressure" hint="e.g. 120/80">
                                                <div className="relative">
                                                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                                                    <input type="text" value={triage.blood_pressure} onChange={e => setTriage({ ...triage, blood_pressure: e.target.value })} placeholder="120/80" className={`${inputCls} pl-9`} />
                                                </div>
                                            </WizardField>
                                            <WizardField label="Respiratory Rate" hint="breaths/min, Normal: 12–20">
                                                <div className="relative">
                                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
                                                    <input type="number" value={triage.respiratory_rate} onChange={e => setTriage({ ...triage, respiratory_rate: e.target.value })} placeholder="16" className={`${inputCls} pl-9`} />
                                                </div>
                                            </WizardField>
                                        </div>
                                    </WizardCard>
                                </>
                            )}
                            {!addTriage && (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                                    <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Triage not added — toggle above to include vitals</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Review */}
                    {currentStepName === 'Review' && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="bg-gray-50 dark:bg-gray-800 px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Visit Summary</p>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {[
                                        { label: 'Patient', icon: <User className="w-3.5 h-3.5" />, value: effectivePatient?.name },
                                        { label: 'Category', icon: <FileText className="w-3.5 h-3.5" />, value: form.visit_category },
                                        ...(isOthers ? [{ label: 'Request Origin', icon: <ArrowRight className="w-3.5 h-3.5" />, value: form.request_origin?.replace('_', ' ') }] : []),
                                        { label: 'Visit Date', icon: <Clock className="w-3.5 h-3.5" />, value: form.visit_date },
                                        { label: 'Status', icon: <CheckCircle2 className="w-3.5 h-3.5" />, value: form.status },
                                        { label: 'Room', icon: <DoorOpen className="w-3.5 h-3.5" />, value: selectedRoom ? `${selectedRoom.room_name} (${selectedRoom.room_number})` : '—' },
                                        { label: 'Doctor', icon: <Stethoscope className="w-3.5 h-3.5" />, value: form.assigned_doctor_id ? `Dr. ${roomDoctors.find(d => String(d.id) === String(form.assigned_doctor_id))?.name}` : 'Not assigned' },
                                        { label: 'Visit Reason', icon: <FileText className="w-3.5 h-3.5" />, value: form.visit_reason },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-start gap-3 px-5 py-3">
                                            <span className="text-indigo-400 mt-0.5 flex-shrink-0">{row.icon}</span>
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">{row.label}</span>
                                            <span className="text-sm text-gray-800 dark:text-gray-100 capitalize font-medium">{row.value || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {addTriage && (
                                <div className="rounded-2xl border border-rose-200 dark:border-rose-800 overflow-hidden">
                                    <div className="bg-rose-50 dark:bg-rose-900/20 px-5 py-3 border-b border-rose-200 dark:border-rose-800 flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                                        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Triage Summary</p>
                                        {selectedUrgency && (
                                            <span className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full ${selectedUrgency.bg} ${selectedUrgency.color} border ${selectedUrgency.border}`}>
                                                {selectedUrgency.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[
                                            { label: 'Chief Complaint', value: triage.chief_complaint },
                                            { label: 'Temperature', value: triage.temperature ? `${triage.temperature}°C` : null },
                                            { label: 'Pulse Rate', value: triage.pulse_rate ? `${triage.pulse_rate} bpm` : null },
                                            { label: 'O₂ Sat.', value: triage.oxygen_saturation ? `${triage.oxygen_saturation}%` : null },
                                            { label: 'Blood Pressure', value: triage.blood_pressure || null },
                                            { label: 'Resp. Rate', value: triage.respiratory_rate ? `${triage.respiratory_rate}/min` : null },
                                        ].filter(r => r.value).map((row, i) => (
                                            <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">{row.label}</span>
                                                <span className="text-sm text-gray-800 dark:text-gray-100 font-medium">{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                                <Building2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                    After registration, you'll be prompted to <strong>assign this visit to departments</strong> (e.g. Laboratory, Pharmacy, Radiology).
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer nav */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 flex items-center justify-between gap-3">
                    {step > 0 ? (
                        <button type="button" onClick={goBack}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300
                                bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                    ) : (
                        <button type="button" onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition">
                            Cancel
                        </button>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{step + 1} / {WIZARD_STEPS.length}</span>
                    {step < WIZARD_STEPS.length - 1 ? (
                        <button type="button" onClick={goNext} disabled={!canNext(step)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                                bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-indigo-200 dark:shadow-indigo-900/50">
                            Continue <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                                bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700
                                disabled:opacity-50 transition shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
                            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</> : <><CheckCircle2 className="w-4 h-4" /> Register Visit</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}