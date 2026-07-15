import React, { useState, useEffect } from "react";
import { Edit, X, Search, Plus, ClipboardList } from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import axios from "axios";
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchTestTypes } from "../patients/patients_lab_tests_helper";


export function TestTypes() {

    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(true);
    const [testTypes, setTestTypes] = useState([]); //initialize state 

    //Use lab test types from the helper
    const loadTestTypes = async () => {
        setLoading(true);
        const data = await fetchTestTypes(token);
        setTestTypes(data);
    
        setLoading(false);
    };
    useEffect(() => {
        loadTestTypes();
    }, [token]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [currentType, setCurrentType] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: ""
    });
    const [isAdding, setIsAdding] = useState(false);

    // Pagination setup
    const [currentPage, setCurrentPage] = useState(1);

    // Number of test types per page
    const testTypesPerPage = 12;

    // Filter lab test types based on search query, 
    const filteredLabTestTypes = testTypes.filter((type) => {
        const query = searchQuery.toLowerCase();
        return (
            type.name.toLowerCase().includes(query) ||
            type.description.toLowerCase().includes(query)
        );
    });


    // Pagination calculations, based on filtered testtypes
    const indexOfLastCategory = currentPage * testTypesPerPage;
    const indexOfFirstCategory = indexOfLastCategory - testTypesPerPage;
    const currentTestTypes = filteredLabTestTypes.slice(
        indexOfFirstCategory,
        indexOfLastCategory
    );

    //Compute total pages for pagination
    const totalPages = Math.ceil(filteredLabTestTypes.length / testTypesPerPage);

    const nextPage = () =>
        setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
    const prevPage = () =>
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));

    const openAddModal = () => {
        setModalMode("add");
        setFormData({
            name: "",
            description: "",
            price: ""
        });

        setIsModalOpen(true);
    };

    const openEditModal = (type) => {
        setModalMode("edit");
        setCurrentType(type);
        setFormData({
            name: type.name,
            description: type.description || "",
            price: type.price ?? ""
        });
        setIsModalOpen(true);
    };


    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentType(null);
    };


    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this test type?")) {
            setTestTypes(testTypes.filter((type) => type.id !== id));
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    //Handle the addition of lab test types
    const handleAddAndEditSubmitSpecimens = async (e) => {
        e.preventDefault();

        const safeTrim = (value) => (value || "").trim();

        // Validation
        if (!safeTrim(formData.name)) {
            toast.error("Test type is required.");
            return;
        }

        if (formData.price === "" || Number(formData.price) < 0) {
            toast.error("A price is required for this test type.");
            return;
        }


        try {
            setIsAdding(true);

            if (modalMode === "add") {
                await axios.post(
                    `${API_BASE_URL}config/registerTestType`,
                    {
                        name: formData.name,
                        description: formData.description,
                        price: Number(formData.price),
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Test type added successfully");

            } else if (modalMode === "edit" && currentType) {
                await axios.post(
                    `${API_BASE_URL}config/UpdateTestType`,
                    {
                        id: currentType.id,
                        name: formData.name,
                        description: formData.description,
                        price: Number(formData.price),
                    },

                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );
                toast.success("Test type updated successfully");
            }

            loadTestTypes();

            // Reset form
            setFormData({
                name: "",
                description: "",
                price: ""
            });
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add test type");
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
                            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                                <ClipboardList className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Test Types</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{filteredLabTestTypes.length} type{filteredLabTestTypes.length !== 1 ? 's' : ''} available</p>
                            </div>
                        </div>
                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 transition-colors w-full sm:w-auto justify-center shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Test Type
                        </button>
                    </div>

                    {/* Search bar — standalone above the grid */}
                    <div className="relative max-w-sm mb-5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search test types..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        />
                    </div>

                    {/* Cards grid */}
                    <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6" borderRadius="0.75rem">
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Skeleton circle width={36} height={36} />
                                            <Skeleton width={110} height={14} />
                                        </div>
                                        <Skeleton width="90%" height={12} className="mb-1" />
                                        <Skeleton width="70%" height={12} className="mb-4" />
                                        <Skeleton width={64} height={28} />
                                    </div>
                                ))}
                            </div>
                        ) : currentTestTypes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {currentTestTypes.map((type) => (
                                    <div
                                        key={type.id}
                                        className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all duration-200"
                                    >
                                        {/* Icon + name */}
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-700 dark:text-violet-300 text-sm font-bold shrink-0 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/60 transition-colors">
                                                {type.name ? type.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug pt-1">
                                                {type.name}
                                            </p>
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                                            {type.description || <span className="italic">No description</span>}
                                        </p>

                                        {/* Price */}
                                        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-4">
                                            {type.price != null
                                                ? `UGX ${Number(type.price).toLocaleString()}`
                                                : <span className="font-normal italic text-gray-400">No price set</span>}
                                        </p>

                                        {/* Edit button */}
                                        <button
                                            onClick={() => openEditModal(type)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-800/40 transition-colors"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 py-16 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                                    <ClipboardList className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">No test types found</p>
                            </div>
                        )}
                    </SkeletonTheme>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
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

                {/* Modal */}
                {isModalOpen && (
                    <>
                        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 backdrop-blur-sm" onClick={closeModal} />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">

                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                                            <ClipboardList className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                            {modalMode === "add" ? "Add Test Type" : "Edit Test Type"}
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
                                    {["name", "description"].map((field) => (
                                        <div key={field}>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                                {field === "name" ? "Test Type Name" : "Description"}
                                                {field === "name" && <span className="text-red-500 ml-0.5">*</span>}
                                            </label>
                                            <input
                                                type="text"
                                                name={field}
                                                value={formData[field]}
                                                onChange={handleInputChange}
                                                placeholder={field === "name" ? "e.g. Biochemistry, Microbiology" : "Optional description"}
                                                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                                                required={field === "lab_section_name"}
                                            />
                                        </div>
                                    ))}

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                            Price (UGX) <span className="text-red-500 ml-0.5">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            placeholder="e.g. 15000"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                    </div>

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
                                            className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                        >
                                            {isAdding ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : modalMode === "add" ? "Add Test Type" : "Save Changes"}
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
