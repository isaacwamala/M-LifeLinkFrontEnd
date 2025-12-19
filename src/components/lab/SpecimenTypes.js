import React, { useState, useEffect } from "react";
import { Edit, Eye, X, Shield, Store, Users } from "lucide-react";
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

    // Number of lab specimens per page
    const specimensPerPage = 12;

    // Filter lab specimens based on search query, 
    const filteredLabSpecimens = specimens.filter((specimen) => {
        const query = searchQuery.toLowerCase();
        return (
            specimen.specimen_name.toLowerCase().includes(query) ||
            specimen.description.toLowerCase().includes(query)
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
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8 transition-colors duration-300 dashboard">
                <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                           Specimens
                        </h1>
                        <button
                            onClick={openAddModal}
                            className="px-5 py-2.5 text-white font-bold rounded bg-gradient-to-r from-blue-700 to-purple-900 transition-colors duration-200 w-full md:w-auto"
                        >
                            + Add specimen
                        </button>
                    </div>


                    <input
                        type="text"
                        placeholder="Search specimen by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full mb-6 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* lab sections grid */}
                    <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6" borderRadius="0.75rem">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                // 🦴 Skeleton placeholders while fetching lab sections
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg shadow border border-gray-200 dark:border-gray-600"
                                    >
                                        <Skeleton width={`80%`} height={20} className="mb-2" />
                                        <Skeleton width={`60%`} height={16} className="mb-2" />
                                        <Skeleton width={`90%`} height={16} className="mb-2" />
                                        <Skeleton width={`50%`} height={16} className="mb-2" />
                                        <Skeleton width={`70%`} height={16} className="mb-2" />
                                        <Skeleton width={`100%`} height={16} className="mb-3" />

                                        <div className="flex gap-3 mt-4">
                                            <Skeleton height={36} width="48%" />
                                            <Skeleton height={36} width="48%" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Current lab  specimens
                                currentSpecimens.map((specimen) => (
                                    <div
                                        key={specimen.id}
                                        className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg shadow border border-gray-200 dark:border-gray-600"
                                    >
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {specimen.specimen_name}
                                        </h3>

                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {specimen.description || 'No description'}
                                        </h3>


                                        <div className="flex gap-3 mt-4">
                                            <button
                                                onClick={() => openEditModal(specimen)}
                                                className="flex-1 px-4 py-2 text-white font-bold rounded-lg bg-gradient-to-r from-blue-700 to-purple-900 transition-colors duration-300"
                                            >
                                                Edit
                                            </button>

                                            {/* <button
                                                onClick={() => handleDelete(supplier.id)}
                                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-500"
                                            >
                                                Delete
                                            </button> */}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </SkeletonTheme>


                    {/* Pagination controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8">
                            <button
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className={`px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 ${currentPage === 1
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                            >
                                Previous
                            </button>

                            <span className="text-gray-700 dark:text-gray-300">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                                className={`px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 ${currentPage === totalPages
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-70 z-40 transition-opacity"
                            onClick={closeModal}
                        ></div>

                        <div className="fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-full overflow-y-auto overflow-x-hidden">
                            <div className="relative p-4 w-full max-w-lg max-h-full">
                                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                        <h3 className="text-gray-900 dark:text-white text-lg font-semibold">
                                            {modalMode === "add" ? "Add Lab Section" : "Edit Lab Section"}
                                        </h3>
                                        <button
                                            onClick={closeModal}
                                            className="text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* on submit,call the function that handles both editing and adding of a supplier */}
                                    <form onSubmit={handleAddAndEditSubmitSpecimens} className="p-4 space-y-4">
                                        {["specimen_name", "description"].map((field) => (
                                            <div key={field}>
                                                <label className="block text-gray-700 dark:text-gray-300 mb-1 capitalize">
                                                    {field.replace(/_/g, " ")}
                                                </label>

                                                <input
                                                    type="text"
                                                    name={field}
                                                    value={formData[field]}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required={field === "lab_section_name"}
                                                />
                                            </div>
                                        ))}


                                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <button
                                                type="button"
                                                onClick={closeModal}
                                                disabled={isAdding} // prevent closing while submitting if you want
                                                className="px-5 py-2.5 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isAdding}
                                                className="px-5 py-2.5 text-white font-bold bg-gradient-to-r from-blue-700 to-purple-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isAdding ? (
                                                    <>
                                                        <svg
                                                            className="animate-spin h-5 w-5 text-white"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8v8H4z"
                                                            ></path>
                                                        </svg>
                                                        Saving...
                                                    </>
                                                ) : modalMode === "add" ? "Add Lab Specimen" : "Save Changes"}
                                            </button>

                                        </div>

                                    </form>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>

    );
}
