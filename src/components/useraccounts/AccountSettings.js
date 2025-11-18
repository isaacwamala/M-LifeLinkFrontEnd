import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { User, Lock, Edit2, Save, X, Mail, Phone, AtSign, Camera } from 'lucide-react';
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "../general/constants";

function AccountSettings() {
  const { user } = useSelector((state) => state.auth);
  const token = user?.data?.access_token;

  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [userDetails, setUserDetails] = useState({
    role: "",
    email: "",
    username: "",
    name: "",
    phone_number: "",
    profile_image: "",
  });

  const [editedInfo, setEditedInfo] = useState({ ...userDetails });
  const [passwords, setPasswords] = useState({ password: "", confirmPassword: "" });

  // Fetch logged-in user details
  const fetchUserDetails = async () => {
    setUserLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}getLoggedInUserDetails`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.userDetails;
      setUserDetails({
        role: data.role?.display_name || "",
        email: data.email || "",
        username: data.username || "",
        name: data.name || "",
        phone_number: data.phone_number || "",
        profile_image: data.profile_image || "",
      });
      setEditedInfo({
        role: data.role?.display_name || "",
        email: data.email || "",
        username: data.username || "",
        name: data.name || "",
        phone_number: data.phone_number || "",
        profile_image: data.profile_image || "",
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to fetch user details.");
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  // Edit / Cancel / Save handlers
  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setEditedInfo({ ...userDetails });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();

      // Append text fields
      formData.append("name", editedInfo.name);
      formData.append("username", editedInfo.username);
      formData.append("email", editedInfo.email);
      formData.append("phone_number", editedInfo.phone_number);

      // Append profile image if it exists
      if (editedInfo.profile_image instanceof File) {
        formData.append("profile_image", editedInfo.profile_image);
      }

      // Make request
      const response = await axios.post(`${API_BASE_URL}updateUserProfile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data", // Important!
        },
      });

      toast.success(response.data.message || "Profile updated successfully");

      // Refresh data
      fetchUserDetails();
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };


  const handleInputChange = (field, value) => {
    setEditedInfo((prev) => ({ ...prev, [field]: value }));
  };

  // Password change handlers
  const handlePasswordChange = (field, value) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));
    setPasswordError("");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.password !== passwords.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwords.password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}auth/reset_password`,
        { password: passwords.password, password_confirmation: passwords.confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setPasswords({ password: "", confirmPassword: "" });
    } catch (error) {
      console.error(error);
      setPasswordError(error.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Profile image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Store the File object for FormData upload
    setEditedInfo((prev) => ({ ...prev, profile_image: file }));

    // Optional: generate a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditedInfo((prev) => ({ ...prev, profile_image_preview: reader.result }));
    };
    reader.readAsDataURL(file);
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 transition-colors">
      <ToastContainer />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-purple-900 p-6">
            <h1 className="text-white text-2xl font-semibold">Account Settings</h1>
            <p className="text-blue-100 mt-1">Manage your profile and security settings</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 flex">
            <button
              className={`flex-1 py-3 text-center transition-colors ${activeTab === "profile"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
            <button
              className={`flex-1 py-3 text-center transition-colors ${activeTab === "password"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              onClick={() => setActiveTab("password")}
            >
              Password
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Edit/Save */}
                <div className="flex justify-end gap-2">
                  {!isEditing ? (
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <Save className="w-4 h-4" /> {loading ? "Saving..." : "Save"}
                      </button>
                    </>
                  )}
                </div>

                {/* Profile Picture */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <img
                      src={editedInfo.profile_image_preview || editedInfo.profile_image || "https://avatar.iran.liara.run/public"}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                    />

                    {isEditing && (
                      <label className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full cursor-pointer hover:bg-blue-600">
                        <Camera className="w-4 h-4 text-white" />
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Click camera to upload</p>
                </div>

                {/* Profile Fields */}
                {["name", "username", "email", "phone_number"].map((field) => (
                  <div key={field}>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                      {field === "name"
                        ? "Full Name"
                        : field === "username"
                          ? "Username"
                          : field === "email"
                            ? "Email"
                            : "Phone Number"}
                    </label>
                    {isEditing ? (
                      <input
                        type={field === "email" ? "email" : "text"}
                        value={editedInfo[field]}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
                        {userDetails[field]}
                      </p>
                    )}
                  </div>
                ))}

                {/* Role display */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
                    {userDetails.role}
                  </p>
                </div>
              </div>
            )}



            {/*PASSWORD TAB*/}
            {activeTab === "password" && (
              <div className="max-w-md mx-auto">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwords.password}
                      onChange={(e) => handlePasswordChange("password", e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {passwordError && (
                    <p className="text-red-600 dark:text-red-400">{passwordError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </form>

                {/* Security Tips */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-gray-900 dark:text-gray-100 mb-3">Security Tips</h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Use a unique password you don't use elsewhere</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Include numbers, symbols, and mixed case letters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Avoid common words and personal information</span>
                    </li>
                  </ul>
                </div>
              </div>


            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountSettings;
