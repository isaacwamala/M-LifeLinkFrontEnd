import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../general/constants";
import mediconnect from "../../assets/mediconnect.png"

const ForGotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}auth/password/forgot`, { email });
            setMessage(response.data.message);
            toast.success(response.data.message);
            setLoading(false);
        } catch (error) {
            setMessage(error.response.data.error);
            toast.error(error.response.data.error);
            setLoading(false);
        }
    };

    return (
        <>
            <ToastContainer />

            {/* Background Image with Gradient Overlay */}
            <div className="relative min-h-screen">
                <div className="absolute inset-0 z-0">
                    <img
                       // src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&q=80"
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
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 py-4 px-6 text-center">
                                <h3 className="text-lg font-semibold">Forgot Password?</h3>
                            </div>

                            {/* Card Body */}
                            <div className="p-6">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label htmlFor="formEmail" className="block mb-2 text-gray-700 font-medium">
                                            Enter your email address and we'll send you a link to reset your password.
                                        </label>
                                        <input
                                            id="formEmail"
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
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
                                                Sending link...
                                            </>
                                        ) : (
                                            'SEND RESET LINK'
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

export default ForGotPassword;