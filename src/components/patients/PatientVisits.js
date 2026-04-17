import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
    ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, Plus, Edit2, Trash2,
    HandCoins, Package, X, User, Phone, MapPin, CreditCard, DollarSign, Hash,
    ChevronRight, ChevronLeft, Building2, CheckCircle2, Clock, AlertCircle,
    Stethoscope, FlaskConical, Pill, Radiation, Scissors, ArrowRight
} from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchProductsItems } from '../products/products_helper';
import { fetchDoctors } from './patients_helper';
import { fetchDepartments } from '../general/helpers';
import { toast, ToastContainer } from 'react-toastify';
import { fetchBasicPatientsInfoForDropDowns } from './patients_helper';
import { useNavigate } from "react-router-dom";


// ─── Status badge helper ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
        ongoing: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <AlertCircle className="w-3 h-3" /> },
        completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: <CheckCircle2 className="w-3 h-3" /> },
    };
    const cfg = map[status] ?? map.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
            {cfg.icon} {status}
        </span>
    );
};


export function PatientVisits() {
    const navigate = useNavigate();
    const [visits, setPatientVisits] = useState([]);
    const [paients, setPatients] = useState([]);
    const [products, setProducts] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVisit, setEditingVisit] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showAddPatient, setShowAddPatient] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [dateFrom, setDateFrom] = useState(startOfMonth);
    const [dateTo, setDateTo] = useState(endOfMonth);

    const initialFormData = {
        visit_id: null, patient_id: '', visit_type: '', status: '',
        visit_reason: '', visit_date: '', visit_start_time: '',
        visit_end_time: '', assigned_doctor_id: '',
    };
    const [formData, setFormData] = useState(initialFormData);

    // Prescription states
    const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
    const [activeVisit, setActiveVisit] = useState(null);
    const [prescriptionForm, setPrescriptionForm] = useState({
        prescription_source: 'direct',
        prescription_notes: '',
        prescription_date: new Date().toISOString().split('T')[0],
        items: [],
    });

    // ─── Department assignment states ──────────────────────────────────
    const [isDeptDrawerOpen, setIsDeptDrawerOpen] = useState(false);
    const [deptVisit, setDeptVisit] = useState(null);          // visit being assigned
    const [departments, setDepartments] = useState([]);         // all available departments
    const [deptAssignments, setDeptAssignments] = useState([]); // existing assignments for this visit
    const [deptLoadingAssignments, setDeptLoadingAssignments] = useState(false);
    const [deptForm, setDeptForm] = useState({
        department_id: '',
        assigned_to: '',
        notes: '',
    });
    const [deptSubmitting, setDeptSubmitting] = useState(false);

    //States for deleting the visit department assignment
    const [deletingAssignmentId, setDeletingAssignmentId] = useState(null);   // ID currently being deleted
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const [editingAssignmentId, setEditingAssignmentId] = useState(null);   // which card is in edit mode
    const [editDeptForm, setEditDeptForm] = useState({ department_id: '' }); // edit form state
    const [editSubmitting, setEditSubmitting] = useState(false);             // edit save loading

    // ─── Fetch departments list with make use of helper in general/helper.js ────────────────────────────────────────
    const loadDepartments = async () => {
        const data = await fetchDepartments(token);
        setDepartments(data);
    };

    // ─── Delete department assignment ─────────────────────────────────
    const handleDeleteAssignment = async (assignmentId) => {
        setDeletingAssignmentId(assignmentId);
        try {
            await axios.delete(
                `${API_BASE_URL}visitAssign/deleteVisitDepartmentAssignment/${assignmentId}`,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success('Department assignment removed successfully');
            setConfirmDeleteId(null);
            // Optimistically remove from list instantly, no need to re-fetch
            setDeptAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove assignment');
        } finally {
            setDeletingAssignmentId(null);
        }
    };

    // ─── Update department assignment (change assigned department) ────────────────
    const handleUpdateAssignment = async (assignmentId) => {
        if (!editDeptForm.department_id) {
            toast.error('Please select a department');
            return;
        }
        setEditSubmitting(true);
        try {
            await axios.post(
                `${API_BASE_URL}visitAssign/updateAssignedDepartmentOnVisit`,
                {
                    assignment_id: assignmentId,
                    department_id: Number(editDeptForm.department_id),
                },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success('Department updated successfully');
            setEditingAssignmentId(null);
            setEditDeptForm({ department_id: '' });

            // Optimistically update the list without re-fetching
            setDeptAssignments((prev) =>
                prev.map((a) =>
                    a.id === assignmentId
                        ? {
                            ...a,
                            department_id: Number(editDeptForm.department_id),
                            department: departments.find(
                                (d) => d.id === Number(editDeptForm.department_id)
                            ) ?? a.department,
                        }
                        : a
                )
            );
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update department');
        } finally {
            setEditSubmitting(false);
        }
    };



    // ─── Open department assignment drawer ────────────────────────────
    const openDeptDrawer = async (visit) => {
        setDeptVisit(visit);
        setDeptForm({ department_id: '', assigned_to: '', notes: '' });
        setIsDeptDrawerOpen(true);
        await loadVisitDeptAssignments(visit.id);
    };

    // ─── Fetch existing dept assignments for a visit ──────────────────
    //Get all departments linked to aspecific patient visit
    const loadVisitDeptAssignments = async (visitId) => {
        setDeptLoadingAssignments(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}visitAssign/getVisitDepartmentsAssignments`,
                {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                    params: { visit_id: visitId }, //pas the Visit ID selected
                }
            );
            //Update the state on component mount
            setDeptAssignments(res.data.data ?? []);
        } catch (err) {
            console.error('Error loading dept assignments:', err);
            setDeptAssignments([]);
        } finally {
            setDeptLoadingAssignments(false);
        }
    };

    // ─── Submit department assignment ─────────────────────────────────
    // This handles the assigning of the patient visit to a department, 
    // with optional staff assignment and notes
    const handleDeptAssign = async () => {
        if (!deptForm.department_id) {
            toast.error('Please select a department');
            return;
        }
        setDeptSubmitting(true);
        try {
            await axios.post(
                `${API_BASE_URL}visitAssign/assignVisitToDepartment`,
                {
                    visit_id: deptVisit.id,
                    department_id: Number(deptForm.department_id),
                    assigned_to: deptForm.assigned_to ? Number(deptForm.assigned_to) : null,
                    notes: deptForm.notes,
                },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success('Visit assigned to department successfully');
            setDeptForm({ department_id: '', assigned_to: '', notes: '' });
            // refresh assignments list
            await loadVisitDeptAssignments(deptVisit.id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to assign department');
        } finally {
            setDeptSubmitting(false);
        }
    };

    // ─── Dept icon helper ─────────────────────────────────────────────
    const deptIcon = (name = '') => {
        const n = name.toLowerCase();
        if (n.includes('lab')) return <FlaskConical className="w-4 h-4" />;
        if (n.includes('pharm')) return <Pill className="w-4 h-4" />;
        if (n.includes('surg')) return <Scissors className="w-4 h-4" />;
        if (n.includes('radio') || n.includes('imaging')) return <Radiation className="w-4 h-4" />;
        return <Stethoscope className="w-4 h-4" />;
    };


    // ─── Core data fetching ───────────────────────────────────────────
    const fetchAllPatientVists = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}patient/getPatientVisits`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { from_date: dateFrom, to_date: dateTo, page },
            });
            const data = response.data.visits;
            setPatientVisits(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);
        } catch (error) {
            console.error('Error fetching visits:', error);
        } finally {
            setLoading(false);
        }
    };

    //This will fetch all medical officers 
    const loadDoctors = async () => {
        const data = await fetchDoctors(token);
        setDoctors(data);
    };

    const loadProducts = async () => {
        const data = await fetchProductsItems(token);
        setProducts(data);
    };

    const loadBasicPatientsInfoForDropdown = async () => {
        const data = await fetchBasicPatientsInfoForDropDowns(token);
        setPatients(data);
    };

    useEffect(() => {
        fetchAllPatientVists(1);
        loadDoctors();
        loadProducts();
        loadBasicPatientsInfoForDropdown();
        loadDepartments();
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => fetchAllPatientVists(1);
    const resetFilters = () => { setDateFrom(startOfMonth); setDateTo(endOfMonth); fetchAllPatientVists(1); };

    const filteredPatientVisits = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return visits.filter((v) => {
            const matchesSearch = !term || v.visit_number?.toLowerCase().includes(term) ||
                v.patient?.name.toLowerCase().includes(term) || v.visit_created_by?.name.toLowerCase().includes(term);
            const visitDate = new Date(v.visit_date);
            return matchesSearch && (!dateFrom || visitDate >= new Date(dateFrom)) && (!dateTo || visitDate <= new Date(dateTo));
        });
    }, [visits, searchTerm, dateFrom, dateTo]);

    const toggleRow = (saleNumber) => {
        const newExpanded = new Set(expandedRows);
        newExpanded.has(saleNumber) ? newExpanded.delete(saleNumber) : newExpanded.add(saleNumber);
        setExpandedRows(newExpanded);
    };

    const openModal = (visit = null, patientId = null) => {
        if (visit) {
            setEditingVisit(visit);
            setFormData({
                visit_id: visit.id, patient_id: visit.patient_id, visit_type: visit.visit_type ?? '',
                status: visit.status ?? '', visit_reason: visit.visit_reason ?? '',
                visit_date: visit.visit_date ?? '', visit_start_time: visit.visit_start_time ?? '',
                visit_end_time: visit.visit_end_time ?? '', assigned_doctor_id: visit.assigned_doctor_id ?? '',
            });
        } else {
            setEditingVisit(null);
            setFormData({ ...initialFormData, patient_id: patientId ?? '', status: 'waiting', visit_date: new Date().toISOString().split('T')[0] });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingVisit(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const payload = { ...formData, assigned_doctor_id: formData.assigned_doctor_id || null, patient_id: formData.patient_id || null };
        const url = editingVisit ? `${API_BASE_URL}patient/updatePatientVisit` : `${API_BASE_URL}patient/registerPatientVisit`;
        try {
            const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            toast.success(editingVisit ? 'Patient Visit updated successfully' : 'Patient Visit registered successfully');
            fetchAllPatientVists(1);
            closeModal();

            // After NEW visit creation, prompt to assign departments
            if (!editingVisit) {
                const newVisit = res.data?.visit ?? res.data?.data;
                if (newVisit) {
                    setTimeout(() => openDeptDrawer(newVisit), 400);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    // Prescription helpers
    const openPrescriptionModal = (visit) => { setActiveVisit(visit); setIsPrescriptionModalOpen(true); };
    const addPrescriptionItem = () => setPrescriptionForm(prev => ({ ...prev, items: [...prev.items, { drug_id: '', strength: '', instructions: '', quantity: null, duration_days: '' }] }));
    const updatePrescriptionItem = (index, field, value) => { const items = [...prescriptionForm.items]; items[index][field] = value; setPrescriptionForm({ ...prescriptionForm, items }); };
    const removePrescriptionItem = (index) => setPrescriptionForm({ ...prescriptionForm, items: prescriptionForm.items.filter((_, i) => i !== index) });

    const submitPrescription = async () => {
        if (!activeVisit) return;
        for (let i = 0; i < prescriptionForm.items.length; i++) {
            const item = prescriptionForm.items[i];
            if (!item.drug_id) { toast.error(`Please select a medicine for item ${i + 1}`); return; }
            if (!item.instructions?.trim()) { toast.error(`Please provide instructions for item ${i + 1}`); return; }
            if (!item.duration_days || item.duration_days <= 0) { toast.error(`Please provide valid duration for item ${i + 1}`); return; }
        }
        const payload = { patient_visit_id: activeVisit.id, ...prescriptionForm };
        try {
            setIsSubmitting(true);
            const response = await axios.post(`${API_BASE_URL}sales/storePrescription`, payload, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            toast.success(response.data.message);
            setIsPrescriptionModalOpen(false);
            navigate('/medical/prescriptions');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create prescription');
        } finally {
            setIsSubmitting(false);
        }
    };


    // ─── Input class helper ───────────────────────────────────────────
    const inputCls = "w-full rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm";


    return (
        <>
            <ToastContainer />

            {/* ─────────────────── MAIN CARD ─────────────────── */}
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
                            Adjust the filters above to view patient visits made other periods.
                        </p>
                    </div>
                    <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow">
                        <Plus className="w-5 h-5" /> Add Patient Visit
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-4">
                        <div className="w-full relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="text" placeholder="Search patient visits..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
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
                        <thead className="bg-gray-50 dark:bg-gray-800 font-bold border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {["Visit No", "Patient Name", "Visit Type", "Visit Date", "Branch", "Assigned Doctor", "Departments", "More"].map((head) => (
                                    <th key={head} className="px-6 py-3 text-left text-xs text-gray-500 font-bold dark:text-gray-400 uppercase tracking-wider">{head}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                [1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="px-6 py-4"><Skeleton /></td>)}</tr>
                                ))
                            ) : filteredPatientVisits.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No Visits found, try adjusting the filter
                                    </td>
                                </tr>
                            ) : (
                                filteredPatientVisits.map((visit) => (
                                    <React.Fragment key={visit.visit_number}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{visit.visit_number}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{visit.patient?.name}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 capitalize">{visit.visit_type}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{visit.visit_date}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{visit.branch?.name ?? 'N/A'}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{visit.assigned_doctor?.name ?? 'N/A'}</td>

                                            {/* Departments column — shows count badge */}
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => openDeptDrawer(visit)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                        bg-indigo-50 text-indigo-700 hover:bg-indigo-100
                                                        dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition"
                                                >
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    Departments
                                                    <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </td>

                                            {/* ALL ACTIONS COMMENTED OUT WE SHALL, NOW EACH DEPARTMENT VISIT HAS ITS OWN ACTIONS */}

                                            {/* <td className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button onClick={() => openModal(visit)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Edit visit">
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/visits/${visit.id}/lab-tests/create`, { state: { visit } })}
                                                        className="flex items-center gap-1 text-green-600 hover:text-green-500 text-xs"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> Lab Test
                                                    </button>
                                                    <button onClick={() => openPrescriptionModal(visit)} className="flex items-center gap-1 text-purple-600 hover:text-purple-500 text-xs">
                                                        <Plus className="w-3.5 h-3.5" /> Prescription
                                                    </button>
                                                </div>
                                            </td> */}

                                            {/* Expand */}
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleRow(visit.visit_number)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                    {expandedRows.has(visit.visit_number) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded row */}
                                        {expandedRows.has(visit.visit_number) && (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <User className="w-4 h-4 text-blue-600" /> Visit Details
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Start time:</strong> {visit.visit_start_time ?? 'N/A'}</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>End time:</strong> {visit.visit_end_time ?? 'N/A'}</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Created by:</strong> {visit.visit_created_by?.name ?? 'N/A'}</p>
                                                        </div>
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <Phone className="w-4 h-4 text-blue-600" /> Visit Reason
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">{visit.visit_reason ?? 'N/A'}</p>
                                                            <h4 className="text-gray-900 dark:text-gray-100 mt-3 mb-1 text-sm font-semibold">Patient Phone</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">{visit.patient?.phone_number ?? 'N/A'}</p>
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
                    <div className="text-sm text-gray-500 dark:text-gray-300">Showing {filteredPatientVisits.length} of {totalPages} results</div>
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


            {/* ═══════════════════════════════════════════════════════════
                DEPARTMENT ASSIGNMENT DRAWER
            ═══════════════════════════════════════════════════════════ */}
            {isDeptDrawerOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => setIsDeptDrawerOpen(false)}
                    />

                    {/* Drawer panel — wider: max-w-5xl */}
                    <div className="fixed right-0 top-0 h-full w-full max-w-5xl z-50 flex flex-col
                   bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700
                     animate-slide-in-right">

                        {/* ── Drawer Header ── */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-indigo-600 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Building2 className="w-5 h-5" /> Assign this visit to department(s)
                                </h2>
                                <p className="text-indigo-200 text-xs mt-0.5">
                                    Visit: <span className="font-semibold">{deptVisit?.visit_number}</span>
                                    {deptVisit?.patient?.name && <> &mdash; {deptVisit.patient.name}</>}
                                </p>
                            </div>
                            <button onClick={() => setIsDeptDrawerOpen(false)}
                                className="rounded-full p-2 hover:bg-indigo-700 text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── Drawer Body — scrollable ── */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                            {/* ── Assign New Department Form ── */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-indigo-500" /> Assign to a Department
                                </h3>

                                {/* Two-column layout for the form */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Department select */}
                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Department *</label>
                                        <select
                                            value={deptForm.department_id}
                                            onChange={(e) => setDeptForm({ ...deptForm, department_id: e.target.value })}
                                            className={inputCls}
                                        >
                                            <option value="">Select department</option>
                                            {departments.map((dept) => (
                                                <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Assign to (user/staff) */}
                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Assign To (Staff)</label>
                                        <select
                                            value={deptForm.assigned_to}
                                            onChange={(e) => setDeptForm({ ...deptForm, assigned_to: e.target.value })}
                                            className={inputCls}
                                        >
                                            <option value="">Select staff member (optional)</option>
                                            {doctors.map((doc) => (
                                                <option key={doc.id} value={doc.id}>{doc.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Notes — spans both columns */}
                                    <div className="col-span-2">
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                                        <textarea
                                            rows={2}
                                            value={deptForm.notes}
                                            onChange={(e) => setDeptForm({ ...deptForm, notes: e.target.value })}
                                            placeholder="e.g. Priority blood test needed…"
                                            className={`${inputCls} resize-none`}
                                        />
                                    </div>

                                    {/* Submit — spans both columns */}
                                    <div className="col-span-2">
                                        <button
                                            onClick={handleDeptAssign}
                                            disabled={deptSubmitting}
                                            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium
                                    disabled:opacity-50 transition flex items-center justify-center gap-2"
                                        >
                                            {deptSubmitting ? (
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <><Building2 className="w-4 h-4" /> Assign Department</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Existing Assignments ── */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Current Assignments
                                    {deptAssignments.length > 0 && (
                                        <span className="ml-auto bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                                            {deptAssignments.length}
                                        </span>
                                    )}
                                </h3>

                                {deptLoadingAssignments ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3 bg-gray-50 dark:bg-gray-800 animate-pulse">
                                                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
                                                <div className="flex-1 space-y-2 pt-1">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="h-3.5 w-36 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                    </div>
                                                    <div className="h-3 w-48 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                    <div className="h-3 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : deptAssignments.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-8 text-center">
                                        <Building2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No departments assigned yet</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Use the form above to route this visit</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {deptAssignments.map((assignment) => (
                                            <div
                                                key={assignment.id}
                                                className="rounded-xl border border-gray-200 dark:border-gray-700
                                        bg-gray-50 dark:bg-gray-800 overflow-hidden"
                                            >
                                                {/* ── Main card row ── */}
                                                <div className="p-4 flex items-start gap-3">

                                                    {/* Dept icon */}
                                                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40
                                            flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        {deptIcon(assignment.department?.department_name)}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                                            <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                                                {assignment.department?.department_name ?? 'Unknown Department'}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <StatusBadge status={assignment.status} />

                                                                {/* Edit trigger */}
                                                                {confirmDeleteId !== assignment.id && editingAssignmentId !== assignment.id && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingAssignmentId(assignment.id);
                                                                            setEditDeptForm({ department_id: String(assignment.department_id) });
                                                                            setConfirmDeleteId(null);
                                                                        }}
                                                                        title="Change department"
                                                                        className="p-1 rounded-md text-gray-400 hover:text-indigo-500 hover:bg-indigo-50
                                                                dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-colors"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* Delete trigger */}
                                                                {confirmDeleteId !== assignment.id && editingAssignmentId !== assignment.id && (
                                                                    <button
                                                                        onClick={() => setConfirmDeleteId(assignment.id)}
                                                                        disabled={deletingAssignmentId === assignment.id}
                                                                        title="Remove assignment"
                                                                        className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50
                                                                dark:hover:bg-red-900/20 dark:hover:text-red-400
                                                                disabled:opacity-40 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {assignment.assigned_user && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                Assigned to: <span className="font-medium text-gray-700 dark:text-gray-300">{assignment.assigned_user.name}</span>
                                                            </p>
                                                        )}
                                                        {assignment.assigned_by && (
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                                By: {assignment.assigned_by.name} &bull; {new Date(assignment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                        {assignment.notes && (
                                                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 italic bg-white dark:bg-gray-900 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                                                                "{assignment.notes}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ── Department action buttons ──────────────────────────────────
                                                Rendered based on department_type slug.
                                                deptVisit carries the full visit object so we always have
                                                visit.id and the visit object itself for navigation state.
                                                 ── */}
                                                {!editingAssignmentId && !confirmDeleteId && (
                                                    <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">

                                                        {/* LAB actions — only when slug === 'lab' */}
                                                        {assignment.department?.slug === 'laboratory' && (
                                                            <button
                                                                onClick={() => {
                                                                    setIsDeptDrawerOpen(false); // close drawer first
                                                                    // Naigate to lab request form, 
                                                                    // passing the visit in state for pre-filling patient and visit details
                                                                    navigate(
                                                                        //the lab test will be for this visit by id
                                                                        `/visits/${deptVisit.id}/lab-tests/create`,
                                                                        //load the entire visit object into state for the lab request form, 
                                                                        // so we can pull out any details we need without extra fetching
                                                                        { state: { visit: deptVisit } }
                                                                    );
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                                bg-green-50 text-green-700 border border-green-200
                                                                hover:bg-green-100
                                                                dark:bg-green-900/20 dark:text-green-400 dark:border-green-800
                                                                dark:hover:bg-green-900/40 transition"
                                                            >
                                                                <FlaskConical className="w-3.5 h-3.5" />
                                                                Request Lab Test
                                                            </button>
                                                        )}

                                                        {/* PHARMACY actions — only when department_type === 'pharmacy' */}
                                                        {assignment.department?.slug === 'pharmacy' && (
                                                            <button
                                                                onClick={() => {
                                                                    setIsDeptDrawerOpen(false);
                                                                    // Naigate to radiology request form, 
                                                                    // passing the visit in state for pre-filling patient and visit details
                                                                    navigate(
                                                                        `/visits/${deptVisit.id}/prescription/create`,
                                    
                                                                        //load the entire visit object into state for the phamacy, 
                                                                        // so we can pull out any details we need without extra fetching
                                                                        { state: { visit: deptVisit } }
                                                                        
                                                                    );
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                                bg-purple-50 text-purple-700 border border-purple-200
                                                                hover:bg-purple-100
                                                                dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800
                                                                dark:hover:bg-purple-900/40 transition"
                                                            >
                                                                <Pill className="w-3.5 h-3.5" />
                                                                New Prescription
                                                            </button>
                                                        )}

                                                        {/* RADIOLOGY actions — only when department_type === 'radiology' */}
                                                        {assignment.department?.slug === 'radiology' && (
                                                            <button
                                                                onClick={() => {
                                                                    setIsDeptDrawerOpen(false);
                                                                    // Naigate to radiology request form, 
                                                                    // passing the visit in state for pre-filling patient and visit details
                                                                    navigate(
                                                                        `/visits/${deptVisit.id}/imaging/create`,
                                                                        //load the entire visit object into state for the lab request form, 
                                                                        // so we can pull out any details we need without extra fetching
                                                                        { state: { visit: deptVisit } }
                                                                    );
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                                bg-sky-50 text-sky-700 border border-sky-200
                                                                hover:bg-sky-100
                                                                dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800
                                                                dark:hover:bg-sky-900/40 transition"
                                                            >
                                                                <Radiation className="w-3.5 h-3.5" />
                                                                Imaging Request
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* ── Inline edit bar ── */}
                                                {editingAssignmentId === assignment.id && (
                                                    <div className="px-4 py-3 border-t border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
                                                        <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                                                            Change department
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={editDeptForm.department_id}
                                                                onChange={(e) => setEditDeptForm({ department_id: e.target.value })}
                                                                className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800
                                                        text-gray-800 dark:text-white border border-indigo-300 dark:border-indigo-600
                                                        focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                            >
                                                                <option value="">Select department</option>
                                                                {departments.map((dept) => (
                                                                    <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                                                                ))}
                                                            </select>

                                                            <button
                                                                onClick={() => handleUpdateAssignment(assignment.id)}
                                                                disabled={editSubmitting}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white
                                                        bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition
                                                        flex items-center gap-1.5 flex-shrink-0"
                                                            >
                                                                {editSubmitting ? (
                                                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                ) : 'Save'}
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setEditingAssignmentId(null);
                                                                    setEditDeptForm({ department_id: '' });
                                                                }}
                                                                disabled={editSubmitting}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium
                                                        bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300
                                                        border border-gray-300 dark:border-gray-600
                                                        hover:bg-gray-100 dark:hover:bg-gray-700
                                                        disabled:opacity-40 transition flex-shrink-0"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}


                                                {/* ── Inline confirm delete bar ── */}
                                                {confirmDeleteId === assignment.id && (
                                                    <div className="flex items-center justify-between gap-3 px-4 py-2.5
                                            bg-red-50 dark:bg-red-900/20
                                            border-t border-red-200 dark:border-red-800">
                                                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                                            Remove <span className="font-bold">{assignment.department?.department_name}</span> from this visit?
                                                        </p>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button
                                                                onClick={() => setConfirmDeleteId(null)}
                                                                disabled={deletingAssignmentId === assignment.id}
                                                                className="px-3 py-1 rounded-md text-xs font-medium
                                                        bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300
                                                        border border-gray-300 dark:border-gray-600
                                                        hover:bg-gray-100 dark:hover:bg-gray-700
                                                        disabled:opacity-40 transition"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAssignment(assignment.id)}
                                                                disabled={deletingAssignmentId === assignment.id}
                                                                className="px-3 py-1 rounded-md text-xs font-medium text-white
                                                        bg-red-600 hover:bg-red-700 disabled:opacity-50 transition
                                                        flex items-center gap-1.5"
                                                            >
                                                                {deletingAssignmentId === assignment.id ? (
                                                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-3 h-3" />
                                                                )}
                                                                Yes, Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Drawer Footer ── */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                            <button
                                onClick={() => setIsDeptDrawerOpen(false)}
                                className="w-full py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}


            {/* ═══════════════════════════════════════════════════════════
                VISIT MODAL (create / edit)
            ═══════════════════════════════════════════════════════════ */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg bg-white dark:bg-gray-900">

                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {editingVisit ? 'Update Patient Visit' : 'Register New Visit'}
                            </h2>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-8">

                            {/* Patient select */}
                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Patient *</label>
                                <select required value={formData.patient_id}
                                    onChange={(e) => { const id = e.target.value; setFormData({ ...formData, patient_id: id }); setSelectedPatient(paients.find(p => p.id == id) || null); setShowAddPatient(id === 'new'); }}
                                    className={inputCls}>
                                    <option value="">Select patient</option>
                                    {paients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone_number} — {p.address}</option>)}
                                </select>
                            </div>

                            {/* Visit Details */}
                            <section>
                                <h3 className="mb-4 text-md font-semibold text-gray-700 dark:text-white">Visit Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Visit Type *</label>
                                        <select required value={formData.visit_type} onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })} className={inputCls}>
                                            <option value="">Select</option>
                                            <option value="InPatient">In Patient</option>
                                            <option value="OutPatient">Out Patient</option>
                                        </select>
                                    </div>
                                    {/* <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Status *</label>
                                        <select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputCls}>
                                            <option value="">Select</option>
                                            <option value="waiting">Waiting</option>
                                            <option value="ongoing">Ongoing</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div> */}
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Assigned Doctor(optional)</label>
                                        <select value={formData.assigned_doctor_id} onChange={(e) => setFormData({ ...formData, assigned_doctor_id: e.target.value })} className={inputCls}>
                                            <option value="">Select Doctor</option>
                                            {doctors.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Visit Date *</label>
                                        <input type="date" required value={formData.visit_date} onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Start Time</label>
                                        <input type="time" value={formData.visit_start_time} onChange={(e) => setFormData({ ...formData, visit_start_time: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">End Time</label>
                                        <input type="time" value={formData.visit_end_time} onChange={(e) => setFormData({ ...formData, visit_end_time: e.target.value })} className={inputCls} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Visit Reason</label>
                                    <textarea rows={3} value={formData.visit_reason} onChange={(e) => setFormData({ ...formData, visit_reason: e.target.value })} className={`${inputCls} resize-none`} />
                                </div>
                            </section>

                            {/* Footer note for new visits */}
                            {!editingVisit && (
                                <div className="flex items-start gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3">
                                    <Building2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                        After registering this visit, you'll be prompted to assign it to the relevant departments (e.g. Laboratory, Pharmacy, Surgery).
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button type="button" onClick={closeModal} className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 transition">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition text-sm">
                                    {submitting ? 'Processing…' : editingVisit ? 'Update Visit' : 'Register Visit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* ═══════════════════════════════════════════════════════════
                PRESCRIPTION MODAL
            ═══════════════════════════════════════════════════════════ */}
            {isPrescriptionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 shadow-xl">

                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Medical Prescription</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Visit No: <span className="font-medium">{activeVisit?.visit_number}</span></p>
                            </div>
                            <button onClick={() => setIsPrescriptionModalOpen(false)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="px-6 py-6 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Source *</label>
                                    <select value={prescriptionForm.prescription_source} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, prescription_source: e.target.value })}
                                        className={inputCls}>
                                        <option value="">Select Source</option>
                                        <option value="direct">Direct</option>
                                        <option value="from_lab">From Lab</option>
                                        <option value="external">External</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Prescription Date *</label>
                                    <input type="date" value={prescriptionForm.prescription_date} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, prescription_date: e.target.value })} className={inputCls} />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Prescription Notes</label>
                                <textarea rows={3} value={prescriptionForm.prescription_notes} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, prescription_notes: e.target.value })}
                                    placeholder="Additional clinical instructions…" className={`${inputCls} resize-none`} />
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
                                            <select value={item.drug_id || ''} onChange={(e) => updatePrescriptionItem(index, 'drug_id', Number(e.target.value))} className={inputCls}>
                                                <option value="">Select medicine</option>
                                                {products.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.name}{p.variant_options?.length ? ' — ' + p.variant_options.map(v => v.option_value).join(' / ') : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">Strength</label>
                                            <input value={item.strength} onChange={(e) => updatePrescriptionItem(index, 'strength', e.target.value)} className={inputCls} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">Instructions</label>
                                            <input value={item.instructions} onChange={(e) => updatePrescriptionItem(index, 'instructions', e.target.value)} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">Duration Days</label>
                                            <input type="number" value={item.duration_days} onChange={(e) => updatePrescriptionItem(index, 'duration_days', e.target.value)} className={inputCls} />
                                        </div>
                                        <div className="flex items-end justify-center">
                                            <button onClick={() => removePrescriptionItem(index)} className="mb-1 rounded-lg p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800" title="Remove">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <button onClick={() => setIsPrescriptionModalOpen(false)} className="px-5 py-2 rounded-lg text-sm bg-gray-200 dark:bg-gray-700">Cancel</button>
                            <button disabled={isSubmitting} onClick={submitPrescription}
                                className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSubmitting ? <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" /> : 'Save Prescription'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Slide-in animation */}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                .animate-slide-in-right {
                    animation: slideInRight 0.25s ease-out forwards;
                }
            `}</style>
        </>
    );
}