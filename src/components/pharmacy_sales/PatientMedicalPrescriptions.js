import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, Plus, Edit2, RefreshCwOff, HandCoins, Package, X, User, Phone, MapPin, CreditCard, DollarSign, Hash, ChevronRight, ChevronLeft, Pill, ClipboardList, FileCheck2, Ban, Clock, ReceiptText, Layers, AlertTriangle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from "react-router-dom";
import AsyncSelect from 'react-select/async';
import Select from 'react-select';
import { fetchProductsForAsyncSelect } from '../products/products_helper';
import { getSelectClassNames } from '../general/searchSelectStyles';


// Prescription status badge — mirrors the color language used elsewhere
// in the app (yellow=pending, green=success/dispensed, red=cancelled)
const PrescriptionStatusBadge = ({ status }) => {
    const map = {
        pending: {
            cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
            icon: Clock,
        },
        dispensed: {
            cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            icon: FileCheck2,
        },
        cancelled: {
            cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            icon: Ban,
        },
    };
    const cfg = map[status] ?? map.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${cfg.cls}`}>
            <Icon className="w-3 h-3" /> {status}
        </span>
    );
};

export function PatientMedicalPrescriptions() {
    const navigate = useNavigate();
    const [prescriptions, setPrescriptions] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [updateItemProductOptions, setUpdateItemProductOptions] = useState([]);
    const productDebounceRef = useRef(null);
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

    //States to handle the dispensing review + confirmation flow
    const [isDispenseReviewOpen, setIsDispenseReviewOpen] = useState(false);
    const [isDispensing, setIsDispensing] = useState(false);
    const [dispensePreviewLoading, setDispensePreviewLoading] = useState(false);
    const [dispensePreviewItems, setDispensePreviewItems] = useState([]);   // preview items augmented with chosen_batch_id
    const [dispensePreviewError, setDispensePreviewError] = useState(null);

    // UOM conversion data — fetched once on mount from the shared pharmacy
    // endpoint. Only base_uom + uom_conversions are used here; price/stock
    // fields in the same payload are intentionally ignored (prescriber must
    // not see stock or pricing while editing a prescription).
    const [uomConversions, setUomConversions] = useState([]);

    // Parallel array to updateForm.items — tracks the react-select option
    // object for each item's chosen dispensing UOM (needed for controlled Select).
    const [updateItemUomOptions, setUpdateItemUomOptions] = useState([]);

    // UOM warning modal (simplified — no navigation to Unit Converter,
    // since the prescriber is not the right role to fix product UOM config).
    const [showUomWarningModal, setShowUomWarningModal] = useState(false);
    const [uomWarningMsg, setUomWarningMsg] = useState({ drug: '', uom: '' });



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

    const loadProductOptions = (inputValue) =>
        new Promise((resolve) => {
            if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
            productDebounceRef.current = setTimeout(() => {
                fetchProductsForAsyncSelect(token, inputValue).then(resolve);
            }, 350);
        });

    // Fetch UOM conversions on mount — used by the update modal's UOM selects.
    useEffect(() => {
        const fetchUomConversions = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}items/getProductBaseUomAndItsUomConversions`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                });
                if (res.data.status === 'success') {
                    setUomConversions(res.data.products ?? []);
                }
            } catch {
                // Silent — UOM selects will just be empty if this fails
            }
        };
        fetchUomConversions();
    }, [token]);

    //Mount the component
    useEffect(() => {
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
                id: item.id,
                drug_id: item.drug_id,
                selected_uom_id: item.selected_uom_id ?? null,
                strength: item.strength || "",
                instructions: item.instructions || "",
                quantity: item.quantity ?? null,
                duration_days: item.duration_days || 1,
            }))
        });

        setUpdateItemProductOptions(prescription.items.map(item =>
            item.drug_id ? {
                value: item.drug_id,
                label: item.drug?.name
                    ? (item.drug.variant_options?.length
                        ? `${item.drug.name} – ${item.drug.variant_options.map(v => v.option_value).join(' / ')}`
                        : item.drug.name)
                    : String(item.drug_id),
                raw: item.drug || {}
            } : null
        ));

        // Pre-populate UOM option objects for each existing item so the
        // react-select is controlled and shows the saved UOM on open.
        setUpdateItemUomOptions(prescription.items.map(item => {
            if (!item.selected_uom_id || !item.drug_id) return null;
            // items/getProductBaseUomAndItsUomConversions identifies each
            // product by `id`, not `product_id`.
            const product = uomConversions.find(p => Number(p.id) === Number(item.drug_id));
            if (!product) return null;

            const conv = (product.uom_conversions ?? []).find(c => c.uom_id === item.selected_uom_id);
            if (!conv) return null;
            return { value: conv.uom_id, label: conv.name, multiplier: conv.multiplier };
        }));

        setIsUpdateModalOpen(true);
    };

    //Add prescription item
    const addUpdatePrescriptionItem = () => {
        setUpdateForm(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    // ❌ no id → new item
                    drug_id: "",
                    selected_uom_id: null,
                    strength: "",
                    instructions: "",
                    quantity: null,
                    duration_days: 1,
                }
            ]
        }));
        setUpdateItemProductOptions(prev => [...prev, null]);
        setUpdateItemUomOptions(prev => [...prev, null]);
    };

    //update prescription item field
    const updateUpdatePrescriptionItem = (index, field, value) => {
        const items = [...updateForm.items];
        items[index][field] = value;
        setUpdateForm({ ...updateForm, items });
    };

    // When the drug changes for an item, also reset its UOM selection
    const handleUpdateItemDrugChange = (index, option) => {
        const newOpts = [...updateItemProductOptions];
        newOpts[index] = option;
        setUpdateItemProductOptions(newOpts);
        updateUpdatePrescriptionItem(index, 'drug_id', option ? option.value : '');
        // Reset UOM since the new drug may have different conversions
        const newUomOpts = [...updateItemUomOptions];
        newUomOpts[index] = null;
        setUpdateItemUomOptions(newUomOpts);
        updateUpdatePrescriptionItem(index, 'selected_uom_id', null);
    };

    // Returns react-select options for the UOM dropdown for a given drug_id
    const getUomOptionsForDrug = (drug_id) => {
        if (!drug_id) return [];
        const product = uomConversions.find(p => Number(p.id) === Number(drug_id));
        if (!product) return [];
        return (product.uom_conversions ?? []).map(c => ({
            value: c.uom_id,
            label: c.name,
            multiplier: c.multiplier,
        }));
    };

    // Handles UOM change per item — blocks if no converter exists
    const handleUpdateItemUomChange = (index, option) => {
        const item = updateForm.items[index];
        if (option) {
            const opts = getUomOptionsForDrug(item.drug_id);
            const exists = opts.some(o => o.value === option.value);
            if (!exists) {
                const drugOpt = updateItemProductOptions[index];
                setUomWarningMsg({
                    drug: drugOpt?.label ?? '',
                    uom: option.label,
                });
                setShowUomWarningModal(true);
                return; // do not set the option
            }
        }
        const newUomOpts = [...updateItemUomOptions];
        newUomOpts[index] = option ?? null;
        setUpdateItemUomOptions(newUomOpts);
        updateUpdatePrescriptionItem(index, 'selected_uom_id', option ? option.value : null);
    };

    // Blue conversion info box for a specific item
    const renderUpdateUomHint = (drug_id, uom_option) => {
        if (!uom_option || !drug_id) return null;
        const product = uomConversions.find(p => Number(p.id) === Number(drug_id));
        if (!product) return null;
        const baseUomName = product.base_uom?.name ?? '';
        return (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-300 flex-shrink-0" />
                    <p className="text-xs text-blue-900 dark:text-white">
                        <span className="font-semibold">Conversion:</span>{' '}
                        1 {uom_option.label} = {uom_option.multiplier} {baseUomName}{uom_option.multiplier > 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        );
    };

    //Remove prescribed item
    const removeUpdatePrescriptionItem = (index) => {
        const items = updateForm.items.filter((_, i) => i !== index);
        setUpdateForm({ ...updateForm, items });
        setUpdateItemProductOptions(prev => prev.filter((_, i) => i !== index));
        setUpdateItemUomOptions(prev => prev.filter((_, i) => i !== index));
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

    // Open the dispensing review modal and immediately fetch the preview so
    // the pharmacist sees live batch availability before confirming.
    const openDispenseReview = async (prescription) => {
        setSelectedPrescription(prescription);
        setDispensePreviewItems([]);
        setDispensePreviewError(null);
        setDispensePreviewLoading(true);
        setIsDispenseReviewOpen(true);   // open now — show spinner inside modal

        try {
            const response = await axios.get(
                `${API_BASE_URL}sales/getPrescriptionDispensingPreview`,
                {
                    params: { prescription_id: prescription.id },
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                }
            );
            const items = response.data.items.map(item => ({
                ...item,
                // Pre-select FEFO suggestion so the pharmacist can confirm
                // without touching anything when stock is healthy.
                chosen_batch_id: item.suggested_batch_id,
            }));
            setDispensePreviewItems(items);
        } catch (error) {
            setDispensePreviewError(
                error.response?.data?.message || 'Failed to load dispensing preview'
            );
        } finally {
            setDispensePreviewLoading(false);
        }
    };

    const closeDispenseReview = () => {
        setIsDispenseReviewOpen(false);
        setSelectedPrescription(null);
        setDispensePreviewItems([]);
        setDispensePreviewError(null);
    };

    // Updates the pharmacist's chosen batch for one item in the preview list.
    const handleBatchChoiceChange = (prescriptionItemId, batchId) => {
        setDispensePreviewItems(prev =>
            prev.map(item =>
                item.prescription_item_id === prescriptionItemId
                    ? { ...item, chosen_batch_id: batchId }
                    : item
            )
        );
    };




    //Function to Create an Update to the Medical Prescription
    const submitUpdatePrescription = async () => {

        for (let i = 0; i < updateForm.items.length; i++) {
            const item = updateForm.items[i];

            if (!item.drug_id) {
                toast.error(`Select medicine for item ${i + 1}`);
                return;
            }
            if (!item.selected_uom_id) {
                toast.error(`Select a dispensing unit for item ${i + 1}`);
                return;
            }
            if (!item.instructions?.trim()) {
                toast.error(`Provide instructions for item ${i + 1}`);
                return;
            }
            if (!item.quantity || item.quantity <= 0) {
                toast.error(`Quantity is required for item ${i + 1}`);
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
                    ...(item.id && { id: item.id }), // only include if updating an existing item
                    drug_id: item.drug_id,
                    selected_uom_id: item.selected_uom_id,
                    strength: item.strength,
                    instructions: item.instructions,
                    quantity: item.quantity,
                    duration_days: item.duration_days,
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

        // Defensive guard — mirrors the Confirm button's disabled condition.
        const unresolvedItem = dispensePreviewItems.find(item => !item.chosen_batch_id);
        if (unresolvedItem) {
            toast.error(`Please resolve "${unresolvedItem.drug_name}" before dispensing`);
            return;
        }

        try {
            setIsDispensing(true);

            const payload = {
                prescription_id: selectedPrescription.id,
                items: dispensePreviewItems.map(item => ({
                    prescription_item_id: item.prescription_item_id,
                    batch_id: item.chosen_batch_id,
                })),
            };

            const response = await axios.post(
                `${API_BASE_URL}sales/dispenseMedicalPrescription`,
                payload,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );

            toast.success(response.data.message);
            closeDispenseReview();
            fetchMedicalPrescriptions(currentPage);

        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to dispense prescription');
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
                                Patient Visit Prescriptions and Dispensing 
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
                                    const isExpanded = expandedRows.has(prescription.id);
                                    const itemCount = prescription.items?.length ?? 0;

                                    return (
                                        <React.Fragment key={prescription.id}>
                                            {/* MAIN ROW */}
                                            <tr
                                                className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer ${isExpanded ? 'bg-purple-50/40 dark:bg-purple-900/10' : ''}`}
                                                onClick={() => toggleRow(prescription.id)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Pill className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                                                        <span className="font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                                            {prescription.prescription_number}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {formatDate(prescription.prescription_date)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-300 text-xs font-bold flex-shrink-0">
                                                            {(visit?.patient?.name || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
                                                            {visit?.patient?.name ?? "N/A"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {visit?.visit_number ?? "N/A"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {visit?.visit_date ?? "N/A"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {prescription.prescriber?.name ?? "N/A"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <PrescriptionStatusBadge status={prescription.prescription_status} />
                                                </td>
                                                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => toggleRow(prescription.id)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition"
                                                            title={isExpanded ? "Collapse" : "Expand"}
                                                        >
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>

                                                        <button
                                                            onClick={() => openUpdateModal(prescription)}
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                            title="Edit prescription"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>

                                                        {prescription.prescription_status === "pending" && (
                                                            <>
                                                                <button
                                                                    onClick={() => openCancellationModal(prescription)}
                                                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                                                    title="Cancel prescription"
                                                                >
                                                                    <RefreshCwOff className="w-4 h-4" />
                                                                </button>

                                                                <button
                                                                    onClick={() => openDispenseReview(prescription)}
                                                                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                                                                    title="Review & dispense prescription"
                                                                >
                                                                    <Package className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* EXPANDED ROW */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={8} className="p-0 bg-gray-50 dark:bg-gray-800/60 border-b-2 border-purple-100 dark:border-purple-900/40">
                                                        <div className="h-0.5 w-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />

                                                        <div className="p-6 space-y-6">

                                                            {/* Medicines table */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <ClipboardList className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                                                            Medicines Prescribed
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-purple-500 dark:text-purple-400">
                                                                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                                                    </span>
                                                                </div>

                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm">
                                                                        <thead className="bg-gray-50 dark:bg-gray-800/60">
                                                                            <tr>
                                                                                {['Medicine', 'Quantity', 'Strength', 'Instructions', 'Duration'].map(h => (
                                                                                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                                                        {h}
                                                                                    </th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                            {prescription.items.map((item) => (
                                                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                                                                                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                                                                                        {item.drug?.name}
                                                                                        {item.drug?.variant_options?.length > 0 && (
                                                                                            <span className="text-gray-400 dark:text-gray-500 font-normal">
                                                                                                {' – '}{item.drug.variant_options.map((v) => v.option_value).join(" / ")}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                                                                                        {item.quantity != null
                                                                                            ? `${item.quantity} ${item.selected_uom?.name ?? 'unit'}${item.quantity !== 1 ? 's' : ''}`
                                                                                            : "N/A"}
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{item.strength || "N/A"}</td>
                                                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{item.instructions || "N/A"}</td>
                                                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                                                                                        {item.duration_days ? `${item.duration_days} day${item.duration_days > 1 ? 's' : ''}` : "N/A"}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>

                                                            </div>

                                                            {/* Info cards grid */}
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                                                {/* Prescriber & details */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center gap-2">
                                                                        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Prescriber & Details</span>
                                                                    </div>
                                                                    <div className="p-3 space-y-2">
                                                                        {[
                                                                            { label: 'Prescriber', value: prescription.prescriber?.name },
                                                                            { label: 'Source', value: prescription.prescription_source },
                                                                            { label: 'Status', value: prescription.prescription_status },
                                                                            { label: 'Created', value: new Date(prescription.created_at).toLocaleString() },
                                                                        ].map(({ label, value }) => (
                                                                            <div key={label} className="flex items-start justify-between gap-2">
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                                                                                <span className="text-xs font-medium text-right capitalize truncate max-w-[55%] text-gray-700 dark:text-gray-200">
                                                                                    {value || '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}

                                                                        {prescription.prescription_status === "cancelled" && (
                                                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <span className="text-xs text-red-400 shrink-0">Cancelled by</span>
                                                                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 text-right">{prescription.cancelled_by?.name || "N/A"}</span>
                                                                                </div>
                                                                                <p className="text-xs text-red-600 dark:text-red-400 italic">
                                                                                    "{prescription.prescription_cancellation_reason || "N/A"}"
                                                                                </p>
                                                                            </div>
                                                                        )}

                                                                        {prescription.prescription_status === "dispensed" && (
                                                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <span className="text-xs text-green-500 shrink-0">Dispensed by</span>
                                                                                    <span className="text-xs font-semibold text-green-700 dark:text-green-400 text-right">{prescription.dispensed_by?.name || "N/A"}</span>
                                                                                </div>
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <span className="text-xs text-green-500 shrink-0">Dispensed at</span>
                                                                                    <span className="text-xs font-semibold text-green-700 dark:text-green-400 text-right">
                                                                                        {prescription.dispensed_at ? new Date(prescription.dispensed_at).toLocaleString() : "N/A"}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Visit info */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                                                                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Visit Information</span>
                                                                    </div>
                                                                    <div className="p-3 space-y-2">
                                                                        {[
                                                                            { label: 'Visit Number', value: visit?.visit_number },
                                                                            { label: 'Visit Date', value: visit?.visit_date },
                                                                            { label: 'Patient', value: visit?.patient?.name },
                                                                        ].map(({ label, value }) => (
                                                                            <div key={label} className="flex items-start justify-between gap-2">
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                                                                                <span className="text-xs font-medium text-right truncate max-w-[55%] text-gray-700 dark:text-gray-200">
                                                                                    {value || '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Notes */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-center gap-2">
                                                                        <ClipboardList className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Prescription Notes</span>
                                                                    </div>
                                                                    <div className="p-3">
                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                                                            {prescription.prescription_notes || "No notes recorded"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </td>
                                                </tr>
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
                                        className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50"
                                    >
                                        {/* Row 1: fields grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-9 gap-4">

                                            {/* Medicine */}
                                            <div className="md:col-span-2">
                                                <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                    Medicine *
                                                </label>
                                                <AsyncSelect
                                                    loadOptions={loadProductOptions}
                                                    defaultOptions
                                                    value={updateItemProductOptions[index] ?? null}
                                                    onChange={(option) => handleUpdateItemDrugChange(index, option)}
                                                    classNames={getSelectClassNames()}
                                                    isClearable
                                                    placeholder="Search medicine..."
                                                />
                                            </div>

                                            {/* Dispensing Unit */}
                                            <div className="md:col-span-1">
                                                <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                    Unit *
                                                </label>
                                                <Select
                                                    options={getUomOptionsForDrug(item.drug_id)}
                                                    value={updateItemUomOptions[index] ?? null}
                                                    onChange={(option) => handleUpdateItemUomChange(index, option)}
                                                    classNames={getSelectClassNames()}
                                                    isClearable
                                                    isDisabled={!item.drug_id}
                                                    placeholder={item.drug_id ? "Unit…" : "—"}
                                                />
                                            </div>

                                            {/* Strength */}
                                            <div>
                                                <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                    Strength
                                                </label>
                                                <input
                                                    value={item.strength || ""}
                                                    onChange={(e) => updateUpdatePrescriptionItem(index, "strength", e.target.value)}
                                                    className="w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                                />
                                            </div>

                                            {/* Instructions */}
                                            <div className="md:col-span-2">
                                                <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                    Instructions *
                                                </label>
                                                <input
                                                    value={item.instructions || ""}
                                                    onChange={(e) => updateUpdatePrescriptionItem(index, "instructions", e.target.value)}
                                                    className="w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <div>
                                                <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                    {updateItemUomOptions[index] ? `Qty (in ${updateItemUomOptions[index].label})` : "Qty"} <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity ?? ""}
                                                    onChange={(e) => updateUpdatePrescriptionItem(index, "quantity", e.target.value === "" ? null : Number(e.target.value))}
                                                    placeholder={updateItemUomOptions[index] ? "e.g. 3" : "Select a unit first"}
                                                    className="w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                                />
                                            </div>

                                            {/* Duration */}
                                            <div>
                                                <label className="block mb-1 text-xs text-gray-600 dark:text-gray-400">
                                                    Days
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.duration_days}
                                                    onChange={(e) => updateUpdatePrescriptionItem(index, "duration_days", Number(e.target.value))}
                                                    className="w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                                />
                                            </div>

                                            {/* Remove */}
                                            <div className="flex items-end justify-center">
                                                <button
                                                    onClick={() => removeUpdatePrescriptionItem(index)}
                                                    className="mb-1 rounded-lg p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    title="Remove medicine"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Row 2: conversion hint (only when a UOM is selected) */}
                                        {renderUpdateUomHint(item.drug_id, updateItemUomOptions[index])}
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


            {/* ── Dispensing Review Modal ───────────────────────────────────────
                Loads the preview from getPrescriptionDispensingPreview so the
                pharmacist can see live batch availability and override the FEFO
                suggestion per item before confirming the dispense.           
            ─────────────────────────────────────────────────────────────────── */}
            {isDispenseReviewOpen && (() => {
                // Items that cannot be resolved (no batch can be chosen for them)
                const unresolvedItems = dispensePreviewItems.filter(item => !item.chosen_batch_id);
                const canConfirm =
                    !dispensePreviewLoading &&
                    !isDispensing &&
                    dispensePreviewItems.length > 0 &&
                    unresolvedItems.length === 0;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 shadow-xl">

                            {/* ── HEADER ── */}
                            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-emerald-600">
                                <div className="flex items-start gap-3">
                                    <Package className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h2 className="text-base font-semibold text-white leading-tight">
                                            Review & Dispense Prescription
                                        </h2>
                                        <p className="text-green-100 text-xs mt-0.5">
                                            {selectedPrescription?.prescription_number}
                                            {selectedPrescription?.visit?.patient?.name
                                                ? ` · ${selectedPrescription.visit.patient.name}`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeDispenseReview}
                                    className="rounded-full p-2 hover:bg-white/20 transition"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* ── BODY ── */}
                            <div className="px-6 py-6 space-y-4">

                                {/* Loading state */}
                                {dispensePreviewLoading && (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
                                        <RefreshCw className="w-8 h-8 animate-spin text-green-500" />
                                        <p className="text-sm">Loading dispensing details…</p>
                                    </div>
                                )}

                                {/* Error state */}
                                {dispensePreviewError && !dispensePreviewLoading && (
                                    <div className="flex flex-col items-center gap-4 py-12">
                                        <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 w-full">
                                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-700 dark:text-red-300">{dispensePreviewError}</p>
                                        </div>
                                        <button
                                            onClick={() => openDispenseReview(selectedPrescription)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Retry
                                        </button>
                                    </div>
                                )}

                                {/* Item cards */}
                                {!dispensePreviewLoading && !dispensePreviewError && dispensePreviewItems.map(item => {
                                    // Compute displayed UOM quantity (base ÷ multiplier)
                                    const qtyInUom = item.multiplier && item.prescribed_quantity
                                        ? Math.round((item.prescribed_quantity / item.multiplier) * 1000) / 1000
                                        : null;


                                    // Base UOM name from the conversions already loaded for the update modal
                                    const baseUomName = uomConversions.find(p => Number(p.id) === Number(item.drug_id))?.base_uom?.name ?? 'units';
                                    // Build react-select options for the batch selector
                                    const batchOptions = (item.eligible_batches ?? []).map(b => ({
                                        value: b.batch_id,
                                        label: `${b.batch_number}  |  Exp: ${b.expiry_date}  |  Stock: ${b.quantity_in_base_uom} ${baseUomName}  |  UGX ${b.discounted_selling_price}`,
                                        batch: b,
                                    }));
                                    const chosenOption = batchOptions.find(o => o.value === item.chosen_batch_id) ?? null;

                                    return (
                                        <div
                                            key={item.prescription_item_id}
                                            className={`rounded-xl border p-4 space-y-3 ${item.conversion_missing
                                                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                                                : item.insufficient_stock && !item.chosen_batch_id
                                                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
                                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                                                }`}
                                        >
                                            {/* Drug name + variant */}
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {item.drug_name}
                                                    {item.variant_options?.length > 0 && (
                                                        <span className="text-gray-400 dark:text-gray-500 font-normal">
                                                            {' – '}{item.variant_options.map(v => v.option_value ?? v).join(' / ')}
                                                        </span>
                                                    )}
                                                </p>
                                                {/* Resolved indicator */}
                                                {!item.conversion_missing && item.chosen_batch_id && (
                                                    <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full flex-shrink-0">
                                                        Ready
                                                    </span>
                                                )}
                                                {(item.conversion_missing || (!item.chosen_batch_id)) && (
                                                    <span className="text-xs font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full flex-shrink-0">
                                                        Needs attention
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quantity context — "3 strips × 10 = 30 tablets needed" */}
                                            {!item.conversion_missing && item.prescribed_quantity != null && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {qtyInUom != null
                                                        ? `${qtyInUom} ${item.uom_name ?? 'unit'}${qtyInUom !== 1 ? 's' : ''} × ${item.multiplier} = `
                                                        : ''}
                                                    <span className="font-bold text-purple-500">
                                                        <strong>{item.prescribed_quantity} {baseUomName}{item.prescribed_quantity !== 1 ? 's' : ''} needed to dispense</strong> 
                                                    </span>
                                                </p>
                                            )}

                                            {/* ── conversion_missing block ── */}
                                            {item.conversion_missing && (
                                                <div className="flex items-start gap-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 px-3 py-2.5">
                                                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-red-700 dark:text-red-300">
                                                        Unit conversion is no longer configured for this drug/unit combination.
                                                        This item cannot be dispensed until a pharmacy administrator
                                                        restores the unit conversion in the Product Unit Converter.
                                                    </p>
                                                </div>
                                            )}

                                            {/* ── insufficient_stock warning + eligible batches ── */}
                                            {!item.conversion_missing && item.insufficient_stock && (
                                                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 px-3 py-2.5">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                    <div className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                                                        <p className="font-semibold">Insufficient stock</p>
                                                        <p>
                                                            No single batch holds enough to cover{' '}
                                                            <strong>{item.prescribed_quantity} {baseUomName}s</strong>.
                                                            {item.eligible_batches?.length > 0
                                                                ? ' Best available batches are shown below — select one to override, or resolve stock first.'
                                                                : ' No batches with available stock exist for this drug.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Batch selector (shown for all non-conversion_missing items) ── */}
                                            {!item.conversion_missing && item.eligible_batches?.length > 0 && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                                        {item.insufficient_stock ? 'Available batches (override)' : 'Batch to dispense from'}
                                                    </label>
                                                    <Select
                                                        options={batchOptions}
                                                        value={chosenOption}
                                                        onChange={opt =>
                                                            handleBatchChoiceChange(
                                                                item.prescription_item_id,
                                                                opt ? opt.value : null
                                                            )
                                                        }
                                                        classNames={getSelectClassNames()}
                                                        isClearable={false}
                                                        placeholder="Select a batch…"
                                                    />
                                                </div>
                                            )}

                                            {/* No batches at all */}
                                            {!item.conversion_missing && item.eligible_batches?.length === 0 && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                                    No batches with available stock found for this drug in this branch.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>


                            {/* ── FOOTER ── */}
                            <div className="sticky bottom-0 flex flex-col gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">

                                {/* Billing notice — dispensing bills the patient's visit immediately */}
                                {/* Billing notice — dispensing bills the patient's visit immediately */}
                                {!dispensePreviewLoading && !dispensePreviewError && dispensePreviewItems.length > 0 && (() => {
                                    // Sum (chosen batch's price × prescribed base-UOM quantity) across every
                                    // item that currently has a batch chosen. Items still needing attention
                                    // (no chosen_batch_id, or conversion_missing) have no price to attach yet,
                                    // so they're excluded from the running total rather than treated as zero.
                                    const resolvedTotal = dispensePreviewItems.reduce((sum, item) => {
                                        if (item.conversion_missing || !item.chosen_batch_id) return sum;
                                        const chosenBatch = (item.eligible_batches ?? []).find(
                                            b => b.batch_id === item.chosen_batch_id
                                        );
                                        if (!chosenBatch) return sum;
                                        const unitPrice = Number(chosenBatch.discounted_selling_price) || 0;
                                        const qty = Number(item.prescribed_quantity) || 0;
                                        return sum + unitPrice * qty;
                                    }, 0);

                                    return (
                                        <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
                                            <ReceiptText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                                <p>
                                                    Confirming will bill{' '}
                                                    <strong>{selectedPrescription?.visit?.patient?.name || "this patient"}</strong>'s
                                                    visit invoice for every item dispensed below, at the price of the batch selected.
                                                </p>
                                                <p className="flex items-baseline gap-1.5">
                                                    <strong><span className="font-medium">Estimated total:</span></strong>
                                                    <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                                        UGX {resolvedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    {unresolvedItems.length > 0 && (
                                                        <span className="text-blue-600/80 dark:text-blue-400/80 italic">
                                                            — will increase once {unresolvedItems.length} remaining item{unresolvedItems.length > 1 ? 's are' : ' is'} resolved
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Unresolved count hint */}
                                {!dispensePreviewLoading && !dispensePreviewError && unresolvedItems.length > 0 && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                        {unresolvedItems.length} item{unresolvedItems.length > 1 ? 's' : ''} need{unresolvedItems.length === 1 ? 's' : ''} attention before you can dispense.
                                    </p>
                                )}

                                <div className="flex justify-end gap-3">

                                    <button
                                        onClick={closeDispenseReview}
                                        className="px-5 py-2 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        disabled={!canConfirm}
                                        onClick={handleDispensePrescription}
                                        className="px-6 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center gap-2 transition"
                                    >
                                        {isDispensing ? (
                                            <span className="border-2 border-t-transparent border-white w-4 h-4 rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Package className="w-4 h-4" />
                                                Confirm & Dispense
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}


            {/* UOM Conversion Warning Modal (prescribing context) */}
            {/* No "Go to Unit Converter" button — the prescriber is not the
                right role to fix product UOM configuration.              */}
            {showUomWarningModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
                        <div className="bg-red-50 dark:bg-red-900 px-6 py-4 border-b border-red-200 dark:border-red-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                <h2 className="font-semibold text-red-900 dark:text-white text-sm">
                                    Unit Conversion Not Found
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowUomWarningModal(false)}
                                className="text-red-400 hover:text-red-600 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 dark:text-gray-200 text-sm mb-4">
                                The unit <span className="font-semibold text-gray-900 dark:text-white">{uomWarningMsg.uom}</span> is
                                not configured as a dispensing unit for{' '}
                                <span className="font-semibold text-gray-900 dark:text-white">{uomWarningMsg.drug}</span>.
                            </p>
                            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-5">
                                <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                                    A pharmacy administrator needs to add this unit conversion in the Product Unit Converter before it can be used for prescribing.
                                </p>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowUomWarningModal(false)}
                                    className="px-5 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
                                >
                                    Choose a different unit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}
