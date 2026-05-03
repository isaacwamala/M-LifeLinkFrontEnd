import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
    ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, Plus, Edit2, Trash2,
    HandCoins, X, User, Phone,
    ChevronRight, ChevronLeft, Building2, CheckCircle2, Clock, AlertCircle,
    Stethoscope, FlaskConical, Pill, Radiation, Scissors, ArrowRight,
    FileText, UserCheck, DoorOpen, Loader2, ShieldAlert, Zap, Circle, ShieldCheck,
    AlertTriangle, Thermometer, Heart, Activity, Wind, Hash, Info, BedDouble, BookOpen
} from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchProductsItems } from '../products/products_helper';
import { fetchDoctors, fetchRoomsWithAssignedDoctors } from './patients_helper';
import { fetchDepartments } from '../general/helpers';
import { toast, ToastContainer } from 'react-toastify';
import { fetchBasicPatientsInfoForDropDowns } from './patients_helper';
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

// ── Sub-components ─────────────────────────────────────────────────────────────
import { AddExaminationDrawer } from './patient_visit_sub_components/Addexaminationdrawer';
import { AssignVisitToWard } from './patient_visit_sub_components/AssignVisitToWard';
import { AddTriageToPatientVisit } from './patient_visit_sub_components/AddTriageToPatientVisit';
import { AssignVisitToDepartments } from './patient_visit_sub_components/AssignVisitToDepartments';
import { PatientExaminationHistory } from './patient_visit_sub_components/PatientExaminationHistory';
import { RejectOrApproveSelfRequestVisit } from './patient_visit_sub_components/RejectOrApproveSelfRequestVisit';
import { PatientWardAssignmentsHistory } from './patient_visit_sub_components/PatientWardAssignmentsHistory';
import { PatientTriagesHistory } from './patient_visit_sub_components/PatientTriagesHistory';

// ── Import CreateVisitWizard to support when creating patient visit ───────────────────────
import { CreateVisitWizard } from './CreateVisitWizard';

// ─── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
        waiting: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
        ongoing: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <AlertCircle className="w-3 h-3" /> },
        completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: <CheckCircle2 className="w-3 h-3" /> },
        triaged: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <ShieldAlert className="w-3 h-3" /> },
        admitted: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <BedDouble className="w-3 h-3" /> },
    };
    const cfg = map[status] ?? map.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
            {cfg.icon} {status}
        </span>
    );
};

// ─── Urgency badge (for triage panel) ─────────────────────────────────────────
const UrgencyBadge = ({ level }) => {
    const map = {
        routine: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' },
        urgent: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800', icon: AlertTriangle },
        emergency: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800', icon: Zap },
    };
    const s = map[level?.toLowerCase()] ?? map.routine;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${s.cls}`}>
            {Icon && <Icon className="w-3 h-3" />}
            {level ?? 'routine'}
        </span>
    );
};

// ─── Vital tile ────────────────────────────────────────────────────────────────
const VitalTile = ({ icon: Icon, label, value, unit, iconCls }) => (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCls}`}>
            <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-none mb-0.5">{label}</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-100 leading-tight truncate">
                {value ?? '—'}
                {unit && value && <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-0.5">{unit}</span>}
            </p>
        </div>
    </div>
);

// ─── Info row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">{label}</span>
        <span className="text-[11px] text-right text-gray-700 dark:text-gray-300 font-medium">{value || '—'}</span>
    </div>
);


// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PatientVisits COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function PatientVisit() {
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    const [visits, setPatientVisits] = useState([]);
    const [expandedRows, setExpanded] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const userRoleId = useSelector((state) => state.auth?.user?.data?.user?.role_id);
    const role = userRoleId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(startOfMonth);
    const [dateTo, setDateTo] = useState(endOfMonth);

    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [products, setProducts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    // ── Modal / drawer open states ─────────────────────────────────────────────
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingVisit, setEditingVisit] = useState(null);
    const [editSubmit, setEditSubmit] = useState(false);
    const [editForm, setEditForm] = useState({
        visit_id: null, patient_id: '', visit_type: '', status: '',
        visit_reason: '', visit_date: '', visit_start_time: '', visit_end_time: '', assigned_doctor_id: '',
    });

    // Examination drawer
    const [isExamOpen, setIsExamOpen] = useState(false);
    const [examVisit, setExamVisit] = useState(null);
    // Ward drawer
    const [isWardOpen, setIsWardOpen] = useState(false);
    const [wardVisit, setWardVisit] = useState(null);
    // Triage add drawer
    const [isTriageOpen, setIsTriageOpen] = useState(false);
    const [triageVisit, setTriageVisit] = useState(null);
    // Department assignment drawer  ← now a sub-component, minimal state here
    const [isDeptOpen, setIsDeptOpen] = useState(false);
    const [deptVisit, setDeptVisit] = useState(null);
    // Examination history card 
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyVisit, setHistoryVisit] = useState(null);
    // Reject/Approve Self request vsist
    const [isDecisionOpen, setIsDecisionOpen] = useState(false);
    const [decisionVisit, setDecisionVisit] = useState(null);
    // patient history ward assignments 
    const [isWardHistoryOpen, setIsWardHistoryOpen] = useState(false);
    const [wardHistoryVisit, setWardHistoryVisit] = useState(null);

    //triages history
    const [isTriagesOpen, setIsTriagesOpen] = useState(false);
    const [triagesVisit, setTriagesVisit] = useState(null);


    // Prescription modal
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
    const [activeVisit, setActiveVisit] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [prescriptionForm, setPrescriptionForm] = useState({
        prescription_source: 'direct', prescription_notes: '',
        prescription_date: new Date().toISOString().split('T')[0], items: [],
    });

    const legacyInputCls = "w-full rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm";

    // ── Data fetching for Patient Visits ──────────────────────────────────────────────────────────
    const fetchAllPatientVists = async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}patient/getPatientVisits`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { from_date: dateFrom, to_date: dateTo, page },
            });
            const data = res.data.visits;
            setPatientVisits(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);
        } catch (err) { console.error('Error fetching visits:', err); }
        finally { setLoading(false); }
    };

    const loadRooms = async () => {
        setLoadingRooms(true);
        const data = await fetchRoomsWithAssignedDoctors(token);
        setRooms(data);
        setLoadingRooms(false);
    };

    useEffect(() => {
        fetchAllPatientVists(1);
        fetchDoctors(token).then(setDoctors);
        fetchProductsItems(token).then(setProducts);
        fetchBasicPatientsInfoForDropDowns(token).then(setPatients);
        fetchDepartments(token).then(setDepartments);
        loadRooms();
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => fetchAllPatientVists(1);
    const resetFilters = () => { setDateFrom(startOfMonth); setDateTo(endOfMonth); fetchAllPatientVists(1); };

    const filteredVisits = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return visits.filter(v => {
            const matchSearch = !term
                || v.visit_number?.toLowerCase().includes(term)
                || v.patient?.name.toLowerCase().includes(term)
                || v.visit_created_by?.name.toLowerCase().includes(term);
            const d = new Date(v.visit_date);
            return matchSearch && (!dateFrom || d >= new Date(dateFrom)) && (!dateTo || d <= new Date(dateTo));
        });
    }, [visits, searchTerm, dateFrom, dateTo]);

    const toggleRow = (num) => {
        const s = new Set(expandedRows);
        s.has(num) ? s.delete(num) : s.add(num);
        setExpanded(s);
    };

    // ── Drawer openers ─────────────────────────────────────────────────────────
    const openDeptDrawer = (visit) => { setDeptVisit(visit); setIsDeptOpen(true); };
    const openExamDrawer = (visit) => { setExamVisit(visit); setIsExamOpen(true); };
    const openWardDrawer = (visit) => { setWardVisit(visit); setIsWardOpen(true); };
    const openTriageDrawer = (visit) => { setTriageVisit(visit); setIsTriageOpen(true); };

    // ── Edit visit ─────────────────────────────────────────────────────────────
    const openEditModal = (visit) => {
        setEditingVisit(visit);
        setEditForm({
            visit_id: visit.id, patient_id: visit.patient_id, visit_type: visit.visit_type ?? '',
            status: visit.status ?? '', visit_reason: visit.visit_reason ?? '',
            visit_date: visit.visit_date ?? '', visit_start_time: visit.visit_start_time ?? '',
            visit_end_time: visit.visit_end_time ?? '', assigned_doctor_id: visit.assigned_doctor_id ?? '',
        });
        setIsEditOpen(true);
    };

    //Opener for examination history card, it will be opened when we pass the patient id on specfic visit
    const openHistoryModal = (visit) => { setHistoryVisit(visit); setIsHistoryOpen(true); };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditSubmit(true);
        try {
            await axios.post(`${API_BASE_URL}patient/updatePatientVisit`,
                { ...editForm, assigned_doctor_id: editForm.assigned_doctor_id || null },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            toast.success('Patient Visit updated successfully');
            fetchAllPatientVists(1);
            setIsEditOpen(false);
        } catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
        finally { setEditSubmit(false); }
    };

    // ── Prescription helpers ───────────────────────────────────────────────────
    const openPrescriptionModal = (visit) => { setActiveVisit(visit); setIsPrescriptionOpen(true); };
    const addPrescriptionItem = () => setPrescriptionForm(p => ({ ...p, items: [...p.items, { drug_id: '', strength: '', instructions: '', quantity: null, duration_days: '' }] }));
    const updatePrescItem = (i, field, val) => { const items = [...prescriptionForm.items]; items[i][field] = val; setPrescriptionForm({ ...prescriptionForm, items }); };
    const removePrescItem = (i) => setPrescriptionForm({ ...prescriptionForm, items: prescriptionForm.items.filter((_, idx) => idx !== i) });

    //Submit prescription
    const submitPrescription = async () => {
        if (!activeVisit) return;
        for (let i = 0; i < prescriptionForm.items.length; i++) {
            const item = prescriptionForm.items[i];
            if (!item.drug_id) { toast.error(`Select a medicine for item ${i + 1}`); return; }
            if (!item.instructions?.trim()) { toast.error(`Provide instructions for item ${i + 1}`); return; }
            if (!item.duration_days || item.duration_days <= 0) { toast.error(`Provide valid duration for item ${i + 1}`); return; }
        }
        try {
            setIsSubmitting(true);
            const res = await axios.post(`${API_BASE_URL}sales/storePrescription`,
                { patient_visit_id: activeVisit.id, ...prescriptionForm },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            toast.success(res.data.message);
            setIsPrescriptionOpen(false);
            navigate('/medical/prescriptions');
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to create prescription'); }
        finally { setIsSubmitting(false); }
    };


    // ══════════════════════════════════════════════════════════════════════════
    return (
        <>
            <ToastContainer />

            {/* ── Create Visit Wizard ── */}
            <CreateVisitWizard
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                token={token}
                patients={patients}
                rooms={rooms}
                loadingRooms={loadingRooms}
                onSuccess={(newVisit) => {
                    fetchAllPatientVists(1);
                    if (newVisit) setTimeout(() => openDeptDrawer(newVisit), 400);
                }}
            />

            {/* ── Department Assignment Drawer (sub-component) ── */}
            <AssignVisitToDepartments
                isOpen={isDeptOpen}
                onClose={() => setIsDeptOpen(false)}
                visit={deptVisit}
                token={token}
                departments={departments}
                doctors={doctors}
                onSuccess={() => fetchAllPatientVists(currentPage)}
            />

            {/* ── Add Examination Drawer ── */}
            <AddExaminationDrawer
                isOpen={isExamOpen}
                onClose={() => setIsExamOpen(false)}
                visit={examVisit}
                token={token}
                onSuccess={() => fetchAllPatientVists(currentPage)}
            />

            {/* ── Assign to Ward Drawer ── */}
            <AssignVisitToWard
                isOpen={isWardOpen}
                onClose={() => setIsWardOpen(false)}
                visit={wardVisit}
                token={token}
                onSuccess={() => fetchAllPatientVists(currentPage)}
            />

            {/* ── Add Triage Drawer ── */}
            <AddTriageToPatientVisit
                isOpen={isTriageOpen}
                onClose={() => setIsTriageOpen(false)}
                visit={triageVisit}
                token={token}
                onSuccess={() => fetchAllPatientVists(currentPage)}
            />

            {/* Examination History Card */}
            <PatientExaminationHistory
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                visit={historyVisit}
                token={token}
            />

            {/* Reject-Approve Visit Drawer */}
            <RejectOrApproveSelfRequestVisit
                isOpen={isDecisionOpen}
                onClose={() => setIsDecisionOpen(false)}
                visit={decisionVisit}
                token={token}
                onSuccess={() => fetchAllPatientVists(currentPage)}
            />

            {/* Displaying modal to return patient ward assignments */}
            <PatientWardAssignmentsHistory
                isOpen={isWardHistoryOpen}
                onClose={() => setIsWardHistoryOpen(false)}
                visit={wardHistoryVisit}
                token={token}
            />

            {/* Display Triages History */}
            <PatientTriagesHistory
                isOpen={isTriagesOpen}
                onClose={() => setIsTriagesOpen(false)}
                visit={triagesVisit}
                token={token}
            />

            {/* Table to display patient visits */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-8 transition-colors border-gray-200 dark:border-gray-700 mt-5">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">Patient Visit Center</h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Visits displayed are those registered in this current month ({new Date().toLocaleString('default', { month: 'long' })}) of {new Date().getFullYear()}.
                            Adjust the filters to view visits from other periods.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow">
                        <Plus className="w-5 h-5" /> Add Patient Visit
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-4">
                        <div className="w-full relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="text" placeholder="Search patient visits within your selected date range filters…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <button onClick={applyDateFilter} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                                <Filter className="w-4 h-4" /> Apply
                            </button>
                            <button onClick={resetFilters} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                <RefreshCw className="w-4 h-4" /> Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {['Visit No', 'Patient Name', 'Visit Category', 'Visit Date', 'Branch', 'Assigned Doctor', 'Departments', 'More'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs text-gray-500 font-bold dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-6 py-4"><Skeleton /></td>)}</tr>)
                            ) : filteredVisits.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No visits found — try adjusting the filters</td></tr>
                            ) : (
                                filteredVisits.map(visit => (
                                    <React.Fragment key={visit.visit_number}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition cursor-pointer"
                                            onClick={() => toggleRow(visit.visit_number)}>
                                            <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{visit.visit_number}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.patient?.name}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 capitalize whitespace-nowrap">{visit.visit_category ?? visit.visit_type ?? '—'}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.visit_date}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.branch?.name ?? 'N/A'}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.assigned_doctor?.name ?? 'N/A'}</td>
                                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => openDeptDrawer(visit)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                        bg-indigo-50 text-indigo-700 hover:bg-indigo-100
                                                        dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition">
                                                    <Building2 className="w-3.5 h-3.5" /> Departments <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-gray-400 dark:text-gray-500 flex items-center justify-center">
                                                    {expandedRows.has(visit.visit_number) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </span>
                                            </td>
                                        </tr>

                                        {/* ══ EXPANDED ROW ══ */}
                                        {expandedRows.has(visit.visit_number) && (
                                            <tr>
                                                <td colSpan={8} className="p-0">
                                                    <div className="border-t border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60">
                                                        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-400 to-transparent opacity-50" />

                                                        <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-4">

                                                            {/* Col 1: Visit Info */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                                    </div>
                                                                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Visit Info</h4>
                                                                    <span className="ml-auto"><StatusBadge status={visit.status} /></span>
                                                                </div>
                                                                <div className="space-y-0">
                                                                    <InfoRow label="Visit No." value={<span className="font-mono text-blue-600 dark:text-blue-400">{visit.visit_number}</span>} />
                                                                    <InfoRow label="Type" value={<span className="capitalize">{visit.visit_category ?? visit.visit_type ?? '—'}</span>} />
                                                                    <InfoRow label="Date" value={visit.visit_date} />
                                                                    <InfoRow label="Start time" value={visit.visit_start_time ?? 'N/A'} />
                                                                    <InfoRow label="End time" value={visit.visit_end_time ?? 'Ongoing'} />
                                                                    <InfoRow label="Created by" value={visit.visit_created_by?.name} />
                                                                    {(visit.visit_type === 'Others' || visit.visit_category === 'Others') && visit.request_origin && (
                                                                        <InfoRow label="Origin" value={<span className="capitalize">{visit.request_origin.replace('_', ' ')}</span>} />
                                                                    )}
                                                                </div>
                                                                <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                                                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Visit Reason</p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{visit.visit_reason || '—'}</p>
                                                                </div>
                                                            </div>

                                                            {/* Col 2: Patient + Doctor + Action buttons */}
                                                            <div className="space-y-3">
                                                                {/* Patient */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <div className="w-6 h-6 rounded-md bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                                                            <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                                        </div>
                                                                        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Patient</h4>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                                                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                                                                {visit.patient?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PT'}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{visit.patient?.name}</p>
                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                                                                                <Phone className="w-3 h-3" />
                                                                                {visit.patient?.phone_number ?? 'No phone'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <InfoRow label="Branch" value={visit.branch?.name} />
                                                                </div>

                                                                {/* Assignment */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                                                                            <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                                                        </div>
                                                                        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Assignment</h4>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        {visit.room ? (
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                                                                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                                                        {visit.room?.room_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                                    </span>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{visit.room?.room_name}</p>
                                                                                    <p className="text-xs text-gray-400 dark:text-gray-500">Room</p>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No room assigned</p>
                                                                        )}
                                                                        {visit.assigned_doctor ? (
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                                                                                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                                                                                        {visit.assigned_doctor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                                    </span>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{visit.assigned_doctor.name}</p>
                                                                                    <p className="text-xs text-gray-400 dark:text-gray-500">Attending physician</p>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No doctor assigned</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Action buttons */}
                                                                {/* Add examination notes */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openExamDrawer(visit); }}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                        text-sm font-semibold text-white
                                                                        bg-gradient-to-r from-teal-600 to-emerald-600
                                                                        hover:from-teal-700 hover:to-emerald-700 transition shadow-md"
                                                                >
                                                                    <Stethoscope className="w-4 h-4" /> Add Examination Notes
                                                                </button>

                                                                {/* Assign to ward button */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openWardDrawer(visit); }}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                        text-sm font-semibold text-white
                                                                        bg-gradient-to-r from-blue-600 to-indigo-600
                                                                        hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
                                                                >
                                                                    <BedDouble className="w-4 h-4" /> Assign to Ward
                                                                </button>

                                                                {/* Add triage */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openTriageDrawer(visit); }}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                        text-sm font-semibold text-white
                                                                        bg-gradient-to-r from-orange-500 to-rose-500
                                                                        hover:from-orange-600 hover:to-rose-600 transition shadow-md"
                                                                >
                                                                    <ShieldAlert className="w-4 h-4" /> Add Triage
                                                                </button>

                                                                {/* Button to view examination history */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openHistoryModal(visit); }}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                    text-sm font-semibold text-white
                                                                    bg-gradient-to-r from-violet-600 to-indigo-600
                                                                    hover:from-violet-700 hover:to-indigo-700 transition shadow-md"
                                                                >
                                                                    <BookOpen className="w-4 h-4" /> View Patient Medical History
                                                                </button>

                                                                {/* View patient ward assignments*/}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setWardHistoryVisit(visit); setIsWardHistoryOpen(true); }}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                    text-sm font-semibold text-white
                                                                    bg-gradient-to-r from-green-800 to-indigo-800
                                                                    hover:from-green-700 hover:to-indigo-800 transition shadow-md"
                                                                >
                                                                    <BedDouble className="w-4 h-4" /> View Patient Ward History
                                                                </button>

                                                                {/* View patient triage history */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setTriagesVisit(visit); setIsTriagesOpen(true); }}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                    text-sm font-semibold text-white
                                                                    bg-gradient-to-r from-blue-500 to-indigo-800
                                                                    hover:from-blue-500 hover:to-indigo-800 transition shadow-md"
                                                                >
                                                                    <Activity className="w-4 h-4" /> View Patient Triage History
                                                                </button>

                                                                {/* Button to reject or approve patient visit, applies for only self request visits */}
                                                                {(visit.visit_category === 'Others' || visit.visit_type === 'Others') &&
                                                                    visit.request_origin === 'self_request' && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setDecisionVisit(visit); setIsDecisionOpen(true); }}
                                                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                             text-sm font-semibold text-white
                                                                             bg-gradient-to-r from-amber-500 to-orange-500
                                                                            hover:from-amber-600 hover:to-orange-600 transition shadow-md"
                                                                        >
                                                                            <ShieldCheck className="w-4 h-4" /> Approve / Reject Request
                                                                        </button>
                                                                    )}
                                                            </div>


                                                            {/* Col 3: Triage Info */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                                <div className="flex items-center justify-between gap-2 mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                                                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                                        </div>
                                                                        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Triage Info</h4>
                                                                    </div>
                                                                    {visit.triage && <UrgencyBadge level={visit.triage?.urgency_level} />}
                                                                </div>

                                                                {!visit.triage ? (
                                                                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                                                                        <Activity className="w-8 h-8 text-gray-200 dark:text-gray-700" />
                                                                        <p className="text-xs text-gray-400 dark:text-gray-500">No triage recorded yet</p>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                                                            <VitalTile icon={Activity} label="Blood Pressure" value={visit.triage.blood_pressure} unit="mmHg" iconCls="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" />
                                                                            <VitalTile icon={Thermometer} label="Temperature" value={visit.triage.temperature} unit="°C" iconCls="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />
                                                                            <VitalTile icon={Heart} label="Pulse Rate" value={visit.triage.pulse_rate} unit="bpm" iconCls="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" />
                                                                            <VitalTile icon={Wind} label="SpO₂" value={visit.triage.oxygen_saturation} unit="%" iconCls="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400" />
                                                                        </div>
                                                                        <div className="pt-2 border-t border-gray-50 dark:border-gray-800 space-y-0">
                                                                            <InfoRow label="Triaged by" value={visit.triage.triaged_by?.name} />
                                                                            <InfoRow label="Time" value={
                                                                                visit.triage.triage_date
                                                                                    ? new Date(visit.triage.triage_date).toLocaleString('en-UG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                                                    : null
                                                                            } />
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>

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
                    <div className="text-sm text-gray-500 dark:text-gray-300">Showing {filteredVisits.length} of {totalPages} results</div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => fetchAllPatientVists(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">Page {currentPage} of {totalPages}</span>
                        <button onClick={() => fetchAllPatientVists(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>


            {/* ══ EDIT VISIT MODAL ══ */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg bg-white dark:bg-gray-900">
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Update Patient Visit</h2>
                            <button onClick={() => setIsEditOpen(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Visit Type</label>
                                    <select value={editForm.visit_type} onChange={e => setEditForm({ ...editForm, visit_type: e.target.value })} className={legacyInputCls}>
                                        <option value="">Select</option>
                                        <option value="InPatient">In Patient</option>
                                        <option value="OutPatient">Out Patient</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Status</label>
                                    <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className={legacyInputCls}>
                                        <option value="waiting">Waiting</option>
                                        <option value="ongoing">Ongoing</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Assigned Doctor</label>
                                    <select value={editForm.assigned_doctor_id} onChange={e => setEditForm({ ...editForm, assigned_doctor_id: e.target.value })} className={legacyInputCls}>
                                        <option value="">Select Doctor</option>
                                        {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Visit Date</label>
                                    <input type="date" value={editForm.visit_date} onChange={e => setEditForm({ ...editForm, visit_date: e.target.value })} className={legacyInputCls} />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Start Time</label>
                                    <input type="time" value={editForm.visit_start_time} onChange={e => setEditForm({ ...editForm, visit_start_time: e.target.value })} className={legacyInputCls} />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">End Time</label>
                                    <input type="time" value={editForm.visit_end_time} onChange={e => setEditForm({ ...editForm, visit_end_time: e.target.value })} className={legacyInputCls} />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Visit Reason</label>
                                <textarea rows={3} value={editForm.visit_reason} onChange={e => setEditForm({ ...editForm, visit_reason: e.target.value })} className={`${legacyInputCls} resize-none`} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 transition">Cancel</button>
                                <button type="submit" disabled={editSubmit} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition text-sm">
                                    {editSubmit ? 'Saving…' : 'Update Visit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* ══ PRESCRIPTION MODAL ══ */}
            {isPrescriptionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 shadow-xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Medical Prescription</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Visit No: <span className="font-medium">{activeVisit?.visit_number}</span></p>
                            </div>
                            <button onClick={() => setIsPrescriptionOpen(false)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="px-6 py-6 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Source *</label>
                                    <select value={prescriptionForm.prescription_source} onChange={e => setPrescriptionForm({ ...prescriptionForm, prescription_source: e.target.value })} className={legacyInputCls}>
                                        <option value="direct">Direct</option>
                                        <option value="from_lab">From Lab</option>
                                        <option value="external">External</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Prescription Date *</label>
                                    <input type="date" value={prescriptionForm.prescription_date} onChange={e => setPrescriptionForm({ ...prescriptionForm, prescription_date: e.target.value })} className={legacyInputCls} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Prescription Notes</label>
                                <textarea rows={3} value={prescriptionForm.prescription_notes} onChange={e => setPrescriptionForm({ ...prescriptionForm, prescription_notes: e.target.value })}
                                    placeholder="Additional clinical instructions…" className={`${legacyInputCls} resize-none`} />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Prescribed Medicines</h3>
                                    <button onClick={addPrescriptionItem} className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700">
                                        <Plus className="w-4 h-4" /> Add medicine
                                    </button>
                                </div>
                                {prescriptionForm.items.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-6 text-center text-sm text-gray-500">No medicines added</div>
                                )}
                                {prescriptionForm.items.map((item, index) => (
                                    <div key={index} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-7 gap-4 bg-white dark:bg-gray-900">
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">Medicine *</label>
                                            <select value={item.drug_id || ''} onChange={e => updatePrescItem(index, 'drug_id', Number(e.target.value))} className={legacyInputCls}>
                                                <option value="">Select medicine</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.variant_options?.length ? ' — ' + p.variant_options.map(v => v.option_value).join(' / ') : ''}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">Strength</label>
                                            <input value={item.strength} onChange={e => updatePrescItem(index, 'strength', e.target.value)} className={legacyInputCls} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">Instructions</label>
                                            <input value={item.instructions} onChange={e => updatePrescItem(index, 'instructions', e.target.value)} className={legacyInputCls} />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">Duration Days</label>
                                            <input type="number" value={item.duration_days} onChange={e => updatePrescItem(index, 'duration_days', e.target.value)} className={legacyInputCls} />
                                        </div>
                                        <div className="flex items-end justify-center">
                                            <button onClick={() => removePrescItem(index)} className="mb-1 rounded-lg p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <button onClick={() => setIsPrescriptionOpen(false)} className="px-5 py-2 rounded-lg text-sm bg-gray-200 dark:bg-gray-700">Cancel</button>
                            <button disabled={isSubmitting} onClick={submitPrescription}
                                className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSubmitting ? <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" /> : 'Save Prescription'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </>
    );
}