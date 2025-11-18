import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { API_BASE_URL } from "../general/constants";
import apiRequest from '../general/common';
import { toast, ToastContainer } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { User, Mail, Lock, Phone, Briefcase, Upload, Building2, UserCircle2, Image as ImageIcon } from 'lucide-react';

function CreateUserAccount() {
    const token = localStorage.getItem('access_token');
    const [selectedRole, setSelectedRole] = useState('');
    const [roles, setRoles] = useState([]);
    const { user } = useSelector((state) => state.auth);
    const [branches, setBranches] = useState([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmissionComplete, setIsSubmissionComplete] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const initialFormData = {
        name: '',
        email: '',
        password: '',
        username: '',
        phone_number: '',
        role_id: '',
        profile_image: '',
        branch_id: '',
        designation: ''
    };

    const [formData, setFormData] = useState(initialFormData);

    // Fetch roles and branches on component mount
    useEffect(() => {
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

        fetchRoles();
    }, [selectedRole]);

    // Function to fetch active business outlets
    const fetchActiveFacilityBranches = async () => {
        try {
            await apiRequest(
                'get',
                `${API_BASE_URL}config/getBranches`,
                null,
                null,
                (response) => {
                    setBranches(response.data || []);
                },
            );
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

    useEffect(() => {
        fetchActiveFacilityBranches();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // handle select change to handle multiple selections
    const handleSelectChange = (selectedOption, name) => {
        if (name === 'role_id') {
            setSelectedRole(selectedOption.value);
            setFormData({ ...formData, [name]: selectedOption.value });
        } else {
            setFormData({ ...formData, [name]: selectedOption.value });
        }
    };

    // Handle image change and its preview
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setFormData({ ...formData, profile_image: file });

        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        } else {
            setImagePreview(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const phoneNumberRegex = /^[\d+\s-]+$/;
        const branch_id = formData.branch_id;

        if (!phoneNumberRegex.test(formData.phone_number)) {
            toast.error("Phone number must contain only numbers not letters");
            setLoading(false);
            return;
        }

        if (user?.data?.plan === "pro") {
            if (!branch_id) {
                toast.error('Please select Branch to proceed');
                setLoading(false);
                return;
            }
        }

        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('password', formData.password);
        formDataToSend.append('username', formData.username);
        formDataToSend.append('phone_number', formData.phone_number);
        formDataToSend.append('role_id', formData.role_id);
        formDataToSend.append('branch_id', formData.branch_id);
        formDataToSend.append('designation', formData.designation);

        if (formData.profile_image) {
            formDataToSend.append('profile_image', formData.profile_image);
        }

        try {
            await axios.post(
                `${API_BASE_URL}createUserAccount`,
                formDataToSend,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`,
                    }
                }
            ).then((response) => {
                toast.success(response.data.message);
                setFormData(initialFormData);
                setImagePreview(null);
            }).catch((error) => {
                toast.error(error.response.data.message);
            });
        } catch (error) {
            console.error('Failed to create user account:', error);
            toast.error(error.response.data.message);
        } finally {
            setLoading(false);
        }
    };

    // Custom styles for react-select to match Tailwind theme
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            borderColor: state.isFocused ? '#10b981' : '#d1d5db',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 'none',
            '&:hover': {
                borderColor: '#10b981'
            },
            borderRadius: '0.5rem',
            padding: '0.125rem',
            minHeight: '42px'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#d1fae5' : 'white',
            color: state.isSelected ? 'white' : '#1f2937',
            '&:active': {
                backgroundColor: '#059669'
            }
        })
    };

    return (
        <>
            <ToastContainer />
            <div className="container mx-auto px-4 mt-5">
                <div className="flex justify-center mt-4">
                    <div className="w-full">
                        <div className="p-4 border-2 border-gray-200 dark:border-gray-700 border-dashed rounded-lg mt-14 dashboard">
                            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-700 to-purple-900 px-6 py-4">
                                    <h3 className="text-white text-center flex items-center justify-center gap-2">
                                        <UserCircle2 className="w-6 h-6" />
                                        Register User
                                    </h3>
                                </div>

                                {/* Body */}
                                <div className="p-6 text-gray-800 dark:text-gray-200">
                                    <form onSubmit={handleSubmit}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* LEFT COLUMN */}
                                            <div className="space-y-4">
                                                {/* Name Field */}
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                        Name of the user<span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            name="name"
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                            required
                                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition"
                                                            placeholder="Enter full name"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Email Field */}
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                        User Email<span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            required
                                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition"
                                                            placeholder="email@example.com"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Password Field */}
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                        User Password<span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="password"
                                                            name="password"
                                                            value={formData.password}
                                                            onChange={handleChange}
                                                            required
                                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition"
                                                            placeholder="Enter password"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Business Outlets */}
                                                {user?.data?.plan === "pro" && (
                                                    <div>
                                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                            User Branch<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <div className="absolute top-3 left-3 z-10 pointer-events-none">
                                                                <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                            </div>
                                                            <select
                                                                name="branch_id"
                                                                value={formData.outlet_id}
                                                                onChange={(e) => handleSelectChange(e.target.value, "branch_id")}
                                                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                                            >
                                                                <option value="">Select branch</option>
                                                                {branches.map((branch) => (
                                                                    <option key={branch.id} value={branch.id}>
                                                                        {branch.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}

                                            </div>

                                            {/* RIGHT COLUMN */}
                                            <div className="space-y-4">
                                                {/* Username Field */}
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                        Username<span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <UserCircle2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            name="username"
                                                            value={formData.username}
                                                            onChange={handleChange}
                                                            required
                                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition"
                                                            placeholder="Enter username"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Phone Number Field */}
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                        Phone Number<span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            name="phoneNumber"
                                                            value={formData.phone_number}
                                                            onChange={handleChange}
                                                            required
                                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition"
                                                            placeholder="+1234567890"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Designation Field */}
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                        Designation
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Briefcase className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            name="designation"
                                                            value={formData.designation}
                                                            onChange={handleChange}
                                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition"
                                                            placeholder="e.g., Manager, Developer"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Role Field */}
                                                <div>
                                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                        Assign to a User type<span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        name="role_id"
                                                        value={formData.role_id}
                                                        onChange={(e) => handleSelectChange(e.target.value, "role_id")}
                                                        className="block w-full pl-3 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                                    >
                                                        <option value="">Select a role</option>
                                                        {roles.map((role) => (
                                                            <option key={role.id} value={role.id}>
                                                                {role.display_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                            </div>
                                        </div>

                                        {/* Profile Image */}
                                        <div className="mt-6">
                                            <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                                Profile Image
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            name="profile_image"
                                                            accept="image/*"
                                                            onChange={handleImageChange}
                                                            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 dark:file:bg-green-900 file:text-green-700 dark:file:text-green-400 hover:file:bg-green-100 dark:hover:file:bg-green-800 file:cursor-pointer cursor-pointer border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Image Preview */}
                                                {imagePreview ? (
                                                    <div className="flex-shrink-0">
                                                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-green-500 shadow-lg">
                                                            <img
                                                                src={imagePreview}
                                                                alt="Profile Preview"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-shrink-0">
                                                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                                                            <ImageIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className="flex justify-center mt-8">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="bg-gradient-to-r from-blue-500 to-purple-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white px-8 py-3 rounded-lg transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <User className="w-5 h-5" />
                                                        Create User Account
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
}

export default CreateUserAccount;
