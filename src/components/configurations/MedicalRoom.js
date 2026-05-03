import React, { useState, useEffect } from "react";
import { Edit, Eye, X, Shield, Store, Users } from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import axios from "axios";
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

function MedicalRoom() {

    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(true);
    const [medicalRooms, setMedicalRooms] = useState([]); //initialize state 
    const [branches, setBranches] = useState([]);

    // Fetch medical rooms
    const fetchMedicalRooms = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}set/getMedicalRooms`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (response.data.success) {
                //  toast.success("Suppliers loaded successfully"); // Optional
                const formatted = response.data.rooms.map(r => ({
                    id: r.id,
                    room_name: r.room_name,
                    room_number: r.room_number,
                    status: r.status,
                    created_at: r.created_at,
                    branch: r.branch?.name
                }));

                setMedicalRooms(formatted);
                console.log("rooms loaded:", formatted);
                console.log("API response:", response.data);
            }

        } catch (error) {
            //console.error("Error fetching medical rooms:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch branches for dropdown

    const fetchActiveFacilityBranches = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}config/getBranches`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            const data = await res.json(); //  FIX

            console.log("branches:", data);

            setBranches(data?.branches ?? []);
        } catch (error) {
            console.error("Failed to fetch branches:", error);
        }
    };



    useEffect(() => {
        fetchMedicalRooms(); // Fetch rooms on component mount
        fetchActiveFacilityBranches();
    }, []);

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [currentRoom, setCurrentRoom] = useState(null);

    const [formData, setFormData] = useState({
        room_name: "",
        room_number: "",
        branch_id: "",
        status: "available",
    });
    const [isAdding, setIsAdding] = useState(false);

    // Pagination setup
    const [currentPage, setCurrentPage] = useState(1);
    // Number of rooms per page
    const roomsPerPage = 20;

    // Filter rooms based on search query
    const filteredRooms = medicalRooms.filter((room) => {
        const query = (searchQuery || "").toLowerCase();

        return (
            (room.room_name || "").toLowerCase().includes(query) ||
            (room.room_number || "").toLowerCase().includes(query) ||
            (room.branch || "").toLowerCase().includes(query) ||
            (room.status || "").toLowerCase().includes(query)
        );
    });


    // Pagination calculations, based on filtered suppliers
    const indexOfLastRoom = currentPage * roomsPerPage;
    const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
    const currentRooms = filteredRooms.slice(
        indexOfFirstRoom,
        indexOfLastRoom
    );

    //Compute total pages for pagination
    const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);

    const nextPage = () =>
        setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
    const prevPage = () =>
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));

    const openAddModal = () => {
        setModalMode("add");
        setFormData({
            room_name: "",
            room_number: "",
            status: "",
        });
        setIsModalOpen(true);
    };

    const openEditModal = (room) => {
        setModalMode("edit");
        setCurrentRoom(room);
        setFormData({
            room_name: room.room_name,
            room_number: room.room_number,
            status: room.status,
            branch_id: room.branch_id,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentRoom(null);
    };



    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this room?")) {
            setMedicalRooms(medicalRooms.filter((room) => room.id !== id));
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };


    // Handle adding and editing suppliers since adding and editing use the same modal
    const handleAddAndEditSubmitSuppliers = async (e) => {
        e.preventDefault();

        const safeTrim = (value) => (value || "").trim();

        // Validation
        if (!safeTrim(formData.room_name)) {
            toast.error("Room name is required.");
            return;
        }
        if (!safeTrim(formData.room_number)) {
            toast.error("Room number is required.");
            return;
        }
        if (!safeTrim(formData.status)) {
            toast.error("Status is required.");
            return;
        }
        if (!safeTrim(formData.branch_id)) {
            toast.error("Branch is required.");
            return;
        }


        try {
            setIsAdding(true); // ✅ start spinner immediately

            if (modalMode === "add") {
                await axios.post(
                    `${API_BASE_URL}set/createMedicalRoom`,
                    {
                        room_name: formData.room_name,
                        room_number: formData.room_number,
                        status: formData.status,
                        branch_id: formData.branch_id,
                        location: formData.location,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Room added successfully");
            } else if (modalMode === "edit" && currentRoom) {
                await axios.post(
                    `${API_BASE_URL}set/updateMedicalRoom`,
                    {
                        room_id: currentRoom.id,
                        room_name: formData.room_name,
                        room_number: formData.room_number,
                        status: formData.status,
                        branch_id: formData.branch_id,
                        location: formData.location,
                    },
                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );
                toast.success("Room updated successfully");
            }

            fetchMedicalRooms();

            // Reset form
            setFormData({
                room_name: "",
                room_number: "",
                status: "",
                branch_id: "",

            });
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to save room");
            console.error("Error saving room:", error);
        } finally {
            setIsAdding(false); // ✅ stop spinner
        }
    };




    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden pt-10">
                <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            Medical Rooms
                        </h1>
                        <button
                            onClick={openAddModal}
                            className="px-5 py-2.5 text-white font-bold rounded bg-gradient-to-r from-blue-700 to-purple-900 transition-colors duration-200 w-full md:w-auto"
                        >
                            + Add Medical Rooms
                        </button>
                    </div>


                    <input
                        type="text"
                        placeholder="Search medical rooms by name,room number,status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full mb-6 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Suppliers Grid */}
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
                                currentRooms.map((room) => (
                                    <div
                                        key={room.id}
                                        className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg shadow border border-gray-200 dark:border-gray-600"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {room.room_name}
                                        </h3>

                                        <p className="text-gray-500 dark:text-gray-300 text-sm">{room.room_number}</p>
                                        <p className="text-gray-700 dark:text-gray-200 mt-2">
                                            status: {room.status}
                                        </p>
                                        <p className="text-gray-700 dark:text-gray-200 mt-2">
                                            Branch: {room.branch || "N/A"}
                                        </p>


                                        <div className="flex gap-3 mt-4">
                                            <button
                                                onClick={() => openEditModal(room)}
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
                                            {modalMode === "add" ? "Add Room" : "Edit Room"}
                                        </h3>
                                        <button
                                            onClick={closeModal}
                                            className="text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* on submit,call the function that handles both editing and adding of a supplier */}
                                    <form onSubmit={handleAddAndEditSubmitSuppliers} className="p-4 space-y-4">
                                        {["room_name", "room_number", "status", "branch_id"].map((field) => (
                                            <div key={field}>
                                                <label className="block text-gray-700 dark:text-gray-300 mb-1 capitalize">
                                                    {field.replace(/([A-Z])/g, " $1")}
                                                </label>

                                                {/* 🔽 HANDLE DROPDOWNS */}
                                                {field === "status" ? (
                                                    <select
                                                        name={field}
                                                        value={formData[field] || ""}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="">Select Status</option>
                                                        <option value="available">Available</option>
                                                        <option value="closed">Closed</option>
                                                    </select>

                                                ) : field === "branch_id" ? (
                                                    <select
                                                        name={field}
                                                        value={formData[field] || ""}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="">Select Branch</option>

                                                        {branches?.map((branch) => (
                                                            <option key={branch.id} value={branch.id}>
                                                                {branch.name}
                                                            </option>
                                                        ))}
                                                    </select>

                                                ) : (
                                                    // 🔽 DEFAULT INPUT
                                                    <input
                                                        type="text"
                                                        name={field}
                                                        value={formData[field] || ""}
                                                        onChange={handleInputChange}
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
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
                                                ) : modalMode === "add" ? "Add Supplier" : "Save Changes"}
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
} export default MedicalRoom
