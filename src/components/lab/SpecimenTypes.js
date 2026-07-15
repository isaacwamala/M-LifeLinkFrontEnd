import React, { useState, useEffect } from "react";
import { Edit, X, Search, Plus, Droplets } from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import axios from "axios";
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { fetchSpecimenTypes } from "../patients/patients_lab_tests_helper";


export function SpecimenTypes() {

    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(true);
    const [specimens, setSpecimens] = useState([]); //initialize state 

    //Use lab specimensfrom the helper
    const loadSpecimens = async () => {
        setLoading(true);
        const data = await fetchSpecimenTypes(token);
        setSpecimens(data);

        setLoading(false);
    };
    useEffect(() => {
        loadSpecimens();
    }, [token]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [currentSpecimen, setCurrentSpecimen] = useState(null);

    const [formData, setFormData] = useState({
        specimen_name: "",
        description: ""
    });
    const [isAdding, setIsAdding] = useState(false);

    // Pagination setup
    const [currentPage, setCurrentPage] = useState(1);

    // Number of lab specimens per page (2-column grid → 8 rows)
    const specimensPerPage = 16;

    // Filter lab specimens based on search query, 
    // Filter lab specimens based on search query, 
    const filteredLabSpecimens = specimens.filter((specimen) => {
        const query = searchQuery.toLowerCase();
        return (
            (specimen.specimen_name || "").toLowerCase().includes(query) ||
            (specimen.description || "").toLowerCase().includes(query)
        );
    });


    // Pagination calculations, based on filtered specimens
    const indexOfLastCategory = currentPage * specimensPerPage;
    const indexOfFirstCategory = indexOfLastCategory - specimensPerPage;
    const currentSpecimens = filteredLabSpecimens.slice(
        indexOfFirstCategory,
        indexOfLastCategory
    );

    //Compute total pages for pagination
    const totalPages = Math.ceil(filteredLabSpecimens.length / specimensPerPage);

    const nextPage = () =>
        setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
    const prevPage = () =>
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));

    const openAddModal = () => {
        setModalMode("add");
        setFormData({
            specimen_name: "",
            description: ""
        });

        setIsModalOpen(true);
    };

    const openEditModal = (specimen) => {
        setModalMode("edit");
        setCurrentSpecimen(specimen);
        setFormData({
            specimen_name: specimen.specimen_name,
            description: specimen.description || "",
        });
        setIsModalOpen(true);
    };


    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSpecimen(null);
    };


    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this specimen?")) {
            setSpecimens(specimens.filter((specimen) => specimen.id !== id));
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    //Handle the addition of lab specimens
    const handleAddAndEditSubmitSpecimens = async (e) => {
        e.preventDefault();

        const safeTrim = (value) => (value || "").trim();

        // Validation
        if (!safeTrim(formData.specimen_name)) {
            toast.error("Specimen  name is required.");
            return;
        }


        try {
            setIsAdding(true);

            if (modalMode === "add") {
                await axios.post(
                    `${API_BASE_URL}config/registerSpecimen`,
                    {
                        specimen_name: formData.specimen_name,
                        description: formData.description,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Specimen name added successfully");

            } else if (modalMode === "edit" && currentSpecimen) {
                await axios.post(
                    `${API_BASE_URL}config/updateSpecimen`,
                    {
                        id: currentSpecimen.id,
                        specimen_name: formData.specimen_name,
                        description: formData.description,
                    },

                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );
                toast.success("Specimen added successfully");
            }

            loadSpecimens();

            // Reset form
            setFormData({
                specimen_name: "",
                description: ""

            });
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add specimen");
        } finally {
            setIsAdding(false);
        }
    };




    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 sm:p-8 transition-colors duration-300 dashboard">
                <div className="w-full">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                <Droplets className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Specimen Types</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{filteredLabSpecimens.length} specimen{filteredLabSpecimens.length !== 1 ? 's' : ''} registered</p>
                            </div>
                        </div>
                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors w-full sm:w-auto justify-center shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Specimen
                        </button>
                    </div>

                    {/* List card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* Search */}
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search specimens..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        {/* Grid */}
                        <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6">
                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <Skeleton circle width={36} height={36} />
                                            <div className="flex-1">
                                                <Skeleton width={110} height={13} className="mb-1.5" />
                                                <Skeleton width={160} height={11} />
                                            </div>
                                            <Skeleton width={48} height={28} borderRadius={8} />
                                        </div>
                                    ))}
                                </div>
                            ) : currentSpecimens.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                                    {currentSpecimens.map((specimen) => (
                                        <div
                                            key={specimen.id}
                                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors group"
                                        >
                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-sm font-bold shrink-0">
                                                {specimen.specimen_name ? specimen.specimen_name.charAt(0).toUpperCase() : '?'}
                                            </div>

                                            {/* Name + description */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                    {specimen.specimen_name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    {specimen.description || <span className="italic">No description</span>}
                                                </p>
                                            </div>

                                            {/* Edit */}
                                            <button
                                                onClick={() => openEditModal(specimen)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-800/40 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-5 py-14 text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                                        <Droplets className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No specimens found</p>
                                </div>
                            )}
                        </SkeletonTheme>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Page <span className="font-semibold text-gray-700 dark:text-gray-300">{currentPage}</span> of <span className="font-semibold text-gray-700 dark:text-gray-300">{totalPages}</span>
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={prevPage}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        ← Prev
                                    </button>
                                    <button
                                        onClick={nextPage}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <>
                        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 backdrop-blur-sm" onClick={closeModal} />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">

                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                            <Droplets className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                            {modalMode === "add" ? "Add Specimen" : "Edit Specimen"}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* on submit, call the function that handles both editing and adding */}
                                <form onSubmit={handleAddAndEditSubmitSpecimens} className="p-6 space-y-4">
                                    {["specimen_name", "description"].map((field) => (
                                        <div key={field}>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                                {field === "specimen_name" ? "Specimen Name" : "Description"}
                                                {field === "specimen_name" && <span className="text-red-500 ml-0.5">*</span>}
                                            </label>
                                            <input
                                                type="text"
                                                name={field}
                                                value={formData[field]}
                                                onChange={handleInputChange}
                                                placeholder={field === "specimen_name" ? "e.g. Blood, Urine, Swab" : "Optional description"}
                                                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                                                required={field === "lab_section_name"}
                                            />
                                        </div>
                                    ))}

                                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            disabled={isAdding}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isAdding}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                        >
                                            {isAdding ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : modalMode === "add" ? "Add Specimen" : "Save Changes"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>

    );
}
