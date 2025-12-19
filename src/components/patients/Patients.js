import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, Plus, Edit2, HandCoins, Package, X, User, Phone, MapPin, CreditCard, DollarSign, Hash, ChevronRight, ChevronLeft } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchPatientCategories } from './patients_helper';
import { fetchDoctors } from './patients_helper';
import { toast, ToastContainer } from 'react-toastify';



export function Patients() {
    const [patients, setPatients] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [patientCategories, setPatientCategories] = useState([]);
    const [doctors, setDoctors] = useState([]);

    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [visitSubmitting, setVisitSubmitting] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);


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

    // Form state for patients creation
    const [formData, setFormData] = useState({
        name: '', nin: '', dob: '', gender: '', patient_category_id: '', branch_id: '', admission_date: '',
        nationality: '', email: '', phone_number: '', occupation: '', marital_status: '', insurance_number: '', insurance_provider: '',
        is_insured: '', address: '', residence: '', subcounty: '', district: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
        emergency_contact_address: '', status: '',
    });

    //FOrm state for patient visit creation
    const [visitForm, setVisitForm] = useState({
        patient_id: '', visit_type: '', status: 'waiting', visit_reason: '', visit_date: '', visit_start_time: '', visit_end_time: '',
        assigned_doctor_id: '',
    });



    //Fetch Patients frombackend
    const fetchAllPatients = async (page = 1) => {
        setLoading(true);

        try {
            const response = await axios.get(`${API_BASE_URL}patient/getRegisteredPatients`, {
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

            const data = response.data.patients;

            setPatients(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);

            console.log("patients:", data);

        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setLoading(false);
        }
    };

    //  Load patient categories for the form select options
    const loadPatientCategories = async () => {
        setLoading(true);
        const data = await fetchPatientCategories(token);
        setPatientCategories(data);
        setLoading(false);
    };

    // Load doctors for visit assignment
    const loadDoctors = async () => {
        setLoading(true);
        const data = await fetchDoctors(token);
        setDoctors(data);
        setLoading(false);
    };

    //Mount the component
    useEffect(() => {
        fetchAllPatients(1);
        loadPatientCategories();
        loadDoctors();
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => {
        fetchAllPatients(1);
    };

    //Reset filtersto default that is current month
    // and also the single page fetch from back end
    const resetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchAllPatients(1);
    };

    //Determine filtered patients based on search term and date range
    //Ensure that if the date filters or searches ,we filter from the full sales list
    //from the back end data
    const filteredPatients = useMemo(() => {
        const term = searchTerm.toLowerCase();

        return patients.filter((p) => {
            const matchesSearch =
                !term ||
                p.patient_number?.toLowerCase().includes(term) ||
                p.name?.toLowerCase().includes(term) ||
                p.phone_number?.toLowerCase().includes(term) ||
                p.branch_name?.toLowerCase().includes(term);

            // Convert created_at to local YYYY-MM-DD
            const createdDateStr = new Date(p.created_at).toLocaleDateString('en-CA'); // YYYY-MM-DD

            const matchesDateFrom = !dateFrom || createdDateStr >= dateFrom;
            const matchesDateTo = !dateTo || createdDateStr <= dateTo;

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [patients, searchTerm, dateFrom, dateTo]);


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
    const openModal = (patient) => {
        if (patient) {
            setEditingPatient(patient);

            setFormData({
                patient_id: patient.id,
                name: patient.name || '',
                nin: patient.nin || '',
                dob: patient.dob || '',
                gender: patient.gender || '',
                patient_category_id: patient.patient_category_id?.toString() || '',
                branch_id: patient.branch_id?.toString() || '',
                admission_date: patient.admission_date || '',

                nationality: patient.nationality || '',
                email: patient.email || '',
                phone_number: patient.phone_number || '',
                occupation: patient.occupation || '',
                marital_status: patient.marital_status || '',

                insurance_number: patient.insurance_number || '',
                insurance_provider: patient.insurance_provider || '',
                is_insured: patient.is_insured ?? '',

                address: patient.address || '',
                residence: patient.residence || '',
                subcounty: patient.subcounty || '',
                district: patient.district || '',

                emergency_contact_name: patient.emergency_contact_name || '',
                emergency_contact_phone: patient.emergency_contact_phone || '',
                emergency_contact_relationship: patient.emergency_contact_relationship || '',
                emergency_contact_address: patient.emergency_contact_address || '',

                status: patient.status || '',
            });
        } else {
            // Reset form for create mode
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


    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPatient(null);
    };

    //Handle submitting of data, it may be either update or creation
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
            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            toast.success(
                editingPatient ? 'Patient updated successfully' : 'Patient registered successfully'
            );

            fetchAllPatients(1);
            closeModal();

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    //Handle function to create patient visit

    const handleVisitSubmit = async (e) => {
        e.preventDefault();
        setVisitSubmitting(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}patient/registerPatientVisit`,
                visitForm,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            // Use response safely
            toast.success(
                response.data?.message || "Visit registered successfully"
            );

            // Optional: you can also use returned visit data
            // const visit = response.data.data;

            setIsVisitModalOpen(false);

        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to register visit"
            );
        } finally {
            setVisitSubmitting(false);
        }
    };



    return (
        <>
            <ToastContainer />
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-5">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">

                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                                Manage Registered Patients
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Patients displayed are those registered in this current month ({new Date().toLocaleString('default', { month: 'long' })}) of {new Date().getFullYear()}. Adjust the filters above to view sales made other periods.
                        </p>
                    </div>

                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow"
                    >
                        <Plus className="w-5 h-5" />
                        Add Patient
                    </button>
                </div>
                {/* Header Row */}



                {/* Filters Section */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search patients..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Date Filters */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            <button
                                onClick={applyDateFilter}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 justify-center"
                            >
                                <Filter className="w-4 h-4" />
                                Apply
                            </button>

                            <button
                                onClick={resetFilters}
                                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2 justify-center"
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
                                    "Patient No",
                                    "Name",
                                    "Gender",
                                    "Phone",
                                    "Branch",
                                    "Registered On",
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
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No patients found matching your criteria
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <React.Fragment key={patient.patient_number}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                                                {patient.patient_number}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                {patient.name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200 capitalize">
                                                {patient.gender}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                {patient.phone_number ?? "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                {patient.branch_name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                {formatDate(patient.created_at)}
                                            </td>

                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleRow(patient.patient_number)}
                                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    {expandedRows.has(patient.patient_number) ? (
                                                        <ChevronUp className="w-5 h-5" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>

                                            <td className="px-4 py-3">
                                                {/* Button to edit patient info */}
                                                <button
                                                    onClick={() => openModal(patient)}
                                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>

                                                {/* Button to edit visit info */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedPatient(patient);
                                                        setVisitForm({
                                                            patient_id: patient.id,
                                                            visit_type: '',
                                                            status: 'waiting',
                                                            visit_reason: '',
                                                            visit_date: new Date().toISOString().split('T')[0],
                                                            visit_start_time: '',
                                                            visit_end_time: '',
                                                            assigned_doctor_id: '',
                                                        });
                                                        setIsVisitModalOpen(true);
                                                    }}
                                                    className="text-green-600 hover:text-green-700"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>

                                            </td>
                                        </tr>

                                        {/* EXPANDED ROW */}
                                        {expandedRows.has(patient.patient_number) && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                                        {/* Personal Info */}
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                Personal Details
                                                            </h4>

                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>DOB:</strong> {patient.dob ?? "N/A"}
                                                            </p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>Nationality:</strong> {patient.nationality ?? "N/A"}
                                                            </p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>Email:</strong> {patient.email ?? "N/A"}
                                                            </p>
                                                        </div>

                                                        {/* Emergency Contact */}
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                Emergency Contact
                                                            </h4>

                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>Name:</strong> {patient.emergency_contact_name ?? "N/A"}
                                                            </p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>Phone:</strong> {patient.emergency_contact_phone ?? "N/A"}
                                                            </p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                <strong>Relationship:</strong> {patient.emergency_contact_relationship ?? "N/A"}
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
                        Showing {filteredPatients.length} of {totalPages} results
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchAllPatients(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => fetchAllPatients(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>


            {/* Modal  To Update Patient Details*/}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg">

                        {/* ================= HEADER ================= */}
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingPatient ? "Update Patient" : "Register New Patient"}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-800 dark:hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* ================= FORM ================= */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-8">

                            {/* ================= BASIC INFORMATION ================= */}
                            <section>
                                <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4">
                                    Personal Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* NIN */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            National ID (NIN)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.nin}
                                            onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    {/* DOB */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.dob}
                                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    {/* Gender */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Gender
                                        </label>
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                </div>
                            </section>

                            {/* ================= ADMISSION ================= */}
                            <section>
                                <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4">
                                    Admission Details
                                </h3>

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

                                    {/* Admission Date */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Admission Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.admission_date}
                                            onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                </div>
                            </section>

                            {/* ================= CONTACT ================= */}
                            <section>
                                <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4">
                                    Contact & Demographics
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Occupation
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.occupation}
                                            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Marital Status
                                        </label>
                                        <select
                                            value={formData.marital_status}
                                            onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select</option>
                                            <option value="single">Single</option>
                                            <option value="married">Married</option>
                                            <option value="divorced">Divorced</option>
                                            <option value="widowed">Widowed</option>
                                        </select>
                                    </div>

                                </div>
                            </section>

                            {/* ================= EMERGENCY ================= */}
                            <section>
                                <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4">
                                    Emergency Contact
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    <input
                                        placeholder="Contact Name"
                                        value={formData.emergency_contact_name}
                                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                    />

                                    <input
                                        placeholder="Contact Phone"
                                        value={formData.emergency_contact_phone}
                                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                    />

                                </div>
                            </section>

                            {/* ================= ACTIONS ================= */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                                >
                                    {submitting
                                        ? "Processing..."
                                        : editingPatient ? "Update Patient" : "Register Patient"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* Modal to Add Patient Visit */}
            {isVisitModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg shadow-lg">

                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-300 dark:border-gray-600">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Register Patient Visit
                            </h3>
                            <button onClick={() => setIsVisitModalOpen(false)}>
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                            </button>
                        </div>

                        {/* Form */}
                        <form
                            onSubmit={handleVisitSubmit}
                            className="p-6 space-y-4"
                        >
                            {/* Visit Type */}
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                    Visit Type *
                                </label>
                                <select
                                    required
                                    value={visitForm.visit_type}
                                    onChange={(e) =>
                                        setVisitForm({ ...visitForm, visit_type: e.target.value })
                                    }
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                >
                                    <option value="">Select</option>
                                    <option value="OutPatient">Out Patient</option>
                                    <option value="InPatient">In Patient</option>
                                </select>
                            </div>

                            {/* Visit Reason */}
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                    Visit Reason
                                </label>
                                <input
                                    type="text"
                                    value={visitForm.visit_reason}
                                    onChange={(e) =>
                                        setVisitForm({ ...visitForm, visit_reason: e.target.value })
                                    }
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Visit Date */}
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                    Visit Date
                                </label>
                                <input
                                    type="date"
                                    value={visitForm.visit_date}
                                    onChange={(e) =>
                                        setVisitForm({ ...visitForm, visit_date: e.target.value })
                                    }
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Time */}
                            <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                Select visit time (Start - End)
                            </label>
                            <div className="grid grid-cols-2 gap-4">

                                <input
                                    type="time"
                                    value={visitForm.visit_start_time}
                                    onChange={(e) =>
                                        setVisitForm({ ...visitForm, visit_start_time: e.target.value })
                                    }
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                />

                                <input
                                    type="time"
                                    value={visitForm.visit_end_time}
                                    onChange={(e) =>
                                        setVisitForm({ ...visitForm, visit_end_time: e.target.value })
                                    }
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Patient Category */}
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                    Assign this visit to a doctor
                                </label>
                                <select
                                    value={visitForm.assigned_doctor_id}
                                    onChange={(e) => setVisitForm({ ...visitForm, assigned_doctor_id: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                                >
                                    <option value="">Select Doctor</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-300 dark:border-gray-600">
                                <button
                                    type="submit"
                                    disabled={visitSubmitting}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                                >
                                    {visitSubmitting ? "Saving..." : "Create Visit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



        </>
    );
}
