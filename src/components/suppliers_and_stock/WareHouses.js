import React, { useState, useEffect } from "react";
import { Edit, Eye, X, Shield, Store, Users } from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import axios from "axios";
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

function WareHouses() {
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: null,
        warehouse: null,
    });
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');

    // States to open add warehouse modal
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);



    // Function to fetch warehouses from the API
    const fetchWarehouses = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}config/getWareHouses`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (response.data.status === "success") {
                toast.success(response.data.message);
                const formatted = response.data.warehouses.map((wh) => ({
                    id: wh.id, // normalize here
                    name: wh.name,
                    location: wh.location,
                }));
                setWarehouses(formatted);
                console.log("Warehouses loaded:", formatted);
            }
        } catch (error) {
            console.error("Error fetching warehouses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    // Function to update warehouse details
    const updateWarehouse = async (id, data) => {
        // 🧩 Basic validation before making the request
        if (!data.name || data.name.trim() === "") {
            toast.error("Warehouse name is required.");
            return;
        }

        if (!data.location || data.location.trim() === "") {
            toast.error("Warehouse location is required.");
            return;
        }

        try {
            setIsUpdating(true);
            const token = localStorage.getItem("access_token");
            console.log("Updating warehouse with ID:", id, "Data:", data);

            const response = await axios.post(
                `${API_BASE_URL}config/updateWarehouse`,
                { id, ...data },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );


            toast.success(response.data.message);
            setWarehouses((prev) =>
                prev.map((wh) => (wh.id === id ? { ...wh, ...data } : wh))
            );
            setModalState((prev) => ({ ...prev, isOpen: false })); // close after success


        } catch (error) {
            console.error("Error updating warehouse:", error);
            console.error("Error details:", error.response?.data || error.message);
            toast.error("An error occurred while updating the warehouse.");
        } finally {
            setIsUpdating(false);
        }
    };

    // handle adding new warehouse
    const handleAddWarehouse = async () => {
        if (!name || name.trim() === "") {
            toast.error("Warehouse name is required.");
            return;
        }
        if (!location || location.trim() === "") {
            toast.error("Warehouse location is required.");
            return;
        }

        try {
            setIsAdding(true);
            const response = await axios.post(
                `${API_BASE_URL}config/addWareHouse`,
                { name, location },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            toast.success(response.data.message || "Warehouse added successfully!");
            setName("");
            setLocation("");
            setAddModalOpen(false);
            fetchWarehouses();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add warehouse.");
        } finally {
            setIsAdding(false);
        }
    };



    //  Open Modal for editing warehouse
    const openModal = (type, warehouse) => {
        setModalState({ isOpen: true, type, warehouse });
    };

    //Close modal for editing warehose
    const closeModal = () => {
        setModalState({ isOpen: false, type: null, warehouse: null });
    };

    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-indigo-800 dark:via-blue-700 dark:to-black p-8 transition-colors duration-300">
                <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="mb-8">
                        <h1 className="text-gray-900 dark:text-white mb-2">
                            Warehouse Management
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Manage your warehouses and stock locations for your medical supplies like a pro efficiently.
                        </p>
                    </div>

                    {/* ➕ Add Warehouse Button */}
                    <button
                        onClick={() => setAddModalOpen(true)}
                        className="px-5 py-2.5 mb-5 bg-gradient-to-r from-blue-700 to-purple-900 hover:bg-gradient-to-br  text-white rounded-lg transition-colors duration-200"
                    >
                        ➕ Add Warehouse
                    </button>

                    {/* Permission Cards Grid */}
                    <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6" borderRadius="0.75rem">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                // 🦴 Skeleton placeholders while fetching
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
                                    >
                                        <div className="flex items-center mb-4">
                                            <div className="p-3 rounded-lg mr-4">
                                                <Skeleton circle width={40} height={40} />
                                            </div>
                                            <div>
                                                <Skeleton width={120} height={20} />
                                                <Skeleton width={80} height={16} className="mt-2" />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3 mt-4">
                                            <Skeleton height={36} width="48%" />
                                            <Skeleton height={36} width="48%" />
                                        </div>
                                    </div>
                                ))
                            ) : warehouses.length === 0 ? (
                                <div className="flex justify-center items-center min-h-[300px] w-full">
                                    <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-xl text-center w-[400px] h-[250px]">
                                        <h4 className="text-gray-700 dark:text-white text-xl font-bold">
                                            No Warehouses Found
                                        </h4>
                                        <p className="text-gray-500 dark:text-gray-400 text-base mt-4">
                                            Try adjusting your filter or reset it.
                                        </p>
                                    </div>
                                </div>

                            ) : (
                                //  Real data after loading
                                warehouses.map((warehouse) => (
                                    <div
                                        key={warehouse.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="p-6">
                                            <div className="flex items-center mb-4">
                                                <div className="text-success p-3 rounded-lg mr-4">
                                                    <h1>
                                                        <Store />
                                                    </h1>
                                                </div>
                                                <div>
                                                    <h3 className="text-gray-900 dark:text-white">{warehouse.name}</h3>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm">{warehouse.location}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-3">

                                                <button
                                                    onClick={() => openModal("edit", warehouse)}
                                                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </SkeletonTheme>



                    {/* Flowbite Modal to edit warehouses*/}
                    {modalState.isOpen && modalState.warehouse && (
                        <>
                            {/* Modal Backdrop */}
                            <div
                                className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-70 z-40 transition-opacity"
                                onClick={closeModal}
                            ></div>

                            {/* Modal */}
                            <div className="fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-full overflow-y-auto overflow-x-hidden">
                                <div className="relative p-4 w-full max-w-2xl max-h-full">
                                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">

                                        {/* Modal header */}
                                        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 rounded-t">
                                            <h3 className="text-gray-900 dark:text-white">Edit Warehouse</h3>
                                            <button
                                                type="button"
                                                className="text-gray-400 dark:text-gray-300 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg w-8 h-8 inline-flex justify-center items-center transition-colors duration-200"
                                                onClick={closeModal}
                                            >
                                                <X className="w-5 h-5" />
                                                <span className="sr-only">Close modal</span>
                                            </button>
                                        </div>

                                        {/* Modal body: Form for name and location */}
                                        <div className="p-4 md:p-5 space-y-4">
                                            <form className="space-y-4">
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                                                        Warehouse Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={modalState.warehouse.name}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        onChange={(e) =>
                                                            setModalState((prev) => ({
                                                                ...prev,
                                                                warehouse: { ...prev.warehouse, name: e.target.value },
                                                            }))
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                                                        Location
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={modalState.warehouse.location}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        onChange={(e) =>
                                                            setModalState((prev) => ({
                                                                ...prev,
                                                                warehouse: { ...prev.warehouse, location: e.target.value },
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </form>
                                        </div>

                                        {/* Modal footer */}
                                        <div className="flex items-center justify-end gap-3 p-4 md:p-5 border-t border-gray-200 dark:border-gray-700 rounded-b">
                                            <button
                                                onClick={closeModal}
                                                className="px-5 py-2.5 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                onClick={() => {
                                                    updateWarehouse(modalState.warehouse.id, {
                                                        name: modalState.warehouse.name,
                                                        location: modalState.warehouse.location,
                                                    });
                                                }}
                                                disabled={isUpdating}
                                                className={`px-5 py-2.5 text-white rounded-lg transition-colors duration-200 
                                                        ${isUpdating
                                                        ? "bg-gradient-to-r from-blue-400 via-green-500 to-blue-600 hover:bg-gradient-to-br  text-white"
                                                        : "bg-gradient-to-r from-blue-400 via-green-500 to-blue-600 hover:bg-gradient-to-br  text-white"}`}
                                            >
                                                {isUpdating ? (
                                                    <div className="flex items-center gap-2">
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
                                                    </div>
                                                ) : (
                                                    "Save Changes"
                                                )}
                                            </button>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Flow bitemodal to add new warehouse */}
                    {/*  Add Warehouse Modal */}
                    {addModalOpen && (
                        <>
                            <div
                                className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-70 z-40 transition-opacity"
                                onClick={() => setAddModalOpen(false)}
                            ></div>

                            <div className="fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-full overflow-y-auto overflow-x-hidden">
                                <div className="relative p-4 w-full max-w-2xl max-h-full">
                                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">

                                        {/* Header */}
                                        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 rounded-t">
                                            <h3 className="text-gray-900 dark:text-white">Add New Warehouse</h3>
                                            <button
                                                type="button"
                                                className="text-gray-400 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg w-8 h-8 flex justify-center items-center"
                                                onClick={() => setAddModalOpen(false)}
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Body */}
                                        <div className="p-4 md:p-5 space-y-4">
                                            <form className="space-y-4">
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                                                        Warehouse Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                                                        Location
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={location}
                                                        onChange={(e) => setLocation(e.target.value)}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </form>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-end gap-3 p-4 md:p-5 border-t border-gray-200 dark:border-gray-700 rounded-b">
                                            <button
                                                onClick={() => setAddModalOpen(false)}
                                                className="px-5 py-2.5 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                onClick={handleAddWarehouse}
                                                disabled={isAdding}
                                                className={`px-5 py-2.5 text-white rounded-lg transition-colors duration-200 
                                                ${isAdding
                                                        ? "bg-gradient-to-r from-blue-400 via-green-500 to-blue-600 hover:bg-gradient-to-br  text-white"
                                                        : "bg-gradient-to-r from-blue-400 via-green-500 to-blue-600 hover:bg-gradient-to-br  text-white"}`}
                                            >
                                                {isAdding ? (
                                                    <div className="flex items-center gap-2 ">
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
                                                    </div>
                                                ) : (
                                                    "Add Warehouse"
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}



                </div>
            </div>
        </>

    );
} export default WareHouses;
