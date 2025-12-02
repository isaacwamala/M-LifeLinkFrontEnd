import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast, ToastContainer } from "react-toastify";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchUoms } from "../products/products_helper"; //import fetch uoms defined in uoms

function UnitOfMeasure() {
    const token = localStorage.getItem("access_token");

    const [loading, setLoading] = useState(true);
    const [uoms, setUoms] = useState([]);


    //Use effect to load uoms
    useEffect(() => {
        const loadUoms = async () => {
            setLoading(true);
            const data = await fetchUoms(token); //use unit of measures defined in helper
            setUoms(data); //set Uoms in state
            setLoading(false);
        };

        loadUoms();
    }, [token]);


    const [searchQuery, setSearchQuery] = useState("");

    const filteredUoms = uoms.filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
            u.name.toLowerCase().includes(q) ||
            u.uom_code.toLowerCase().includes(q)
        );
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 6;

    const indexLast = currentPage * perPage;
    const indexFirst = indexLast - perPage;
    const currentUoms = filteredUoms.slice(indexFirst, indexLast);
    const totalPages = Math.ceil(filteredUoms.length / perPage);

    const nextPage = () =>
        setCurrentPage((p) => (p < totalPages ? p + 1 : p));
    const prevPage = () =>
        setCurrentPage((p) => (p > 1 ? p - 1 : p));

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // add | edit
    const [currentUom, setCurrentUom] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        uom_code: "",
    });

    const handleInput = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // OPEN ADD
    const openAddModal = () => {
        setModalMode("add");
        setFormData({
            name: "",
            uom_code: "",
        });
        setIsModalOpen(true);
    };

    // OPEN EDIT
    const openEditModal = (uom) => {
        setModalMode("edit");
        setCurrentUom(uom);
        setFormData({
            name: uom.name,
            uom_code: uom.uom_code,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentUom(null);
    };

    // ADD / EDIT
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.uom_code.trim()) {
            toast.error("Both fields are required");
            return;
        }

        setIsSaving(true);

        try {
            if (modalMode === "add") {
                await axios.post(
                    `${API_BASE_URL}config/getUnitOfMeasure`,
                    {
                        name: formData.name,
                        uom_code: formData.uom_code,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                toast.success("Unit of Measure added");
            } else if (modalMode === "edit" && currentUom) {
                await axios.post(
                    `${API_BASE_URL}config/updateUnitOfMeasure`,
                    {
                        id: currentUom.id,
                        name: formData.name,
                        uom_code: formData.uom_code,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                toast.success("Unit of Measure updated");
            }

            fetchUoms();
            closeModal();
        } catch (err) {
            console.error("Saving failed:", err);
            toast.error("Failed to save UOM");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden pt-10">
                <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                            Unit Of Measure Management
                        </h1>

                        <button
                            onClick={openAddModal}
                            className="px-5 py-2.5 text-white font-bold rounded 
                    bg-gradient-to-r from-blue-700 to-purple-900 hover:opacity-90 transition"
                        >
                            + Add UOM
                        </button>
                    </div>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full mb-6 px-4 py-2 rounded-lg 
                border border-gray-300 dark:border-gray-600 
                bg-gray-50 dark:bg-gray-700 
                text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400"
                    />

                    {/* GRID */}
                    <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading
                                ? Array.from({ length: 6 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="p-5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg"
                                    >
                                        <Skeleton height={20} />
                                        <Skeleton height={20} width="60%" className="mt-2" />
                                        <div className="flex gap-3 mt-4">
                                            <Skeleton height={36} width="48%" />
                                            <Skeleton height={36} width="48%" />
                                        </div>
                                    </div>
                                ))
                                : currentUoms.map((uom) => (
                                    <div
                                        key={uom.id}
                                        className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg shadow 
                                  border border-gray-300 dark:border-gray-600"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {uom.name}
                                        </h3>
                                        <p className="text-gray-700 dark:text-gray-300">
                                            Code: {uom.uom_code}
                                        </p>

                                        <div className="flex gap-3 mt-4">
                                            <button
                                                onClick={() => openEditModal(uom)}
                                                className="flex-1 px-4 py-2 text-white font-bold rounded 
                                          bg-gradient-to-r from-blue-700 to-purple-900 hover:opacity-90"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </SkeletonTheme>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border rounded-lg 
                        bg-gray-100 dark:bg-gray-700 
                        border-gray-300 dark:border-gray-600 
                        text-gray-800 dark:text-gray-200
                        disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>

                            <span className="text-gray-700 dark:text-gray-300">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 border rounded-lg 
                        bg-gray-100 dark:bg-gray-700 
                        border-gray-300 dark:border-gray-600 
                        text-gray-800 dark:text-gray-200
                        disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {isModalOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 z-40"
                            onClick={closeModal}
                        />

                        {/* Modal Body */}
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-lg shadow border 
                    border-gray-300 dark:border-gray-600 p-4">

                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    {modalMode === "add" ? "Add Unit Of Measure" : "Edit Unit Of Measure"}
                                </h3>

                                <form onSubmit={handleSubmit} className="space-y-4">

                                    {/* Name */}
                                    <div>
                                        <label className="text-gray-700 dark:text-gray-300">Name</label>
                                        <input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInput}
                                            className="w-full px-4 py-2 border rounded-lg 
                                    bg-gray-50 dark:bg-gray-700 
                                    text-gray-900 dark:text-gray-100
                                    border-gray-300 dark:border-gray-600"
                                            required
                                        />
                                    </div>

                                    {/* UOM Code */}
                                    <div>
                                        <label className="text-gray-700 dark:text-gray-300">UOM Code</label>
                                        <input
                                            name="uom_code"
                                            value={formData.uom_code}
                                            onChange={handleInput}
                                            className="w-full px-4 py-2 border rounded-lg 
                                    bg-gray-50 dark:bg-gray-700 
                                    text-gray-900 dark:text-gray-100
                                    border-gray-300 dark:border-gray-600"
                                            required
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-300 dark:border-gray-700">

                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="px-5 py-2 border rounded-lg 
                                    bg-white dark:bg-gray-700 
                                    border-gray-300 dark:border-gray-600
                                    text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="px-5 py-2 text-white rounded-lg 
                                    bg-gradient-to-r from-blue-700 to-purple-900 
                                    hover:opacity-90 flex items-center gap-2"
                                        >
                                            {isSaving ? "Saving..." : "Save"}
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

export default UnitOfMeasure;
