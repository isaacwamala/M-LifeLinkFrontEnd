import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, Plus, Edit2, HandCoins, Package, X, User, Phone, MapPin, CreditCard, DollarSign, Hash, ChevronRight, ChevronLeft } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchPatientCategories } from './patients_helper';
import { fetchDoctors } from './patients_helper';
import { toast, ToastContainer } from 'react-toastify';
import { fetchBasicPatientsInfoForDropDowns } from './patients_helper';



export function PatientVisits() {
    const [visits, setPatientVisits] = useState([]);
    const [paients, setPatients] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVisit, setEditingVisit] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [patientCategories, setPatientCategories] = useState([]);
    const [doctors, setDoctors] = useState([]);

    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [visitSubmitting, setVisitSubmitting] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);

    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showAddPatient, setShowAddPatient] = useState(false);



    //Set current page due to paginations from back end
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const now = new Date();
    // Ensure we show data for this month of the current year, as back end returns them by default
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]; // YYYY-MM-DD
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    const [dateFrom, setDateFrom] = useState(startOfMonth);
    const [dateTo, setDateTo] = useState(endOfMonth);

    const initialFormData = {
        visit_id: null,
        patient_id: '',
        visit_type: '',
        status: '',
        visit_reason: '',
        visit_date: '',
        visit_start_time: '',
        visit_end_time: '',
        assigned_doctor_id: '',
    };


    // Form state for patients creation
    const [formData, setFormData] = useState(initialFormData);



    //Fetch Patient Visits 
    const fetchAllPatientVists = async (page = 1) => {
        setLoading(true);

        try {
            const response = await axios.get(`${API_BASE_URL}patient/getPatientVisits`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                params: {
                    from_date: dateFrom,
                    to_date: dateTo,
                    page: page,
                },
            });

            const data = response.data.visits;

            setPatientVisits(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);

            console.log("visits:", data);

        } catch (error) {
            console.error("Error fetching vists:", error);
        } finally {
            setLoading(false);
        }
    };


    // Load doctors for visit assignment
    const loadDoctors = async () => {
        setLoading(true);
        const data = await fetchDoctors(token);
        setDoctors(data);
        setLoading(false);
    };

    //Load basic patients info for dropdowns
    const loadBasicPatientsInfoForDropdown = async () => {
        setLoading(true);
        const data = await fetchBasicPatientsInfoForDropDowns(token);
        setPatients(data);
        setLoading(false);
    }

    //Mount the component
    useEffect(() => {
        fetchAllPatientVists(1);
        loadDoctors();
        loadBasicPatientsInfoForDropdown();
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => {
        fetchAllPatientVists(1);
    };

    //Reset filtersto default that is current month
    // and also the single page fetch from back end
    const resetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchAllPatientVists(1);
    };

    //Determine filtered patients based on search term and date range
    //Ensure that if the date filters or searches ,we filter from the full patients list
    //from the back end data
    const filteredPatientVisits = useMemo(() => {
        const term = searchTerm.toLowerCase();

        return visits.filter((v) => {
            const matchesSearch =
                !term ||
                v.visit_number?.toLowerCase().includes(term) ||
                v.patient?.name.toLowerCase().includes(term) ||
                v.visit_created_by?.name.toLowerCase().includes(term);


            const created = new Date(v.created_at);

            const matchesDateFrom = !dateFrom || created >= new Date(dateFrom);
            const matchesDateTo = !dateTo || created <= new Date(dateTo);

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [visits, searchTerm, dateFrom, dateTo]);

    // Toggle row
    const toggleRow = (saleNumber) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(saleNumber)) {
            newExpanded.delete(saleNumber);
        } else {
            newExpanded.add(saleNumber);
        }
        setExpandedRows(newExpanded);
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    //Open modal with existing data during update
   const openModal = (visit = null, patientId = null) => {
    if (visit) {
        // EDIT MODE
        setEditingVisit(visit);

        setFormData({
            visit_id: visit.id,             
            patient_id: visit.patient_id,
            visit_type: visit.visit_type ?? '',
            status: visit.status ?? '',
            visit_reason: visit.visit_reason ?? '',
            visit_date: visit.visit_date ?? '',
            visit_start_time: visit.visit_start_time ?? '',
            visit_end_time: visit.visit_end_time ?? '',
            assigned_doctor_id: visit.assigned_doctor_id ?? '',
        });
    } else {
        // CREATE MODE to create new vist
        setEditingVisit(null);

        setFormData({
            ...initialFormData,
            patient_id: patientId ?? '',
            status: 'waiting',
            visit_date: new Date().toISOString().split('T')[0],
        });
    }

    setIsModalOpen(true);
};



    const closeModal = () => {
        setIsModalOpen(false);
        setEditingVisit(null);
    };

    //Handle submitting of data, it may be either update or creation
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
            assigned_doctor_id: formData.assigned_doctor_id || null,
            patient_id: formData.patient_id || null,
        };

        const url = editingVisit
            ? `${API_BASE_URL}patient/updatePatientVisit`
            : `${API_BASE_URL}patient/registerPatientVisit`;

        try {
            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            toast.success(
                editingVisit ? 'Patient Visit updated successfully' : 'Patient Visit registered successfully'
            );

            fetchAllPatientVists(1);
            closeModal();

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <>
            <ToastContainer />
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-8 transition-colors border-gray-200 dark:border-gray-700 mt-5">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">

                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                                Patient Visit Center
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Visits displayed are those registered in this current month ({new Date().toLocaleString('default', { month: 'long' })}) of {new Date().getFullYear()}. Adjust the filters above to view patient visits made other periods.
                        </p>
                    </div>

                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow"
                    >
                        <Plus className="w-5 h-5" />
                        Add Patient Visit
                    </button>
                </div>
                {/* Header Row */}



                {/* Filters Section */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-4">

                        {/* Search */}
                        <div className="w-full">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search patient visits..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                            {/* From Date */}
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200
                               focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            {/* To Date */}
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200
                               focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            {/* Apply */}
                            <button
                                onClick={applyDateFilter}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                           bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                            >
                                <Filter className="w-4 h-4" />
                                Apply
                            </button>

                            {/* Reset */}
                            <button
                                onClick={resetFilters}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                           bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                           rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reset
                            </button>

                        </div>
                    </div>
                </div>


                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 font-bold border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {[
                                    "Visit No",
                                    "Patient Name",
                                    "visit Type",
                                    "vist date",
                                    "Branch",
                                    "Assigned doctor",
                                    "Actions",
                                    "More"
                                ].map((head) => (
                                    <th
                                        key={head}
                                        className="px-6 py-3 text-left text-xs text-gray-500 font-bold dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>


                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">

                            {loading ? (
                                <>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4"><Skeleton /></td>
                                            <td className="px-6 py-4"><Skeleton /></td>
                                            <td className="px-6 py-4"><Skeleton /></td>
                                            <td className="px-6 py-4"><Skeleton /></td>
                                            <td className="px-6 py-4"><Skeleton /></td>
                                            <td className="px-6 py-4"><Skeleton /></td>
                                            <td className="px-6 py-4"><Skeleton /></td>
                                            <td className="px-6 py-4"><Skeleton /></td>
                                        </tr>
                                    ))}
                                </>
                            ) : filteredPatientVisits.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No Visits found, try adjusting the filter
                                    </td>
                                </tr>
                            ) : (
                                filteredPatientVisits.map((visit) => (
                                    <React.Fragment key={visit.visit_number}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                                                {visit.visit_number}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                {visit.patient?.name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 capitalize">
                                                {visit.visit_type}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 capitalize">
                                                {visit.visit_date}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                {visit.branch?.name ?? "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                {visit.assigned_doctor?.name ?? "N/A"}
                                            </td>


                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleRow(visit.visit_number)}
                                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    {expandedRows.has(visit.visit_number) ? (
                                                        <ChevronUp className="w-5 h-5" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>

                                            <td className="px-4 py-3">
                                                {/* Button to edit patient info */}
                                                <button
                                                    onClick={() => openModal(visit)}
                                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>


                                            </td>
                                        </tr>

                                        {/* EXPANDED ROW */}
                                        {expandedRows.has(visit.visit_number) && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                                        {/* Personal Info */}
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                Visit Details
                                                            </h4>

                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>Visit Start time:</strong> {visit.visit_start_time ?? "N/A"}
                                                            </p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>Visit End Time:</strong> {visit.visit_end_time ?? "N/A"}
                                                            </p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>Visited created by:</strong> {visit.visit_created_by?.name ?? "N/A"}
                                                            </p>
                                                        </div>

                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                Visit reason
                                                            </h4>

                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                {visit.visit_reason ?? "N/A"}
                                                            </p>

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
                <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                    {/* Showing info */}
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                        Showing {filteredPatientVisits.length} of {totalPages} results
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchAllPatientVists(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => fetchAllPatientVists(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>


            {/* Modal  To Update Patient Visits*/}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg
                    bg-white dark:bg-gray-900">

                        {/* ================= HEADER ================= */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4
                      border-b border-gray-200 dark:border-gray-700
                      bg-white dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {editingVisit ? "Update Patient Visit" : "Register New Visit"}
                            </h2>

                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* ================= FORM ================= */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-8">


                            {/* ================= PATIENT SELECT  TO ADD A VISIT ================= */}
                            <div>
                                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">
                                    Patient *
                                </label>

                                <select
                                    required
                                    value={formData.patient_id}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setFormData({ ...formData, patient_id: id });

                                        const patient = paients.find(p => p.id == id);
                                        setSelectedPatient(patient || null);

                                        // Reset add-patient mode
                                        setShowAddPatient(id === "new");
                                    }}
                                    className="w-full rounded-lg px-4 py-2
                                    bg-white dark:bg-gray-800
                                    text-gray-800 dark:text-white
                                    border border-gray-300 dark:border-gray-600
                                    focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">Select patient</option>

                                    {paients.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} — {p.phone_number} — {p.address}
                                        </option>
                                    ))}

                                </select>
                            </div>


                            {/* ================= VISIT DETAILS ================= */}
                            <section>
                                <h3 className="mb-4 text-md font-semibold text-gray-700 dark:text-white">
                                    Visit Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    {/* Visit Type */}
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">
                                            Visit Type *
                                        </label>
                                        <select
                                            required
                                            value={formData.visit_type}
                                            onChange={(e) =>
                                                setFormData({ ...formData, visit_type: e.target.value })
                                            }
                                            className="w-full rounded-lg px-4 py-2
                           bg-white dark:bg-gray-800
                           text-gray-800 dark:text-white
                           border border-gray-300 dark:border-gray-600
                           focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="">Select</option>
                                            <option value="InPatient">In Patient</option>
                                            <option value="OutPatient">Out Patient</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">
                                            Status *
                                        </label>
                                        <select
                                            required
                                            value={formData.status}
                                            onChange={(e) =>
                                                setFormData({ ...formData, status: e.target.value })
                                            }
                                            className="w-full rounded-lg px-4 py-2
                           bg-white dark:bg-gray-800
                           text-gray-800 dark:text-white
                           border border-gray-300 dark:border-gray-600
                           focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="">Select</option>
                                            <option value="waiting">Waiting</option>
                                            <option value="ongoing">Ongoing</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>

                                    {/* Assigned Doctor */}
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">
                                            Assigned Doctor
                                        </label>
                                        <select
                                            value={formData.assigned_doctor_id}
                                            onChange={(e) =>
                                                setFormData({ ...formData, assigned_doctor_id: e.target.value })
                                            }
                                            className="w-full rounded-lg px-4 py-2
                           bg-white dark:bg-gray-800
                           text-gray-800 dark:text-white
                           border border-gray-300 dark:border-gray-600
                           focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="">Select Doctor</option>
                                            {doctors.map((doc) => (
                                                <option key={doc.id} value={doc.id}>
                                                    {doc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Visit Date */}
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">
                                            Visit Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.visit_date}
                                            onChange={(e) =>
                                                setFormData({ ...formData, visit_date: e.target.value })
                                            }
                                            className="w-full rounded-lg px-4 py-2
                           bg-white dark:bg-gray-800
                           text-gray-800 dark:text-white
                           border border-gray-300 dark:border-gray-600
                           focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Start Time */}
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.visit_start_time}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    visit_start_time: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-lg px-4 py-2
                           bg-white dark:bg-gray-800
                           text-gray-800 dark:text-white
                           border border-gray-300 dark:border-gray-600"
                                        />
                                    </div>

                                    {/* End Time */}
                                    <div>
                                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.visit_end_time}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    visit_end_time: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-lg px-4 py-2
                           bg-white dark:bg-gray-800
                           text-gray-800 dark:text-white
                           border border-gray-300 dark:border-gray-600"
                                        />
                                    </div>
                                </div>

                                {/* Visit Reason */}
                                <div className="mt-4">
                                    <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">
                                        Visit Reason
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.visit_reason}
                                        onChange={(e) =>
                                            setFormData({ ...formData, visit_reason: e.target.value })
                                        }
                                        className="w-full rounded-lg px-4 py-2
                         bg-white dark:bg-gray-800
                         text-gray-800 dark:text-white
                         border border-gray-300 dark:border-gray-600
                         focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </section>

                            {/* ================= ACTIONS ================= */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 rounded-lg text-white
                                     bg-blue-600 hover:bg-blue-700
                                     disabled:opacity-60 transition"
                                >
                                    {submitting
                                        ? "Processing..."
                                        : editingVisit
                                            ? "Update Visit"
                                            : "Register Visit"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}






        </>
    );
}
