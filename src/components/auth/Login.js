import React, { useState } from 'react';
import { User, Lock, LogIn, Heart } from 'lucide-react';
import { useDispatch } from "react-redux";
import { loginUser } from "../redux/slice/authSlice";
import { fetchUserRoles } from '../redux/slice/rolesSlice';
import { API_BASE_URL } from '../general/constants';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from "react-router-dom";

function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    // Destructure username and password for easier access in JSX
    const { username, password } = formData;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            toast.error('Username and password required');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}auth/login`, formData);
            const { access_token, user, plan } = response.data.data;
            const roleId = parseInt(user.role_id);

            toast.success(response.data.message);

            const data = JSON.stringify({ username, password });
            dispatch(loginUser(data));
            dispatch(fetchUserRoles());

            localStorage.setItem('access_token', access_token);
            localStorage.setItem("user", access_token);
            localStorage.setItem("plan", plan);

            setTimeout(() => {
                setLoading(false);
                if (roleId === 1) {
                    navigate('/usergroups'); // Admin
                } else if (roleId === 4) {
                    // Add navigation for role 4
                } else {
                    // Add navigation for other roles
                }
            }, 2000);

        } catch (error) {
            console.error(error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Login failed. Please try again.';
            toast.error(errorMessage);
            setLoading(false);
        }
    };

    return (
        <>
            <ToastContainer />
            <div className="min-h-screen relative flex items-center justify-center p-4">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&q=80"
                        alt="Medical Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/85 to-teal-800/90"></div>
                </div>

                {/* Login Card */}
                <div className="relative z-10 w-full max-w-md">
                    {/* Logo/Icon Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 mb-4">
                            <Heart className="w-10 h-10 text-white" fill="currentColor" />
                        </div>
                        <h1 className="text-white mb-2 tracking-wide">WELCOME TO</h1>
                        <h2 className="text-white tracking-wider">MUTIMA LIFE LINK</h2>
                        <h3 className="text-white mt-1">VIRTUAL MEDICAL CENTER</h3>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mt-4"></div>
                    </div>

                    {/* Login Form Card */}
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
                        <div className="text-center mb-6">
                            <h4 className="text-gray-700">Sign In to Your Account</h4>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Username Input */}
                            <div>
                                <label htmlFor="username" className="block text-gray-700 mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={username}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white"
                                        placeholder="Enter your username"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div>
                                <label htmlFor="password" className="block text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        value={password}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white"
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-gray-600">Remember me</span>
                                </label>
                                <a href="/forgotPassword" className="text-blue-600 hover:text-blue-700 transition-colors">
                                    Forgot password?
                                </a>
                            </div>

                           
                            {/* Login Button */}
                            <button
                                type="submit"
                                disabled={loading} // disable button while loading
                                className={`w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg transform hover:-translate-y-0.5 
                                ${loading ? 'opacity-70 cursor-not-allowed hover:from-blue-600 hover:to-teal-600' : 'hover:from-blue-700 hover:to-teal-700 hover:shadow-xl'}`}
                            >
                                {loading ? (
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
                                            d="M4 12a8 8 0 018-8v8z"
                                        ></path>
                                    </svg>
                                ) : (
                                    <LogIn className="h-5 w-5" />
                                )}
                                {loading ? "Signing In..." : "Sign In"}
                            </button>

                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-4 bg-white text-gray-500">Need Help?</span>
                            </div>
                        </div>

                        {/* Footer Links */}
                        <div className="text-center space-y-2">
                            <p className="text-gray-600">
                                Don't have an account?{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">
                                    Contact Administrator
                                </a>
                            </p>
                            <p className="text-gray-500 mt-4">
                                © 2025 Mutima Life Link Virtual Medical Center
                            </p>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-6 text-center">
                        <p className="text-white/90 text-sm">
                            Secure access to your virtual medical services
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Login;
