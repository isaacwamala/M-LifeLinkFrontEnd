import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { API_BASE_URL } from "../general/constants";


import { useDispatch, useSelector } from "react-redux";

//  import this action which refreshes the current user data in redux store
//  without needing to login again, useful for when we assign or unassign roles / other data
//  to the logged in user, so we can update the user roles in redux without logging them out
import { refreshCurrentUser } from "../redux/slice/authSlice";

function AssignRoleToUser() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingUser, setPendingUser] = useState(null); // { id, name, currentRoleIds }
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("access_token");


  const dispatch = useDispatch();

  // Get logged-in user's ID from redux
  // Adjust this selector to match your state shape
  const loggedInUserId = useSelector((state) => state.auth.user?.data?.user?.id);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}getUserAccounts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}roles/all_roles`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setUsers(usersRes.data.data.userDetails || []);
      setRoles(rolesRes.data.roles || rolesRes.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch users or roles");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openRoleModal = (user) => {
    const currentIds = Array.isArray(user.role_id)
      ? user.role_id.map(Number)
      : [Number(user.role_id)];
    setPendingUser({ id: user.id, name: user.name, currentRoleIds: currentIds });
    setSelectedRoleIds([...currentIds]);
  };

  const closeModal = () => {
    setPendingUser(null);
    setSelectedRoleIds([]);
  };

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  //Handling the assign and unassingning of roles to users 
  const handleSaveRoles = async () => {
    if (!pendingUser) return;
    setSaving(true);

    const original = pendingUser.currentRoleIds;
    const toAssign = selectedRoleIds.filter((id) => !original.includes(id));
    const toRemove = original.filter((id) => !selectedRoleIds.includes(id));

    try {
      const promises = [];

      if (toAssign.length > 0) {
        promises.push(
          axios.post(
            `${API_BASE_URL}roles/assignRole`,
            { user_id: pendingUser.id, role_id: toAssign },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        );
      }

      if (toRemove.length > 0) {
        promises.push(
          axios.post(
            `${API_BASE_URL}roles/removeRole`,
            { user_id: pendingUser.id, role_id: toRemove },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        );
      }

      if (promises.length === 0) {
        toast.info("No changes to save");
        setSaving(false);
        closeModal();
        return;
      }

      await Promise.all(promises);
      toast.success(`Roles updated for ${pendingUser.name}`);

      // 3. If the user whose roles changed IS the logged-in user,
      //    re-sync redux without logging them out
      // If the edited user IS the logged-in user, sync redux with fresh data
      if (pendingUser.id === loggedInUserId) {
        // This will call the refreshCurrentUser async thunk action, 
        // which will call the /auth/me endpoint again,
        // get the updated user data with roles, and update the redux state 
        // with the new user data, without affecting the session or token
        dispatch(refreshCurrentUser());
      }

      closeModal();
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update roles");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadges = (user) => {
    const roleIds = Array.isArray(user.role_id)
      ? user.role_id.map(Number)
      : [Number(user.role_id)];
    const assignedRoles = roles.filter((r) => roleIds.includes(Number(r.id)));
    if (assignedRoles.length === 0)
      return <span className="text-xs text-gray-400 italic">No roles</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {assignedRoles.map((role) => (
          <span
            key={role.id}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {role.display_name}
          </span>
        ))}
      </div>
    );
  };

  const getInitials = (name) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const avatarColors = [
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200",
    "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200",
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
    "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200",
  ];

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="w-full">
          <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg mt-14">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-900 px-6 py-4">
                <h1 className="text-white text-xl font-semibold">Assign Roles to Users</h1>
                <p className="text-blue-200 text-sm mt-0.5">
                  Click "Manage Roles" on any user to assign or unassign multiple roles
                </p>
              </div>

              <div className="p-6">
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by user name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Table */}
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-3 border border-gray-100 dark:border-gray-700 rounded-lg"
                      >
                        <Skeleton circle width={40} height={40} />
                        <div className="flex-1">
                          <Skeleton width={160} height={14} />
                          <Skeleton width={100} height={12} className="mt-1" />
                        </div>
                        <Skeleton width={200} height={24} />
                        <Skeleton width={80} height={32} />
                      </div>
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                    No users found matching "{searchTerm}"
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-300 w-10">
                            #
                          </th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-300">
                            User
                          </th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-300">
                            Designation
                          </th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-300">
                            Assigned Roles
                          </th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-300">
                            Branch
                          </th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-300">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredUsers.map((user, idx) => (
                          <tr
                            key={user.id}
                            className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="py-3 px-3 text-gray-400 dark:text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                {user.profile_image ? (
                                  <img
                                    src={user.profile_image}
                                    alt={user.name}
                                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColors[idx % avatarColors.length]
                                      }`}
                                  >
                                    {getInitials(user.name)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white leading-tight">
                                    {user.name}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                              {user.designation || (
                                <span className="text-gray-300 dark:text-gray-600 italic">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3">{getRoleBadges(user)}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                              {user.branch?.name || "—"}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => openRoleModal(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z"
                                  />
                                </svg>
                                Manage Roles
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {pendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Manage Roles
                  </h2>
                  <p className="text-sm text-gray-400 dark:text-gray-400 mt-0.5">
                    {pendingUser.name}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Roles List */}
            <div className="px-6 py-4 max-h-72 overflow-y-auto">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide font-medium">
                Select roles to assign
              </p>
              <div className="space-y-2">
                {roles.map((role) => {
                  const isChecked = selectedRoleIds.includes(Number(role.id));
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${isChecked
                        ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRole(Number(role.id))}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm font-medium ${isChecked
                          ? "text-blue-800 dark:text-blue-200"
                          : "text-gray-700 dark:text-gray-200"
                          }`}
                      >
                        {role.display_name}
                      </span>
                      {isChecked && (
                        <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Assigned
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Summary bar */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              {selectedRoleIds.length === 0
                ? "No roles selected — all will be unassigned"
                : `${selectedRoleIds.length} role${selectedRoleIds.length > 1 ? "s" : ""} selected`}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoles}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AssignRoleToUser;