import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit, Eye,  ChevronLeft, ChevronRight,Percent,Workflow,UsersRound,Users, Target } from 'lucide-react';
import { toast, ToastContainer } from "react-toastify";
import Select from 'react-select';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { API_BASE_URL } from '../general/constants';
import apiRequest from '../general/common';
import { useSelector, useDispatch } from "react-redux";




function UserAccountLists() {
    const token = localStorage.getItem('access_token');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);


    const { user } = useSelector((state) => state.auth);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [status, setStatus] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        phone_number: '',
        role_id: '',
        branch_id: ''
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [branches, setBranches] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(null);

    // Set analytics as part of returned data on the endpoint that returns users
    const [analytics, setAnalytics] = useState({
        totalUsers: 0,
        totalRoles: 0,
        activeUsers: 0,
        inactiveUsers: 0
    });


    // Search and pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const fetchUsers = async () => {
        try {
            await apiRequest(
                'get',
                `${API_BASE_URL}getUserAccounts`,
                null,
                null,
                (data) => {
                    setUsers(data.data.userDetails);
                    setAnalytics(data.data.analytics); //it returns total users, active/inavtive users, total roles etc
                    console.log('Fetched users:', data.data.userDetails);
                    setLoading(false);
                },
            );
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            await apiRequest(
                'get',
                `${API_BASE_URL}roles/all_roles`,
                null,
                null,
                (data) => {
                    setRoles(data.roles);
                },
            );
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        }
    };

    const fetchActiveBranches = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}config/getBranches`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse the JSON body
            const data = await response.json();

            // Assuming your API returns { branches: [...] }
            setBranches(data.branches || []);
            console.log('Fetched branches:', data);
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };


    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchActiveBranches();
    }, []);

    const handleUpdateClick = (user) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            username: user.username,
            phone_number: user.phone_number,
            role_id: user.role?.id || '',
            profile_image: null,
            branch_id: user.branch?.id || '',
        });
        setShowUpdateModal(true);
        setDropdownOpen(null);
    };

    const handleStatusClick = (user) => {
        setSelectedUser(user);
        setStatus(Number(user.user_status) === 1 ? 0 : 1);
        setShowStatusModal(true);
        setDropdownOpen(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setFormData((prevData) => ({
            ...prevData,
            profile_image: file,
        }));
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = {
                id: selectedUser.id,
                name: formData.name,
                email: formData.email,
                username: formData.username,
                phone_number: formData.phone_number,
                role_id: formData.role_id,
                branch_id: formData.branch_id,
            };

            const response = await axios.post(`${API_BASE_URL}updateUserAccount`, userData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            
            toast.success(response.data.message);
           fetchUsers(); //refresh the user list and this clears cahed data from backend,and then rebuilds new ones
            setShowUpdateModal(false);
        } catch (error) {
            console.error('Failed to update user account:', error);
            toast.error('Failed to update user account.');
        }
    };

    const handleStatusSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = {
                id: selectedUser.id,
                user_status: status,
            };
            console.log('Submitting status update:', { id: selectedUser.id, user_status: status });
            const response = await axios.put(`${API_BASE_URL}updateUserAccount`, userData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            fetchUsers();
            toast.success(response.data.message);
            setShowStatusModal(false);
        } catch (error) {
            console.error('Failed to update user status:', error);
            toast.warning(error.response.data.message);
        }
    };

    // Filter users based on search term
    const filteredUsers = users.filter((user) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.username.toLowerCase().includes(searchLower)
        );
    });

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <>
            <ToastContainer />
            <div className="container mx-auto mt-5 px-4 bg-white dark:bg-gray-900 min-h-screen">
                <div className="flex justify-center mt-4">
                    <div className="w-full">
                        <div className="p-4 border-2 border-blue-200 border-dashed rounded-lg dark:border-blue-700">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-purple-900 dark:bg-green-700 px-6 py-4">
                                    <h3 className="text-center text-white text-2xl">Users</h3>
                                </div>

                                {/* Body */}
                                <div className="p-6">
                                    {loading ? (
                                        <div className="flex flex-col gap-4">
                                            {Array.from({ length: 4 }).map((_, index) => (
                                                <div key={index} role="status" className="w-full animate-pulse">
                                                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-48 mb-4"></div>
                                                    <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full w-full mb-2.5"></div>
                                                    <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full w-3/4 mb-2.5"></div>
                                                    <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full w-1/2 mb-2.5"></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                           
                                            {/* Metric Cards */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

                                                {/* Total Users */}
                                                <div className="bg-blue-600 rounded-xl p-6 flex flex-col justify-between">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="text-blue-100 text-sm mb-1">Total Users</p>
                                                            <p className="text-white text-3xl">{analytics.totalUsers}</p>
                                                        </div>
                                                        <div className="bg-white/20 rounded-lg p-2">
                                                            <Users className="w-6 h-6 text-white" />
                                                            
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Active Users */}
                                                <div className="bg-teal-600 rounded-xl p-6 flex flex-col justify-between">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="text-teal-100 text-sm mb-1">Active Users</p>
                                                            <p className="text-white text-3xl">{analytics.activeUsers}</p>
                                                        </div>
                                                        <div className="bg-white/20 rounded-lg p-2">
                                                            <Users className="w-6 h-6 text-white" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Inactive Users */}
                                                <div className="bg-orange-600 rounded-xl p-6 flex flex-col justify-between">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="text-orange-100 text-sm mb-1">Inactive Users</p>
                                                            <p className="text-white text-3xl">{analytics.inactiveUsers}</p>
                                                        </div>
                                                        <div className="bg-white/20 rounded-lg p-2">
                                                            <UsersRound className="w-6 h-6 text-white" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Total Roles */}
                                                <div className="bg-purple-600 rounded-xl p-6 flex flex-col justify-between">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="text-purple-100 text-sm mb-1">Total Roles</p>
                                                            <p className="text-white text-3xl">{analytics.totalRoles}</p>
                                                        </div>
                                                        <div className="bg-white/20 rounded-lg p-2">
                                                            <Workflow className="w-6 h-6 text-white" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Percentage Active */}
                                                <div className="bg-teal-700 rounded-xl p-6 flex flex-col justify-between">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="text-teal-100 text-sm mb-1">Active Percentage</p>

                                                            <p className="text-white text-3xl">
                                                                {analytics.totalUsers > 0
                                                                    ? `${Math.round((analytics.activeUsers / analytics.totalUsers) * 100)}%`
                                                                    : "0%"}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/20 rounded-lg p-2">
                                                            <Percent className="w-6 h-6 text-white" />
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>


                                            {/* Search Input */}
                                            <div className="mb-6">
                                                <input
                                                    type="text"
                                                    placeholder="Search by name, email, or username..."
                                                    value={searchTerm}
                                                    onChange={(e) => {
                                                        setSearchTerm(e.target.value);
                                                        setCurrentPage(1);
                                                    }}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                            </div>




                                            {/* Table */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-blue-600 dark:text-blue-400">Name</th>
                                                            <th className="px-4 py-3 text-left text-blue-600 dark:text-blue-400">Email</th>
                                                            <th className="px-4 py-3 text-left text-blue-600 dark:text-blue-400">Phone number</th>
                                                            <th className="px-4 py-3 text-left text-blue-600 dark:text-blue-400">Account type</th>
                                                            {user?.data?.plan === "pro" && (
                                                                <th className="px-4 py-3 text-left text-blue-600 dark:text-blue-400">Branch</th>
                                                            )}
                                                            <th className="px-4 py-3 text-left text-blue-600 dark:text-blue-400">User status</th>
                                                            <th className="px-4 py-3 text-left text-blue-600 dark:text-blue-400">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800">
                                                        {currentUsers.map((userData, index) => (
                                                            <tr
                                                                key={index}
                                                                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                            >
                                                                <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{userData.name}</td>
                                                                <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{userData.email}</td>
                                                                <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{userData.phone_number}</td>
                                                                <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{userData.role?.display_name || ' '}</td>
                                                                {user?.data?.plan === "pro" && (
                                                                    <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{userData.branch?.name || ' '}</td>
                                                                )}
                                                                <td className="px-4 py-3">
                                                                    <span
                                                                        className={`inline-block px-3 py-1 rounded-full text-white ${Number(userData.user_status) === 1 ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-red-500'
                                                                            }`}
                                                                    >
                                                                        {Number(userData.user_status) === 1 ? 'Active' : 'Deactivated'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={() => handleUpdateClick(userData)}
                                                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                                            title="Update User"
                                                                        >
                                                                            <Edit size={20} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleStatusClick(userData)}
                                                                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                                                                            title={Number(userData.user_status) === 1 ? 'Deactivate' : 'Activate'}
                                                                        >
                                                                            <Eye size={20} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination */}
                                            <div className="mt-6 flex items-center justify-between">
                                                <div className="text-gray-700 dark:text-gray-300">
                                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} entries
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                        <button
                                                            key={page}
                                                            onClick={() => handlePageChange(page)}
                                                            className={`px-4 py-2 rounded ${currentPage === page
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Update User Modal - Flowbite Style */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50">
                    <div className="relative p-4 w-full max-w-2xl max-h-full">
                        <div className="relative bg-white rounded-lg shadow dark:bg-gray-800">
                            {/* Modal header */}
                            <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                <h3 className="text-xl text-gray-900 dark:text-white">
                                    Update User Account
                                </h3>
                                <button
                                    onClick={() => setShowUpdateModal(false)}
                                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                                >
                                    <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                    </svg>
                                </button>
                            </div>
                            {/* Modal body */}
                            <div className="p-4 md:p-5 space-y-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label className="block mb-2 text-gray-900 dark:text-white">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block mb-2 text-gray-900 dark:text-white">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    {/* <div className="mb-4">
                                        <label className="block mb-2 text-gray-900 dark:text-white">Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div> */}

                                    <div className="mb-4">
                                        <label className="block mb-2 text-gray-900 dark:text-white">Phone Number</label>
                                        <input
                                            type="text"
                                            name="phone_number"
                                            value={formData.phone_number}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    {/* Account Type */}
                                    <div className="mb-4">
                                        <label className="block mb-2 text-gray-900 dark:text-white">
                                            Account type
                                        </label>
                                        <select
                                            value={formData.role_id || ""}
                                            onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="" disabled>
                                                Select account type
                                            </option>
                                            {roles.map((role) => (
                                                <option key={role.id} value={role.id}>
                                                    {role.display_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* User Branch */}
                                    {user?.data?.plan === "pro" && (
                                        <div className="mb-4">
                                            <label className="block mb-2 text-gray-900 dark:text-white">
                                                User Branch
                                            </label>
                                            <select
                                                value={formData.branch_id || ""}
                                                onChange={(e) => setFormData({ ...formData, branch_id: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            >
                                                <option value="" disabled>
                                                    Select branch
                                                </option>
                                                {branches.map((branch) => (
                                                    <option key={branch.id} value={branch.id}>
                                                        {branch.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}


                                    <div className="flex justify-center mt-6">
                                        <button
                                            type="submit"
                                            className="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 rounded-lg px-5 py-2.5 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                                        >
                                            Update User
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Update Modal - Flowbite Style */}
            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50">
                    <div className="relative p-4 w-full max-w-md max-h-full">
                        <div className="relative bg-white rounded-lg shadow dark:bg-gray-800">
                            {/* Modal header */}
                            <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                <h3 className="text-xl text-gray-900 dark:text-white">
                                    Activate or deactivate user account
                                </h3>
                                <button
                                    onClick={() => setShowStatusModal(false)}
                                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                                >
                                    <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                    </svg>
                                </button>
                            </div>
                            {/* Modal body */}
                            <div className="p-4 md:p-5 space-y-4">
                                <form onSubmit={handleStatusSubmit}>
                                    <div className="mb-4">
                                        <label className="block mb-2 text-blue-600 dark:text-blue-400">Select Status</label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(Number(e.target.value))}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value={1}>Activate</option>
                                            <option value={0}>Deactivate</option>
                                        </select>
                                    </div>

                                    <div className="flex justify-center mt-6">
                                        <button
                                            type="submit"
                                            className="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 rounded-lg px-5 py-2.5 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                                        >
                                            Update Status
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default UserAccountLists;