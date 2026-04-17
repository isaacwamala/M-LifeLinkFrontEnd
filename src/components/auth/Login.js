import React, { useState } from 'react';
import { User, Lock, LogIn, Heart, ArrowLeft, FlaskConical, ShieldCheck, Pill } from 'lucide-react';
import { useDispatch } from "react-redux";
import { loginUser } from "../redux/slice/authSlice";
import { fetchUserRoles } from '../redux/slice/rolesSlice';
import { API_BASE_URL } from '../general/constants';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import mediconnect from "../assets/mediconnect.png";


// Define Role cards Lists to be used  in role section of login page
const ROLE_CARDS = [
  {
    key: 'admin',
   // roleId: 1,//As they really are from backend
    title: 'Global Administrator',
    subtitle: 'Full system access',
    icon: ShieldCheck,
    color: 'blue',
  },
  {
    key: 'pharmacist',
    //roleId: 5, //As they really are from backend
    title: 'Pharmacist',
    subtitle: 'Medication management',
    icon: Pill,
    color: 'teal',
  },
  {
    key: 'lab',
    //roleId: 6,  //As they really are from backend
    title: 'Laboratory Technician',
    subtitle: 'Lab results & diagnostics',
    icon: FlaskConical,
    color: 'amber',
  },
];

//Map the colors for each role card
const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-700',
    badge: 'text-blue-700',
    ring: 'hover:ring-blue-400',
  },
  teal: {
    bg: 'bg-teal-50',
    icon: 'text-teal-700',
    badge: 'text-teal-700',
    ring: 'hover:ring-teal-400',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-700',
    badge: 'text-amber-700',
    ring: 'hover:ring-amber-400',
  },
};

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const { username, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

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
      localStorage.setItem('user', access_token);
      localStorage.setItem('plan', plan);

      setTimeout(() => {
        setLoading(false);
        if (roleId === 1) {
          navigate('/usergroups');       // Global Admin
        } else if (roleId === 5) {
          navigate('/inventory');        // Pharmacist
        } else if (roleId === 6) {
          navigate('/inventory');        // Lab Technician
        } else {
          navigate('/inventory');        // All other roles
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

        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={mediconnect}
            alt="Medical Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/85 to-teal-800/90"></div>
        </div>

        <div className="relative z-10 w-full">

          {/* ── ROLE SELECTION SCREEN ── */}
          {!selectedRole && (
            <div className="max-w-2xl mx-auto">

              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 mb-4">
                  <Heart className="w-10 h-10 text-white" fill="currentColor" />
                </div>
                <p className="text-white/70 text-xs tracking-[3px] uppercase mb-1">Welcome to</p>
                <h1 className="text-white text-3xl font-medium tracking-widest">MEDICONNECT</h1>
                <p className="text-white/60 text-sm mt-1">Virtual Medical Center</p>
                <div className="w-20 h-px bg-white/25 mx-auto mt-4"></div>
              </div>

              <p className="text-center text-white/80 text-sm mb-6">
                Select your role to continue
              </p>

              {/* Role Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {ROLE_CARDS.map((role) => {
                  const Icon = role.icon;
                  const c = COLOR_MAP[role.color];
                  return (
                    <button
                      key={role.key}
                      onClick={() => setSelectedRole(role)}
                      className={`bg-white/95 rounded-2xl p-7 flex flex-col items-center gap-4 text-center cursor-pointer border-2 border-transparent ring-2 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${c.ring}`}
                    >
                      <div className={`w-14 h-14 rounded-full ${c.bg} flex items-center justify-center`}>
                        <Icon className={`w-7 h-7 ${c.icon}`} />
                      </div>
                      <div>
                    
                        <p className="text-gray-800 text-base font-medium">{role.title}</p>
                        <p className="text-gray-400 text-xs mt-1">{role.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-white/30 text-xs mt-10">
                © 2025 Mutima Life Link Virtual Medical Center
              </p>
            </div>
          )}

          {/* ── LOGIN FORM SCREEN ── */}
          {selectedRole && (
            <div className="max-w-md mx-auto">

              {/* Back button */}
              <button
                onClick={() => setSelectedRole(null)}
                className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to roles
              </button>

              {/* Selected role badge */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-4">
                  <span className={`w-2 h-2 rounded-full ${
                    selectedRole.color === 'blue' ? 'bg-blue-300' :
                    selectedRole.color === 'teal' ? 'bg-teal-300' : 'bg-amber-300'
                  }`}></span>
                  <span className="text-white text-sm font-medium">{selectedRole.title}</span>
                </div>
                <h2 className="text-white text-2xl font-medium">Sign in to your account</h2>
              </div>

              {/* Login Card */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">

                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-gray-600 text-sm mb-2 font-medium">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={username}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white text-sm"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-gray-600 text-sm mb-2 font-medium">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={password}
                        onChange={handleChange}
                        className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white text-sm"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  {/* Remember / Forgot */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      Remember me
                    </label>
                    <a href="/forgotPassword" className="text-blue-600 hover:text-blue-700 transition-colors">
                      Forgot password?
                    </a>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg
                      ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:from-blue-700 hover:to-teal-700 hover:shadow-xl hover:-translate-y-0.5'}`}
                  >
                    {loading ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                    ) : (
                      <LogIn className="h-5 w-5" />
                    )}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-white text-gray-400 text-sm">Need Help?</span>
                  </div>
                </div>

                <div className="text-center space-y-2 text-sm">
                  <p className="text-gray-500">
                    Don't have an account?{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700">Contact Administrator</a>
                  </p>
                  <p className="text-gray-300 text-xs mt-3">
                    © 2025 Mutima Life Link Virtual Medical Center
                  </p>
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-white/60 text-xs">Secure access to your virtual medical services</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default Login;