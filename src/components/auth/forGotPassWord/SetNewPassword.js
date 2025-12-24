import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../general/constants";
import mediconnect from "../../assets/mediconnect.png"

const SetNewPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Extract the token from the URL query parameters
        const queryParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = queryParams.get('token'); // Get token from search parameters in the browser URL
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            toast.error('Token not found'); // Use toast to display error
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true); // Start spinner when submitting

        try {
            const response = await axios.post(`${API_BASE_URL}auth/setNewPassword`, {
                token, // Pass token from query string as a request to the server
                password,
                password_confirmation: passwordConfirmation,
            });

            toast.success(response.data.message); // Show success toast
            setLoading(false);

            // Delay navigation by 3 seconds after the success message
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (error) {
            if (error.response && error.response.data) {
                toast.error(error.response.data.message); // Display error message as toast
                setLoading(false);
            } else {
                toast.error('An error occurred while resetting the password.');
                setLoading(false);
            }
        }
    };

    return (
        <>
            <ToastContainer />

            {/* Background Image with Gradient Overlay */}
            <div className="relative min-h-screen">
                <div className="absolute inset-0 z-0">
                    <img
                        //src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&q=80"
                       src={mediconnect}
                        alt="Medical Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/85 to-teal-800/90"></div>
                </div>

                {/* Centered Card */}
                <div className="relative z-10 flex justify-center items-center min-h-screen px-4 py-12">
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-white border-2 border-blue-600 rounded-lg shadow-lg overflow-hidden">

                            {/* Card Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 text-center">
                                <h3 className="text-lg font-semibold">Set New Password</h3>
                            </div>

                            {/* Card Body */}
                            <div className="p-6">
                                <form onSubmit={handleSubmit}>

                                    <div className="mb-4">
                                        <label htmlFor="formPassword" className="block mb-2 text-gray-700 font-medium">
                                            New Password
                                        </label>
                                        <input
                                            id="formPassword"
                                            type="password"
                                            placeholder="Enter new password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="formPasswordConfirmation" className="block mb-2 text-gray-700 font-medium">
                                            Confirm New Password
                                        </label>
                                        <input
                                            id="formPasswordConfirmation"
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={passwordConfirmation}
                                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:bg-green-700 text-white py-2 px-4 rounded-md mt-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            'RESET PASSWORD'
                                        )}
                                    </button>

                                    <a
                                        href="/"
                                        className="block w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md mt-3 text-center transition-colors"
                                    >
                                        Cancel
                                    </a>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
};

export default SetNewPassword;
