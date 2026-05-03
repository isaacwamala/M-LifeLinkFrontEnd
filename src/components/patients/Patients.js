import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, Plus, Edit2,
    HandCoins, X, User, Phone, ChevronRight, ChevronLeft,
    UserPlus, UserCheck, ArrowRight, CheckCircle2, ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchPatientCategories, fetchDoctors, fetchRoomsWithAssignedDoctors, fetchBasicPatientsInfoForDropDowns } from './patients_helper';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// ── Shared visit wizard ───────────────────────────────────────────────────────
import { CreateVisitWizard } from './CreateVisitWizard';


// ══════════════════════════════════════════════════════════════════════════════
//  ENTRY-POINT CHOOSER MODAL
// ══════════════════════════════════════════════════════════════════════════════
function PatientTypeChooser({ isOpen, onClose, onChooseNew, onChooseExisting }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
                <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Add Patient Visit</h2>
                        <p className="text-blue-200 text-xs mt-0.5">Is this a new or existing patient?</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 grid grid-cols-1 gap-3">
                    <button onClick={onChooseNew}
                        className="group flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20
                            hover:border-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-left">
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                            <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">New Patient</p>
                            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Register the patient first, then create their visit</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button onClick={onChooseExisting}
                        className="group flex items-center gap-4 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20
                            hover:border-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all text-left">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                            <UserCheck className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-blue-700 dark:text-blue-300 text-sm">Existing Patient</p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">Search for a registered patient and create their visit</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
//  VISIT CREATED SUCCESS DRAWER
//  Simple confirmation shown after wizard completes.
//  Full visit management (departments, triage, etc.) stays in Patient Visits.
// ══════════════════════════════════════════════════════════════════════════════
function VisitCreatedDrawer({ isOpen, onClose, visit, patientName, onGoToVisits }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
                style={{ animation: 'slideUp 0.25s ease-out' }}>

                {/* Success banner */}
                <div className="px-6 py-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Visit Registered!</h2>
                    <p className="text-emerald-100 text-sm mt-1">
                        {patientName
                            ? <><strong>{patientName}</strong>'s visit has been created successfully.</>
                            : 'Patient visit created successfully.'}
                    </p>
                </div>

                {/* Visit summary */}
                {visit && (
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                        {[
                            { label: 'Visit No.', value: visit.visit_number },
                            { label: 'Category', value: visit.visit_category ?? visit.visit_type },
                            { label: 'Date', value: visit.visit_date },
                            { label: 'Status', value: visit.status },
                        ].filter(r => r.value).map((row, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 dark:text-gray-500 font-medium">{row.label}</span>
                                <span className="text-gray-800 dark:text-gray-100 font-semibold capitalize">{row.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Hint */}
                <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300 text-center leading-relaxed">
                        To assign departments, add triage, examinations or manage this visit fully — use the <strong>Patient Visits</strong> page.
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onGoToVisits}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
                    >
                        View Created Visit in Patient Visits
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300
                            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        Done, stay here
                    </button>
                </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PATIENTS COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function Patients() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    // ── Patient list state ─────────────────────────────────────────────────────
    const [patients, setPatients] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [dateFrom, setDateFrom] = useState(null);
    const [dateTo, setDateTo] = useState(null);

    // ── Reference data ─────────────────────────────────────────────────────────
    const [patientCategories, setPatientCategories] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [allPatientsForDropdown, setAllPatientsForDropdown] = useState([]);

    // ── Patient registration modal ─────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '', nin: '', dob: '', gender: '', patient_category_id: '', branch_id: '', admission_date: '',
        nationality: '', email: '', phone_number: '', occupation: '', marital_status: '',
        insurance_number: '', insurance_provider: '', is_insured: '',
        address: '', residence: '', subcounty: '', district: '',
        emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
        emergency_contact_address: '', status: '',
    });

    // ── Visit creation state ───────────────────────────────────────────────────
    const [isChooserOpen, setIsChooserOpen] = useState(false);
    const [isVisitWizardOpen, setIsVisitWizardOpen] = useState(false);
    const [isLockedWizardOpen, setIsLockedWizardOpen] = useState(false);
    const [lockedPatient, setLockedPatient] = useState(null);

    // ── Success drawer ─────────────────────────────────────────────────────────
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [successVisit, setSuccessVisit] = useState(null);
    const [successPatientName, setSuccessPatientName] = useState('');

    // ── Globa stats for patients ─────────────────────────────────────────────────────────
    const [stats, setStats] = useState({ total: 0, male: 0, female: 0, other: 0 });

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchAllPatients = async (page = 1, search = searchTerm) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}patient/getRegisteredPatients`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: {
                    page,
                    search: search || null,
                    ...(dateFrom ? { from_date: dateFrom } : {}),
                    ...(dateTo ? { to_date: dateTo } : {}),
                },
            });
            const data = response.data.patients;
            setPatients(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);

            // ── Global stats ──────────────────────────────────────────
            if (response.data.stats) setStats(response.data.stats);

        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadReferenceData = async () => {
        setLoadingRooms(true);
        const [cats, rms, allPats] = await Promise.all([
            fetchPatientCategories(token),
            fetchRoomsWithAssignedDoctors(token).catch(() => []),
            fetchBasicPatientsInfoForDropDowns(token).catch(() => []),
        ]);
        setPatientCategories(cats);
        setRooms(rms);
        setAllPatientsForDropdown(allPats);
        setLoadingRooms(false);
    };

    useEffect(() => {
        const t = setTimeout(() => fetchAllPatients(1, searchTerm), 500);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        fetchAllPatients(1, searchTerm);
        loadReferenceData();
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => fetchAllPatients(1, searchTerm);
    const resetFilters = () => { setDateFrom(null); setDateTo(null); fetchAllPatients(1, searchTerm); };

    // ── Patient form helpers ───────────────────────────────────────────────────
    const openModal = (patient = null) => {
        if (patient) {
            setEditingPatient(patient);
            setFormData({
                patient_id: patient.id,
                name: patient.name || '', nin: patient.nin || '', dob: patient.dob || '',
                gender: patient.gender || '', patient_category_id: patient.patient_category_id?.toString() || '',
                branch_id: patient.branch_id?.toString() || '', admission_date: patient.admission_date || '',
                nationality: patient.nationality || '', email: patient.email || '',
                phone_number: patient.phone_number || '', occupation: patient.occupation || '',
                marital_status: patient.marital_status || '', insurance_number: patient.insurance_number || '',
                insurance_provider: patient.insurance_provider || '', is_insured: patient.is_insured ?? '',
                address: patient.address || '', residence: patient.residence || '',
                subcounty: patient.subcounty || '', district: patient.district || '',
                emergency_contact_name: patient.emergency_contact_name || '',
                emergency_contact_phone: patient.emergency_contact_phone || '',
                emergency_contact_relationship: patient.emergency_contact_relationship || '',
                emergency_contact_address: patient.emergency_contact_address || '', status: patient.status || '',
            });
        } else {
            setEditingPatient(null);
            setFormData({
                name: '', nin: '', dob: '', gender: '', patient_category_id: '', branch_id: '', admission_date: '',
                nationality: '', email: '', phone_number: '', occupation: '', marital_status: '',
                insurance_number: '', insurance_provider: '', is_insured: '',
                address: '', residence: '', subcounty: '', district: '',
                emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
                emergency_contact_address: '', status: '',
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingPatient(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
            is_insured: formData.is_insured === '' ? null : Number(formData.is_insured),
            patient_category_id: formData.patient_category_id || null,
        };

        const url = editingPatient
            ? `${API_BASE_URL}patient/updatePatient`
            : `${API_BASE_URL}patient/registerPatient`;

        try {
            const res = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });

            toast.success(editingPatient ? 'Patient updated successfully' : 'Patient registered successfully');

            if (!editingPatient) {
                // New patient → close form, then open locked visit wizard
                const newPatient = res.data?.patient ?? res.data?.data ?? {
                    id: res.data?.id,
                    name: formData.name,
                    phone_number: formData.phone_number,
                };
                closeModal();
                fetchAllPatients(1);
                setTimeout(() => {
                    setLockedPatient(newPatient);
                    setIsLockedWizardOpen(true);
                }, 300);
            } else {
                fetchAllPatients(1);
                closeModal();
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Chooser handlers ───────────────────────────────────────────────────────
    const handleChooseNew = () => { setIsChooserOpen(false); openModal(); };
    const handleChooseExisting = () => { setIsChooserOpen(false); setLockedPatient(null); setIsVisitWizardOpen(true); };

    // ── After visit wizard completes → show success drawer ────────────────────
    const handleVisitCreated = (newVisit) => {
        if (!newVisit) return;
        const patName = lockedPatient?.name ?? newVisit?.patient?.name ?? '';
        setTimeout(() => {
            setSuccessVisit(newVisit);
            setSuccessPatientName(patName);
            setLockedPatient(null);
            setIsSuccessOpen(true);
        }, 300);
    };

    // ── Misc helpers ───────────────────────────────────────────────────────────
    const toggleRow = (id) => {
        const s = new Set(expandedRows);
        s.has(id) ? s.delete(id) : s.add(id);
        setExpandedRows(s);
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <>
            <ToastContainer />

            {/* Chooser: New vs Existing */}
            <PatientTypeChooser
                isOpen={isChooserOpen}
                onClose={() => setIsChooserOpen(false)}
                onChooseNew={handleChooseNew}
                onChooseExisting={handleChooseExisting}
            />

            {/* Wizard: existing patient (includes patient-search step) */}
            <CreateVisitWizard
                isOpen={isVisitWizardOpen}
                onClose={() => setIsVisitWizardOpen(false)}
                token={token}
                patients={allPatientsForDropdown}
                rooms={rooms}
                loadingRooms={loadingRooms}
                onSuccess={handleVisitCreated}
            />

            {/* Wizard: new patient (patient pre-locked, no search step) */}
            <CreateVisitWizard
                isOpen={isLockedWizardOpen}
                onClose={() => { setIsLockedWizardOpen(false); setLockedPatient(null); }}
                token={token}
                patients={[]}
                rooms={rooms}
                loadingRooms={loadingRooms}
                lockedPatient={lockedPatient}
                onSuccess={handleVisitCreated}
            />

            {/* Success drawer — shown after either wizard finishes */}
            <VisitCreatedDrawer
                isOpen={isSuccessOpen}
                onClose={() => { setIsSuccessOpen(false); setSuccessVisit(null); }}
                visit={successVisit}
                patientName={successPatientName}
                onGoToVisits={() => {
                    setIsSuccessOpen(false);
                    navigate('/patient_visits');
                }}
            />

            {/* ══ MAIN TABLE ══ */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-5">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                                Manage Registered Patients
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Patients displayed are those registered in this current month ({new Date().toLocaleString('default', { month: 'long' })}) of {new Date().getFullYear()}.
                            Adjust the filters above to view patients from other periods.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => openModal()}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg transition-colors shadow text-sm font-semibold">
                            <UserPlus className="w-4 h-4" /> Register New Patient
                        </button>
                        <button onClick={() => setIsChooserOpen(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors shadow text-sm font-semibold">
                            <Plus className="w-4 h-4" /> Add Patient Visit
                        </button>
                    </div>
                </div>

                {/* ══ STATS CARDS ══ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                    {[
                        {
                            label: 'Total Patients',
                            value: stats.total,
                            icon: <User className="w-5 h-5" />,
                            bg: 'from-blue-500 to-indigo-600',
                            light: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                            text: 'text-blue-700 dark:text-blue-300',
                            sub: 'text-blue-500 dark:text-blue-400',
                            iconBg: 'bg-blue-600',
                        },
                        {
                            label: 'Male Patients',
                            value: stats.male,
                            icon: (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="10" cy="14" r="5" /><path d="M19 5l-5.5 5.5M19 5h-4M19 5v4" />
                                </svg>
                            ),
                            bg: 'from-sky-500 to-cyan-600',
                            light: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800',
                            text: 'text-sky-700 dark:text-sky-300',
                            sub: 'text-sky-500 dark:text-sky-400',
                            iconBg: 'bg-sky-600',
                        },
                        {
                            label: 'Female Patients',
                            value: stats.female,
                            icon: (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="8" r="5" /><path d="M12 13v8M9 18h6" />
                                </svg>
                            ),
                            bg: 'from-pink-500 to-rose-600',
                            light: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
                            text: 'text-pink-700 dark:text-pink-300',
                            sub: 'text-pink-500 dark:text-pink-400',
                            iconBg: 'bg-pink-500',
                        },
                        {
                            label: 'Other / Unspecified',
                            value: stats.other,
                            icon: <UserCheck className="w-5 h-5" />,
                            bg: 'from-violet-500 to-purple-600',
                            light: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
                            text: 'text-violet-700 dark:text-violet-300',
                            sub: 'text-violet-500 dark:text-violet-400',
                            iconBg: 'bg-violet-600',
                        },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className={`relative rounded-xl border p-4 flex items-center gap-4 overflow-hidden ${card.light}`}
                        >
                            {/* Icon */}
                            <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center text-white flex-shrink-0 shadow-md`}>
                                {card.icon}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium uppercase tracking-wide truncate ${card.sub}`}>
                                    {card.label}
                                </p>
                                {loading ? (
                                    <Skeleton width={60} height={28} />
                                ) : (
                                    <p className={`text-2xl font-extrabold leading-tight ${card.text}`}>
                                        {card.value.toLocaleString()}
                                    </p>
                                )}
                                {/* Mini percentage bar */}
                                {!loading && stats.total > 0 && card.label !== 'Total Patients' && (
                                    <div className="mt-1.5 h-1 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${card.bg} transition-all duration-700`}
                                            style={{ width: `${Math.round((card.value / stats.total) * 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Subtle bg glow */}
                            <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-gradient-to-br ${card.bg} opacity-10`} />
                        </div>
                    ))}
                </div>


                {/* Filters */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="text" placeholder="Search patients..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="date" value={dateFrom || ''} onChange={e => setDateFrom(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="date" value={dateTo || ''} onChange={e => setDateTo(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <button onClick={applyDateFilter} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                                <Filter className="w-4 h-4" /> Apply
                            </button>
                            <button onClick={resetFilters} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 font-bold border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {['Patient No', 'Name', 'Gender', 'Phone', 'Branch', 'Registered On', 'Actions', 'More'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs text-gray-500 font-bold dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-6 py-4"><Skeleton /></td>)}</tr>
                                ))
                            ) : patients.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No patients found matching your criteria
                                    </td>
                                </tr>
                            ) : (
                                patients.map(patient => (
                                    <React.Fragment key={patient.patient_number}>
                                        <tr onClick={() => toggleRow(patient.patient_number)}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
                                            <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{patient.patient_number}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{patient.name}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 capitalize">{patient.gender}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{patient.phone_number ?? 'N/A'}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{patient.branch_name}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{formatDate(patient.created_at)}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={e => { e.stopPropagation(); toggleRow(patient.patient_number); }}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                    {expandedRows.has(patient.patient_number) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={e => { e.stopPropagation(); openModal(patient); }}
                                                    className="text-blue-400 hover:text-blue-300 transition-colors" title="Edit patient">
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>

                                        {expandedRows.has(patient.patient_number) && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <User className="w-4 h-4 text-blue-600" /> Personal Details
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>DOB:</strong> {patient.dob ?? 'N/A'}</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Nationality:</strong> {patient.nationality ?? 'N/A'}</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Email:</strong> {patient.email ?? 'N/A'}</p>
                                                        </div>
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <Phone className="w-4 h-4 text-blue-600" /> Emergency Contact
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Name:</strong> {patient.emergency_contact_name ?? 'N/A'}</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Phone:</strong> {patient.emergency_contact_phone ?? 'N/A'}</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Relationship:</strong> {patient.emergency_contact_relationship ?? 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-300">Showing {patients.length} of {totalPages} results</div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => fetchAllPatients(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">Page {currentPage} of {totalPages}</span>
                        <button onClick={() => fetchAllPatients(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>


            {/* ══ PATIENT REGISTRATION / EDIT MODAL ══ */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg">

                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {editingPatient ? 'Update Patient' : 'Register New Patient'}
                                </h2>
                                {!editingPatient && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        After registration, you'll be taken straight to creating their visit ✓
                                    </p>
                                )}
                            </div>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-8">
                            <section>
                                <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                                        <input type="text" required value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">National ID (NIN)</label>
                                        <input type="text" value={formData.nin}
                                            onChange={e => setFormData({ ...formData, nin: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
                                        <input type="date" value={formData.dob}
                                            onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                                        <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white">
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4">Admission Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Patient Category */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Patient Category
                                        </label>
                                        <select
                                            value={formData.patient_category_id}
                                            onChange={(e) => setFormData({ ...formData, patient_category_id: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select Category</option>
                                            {patientCategories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Admission Date</label>
                                        <input type="datetime-local" value={formData.admission_date}
                                            onChange={e => setFormData({ ...formData, admission_date: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4">Contact & Demographics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                                        <input type="text" value={formData.phone_number}
                                            onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                        <input type="email" value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Occupation</label>
                                        <input type="text" value={formData.occupation}
                                            onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Marital Status</label>
                                        <select value={formData.marital_status} onChange={e => setFormData({ ...formData, marital_status: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white">
                                            <option value="">Select</option>
                                            <option value="single">Single</option>
                                            <option value="married">Married</option>
                                            <option value="divorced">Divorced</option>
                                            <option value="widowed">Widowed</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4">Emergency Contact</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input placeholder="Contact Name" value={formData.emergency_contact_name}
                                        onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
                                    <input placeholder="Contact Phone" value={formData.emergency_contact_phone}
                                        onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white" />
                                </div>
                            </section>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <button type="button" onClick={closeModal}
                                    className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold disabled:opacity-60">
                                    {submitting ? 'Processing...' : editingPatient ? 'Update Patient' : 'Register & Create Visit →'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}