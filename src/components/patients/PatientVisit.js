import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, Plus, Edit2, Trash2,
    HandCoins, X, User, Phone,
    ChevronRight, ChevronLeft, Building2, CheckCircle2, Clock, AlertCircle,
    Stethoscope, FlaskConical, Pill, Radiation, Scissors, ArrowRight,
    FileText, UserCheck, DoorOpen, Loader2, ShieldAlert, Zap, Circle, ShieldCheck,
    AlertTriangle, Thermometer, Heart, Activity, Wind, Hash, Info, BedDouble, BookOpen,
    MapPin, Scale
} from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
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
import { AssignVisitToRoom } from './patient_visit_sub_components/AssignVisitToRoom';
import { VisitRoutingStatus } from './patient_visit_sub_components/VisitRoutingStatus';
import { FilterVisitsDrawer } from './patient_visit_sub_components/FilterVisitsDrawer';
import { BMIRanges } from './patient_visit_sub_components/BMIRanges';

// ── Import CreateVisitWizard to support when creating patient visit ───────────────────────
import { CreateVisitWizard } from './CreateVisitWizard';
import { classifyBmi } from './patient_visit_sub_components/triage_widgets/BmiRangeLegend';

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
    const [insights, setInsights] = useState(null);
    const [expandedRows, setExpanded] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    //Fetch roles from redux
    const userRoleId = useSelector((state) => state.auth?.user?.data?.user?.role_id);
    const role = userRoleId;


    const today = new Date().toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(today);

    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
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

    // Edit triage drawer
    const [isEditTriageOpen, setIsEditTriageOpen] = useState(false);
    const [editingTriageRecord, setEditingTriageRecord] = useState(null);
    const [editTriageVisit, setEditTriageVisit] = useState(null);

    // Room assignment drawer
    const [isRoomOpen, setIsRoomOpen] = useState(false);
    const [roomVisit, setRoomVisit] = useState(null);

    // Routing status drawer
    const [isRoutingOpen, setIsRoutingOpen] = useState(false);
    const [routingVisit, setRoutingVisit] = useState(null);

    // Filter drawer
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // BMI Ranges configuration drawer
    const [isBmiRangesOpen, setIsBmiRangesOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        visit_category: '',
        request_origin: '',
        request_approval_status: '',
    });

    // Post-ward-assignment prompt
    const [showWardSuccessPrompt, setShowWardSuccessPrompt] = useState(false);

    // ── Active room assignment (for doctor room-scoping banner) ───────────────
    const [activeRoom, setActiveRoom] = useState(undefined); // undefined = not yet fetched
    const [loadingActiveRoom, setLoadingActiveRoom] = useState(false);

    // ── Role checks (coerced to numbers to guard against string IDs from the API) ──
    const roleIds = (role || []).map(Number);
    const isAdmin = roleIds.includes(1);
    const isDoctor = roleIds.includes(3);
    const isReceptionist = roleIds.includes(9);

    // Only admin or receptionist can register a visit — doctor status alone never grants this,
    // active-room status is irrelevant to this specific permission.
    const canAddVisit = isAdmin || isReceptionist;



    const legacyInputCls = "w-full rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm";

    // ── Data fetching for Patient Visits ──────────────────────────────────────────────────────────
    const fetchAllPatientVists = useCallback(async (page = 1, overrideFilters, overrideSearch) => {
        setLoading(true);
        const activeFilters = overrideFilters !== undefined ? overrideFilters : filters;
        const activeSearch = overrideSearch !== undefined ? overrideSearch : searchTerm;
        try {
            const drawerFiltersActive = Object.values(activeFilters).some(Boolean);
            const bypassDateRange = drawerFiltersActive || !!activeSearch;

            // Bypass date range when a search term or drawer filter is active so
            // results aren't artificially restricted to the selected day.
            const params = bypassDateRange
                ? { page }
                : { from_date: dateFrom, to_date: dateTo, page };

            if (activeSearch) params.search = activeSearch;
            if (activeFilters.status) params.status = activeFilters.status;
            if (activeFilters.visit_category) params.visit_category = activeFilters.visit_category;
            if (activeFilters.request_origin && activeFilters.visit_category === 'Others')
                params.request_origin = activeFilters.request_origin;
            if (activeFilters.request_approval_status) params.request_approval_status = activeFilters.request_approval_status;

            const res = await axios.get(`${API_BASE_URL}patient/getPatientVisits`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params,
            });
            const data = res.data.visits;
            setPatientVisits(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);
            if (res.data.insights) setInsights(res.data.insights);
        } catch (err) { console.error('Error fetching visits:', err); }
        finally { setLoading(false); }
    }, [token, dateFrom, dateTo, filters, searchTerm]);

    const loadRooms = async () => {
        setLoadingRooms(true);
        const data = await fetchRoomsWithAssignedDoctors(token);
        setRooms(data);
        setLoadingRooms(false);
    };

    const fetchActiveRoomAssignment = async () => {
        setLoadingActiveRoom(true);
        try {
            const res = await axios.get(`${API_BASE_URL}set/getMyActiveRoomAssignment`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            setActiveRoom(res.data.room); // null if no room, object if assigned
        } catch (err) {
            console.error('Failed to fetch active room assignment:', err);
            setActiveRoom(null);
        } finally {
            setLoadingActiveRoom(false);
        }
    };

    useEffect(() => {
        fetchAllPatientVists(1);
        fetchDoctors(token).then(setDoctors);
        fetchBasicPatientsInfoForDropDowns(token).then(setPatients);
        fetchDepartments(token).then(setDepartments);
        loadRooms();
        // Only doctors need the room assignment check; admins see everything
        if (!isAdmin) {
            fetchActiveRoomAssignment();
        }
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => fetchAllPatientVists(1);
    const resetFilters = () => { setDateFrom(today); setDateTo(today); };

    // Debounce search — fires backend request 400 ms after the user stops typing
    const searchDebounceRef = useRef(null);
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            fetchAllPatientVists(1, undefined, val);
        }, 400);
    };

    // Count how many filter fields are actively set (for the badge indicator)
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        fetchAllPatientVists(1, newFilters, undefined);
    };

    const toggleRow = (num) => {
        const s = new Set(expandedRows);
        s.has(num) ? s.delete(num) : s.add(num);
        setExpanded(s);
    };

    // ── Drawer openers ─────────────────────────────────────────────────────────
    const openRoomDrawer = (visit) => { setRoomVisit(visit); setIsRoomOpen(true); };
    const openDeptDrawer = (visit) => { setDeptVisit(visit); setIsDeptOpen(true); };
    const openExamDrawer = (visit) => { setExamVisit(visit); setIsExamOpen(true); };
    const openWardDrawer = (visit) => { setWardVisit(visit); setIsWardOpen(true); };
    const openTriageDrawer = (visit) => { setTriageVisit(visit); setIsTriageOpen(true); };
    const openRoutingDrawer = (visit) => { setRoutingVisit(visit); setIsRoutingOpen(true); };

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
                onSuccess={() => {
                    fetchAllPatientVists(currentPage);
                    setShowWardSuccessPrompt(true);
                }}
            />

            {/* ── Add Triage Drawer ── */}
            <AddTriageToPatientVisit
                isOpen={isTriageOpen}
                onClose={() => setIsTriageOpen(false)}
                visit={triageVisit}
                token={token}
                onSuccess={() => fetchAllPatientVists(currentPage)}
            />

            {/* ── Edit Triage Drawer ── */}
            <AddTriageToPatientVisit
                isOpen={isEditTriageOpen}
                onClose={() => { setIsEditTriageOpen(false); setEditingTriageRecord(null); }}
                visit={editTriageVisit}
                token={token}
                existingTriage={editingTriageRecord}
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

            {/* ── Assign to Room Drawer ── */}
            <AssignVisitToRoom
                isOpen={isRoomOpen}
                onClose={() => setIsRoomOpen(false)}
                visit={roomVisit}
                token={token}
                onSuccess={() => fetchAllPatientVists(currentPage)}
            />

            {/* Display Triages History */}
            <PatientTriagesHistory
                isOpen={isTriagesOpen}
                onClose={() => setIsTriagesOpen(false)}
                visit={triagesVisit}
                token={token}
            />

            {/* ── Visit Routing Status Drawer ── */}
            <VisitRoutingStatus
                isOpen={isRoutingOpen}
                onClose={() => setIsRoutingOpen(false)}
                visit={routingVisit}
                token={token}
            />

            {/* ── Filter Visits Drawer ── */}
            <FilterVisitsDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                currentFilters={filters}
                onApply={handleApplyFilters}
            />

            {/* ── BMI Ranges Configuration Drawer ── */}
            <BMIRanges
                isOpen={isBmiRangesOpen}
                onClose={() => setIsBmiRangesOpen(false)}
                token={token}
                onSuccess={() => { /* no visit refetch needed — this doesn't change visit data */ }}
            />

            {/* ── Post-ward-assignment prompt ── */}
            {showWardSuccessPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-fade-in">
                        {/* Header strip */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Visit assigned to ward</p>
                                    <p className="text-blue-100 text-xs mt-0.5">What would you like to do next?</p>
                                </div>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="px-6 py-5 space-y-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                The ward assignment is saved. You can stay here to continue managing visits, or go to the Ward Assignments Board to assign a bed.
                            </p>
                            <button
                                onClick={() => navigate('/ward_assignments_board')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                                    text-sm font-semibold text-white
                                    bg-gradient-to-r from-blue-600 to-indigo-600
                                    hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-200 dark:shadow-blue-900/40"
                            >
                                <BedDouble className="w-4 h-4" />
                                Go to Ward Assignments Board
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowWardSuccessPrompt(false)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                                    text-sm font-medium text-gray-600 dark:text-gray-300
                                    bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            >
                                Remain here
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
                        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                    `}</style>
                </div>
            )}

            {/* Table to display patient visits */}
            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 rounded-lg shadow-sm border p-8 transition-colors border-gray-200 dark:border-slate-700 mt-5">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">Patient Visit Center</h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Visits displayed are from today ({new Date().toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}).
                            Adjust the date filters to view visits from other periods.
                        </p>
                    </div>

                    {/* ── Room assignment banner ── */}
                    {isAdmin && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium">
                            <DoorOpen className="w-4 h-4 flex-shrink-0" />
                            Viewing all visits in their  rooms
                        </div>
                    )}

                    {/* Doctor priority specific banner, not admins */}
                    {isDoctor && !isAdmin && !loadingActiveRoom && activeRoom && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 text-sm font-medium">
                            <DoorOpen className="w-4 h-4 flex-shrink-0" />
                            Viewing visits for Room {activeRoom.room_name} ({activeRoom.room_number})
                        </div>
                    )}
                    {/* D octor priority specific banner, not admins*/}
                    {isDoctor && !isAdmin && !loadingActiveRoom && !activeRoom && activeRoom !== undefined && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            You are not currently assigned to a room. Contact an admin to get assigned before registering visits.
                        </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Disable the button if role isnt admin or receptionisit */}
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            disabled={!canAddVisit}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow text-white ${!canAddVisit ? 'bg-blue-400 cursor-not-allowed opacity-60' : 'bg-blue-600 hover:bg-blue-700'
                                }`}>
                            <Plus className="w-5 h-5" /> Add Patient Visit
                        </button>

                        <button
                            onClick={() => setIsBmiRangesOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-lg transition-colors shadow text-white bg-teal-600 hover:bg-teal-700"
                        >
                            <Scale className="w-4 h-4" /> Configure BMI Ranges
                        </button>
                    </div>
                </div>

                {/* ── Visit Insights ── */}
                {insights && (
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                            Visit Insights — filtered period
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                            {/* Total */}
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Visits</span>
                                <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{insights.total}</span>
                            </div>

                            {/* OPD */}
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                <span className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">OPD</span>
                                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{insights.opd}</span>
                                <span className="text-[10px] text-blue-400 dark:text-blue-500">Outpatient</span>
                            </div>

                            {/* IPD */}
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                                <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">IPD</span>
                                <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{insights.ipd}</span>
                                <span className="text-[10px] text-indigo-400 dark:text-indigo-500">Inpatient</span>
                            </div>

                            {/* Others — with self/doctor sub-breakdown */}
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                                <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider">Others</span>
                                <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{insights.others}</span>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                        <Circle className="w-1.5 h-1.5 fill-amber-500" />
                                        {insights.others_self_request} self-request
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                        <Circle className="w-1.5 h-1.5 fill-amber-700" />
                                        {insights.others_doctor_request} doctor-request
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input type="text" placeholder="Search by patient name, visit number, or phone…" value={searchTerm} onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
                            </div>
                            {/* Filters button with active badge */}
                            <button
                                onClick={() => setIsFilterOpen(true)}
                                className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium"
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
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
                                {['Visit No', 'Patient Name', 'Visit Category', 'Visit Date', 'Branch', 'Room', 'status', 'Departments', 'More'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs text-gray-500 font-bold dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="px-6 py-4"><Skeleton /></td>)}</tr>)
                            ) : visits.length === 0 ? (
                                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No visits found — try adjusting the filters</td></tr>
                            ) : (
                                visits.map(visit => (
                                    <React.Fragment key={visit.visit_number}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition cursor-pointer"
                                            onClick={() => toggleRow(visit.visit_number)}>
                                            <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{visit.visit_number}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.patient?.name}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 capitalize whitespace-nowrap">{visit.visit_category ?? visit.visit_type ?? '—'}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.visit_date}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.branch?.name ?? 'N/A'}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.room?.room_name ?? 'N/A'}</td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 whitespace-nowrap">{visit.status ?? 'N/A'}</td>
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
                                                <td colSpan={9} className="p-0">
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

                                                                {/* Pending self-request Others visits: show ONLY Approve/Reject */}
                                                                {(visit.visit_category === 'Others' || visit.visit_type === 'Others') &&
                                                                    visit.request_origin === 'self_request' &&
                                                                    visit.request_approval_status === 'pending' ? (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setDecisionVisit(visit); setIsDecisionOpen(true); }}
                                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                        text-sm font-semibold text-white
                                                                        bg-gradient-to-r from-amber-500 to-orange-500
                                                                         hover:from-amber-600 hover:to-orange-600 transition shadow-md"
                                                                    >
                                                                        <ShieldCheck className="w-4 h-4" /> Approve / Reject Request
                                                                    </button>
                                                                ) : (
                                                                    <>
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
                                                                        {/* Assign to ward button — IPD visits only */}
                                                                        {(visit.visit_category ?? visit.visit_type) === 'IPD' && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); openWardDrawer(visit); }}
                                                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                                 text-sm font-semibold text-white
                                                                                bg-gradient-to-r from-blue-600 to-indigo-600
                                                                                 hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
                                                                            >
                                                                                <BedDouble className="w-4 h-4" /> Assign to Ward
                                                                            </button>
                                                                        )}

                                                                        {/* Assign to Room — only when waiting */}
                                                                        {visit.status === 'waiting' && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); openRoomDrawer(visit); }}
                                                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            text-sm font-semibold text-white
            bg-gradient-to-r from-violet-600 to-purple-600
             hover:from-violet-700 hover:to-purple-700 transition shadow-md"
                                                                            >
                                                                                <DoorOpen className="w-4 h-4" />
                                                                                {visit.room ? 'Re-assign to Room' : 'Assign to Room'}
                                                                            </button>
                                                                        )}

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

                                                                        {/* View patient ward assignments */}
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

                                                                        {/* View routing status */}
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); openRoutingDrawer(visit); }}
                                                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                                            text-sm font-semibold text-white
                                                                            bg-gradient-to-r from-cyan-600 to-teal-600
                                                                            hover:from-cyan-700 hover:to-teal-700 transition shadow-md"
                                                                        >
                                                                            <MapPin className="w-4 h-4" /> View Routing Status
                                                                        </button>

                                                                        {/* Approve/Reject button for non-pending self-request Others visits */}
                                                                        {/* Approve/Reject button for non-pending, non-approved self-request Others visits */}
                                                                        {(visit.visit_category === 'Others' || visit.visit_type === 'Others') &&
                                                                            visit.request_origin === 'self_request' &&
                                                                            visit.request_approval_status !== 'approved' && (
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
                                                                    </>
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
                                                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                                        {visit.triage?.bmi_value && (() => {
                                                                            const cat = visit.triage.bmi_category ?? classifyBmi(visit.triage.bmi_value);
                                                                            const clsMap = {
                                                                                underweight: 'bg-blue-600 text-white border-blue-700',
                                                                                normal:      'bg-green-600 text-white border-green-700',
                                                                                overweight:  'bg-yellow-500 text-gray-900 border-yellow-600',
                                                                                obese:       'bg-red-600 text-white border-red-700',
                                                                            };
                                                                            return (
                                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${clsMap[cat] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                                                    BMI {visit.triage.bmi_value}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                        {visit.triage && <UrgencyBadge level={visit.triage?.urgency_level} />}
                                                                    </div>
                                                                </div>

                                                                {!visit.triage ? (
                                                                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                                                                        <Activity className="w-8 h-8 text-gray-200 dark:text-gray-700" />
                                                                        <p className="text-xs text-gray-400 dark:text-gray-500">No triage recorded yet</p>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {/* Array vitals as chip lists */}
                                                                        {[
                                                                            { icon: Activity,    label: 'Blood Pressure', readings: visit.triage.blood_pressure, fmt: v => `${v} mmHg`,           cls: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' },
                                                                            { icon: Thermometer, label: 'Temperature',    readings: visit.triage.temperature,    fmt: r => `${r?.value ?? r}°C`,  cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
                                                                            { icon: Heart,       label: 'Pulse Rate',     readings: visit.triage.pulse_rate,     fmt: v => `${v} bpm`,            cls: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' },
                                                                        ].map(({ icon: Icon, label, readings, fmt, cls }) => {
                                                                            const arr = Array.isArray(readings) ? readings : (readings != null ? [readings] : []);
                                                                            if (!arr.length) return null;
                                                                            return (
                                                                                <div key={label} className="flex items-start gap-2 mb-2">
                                                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cls}`}>
                                                                                        <Icon className="w-3 h-3" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-0.5">{label}</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {arr.map((r, i) => (
                                                                                                <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-200">
                                                                                                    {fmt(r)}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}

                                                                        {/* Scalar vitals */}
                                                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                                                            <VitalTile icon={Wind}       label="SpO₂"            value={visit.triage.oxygen_saturation} unit="%"  iconCls="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400" />
                                                                            <VitalTile icon={Activity}   label="Weight"          value={visit.triage.weight}            unit="kg" iconCls="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" />
                                                                            <VitalTile icon={Activity}   label="Stand. Height"   value={visit.triage.standing_height}   unit="cm" iconCls="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" />
                                                                            <VitalTile icon={Activity}   label="Sit. Height"     value={visit.triage.sitting_height}    unit="cm" iconCls="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" />
                                                                            <VitalTile icon={Activity}   label="Waist"           value={visit.triage.waist}             unit="cm" iconCls="bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400" />
                                                                            <VitalTile icon={Activity}   label="Hip"             value={visit.triage.hip}               unit="cm" iconCls="bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400" />
                                                                            {visit.triage.muac && <VitalTile icon={Activity} label="MUAC" value={visit.triage.muac} unit="cm" iconCls="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" />}
                                                                        </div>

                                                                        <div className="pt-2 border-t border-gray-50 dark:border-gray-800 space-y-0">
                                                                            <InfoRow label="Triaged by" value={visit.triage.triaged_by?.name} />
                                                                            <InfoRow label="Time" value={
                                                                                visit.triage.triage_date
                                                                                    ? new Date(visit.triage.triage_date).toLocaleString('en-UG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                                                    : null
                                                                            } />
                                                                        </div>

                                                                        {/* Edit Triage button */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingTriageRecord(visit.triage);
                                                                                setEditTriageVisit(visit);
                                                                                setIsEditTriageOpen(true);
                                                                            }}
                                                                            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                                                                text-xs font-semibold text-white
                                                                                bg-gradient-to-r from-orange-500 to-rose-500
                                                                                hover:from-orange-600 hover:to-rose-600 transition shadow-sm"
                                                                        >
                                                                            <Edit2 className="w-3.5 h-3.5" /> Edit Triage
                                                                        </button>
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
                    <div className="text-sm text-gray-500 dark:text-gray-300">Showing {visits.length} of {totalPages} results</div>
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


            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </>
    );
}