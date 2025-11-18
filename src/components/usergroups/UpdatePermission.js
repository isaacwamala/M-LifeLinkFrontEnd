import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { API_BASE_URL } from "../general/constants";

function UpdatePermission(props) {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState([]);
  const [checkedPermissions, setCheckedPermissions] = useState([]);
  const [checkedPermissionIds, setCheckedPermissionIds] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [step2FormData, setStep2FormData] = useState([]);

  const handleOk = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      props.setOpen(false);
    }, 3000);
  };
  const handleCancel = () => {
    props.setOpen(false);
  };
  const getRoleDetails = (id) => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${API_BASE_URL}roles/role/${id}`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("user")}`,
      },
    };

    axios
      .request(config)
      .then((response) => {
        setRole(response.data.role);
        setCheckedPermissions(response.data.role.permissions);
        setCheckedPermissionIds(
          response.data.role.permissions.map((permission) => permission.id)
        );
        setStep2FormData(
          response.data.role.permissions.map((permission) => permission.id)
        );
      })
      .catch((error) => {
        toast.error("Error Occured fetching data");
      });
  };

  //   fetch all permissions
  const getPermissions = async () => {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${API_BASE_URL}roles/permissions`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("user")}`,
      },
    };

    await axios
      .request(config)
      .then((response) => {
        setPermissions(response.data.permissions);
      })
      .catch((error) => {
        toast.error("Error Occurred Fetching data ");
      });
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCheckboxChange = (permId) => {
    // Check if the permission is already selected
    const index = checkedPermissionIds.indexOf(permId);
    if (index === -1) {
      // Permission not selected, add it to the array
      setCheckedPermissionIds([...checkedPermissionIds, permId]);
    } else {
      // Permission already selected, remove it from the array
      setCheckedPermissionIds(
        checkedPermissionIds.filter((id) => id !== permId)
      );
    }
  };

  const handlePermissionsUpdate = async (baseArray, newArray) => {
    setLoading(true);
    const baseSet = new Set(baseArray);
    const newIds = newArray.filter((id) => !baseSet.has(id));
    const missingIds = baseArray.filter((id) => !new Set(newArray).has(id));

    if (newIds.length > 0) {
      let data = JSON.stringify({
        role_id: role.id,
        permission_ids: newIds,
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${API_BASE_URL}roles/role/${props.id}/permissions`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("user")}`,
        },
        data: data,
      };

      await axios
        .request(config)
        .then((response) => {
          toast.success("Permissions updated");
          props.setOpen(false);
          props.setRefresh(true);
          setLoading(false);

        })
        .catch((error) => {
          toast.error("Error Occured");
        });
    }

    if (missingIds.length > 0) {
      let data = JSON.stringify({
        role_id: role.id,
        permission_ids: missingIds,
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${API_BASE_URL}roles/role/3/remove-permissions`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("user")}`,
        },
        data: data,
      };

      await axios
        .request(config)
        .then((response) => {
          toast.success("Permissions Updated");
          props.setOpen(false);
          props.setRefresh(true);
          setLoading(false);
        })
        .catch((error) => {
          toast.error("Error Occured");
        });
    }
  };

  useEffect(() => {
    props.id > 0 && getRoleDetails(props.id);
    getPermissions();
  }, [props.id]);

  if (!props.open) return null;

  return (
    
    <div>
      {/* Modal backdrop */}
      <div
        className="fixed inset-0 z-50 bg-gray-900/50 dark:bg-gray-800/50 flex items-center justify-center overflow-y-auto overflow-x-hidden"
        onClick={handleCancel}
      >
        {/* Modal content */}
        <div
          className="relative p-4 w-full max-w-4xl max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 rounded-t">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                User Account Details
              </h3>
              <button
                type="button"
                className="text-gray-400 dark:text-gray-300 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
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
            <div className="p-4 md:p-5 space-y-4 text-gray-800 dark:text-gray-200">
              <p>
                <span className="text-lg font-semibold">Account Name</span>: {role.display_name}
              </p>
              <p>
                <span className="text-lg font-semibold">Account Nature</span>: {role.name}
              </p>

              {/* Divider */}
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-600 dark:text-gray-400">Permissions List</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
              </div>

              {editMode ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4">
                  {permissions.map((perm) => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`cb${perm.id}`}
                        onChange={() => handleCheckboxChange(perm.id)}
                        checked={checkedPermissionIds.includes(perm.id)}
                        className="appearance-none h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded checked:bg-green-400 dark:checked:bg-green-500 transition-all duration-200 peer"
                      />
                      <div className="h-5 w-5 absolute rounded-full pointer-events-none peer-checked:border-green-400 peer-checked:border-2"></div>
                      <label
                        htmlFor={`cb${perm.id}`}
                        className="text-sm peer-checked:text-green-600 dark:peer-checked:text-green-400 cursor-pointer select-none"
                      >
                        {perm.display_name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                checkedPermissions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-4">
                    {checkedPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex items-start">
                          <div className="mr-3 mt-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-green-500"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                              {permission.display_name}
                            </h4>
                            {permission.description && (
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center p-4 md:p-5 border-t border-gray-200 dark:border-gray-700 rounded-b">
              <button
                className="mr-6 select-none rounded-lg bg-red-600 dark:bg-red-700 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-red-500/20 dark:shadow-red-800/20 transition-all hover:shadow-lg hover:shadow-red-500/40 dark:hover:shadow-red-800/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                type="button"
                onClick={handleCancel}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="mr-6 select-none rounded-lg bg-green-600 dark:bg-green-700 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-green-500/20 dark:shadow-green-800/20 transition-all hover:shadow-lg hover:shadow-green-500/40 dark:hover:shadow-green-800/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                disabled={editMode}
              >
                Remove / add Permissions
              </button>
              {editMode && (
                <button
                  type="button"
                  className="select-none rounded-lg bg-green-600 dark:bg-green-700 py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-green-500/20 dark:shadow-green-800/20 transition-all hover:shadow-lg hover:shadow-green-500/40 dark:hover:shadow-green-800/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                  onClick={() => {
                    handlePermissionsUpdate(step2FormData, checkedPermissionIds);
                  }}
                >
                  {loading ? (
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 dark:border-gray-700 h-6 w-6"></div>
                  ) : (
                    "Update Permissions"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light" // You can change dynamically if needed
      />
    </div>

  );
}

export default UpdatePermission;
