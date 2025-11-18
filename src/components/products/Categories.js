import React, { useState, useEffect } from "react";
import { Edit, Eye, X, Shield, Store, Users } from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import axios from "axios";
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

function Categories() {

    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]); //initialize state 

    // Fetch suppliers
    const fetchProductCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}config/getCategories`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (response.data.success) {
                //  toast.success("Suppliers loaded successfully"); // Optional
                const formatted = response.data.categories.map(c => ({
                    id: c.id,
                    name: c.name,

                }));

                setCategories(formatted);
                console.log("Categories loaded:", formatted);

            }

        } catch (error) {
            console.error("Error fetching Categories:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductCategories(); // Fetch suppliers on component mount
    }, []);

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [currentCategory, setCurrentCategory] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
    });
    const [isAdding, setIsAdding] = useState(false);

    // Pagination setup
    const [currentPage, setCurrentPage] = useState(1);
    // Number of suppliers per page
    const categoriesPerPage = 6;

    // Filter suppliers based on search query, 
    const filteredCategories = categories.filter((category) => {
        const query = searchQuery.toLowerCase();
        return (
            category.name.toLowerCase().includes(query)
        );
    });


    // Pagination calculations, based on filtered suppliers
    const indexOfLastCategory = currentPage * categoriesPerPage;
    const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
    const currentCategories = filteredCategories.slice(
        indexOfFirstCategory,
        indexOfLastCategory
    );

    //Compute total pages for pagination
    const totalPages = Math.ceil(filteredCategories.length / categoriesPerPage);

    const nextPage = () =>
        setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
    const prevPage = () =>
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));

    const openAddModal = () => {
        setModalMode("add");
        setFormData({
            name: "",
        });
        setIsModalOpen(true);
    };

    const openEditModal = (category) => {
        setModalMode("edit");
        setCurrentCategory(category);
        setFormData({
            name: category.name,
        });
        setIsModalOpen(true);
    };


    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCategory(null);
    };



    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            setCategories(categories.filter((category) => category.id !== id));
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };


    // Handle adding and editing suppliers since adding and editing use the same modal
    const handleAddAndEditSubmitCategories = async (e) => {
        e.preventDefault();

        const safeTrim = (value) => (value || "").trim();

        // Validation
        if (!safeTrim(formData.name)) {
            toast.error("Category name is required.");
            return;
        }


        try {
            setIsAdding(true); // ✅ start spinner immediately

            if (modalMode === "add") {
                await axios.post(
                    `${API_BASE_URL}config/createCategory`,
                    {
                        name: formData.name,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Product category added successfully");
            } else if (modalMode === "edit" && currentCategory) {
                await axios.post(
                    `${API_BASE_URL}config/updateCategory`,
                    {
                        id: currentCategory.id,
                        name: formData.name,
                    },

                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );
                toast.success("Category updated successfully");
            }

            fetchProductCategories();

            // Reset form
            setFormData({
                name: "",

            });
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to save category");
            console.error("Error saving category:", error);
        } finally {
            setIsAdding(false); // ✅ stop spinner
        }
    };




    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8 transition-colors duration-300 dashboard">
                <div className="w-full max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            Products Category Management
                        </h1>
                        <button
                            onClick={openAddModal}
                            className="px-5 py-2.5 text-white font-bold rounded bg-gradient-to-r from-blue-700 to-purple-900 transition-colors duration-200 w-full md:w-auto"
                        >
                            + Add Category
                        </button>
                    </div>


                    <input
                        type="text"
                        placeholder="Search category by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full mb-6 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Categories Grid */}
                    <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6" borderRadius="0.75rem">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                // 🦴 Skeleton placeholders while fetching suppliers
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
                                // 🧱 Real suppliers data
                                currentCategories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg shadow border border-gray-200 dark:border-gray-600"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {category.name}
                                        </h3>


                                        <div className="flex gap-3 mt-4">
                                            <button
                                                onClick={() => openEditModal(category)}
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
                                            {modalMode === "add" ? "Add Supplier" : "Edit Supplier"}
                                        </h3>
                                        <button
                                            onClick={closeModal}
                                            className="text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* on submit,call the function that handles both editing and adding of a supplier */}
                                    <form onSubmit={handleAddAndEditSubmitCategories} className="p-4 space-y-4">
                                        {["name"].map(
                                            (field) => (
                                                <div key={field}>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-1 capitalize">
                                                        {field.replace(/([A-Z])/g, " $1")}
                                                    </label>
                                                    <input
                                                        type={
                                                            field === "email"
                                                                ? "email"
                                                                : field === "phone"
                                                                    ? "tel"
                                                                    : "text"
                                                        }
                                                        name={field}
                                                        value={formData[field]}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        required={field === "name"}
                                                    />
                                                </div>
                                            )
                                        )}

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
                                                ) : modalMode === "add" ? "Add Category" : "Save Changes"}
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
} export default Categories
