import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, Plus, Edit2, RefreshCwOff, HandCoins, Package, X, User, Phone, MapPin, CreditCard, DollarSign, Hash, ChevronRight, ChevronLeft } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from "react-router-dom";
import { fetchProductsItems } from '../products/products_helper';


export function PatientMedicalPrescriptions() {
    const navigate = useNavigate();
    const [prescriptions, setPrescriptions] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);

    //states to handle the update the prescription
    const [updateForm, setUpdateForm] = useState({
        prescription_id: null,
        prescription_notes: "",
        prescription_date: "",
        items: []
    });
    const [isUpdating, setIsUpdating] = useState(false);

    //States to handle the cancellation of the prescription
    const [cancelForm, setCancelForm] = useState({
        prescription_id: null,
        prescription_cancellation_reason: ""
    })
    const [isCancelling, setIsCancelling] = useState(false);

    //States to handle the dispensing confirmation of the prescription
    const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
    const [isDispensing, setIsDispensing] = useState(false);



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

    //Fetch prescriptions
    const fetchMedicalPrescriptions = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}sales/getMedicalPrescriptions`, {
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

            const prescriptionsData = response.data.prescriptions.data; // <-- only the array
            setPrescriptions(prescriptionsData);
            setCurrentPage(response.data.prescriptions.current_page);
            setTotalPages(response.data.prescriptions.last_page);

            console.log("Prescriptions fetched:", prescriptionsData);

        } catch (error) {
            console.error("Error fetching prescriptions:", error);
        } finally {
            setLoading(false);
        }
    };

    //fetch products
    const loadProducts = async () => {
        const data = await fetchProductsItems(token);
        setProducts(data);
    };

    //Mount the component
    useEffect(() => {
        loadProducts();
        fetchMedicalPrescriptions(1);
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => {
        fetchMedicalPrescriptions(1);
    };


    //Reset prescriptions to default
    const resetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchMedicalPrescriptions(1);
    };

    //Fetch and filter prescriptions
    const filteredMedicalPrescriptions = useMemo(() => {
        const term = searchTerm.toLowerCase();

        return prescriptions.filter((p) => {
            const matchesSearch =
                !term ||
                p.prescription_number?.toLowerCase().includes(term) ||
                p.prescriber?.name.toLowerCase().includes(term)

            const prescriptionDate = new Date(p.prescription_date);


            const matchesDateFrom = !dateFrom || prescriptionDate >= new Date(dateFrom);
            const matchesDateTo = !dateTo || prescriptionDate <= new Date(dateTo);

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [prescriptions, searchTerm, dateFrom, dateTo]);

    // Toggle row
    const toggleRow = (prescriptionNumber) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(prescriptionNumber)) {
            newExpanded.delete(prescriptionNumber);
        } else {
            newExpanded.add(prescriptionNumber);
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

    //open update modal
    const openUpdateModal = (prescription) => {
        setSelectedPrescription(prescription);

        setUpdateForm({
            prescription_id: prescription.id,
            prescription_notes: prescription.prescription_notes || "",
            prescription_date: prescription.prescription_date,
            items: prescription.items.map(item => ({
                id: item.id, // existing item
                drug_id: item.drug_id,
                strength: item.strength || "",
                instructions: item.instructions || "",
                quantity: item.quantity ?? null,
                duration_days: item.duration_days || 1
            }))
        });

        setIsUpdateModalOpen(true);
    };

    //Add prescription item
    const addUpdatePrescriptionItem = () => {
        setUpdateForm(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    drug_id: "",
                    strength: "",
                    instructions: "",
                    quantity: null,
                    duration_days: 1
                    // ❌ no id → new item
                }
            ]
        }));
    };

    //update prescription item
    const updateUpdatePrescriptionItem = (index, field, value) => {
        const items = [...updateForm.items];
        items[index][field] = value;
        setUpdateForm({ ...updateForm, items });
    };

    //Remove prescribed item
    const removeUpdatePrescriptionItem = (index) => {
        const items = updateForm.items.filter((_, i) => i !== index);
        setUpdateForm({ ...updateForm, items });
    };

    //Open the cancellation modal
    const openCancellationModal = (prescription) => {
        setSelectedPrescription(prescription);
        //Set the cancel form
        setCancelForm({
            prescription_id: prescription.id,
            prescription_cancellation_reason: prescription.prescription_cancellation_reason || "",
        });

        //set the opening of the cancellation modal
        setIsCancelModalOpen(true);
    };

    //Open the dispense modal
    const openDispenseModal = (prescription) => {
        setSelectedPrescription(prescription);
        setIsDispenseModalOpen(true);
    };




    //Function to Create an Update to the Medical Prescription
    const submitUpdatePrescription = async () => {


        for (let i = 0; i < updateForm.items.length; i++) {
            const item = updateForm.items[i];

            if (!item.drug_id) {
                toast.error(`Select medicine for item ${i + 1}`);
                return;
            }
            if (!item.instructions?.trim()) {
                toast.error(`Provide instructions for item ${i + 1}`);
                return;
            }
            if (!item.duration_days || item.duration_days <= 0) {
                toast.error(`Invalid duration days for item ${i + 1}`);
                return;
            }
        }


        try {
            setIsUpdating(true);
            const payload = {
                prescription_id: updateForm.prescription_id,
                prescription_notes: updateForm.prescription_notes,
                prescription_date: updateForm.prescription_date,
                items: updateForm.items.map(item => ({
                    ...(item.id && { id: item.id }), // 👈 only include if exists
                    drug_id: item.drug_id,
                    strength: item.strength,
                    instructions: item.instructions,
                    quantity: item.quantity,
                    duration_days: item.duration_days
                }))
            };

            const response = await axios.post(
                `${API_BASE_URL}sales/updatePrescription`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            toast.success(response.data.message);
            setIsUpdateModalOpen(false);
            fetchMedicalPrescriptions(currentPage);

        } catch (error) {
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            setIsUpdating(false);
        }
    };

    //Function to cancel the medical prescription
    const handlePrescriptionCancellation = async () => {


        try {
            setIsCancelModalOpen(true);

            const payload = {
                prescription_id: cancelForm.prescription_id,
                prescription_cancellation_reason: cancelForm.prescription_cancellation_reason,
            };

            const response = await axios.post(
                `${API_BASE_URL}sales/cancelMedicalPrescription`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            toast.success(response.data.message);
            setIsCancelModalOpen(false);
            fetchMedicalPrescriptions(currentPage);

        } catch (error) {
            toast.error(error.response?.data?.message || "Prescription Cancellation failed");
        } finally {
            setIsUpdating(false);
        }
    };

    //Function to handle the dispensing confirmation of the prescription
    const handleDispensePrescription = async () => {
        if (!selectedPrescription) return;

        try {
            setIsDispensing(true);

            const payload = {
                prescription_id: selectedPrescription.id,
            };

            const response = await axios.post(
                `${API_BASE_URL}sales/dispenseMedicalPrescription`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            toast.success(response.data.message);

            setIsDispenseModalOpen(false);
            fetchMedicalPrescriptions(currentPage);

        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to dispense prescription"
            );
        } finally {
            setIsDispensing(false);
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
                                Patient Medical Prescriptions and Dispensing Confirmations
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Prescriptions displayed are those registered in this current month ({new Date().toLocaleString('default', { month: 'long' })}) of {new Date().getFullYear()}. Adjust the filters above to view prescriptions in other periods
                        </p>
                    </div>


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
                                    placeholder="Search prescriptions..."
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
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {[
                                    "Prescription No",
                                    "Prescription Date",
                                    "Patient Name",
                                    "Visit No",
                                    "Visit Date",
                                    "Prescriber",
                                    "Status",
                                    "Actions",
                                ].map((head) => (
                                    <th
                                        key={head}
                                        className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider"
                                    >
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <>
                                    {[1, 2, 3, 4, 5, 7].map((i) => (
                                        <tr key={i}>
                                            {[...Array(8)].map((_, idx) => (
                                                <td key={idx} className="px-6 py-4">
                                                    <Skeleton />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </>
                            ) : filteredMedicalPrescriptions.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                                    >
                                        No prescriptions found for this period.
                                    </td>
                                </tr>
                            ) : (
                                filteredMedicalPrescriptions.map((prescription) => {
                                    const visit = prescription.visit;

                                    return (
                                        <React.Fragment key={prescription.id}>
                                            {/* Main Row */}
                                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                                <td className="px-6 py-4 font-bold text-purple-600 dark:text-purple-400">
                                                    {prescription.prescription_number}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-purple-600 dark:text-purple-400">
                                                    {prescription.prescription_date}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                    {visit?.patient?.name ?? "N/A"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                    {visit?.visit_number ?? "N/A"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                    {visit?.visit_date ?? "N/A"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                                                    {prescription.prescriber?.name ?? "N/A"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900 dark:text-gray-200 capitalize">
                                                    {prescription.prescription_status}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => toggleRow(prescription.id)}
                                                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                                    >
                                                        {expandedRows.has(prescription.id) ? (
                                                            <ChevronUp className="w-5 h-5" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5" />
                                                        )}
                                                    </button>

                                                    {/* Handle the update of the prescription */}
                                                    <button
                                                        onClick={() => openUpdateModal(prescription)}
                                                        className="text-blue-600 hover:text-blue-800 mr-2"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>

                                                    {/* Handle the cancellation of the subscription if its pending*/}
                                                    {prescription.prescription_status === "pending" && (
                                                        <button
                                                            onClick={() => openCancellationModal(prescription)}
                                                            className="text-blue-600 hover:text-blue-800 mr-2"
                                                        >
                                                            <RefreshCwOff className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {/* Handle the dispensin of the prescription if its pending*/}
                                                    {prescription.prescription_status === "pending" && (
                                                        <button
                                                            onClick={() => openDispenseModal(prescription)}
                                                            className="text-green-600 hover:text-green-800 mr-2"
                                                            title="Dispense prescription"
                                                        >
                                                            <Package className="w-4 h-4" />
                                                        </button>
                                                    )}


                                                </td>
                                            </tr>


                                            {/* Expanded Row */}
                                            {expandedRows.has(prescription.id) && (
                                                <>

                                                    {/* Prescribed Medicines Table */}
                                                    <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                                        <td colSpan={8} className="px-6 py-2">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-2 text-2xl text-center  font-bold">Medicines Prescribed</h4>
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full border border-gray-200 dark:border-gray-700">
                                                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                                                        <tr>
                                                                            <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>

                                                                            <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Strength</th>
                                                                            <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Instructions</th>
                                                                            <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Duration (days)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {prescription.items.map((item) => (
                                                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                                                                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200">{item.drug?.name}-{item.drug?.variant_options?.map((v) => v.option_value).join(" / ") || "N/A"}</td>

                                                                                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200">{item.strength || "N/A"}</td>
                                                                                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200">{item.instructions || "N/A"}</td>
                                                                                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200">{item.duration_days || "N/A"}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Prescriber Info */}
                                                    <tr className="bg-white dark:bg-gray-900 mt-5">
                                                        <td colSpan={8} className="px-6 py-2 border-t border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-2 font-semibold">Prescriber Info</h4>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                Name: {prescription.prescriber?.name || "N/A"}
                                                            </p>
                                                        </td>
                                                    </tr>

                                                    {/* Prescription Details */}
                                                    {/* Prescription Details */}
                                                    <tr className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                                                        <td colSpan={8} className="px-6 py-2">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-2 font-semibold">
                                                                Prescription Details
                                                            </h4>

                                                            <ul className="text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
                                                                <li>Source: {prescription.prescription_source}</li>
                                                                <li>Status: {prescription.prescription_status}</li>
                                                                <li>Created At: {new Date(prescription.created_at).toLocaleString()}</li>

                                                                {/* Show ONLY if cancelled */}
                                                                {prescription.prescription_status === "cancelled" && (
                                                                    <>
                                                                        <li className="text-red-600 dark:text-red-400 font-medium">
                                                                            Cancelled By: {prescription.cancelled_by?.name || "N/A"}
                                                                        </li>
                                                                        <li className="text-red-600 dark:text-red-400">
                                                                            Cancellation Reason: {prescription.prescription_cancellation_reason || "N/A"}
                                                                        </li>
                                                                    </>
                                                                )}
                                                                {/* Show if dispensed */}
                                                                {prescription.prescription_status === "dispensed" && (
                                                                    <>

                                                                        <li className="text-green-600 dark:text-green-600 font-bold">
                                                                            Dispensed By: {prescription.dispensed_by?.name || "N/A"}
                                                                            </li>
                                                                        <li className="text-green-600 dark:text-green-600 font-bold">
                                                                            Dispensed At:{" "}
                                                                            {prescription.dispensed_at
                                                                                ? new Date(prescription.dispensed_at).toLocaleString()
                                                                                : "N/A"}
                                                                        </li>
                                                                    </>
                                                                )}


                                                            </ul>
                                                        </td>
                                                    </tr>


                                                    {/* Patient Visit Info */}
                                                    <tr className="bg-white dark:bg-gray-900">
                                                        <td colSpan={8} className="px-6 py-2 border-t border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-2 font-semibold">Visit Information</h4>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                Visit Number: {visit?.visit_number || "N/A"} <br />
                                                                Visit Date: {visit?.visit_date || "N/A"} <br />
                                                                Patient Name: {visit?.patient?.name || "N/A"}
                                                            </p>
                                                        </td>
                                                    </tr>

                                                    {/* Prescription Notes */}
                                                    <tr className="bg-white dark:bg-gray-900">
                                                        <td colSpan={8} className="px-6 py-2 border-t border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-2 font-semibold">Prescription Notes</h4>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                {prescription.prescription_notes || "No notes"}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </>
                                            )}



                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>


                {/* Pagination */}
                <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                    {/* Showing info */}
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                        Showing {filteredMedicalPrescriptions.length} of {totalPages} results
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchMedicalPrescriptions(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => fetchMedicalPrescriptions(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>


            {/* Modal to update prescription */}
            {isUpdateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl
            bg-white dark:bg-gray-900 shadow-xl">

                        {/* ================= HEADER ================= */}
                        <div className="sticky top-0 z-10 flex items-center justify-between
                border-b border-gray-200 dark:border-gray-700
                px-6 py-4 bg-white dark:bg-gray-900">

                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Update Medical Prescription
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Modify medicines, instructions, or notes
                                </p>
                            </div>

                            <button
                                onClick={() => setIsUpdateModalOpen(false)}
                                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* ================= BODY ================= */}
                        <div className="px-6 py-6 space-y-8">

                            {/* ===== Meta ===== */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm text-gray-600 dark:text-gray-300">
                                        Prescription Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={updateForm.prescription_date}
                                        onChange={(e) =>
                                            setUpdateForm({
                                                ...updateForm,
                                                prescription_date: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                            px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* ===== Notes ===== */}
                            <div>
                                <label className="block mb-1 text-sm text-gray-600 dark:text-gray-300">
                                    Prescription Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={updateForm.prescription_notes}
                                    onChange={(e) =>
                                        setUpdateForm({
                                            ...updateForm,
                                            prescription_notes: e.target.value,
                                        })
                                    }
                                    placeholder="Additional instructions or remarks…"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                        px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                            </div>

                            {/* ================= MEDICINES ================= */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        Prescribed Medicines
                                    </h3>

                                    <button
                                        onClick={addUpdatePrescriptionItem}
                                        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add medicine
                                    </button>
                                </div>

                                {updateForm.items.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700
                        py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No medicines added
                                    </div>
                                )}

                                {updateForm.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700
                            p-4 grid grid-cols-1 md:grid-cols-7 gap-4
                            bg-gray-50 dark:bg-gray-800/50"
                                    >
                                        {/* Medicine */}
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                Medicine *
                                            </label>
                                            <select
                                                value={item.drug_id || ""}
                                                onChange={(e) =>
                                                    updateUpdatePrescriptionItem(
                                                        index,
                                                        "drug_id",
                                                        Number(e.target.value)
                                                    )
                                                }
                                                className="w-full rounded-lg px-3 py-2 text-sm
                                    bg-white dark:bg-gray-800
                                    text-gray-900 dark:text-white
                                    border border-gray-300 dark:border-gray-600
                                    focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                            >
                                                <option value="">Select medicine</option>
                                                {products.map((product) => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.name}
                                                        {product.variant_options?.length
                                                            ? " — " +
                                                            product.variant_options
                                                                .map(v => v.option_value)
                                                                .join(" / ")
                                                            : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Strength */}
                                        <div>
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                Strength
                                            </label>
                                            <input
                                                value={item.strength || ""}
                                                onChange={(e) =>
                                                    updateUpdatePrescriptionItem(
                                                        index,
                                                        "strength",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full rounded-lg px-3 py-2 text-sm
                                    bg-white dark:bg-gray-800
                                    text-gray-900 dark:text-white
                                    border border-gray-300 dark:border-gray-600"
                                            />
                                        </div>

                                        {/* Instructions */}
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                Instructions *
                                            </label>
                                            <input
                                                value={item.instructions || ""}
                                                onChange={(e) =>
                                                    updateUpdatePrescriptionItem(
                                                        index,
                                                        "instructions",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full rounded-lg px-3 py-2 text-sm
                                    bg-white dark:bg-gray-800
                                    text-gray-900 dark:text-white
                                    border border-gray-300 dark:border-gray-600"
                                            />
                                        </div>

                                        {/* Days */}
                                        <div>
                                            <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                Duration (days) *
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.duration_days}
                                                onChange={(e) =>
                                                    updateUpdatePrescriptionItem(
                                                        index,
                                                        "duration_days",
                                                        Number(e.target.value)
                                                    )
                                                }
                                                className="w-full rounded-lg px-3 py-2 text-sm
                                    bg-white dark:bg-gray-800
                                    text-gray-900 dark:text-white
                                    border border-gray-300 dark:border-gray-600"
                                            />
                                        </div>

                                        {/* Remove */}
                                        <div className="flex items-end justify-center">
                                            <button
                                                onClick={() => removeUpdatePrescriptionItem(index)}
                                                className="mb-1 rounded-lg p-2
                                    text-gray-500 hover:text-red-600
                                    hover:bg-gray-100 dark:hover:bg-gray-800"
                                                title="Remove medicine"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ================= FOOTER ================= */}
                        <div className="flex justify-end gap-3 px-6 py-4
                border-t border-gray-200 dark:border-gray-700
                bg-gray-50 dark:bg-gray-900">

                            <button
                                onClick={() => setIsUpdateModalOpen(false)}
                                className="px-5 py-2 rounded-lg text-sm
                    bg-gray-200 dark:bg-gray-700
                    text-gray-800 dark:text-gray-200"
                            >
                                Cancel
                            </button>

                            <button
                                disabled={isUpdating}
                                onClick={submitUpdatePrescription}
                                className="px-6 py-2 rounded-lg text-sm
                    bg-purple-600 hover:bg-purple-700
                    text-white disabled:opacity-50
                    flex items-center justify-center gap-2"
                            >
                                {isUpdating ? (
                                    <span className="loader border-2 border-t-transparent border-white
                        w-5 h-5 rounded-full animate-spin"></span>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal to cancel the medical prescription */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl
            bg-white dark:bg-gray-900 shadow-xl">

                        {/* ================= HEADER ================= */}
                        <div className="sticky top-0 z-10 flex items-center justify-between
                border-b border-gray-200 dark:border-gray-700
                px-6 py-4 bg-white dark:bg-gray-900">

                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Cancel Medical Prescription
                                </h2>

                            </div>

                            <button
                                onClick={() => setIsCancelModalOpen(false)}
                                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* ================= BODY ================= */}
                        <div className="px-6 py-6 space-y-8">


                            {/* ===== ===== */}
                            <div>
                                <label className="block mb-1 text-sm text-gray-600 dark:text-gray-300">
                                    Prescription Rejection Reason
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    value={cancelForm.prescription_cancellation_reason}
                                    onChange={(e) =>
                                        setCancelForm({
                                            ...cancelForm,
                                            prescription_cancellation_reason: e.target.value,
                                        })
                                    }
                                    placeholder="Add prescription rejection reason"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                        px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                            </div>


                        </div>

                        {/* ================= FOOTER ================= */}
                        <div className="flex justify-end gap-3 px-6 py-4
                border-t border-gray-200 dark:border-gray-700
                bg-gray-50 dark:bg-gray-900">

                            <button
                                onClick={() => setIsCancelModalOpen(false)}
                                className="px-5 py-2 rounded-lg text-sm
                    bg-gray-200 dark:bg-gray-700
                    text-gray-800 dark:text-gray-200"
                            >
                                Cancel
                            </button>

                            <button
                                disabled={isCancelling}
                                onClick={handlePrescriptionCancellation}
                                className="px-6 py-2 rounded-lg text-sm
                    bg-purple-600 hover:bg-purple-700
                    text-white disabled:opacity-50
                    flex items-center justify-center gap-2"
                            >
                                {isCancelling ? (
                                    <span className="loader border-2 border-t-transparent border-white
                        w-5 h-5 rounded-full animate-spin"></span>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Handle the modal to dispense the prescription */}
            {isDispenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-xl">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4
                border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Confirm Prescription Dispensing
                            </h2>
                            <button
                                onClick={() => setIsDispenseModalOpen(false)}
                                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                You are about to dispense this prescription:
                            </p>

                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-sm">
                                <p className="text-gray-800 dark:text-gray-200">
                                    <strong>Prescription No:</strong>{" "}
                                    {selectedPrescription?.prescription_number}
                                </p>
                                <p className="text-gray-800 dark:text-gray-200">
                                    <strong>Patient:</strong>{" "}
                                    {selectedPrescription?.visit?.patient?.name || "N/A"}
                                </p>
                            </div>

                            <p className="text-xs text-red-600 dark:text-red-400">
                                This action cannot be undone.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4
                border-t border-gray-200 dark:border-gray-700
                bg-gray-50 dark:bg-gray-900">

                            <button
                                onClick={() => setIsDispenseModalOpen(false)}
                                className="px-5 py-2 rounded-lg text-sm
                        bg-gray-200 dark:bg-gray-700
                        text-gray-800 dark:text-gray-200"
                            >
                                Cancel
                            </button>

                            <button
                                disabled={isDispensing}
                                onClick={handleDispensePrescription}
                                className="px-6 py-2 rounded-lg text-sm
                        bg-green-600 hover:bg-green-700
                        text-white disabled:opacity-50
                        flex items-center gap-2"
                            >
                                {isDispensing ? (
                                    <span className="loader border-2 border-t-transparent border-white
                            w-5 h-5 rounded-full animate-spin" />
                                ) : (
                                    "Yes, Dispense"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}




        </>
    );
}
