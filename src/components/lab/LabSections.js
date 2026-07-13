import React, { useState, useEffect } from "react";
import { Edit, X, Search, Plus, Grid3X3 } from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import axios from "axios";
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { fetchLabSections } from "../patients/patients_lab_tests_helper";


export function LabSections() {

    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(true);
    const [labSections, setLabSections] = useState([]); //initialize state 

    //Use lab sections from the helper
    const loadLabSections = async () => {
        setLoading(true);
        const data = await fetchLabSections(token);
        setLabSections(data);
        setLoading(false);
    };
    useEffect(() => {
        loadLabSections();
    }, [token]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [currentSection, setCurrentSection] = useState(null);

    const [formData, setFormData] = useState({
        lab_section_name: "",
        description: ""
    });
    const [isAdding, setIsAdding] = useState(false);

    // Pagination setup
    const [currentPage, setCurrentPage] = useState(1);

    // Number of lab sections per page
    const labSectionsPerPage = 6;

    // Filter lab sections based on search query, 
    // Filter lab sections based on search query, 
    const filteredLabSections = labSections.filter((section) => {
        const query = searchQuery.toLowerCase();
        return (
            (section.lab_section_name || "").toLowerCase().includes(query) ||
            (section.description || "").toLowerCase().includes(query)
        );
    });


    // Pagination calculations, based on filtered suppliers
    const indexOfLastCategory = currentPage * labSectionsPerPage;
    const indexOfFirstCategory = indexOfLastCategory - labSectionsPerPage;
    const currentLabSections = filteredLabSections.slice(
        indexOfFirstCategory,
        indexOfLastCategory
    );

    //Compute total pages for pagination
    const totalPages = Math.ceil(filteredLabSections.length / labSectionsPerPage);

    const nextPage = () =>
        setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
    const prevPage = () =>
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));

    const openAddModal = () => {
        setModalMode("add");
        setFormData({
            lab_section_name: "",
            description: ""
        });

        setIsModalOpen(true);
    };

    const openEditModal = (section) => {
        setModalMode("edit");
        setCurrentSection(section);
        setFormData({
            lab_section_name: section.lab_section_name,
            description: section.description || "",
        });
        setIsModalOpen(true);
    };


    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSection(null);
    };


    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this section?")) {
            setLabSections(labSections.filter((section) => section.id !== id));
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    //Handle the addition of lab sections
    const handleAddAndEditSubmitLabSections = async (e) => {
        e.preventDefault();

        const safeTrim = (value) => (value || "").trim();

        // Validation
        if (!safeTrim(formData.lab_section_name)) {
            toast.error("Lab section name is required.");
            return;
        }


        try {
            setIsAdding(true);

            if (modalMode === "add") {
                await axios.post(
                    `${API_BASE_URL}config/registerLabSection`,
                    {
                        lab_section_name: formData.lab_section_name,
                        description: formData.description,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Laboratory section added successfully");

            } else if (modalMode === "edit" && currentSection) {
                await axios.post(
                    `${API_BASE_URL}config/updateLabSection`,
                    {
                        id: currentSection.id,
                        name: formData.lab_section_name,
                        description: formData.description,
                    },

                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );
                toast.success("Laboratory section updated successfully");
            }

            loadLabSections();

            // Reset form
            setFormData({
                lab_section_name: "",
                description: ""

            });
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to Lab section");
            console.error("Error saving section:", error);
        } finally {
            setIsAdding(false); //  stop spinner
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
                            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                                <Grid3X3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Laboratory Sections</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{filteredLabSections.length} section{filteredLabSections.length !== 1 ? 's' : ''} configured</p>
                            </div>
                        </div>
                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 transition-colors w-full sm:w-auto justify-center shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Section
                        </button>
                    </div>

                    {/* Table card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* Search */}
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search sections..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[500px]">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section Name</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                        {loading ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <tr key={i}>
                                                    <td className="px-5 py-3.5"><Skeleton width={20} height={14} /></td>
                                                    <td className="px-5 py-3.5"><Skeleton width={160} height={14} /></td>
                                                    <td className="px-5 py-3.5"><Skeleton width={260} height={14} /></td>
                                                    <td className="px-5 py-3.5 text-right"><Skeleton width={64} height={28} /></td>
                                                </tr>
                                            ))
                                        ) : currentLabSections.length > 0 ? (
                                            currentLabSections.map((section, idx) => (
                                                <tr key={section.id} className="hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors">
                                                    <td className="px-5 py-3.5 text-xs text-gray-400 dark:text-gray-500 font-mono">
                                                        {indexOfFirstCategory + idx + 1}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {section.lab_section_name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                            {section.description || <span className="italic text-gray-400 dark:text-gray-500">No description</span>}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <button
                                                            onClick={() => openEditModal(section)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800/40 transition-colors"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-5 py-14 text-center">
                                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                                                        <Grid3X3 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">No lab sections found</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
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
                                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                            <Grid3X3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                            {modalMode === "add" ? "Add Lab Section" : "Edit Lab Section"}
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
                                <form onSubmit={handleAddAndEditSubmitLabSections} className="p-6 space-y-4">
                                    {["lab_section_name", "description"].map((field) => (
                                        <div key={field}>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                                {field === "lab_section_name" ? "Section Name" : "Description"}
                                                {field === "lab_section_name" && <span className="text-red-500 ml-0.5">*</span>}
                                            </label>
                                            <input
                                                type="text"
                                                name={field}
                                                value={formData[field]}
                                                onChange={handleInputChange}
                                                placeholder={field === "lab_section_name" ? "e.g. Haematology" : "Optional description"}
                                                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
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
                                            className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                        >
                                            {isAdding ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : modalMode === "add" ? "Add Section" : "Save Changes"}
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
