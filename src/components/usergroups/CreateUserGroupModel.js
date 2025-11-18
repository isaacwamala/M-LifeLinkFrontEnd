import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import {useNavigate} from 'react-router-dom';
import { API_BASE_URL } from "../general/constants";
import apiRequest from "../general/common";

// TARGETS CREATING A USER GROUP THROUGH creating a role,assigning permissions at once
function CreateUserGroupModal(props) {

  const navigate = useNavigate();
  const [role, setRole] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [step1FormData, setStep1FormData] = useState({
    name: "",
    display_name: "",
  });
  const [step2FormData, setStep2FormData] = useState({
    permissions: [],
  });
  const [errorMessage, setErrorMessage] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setStep1FormData({ ...step1FormData, [name]: value }); // Update the corresponding field
    setErrorMessage({ ...errorMessage, [name]: null });
  };
  const validateStep1Form = () => {
    const newErrors = {};
    if (!step1FormData.name) {
      newErrors.name = "Name is required";
    }
    setErrorMessage(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleCheckboxChange = (permId) => {
    // Check if the permission is already selected
    const index = step2FormData.permissions.indexOf(permId);
    if (index === -1) {
      // Permission not selected, add it to the array
      setStep2FormData((prevData) => ({
        ...prevData,
        permissions: [...prevData.permissions, permId],
      }));
    } else {
      // Permission already selected, remove it from the array
      setStep2FormData((prevData) => ({
        ...prevData,
        permissions: prevData.permissions.filter((id) => id !== permId),
      }));
    }
  };

  const handleStep1Next = async () => {
    if (validateStep1Form()) {
      setLoading(true);
        const data = JSON.stringify({
          name: step1FormData.name,
          display_name: step1FormData.display_name,
        });
  
        const onSuccess = (response) => {
          setRole(response.role);
          setCurrentStep(2);
          setLoading(false);
          toast.success(response.message);
        };
  
        const onError = (error) => {
          toast.error("Error occurred while Creating Roles");
          setLoading(false);
        };
  
        //api request to create anew role
        await apiRequest(
          "post",
          `${API_BASE_URL}roles/create`,
          data,
          "",
          onSuccess,
          onError,
         
        );
    }
  };
  const handleStep2Submit = async () => {
    setLoading(true);

    const data = JSON.stringify({
      role_id: role.id,
      permission_ids: step2FormData.permissions,
    });
  
    const onSuccess = (response) => {
      toast.success(response.message);
      const navigateAfterDelay = async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setLoading(false);
        props.setOpen(false);
        navigate("/usergroups");
        props.setRefresh(true);
      };
      navigateAfterDelay();
    };
  
    const onError = (error) => {
      toast.error("Error occurred");
      setLoading(false);
    };
  
    //api to assign permissions to arole
    await apiRequest(
      "post",
      `${API_BASE_URL}roles/role/2/permissions`,
      data,
      "",
      onSuccess,
      onError,
    );
  };

  
// Use API_BASE_URL to construct the full endpoint URL
const getPermissions = async () => {
  const onSuccess = (response) => {
    setPermissions(response.permissions);
  };

  const onError = (error) => {
    toast.error('Error Occurred Fetching data');
  };

  // API request to fetch all permissions
  await apiRequest(
    'get',
    `${API_BASE_URL}roles/permissions`, // Construct the full URL using API_BASE_URL
    '', // No data in this request
    '',
    onSuccess,
    onError
  );
};
  const handleOk = () => {
    if (currentStep === 1) {
      handleStep1Next();
    } else if (currentStep === 2) {
      handleStep2Submit();
    }
  };
  const handleCancel = () => {
    currentStep === 1 ? props.setOpen(false) : setCurrentStep(1);
  };

  useEffect(() => {
    getPermissions();
  }, []);
  
  if (!props.open) return null;

  return (
    <div>
  {/* Modal backdrop */}
  <div
    className="fixed inset-0 z-50 bg-gray-900 bg-opacity-50 flex items-center justify-center overflow-y-auto overflow-x-hidden"
    onClick={handleCancel}
  >
    {/* Modal content */}
    <div
      className="relative p-4 w-full max-w-2xl max-h-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {/* Modal header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200 dark:border-gray-600 rounded-t">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {currentStep === 1
              ? "Step 1: Account Type Information"
              : "Step 2: Assigning Permission"}
          </h3>
          <button
            type="button"
            className="text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg text-sm w-8 h-8 flex justify-center items-center"
            onClick={handleCancel}
          >
            <svg
              className="w-3 h-3"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 14"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
              />
            </svg>
            <span className="sr-only">Close modal</span>
          </button>
        </div>

        {/* Modal body */}
        <div className="p-4 md:p-5 space-y-4">
          {currentStep === 1 && (
            <form className="mt-6 mb-2 w-80 max-w-screen-lg sm:w-96 flex flex-col gap-5">
              {/* Name Input */}
              <div className="relative">
                <input
                  name="name"
                  value={step1FormData.name}
                  onChange={handleChange}
                  type="text"
                  placeholder=" "
                  className={`w-full px-3 py-3 rounded-md border ${
                    errorMessage.name ? "border-red-500" : "border-gray-300"
                  } text-gray-900 dark:text-gray-100 bg-transparent dark:bg-gray-700 focus:border-green-500 outline-none`}
                />
                <label className="absolute left-3 -top-2 bg-white dark:bg-gray-700 px-1 text-xs text-gray-600 dark:text-gray-400">
                  Name
                </label>
                {errorMessage.name && (
                  <p className="mt-1 text-xs text-red-500">{errorMessage.name}</p>
                )}
              </div>

              {/* Display Name Input */}
              <div className="relative">
                <input
                  name="display_name"
                  value={step1FormData.display_name}
                  onChange={handleChange}
                  type="text"
                  placeholder=" "
                  className={`w-full px-3 py-3 rounded-md border ${
                    errorMessage.display_name ? "border-red-500" : "border-gray-300"
                  } text-gray-900 dark:text-gray-100 bg-transparent dark:bg-gray-700 focus:border-green-500 outline-none`}
                />
                <label className="absolute left-3 -top-2 bg-white dark:bg-gray-700 px-1 text-xs text-gray-600 dark:text-gray-400">
                  Display Name
                </label>
                {errorMessage.display_name && (
                  <p className="mt-1 text-xs text-red-500">{errorMessage.display_name}</p>
                )}
              </div>
            </form>
          )}

          {currentStep === 2 && (
            <form className="mt-6 mb-2 w-80 max-w-screen-lg sm:w-96 flex flex-col gap-3">
              {permissions.length === 0 ? (
                <p className="text-gray-800 dark:text-gray-200">No Permissions Found</p>
              ) : (
                permissions.map((perm, key) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={step2FormData.permissions.includes(perm.id)}
                      onChange={() => handleCheckboxChange(perm.id)}
                      className="h-5 w-5 rounded border-gray-400 text-green-600 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label className="ml-2 text-gray-800 dark:text-gray-200">
                      {perm.display_name}
                    </label>
                  </div>
                ))
              )}
            </form>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center p-4 md:p-5 border-t border-gray-200 dark:border-gray-600 rounded-b">
          <button
            className="mr-4 rounded-md bg-red-600 px-5 py-2 text-white text-sm font-semibold hover:bg-red-700 focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
            type="button"
            onClick={handleCancel}
          >
            {currentStep === 1 ? "Cancel" : "Back"}
          </button>
          <button
            className="rounded-md bg-green-600 px-5 py-2 text-white text-sm font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
            type="button"
            onClick={handleOk}
            disabled={loading}
          >
            {loading ? (
              <div className="loader h-5 w-5 border-2 border-t-2 border-white rounded-full animate-spin"></div>
            ) : currentStep === 1 ? (
              "Next"
            ) : (
              "Create Account Type"
            )}
          </button>
        </div>
      </div>
    </div>
  </div>

  <ToastContainer
    position="top-right"
    autoClose={1000}
    newestOnTop
    closeOnClick
    pauseOnHover
    draggable
    theme="light"
  />
</div>

  );
}

export default CreateUserGroupModal;
