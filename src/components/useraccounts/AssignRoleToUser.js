import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { API_BASE_URL } from "../general/constants";

function AssignRoleToUser() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("access_token");

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}getUserAccounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        axios.get(`${API_BASE_URL}roles/all_roles`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle assigning user to role,passing role id and user id as arequest load
  const handleCheckboxChange = async (userId, roleId) => {
    try {
      await axios.post(
        `${API_BASE_URL}roles/assignRole`,
        { user_id: userId, role_id: roleId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("User Role updated");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign role");
    }
  };

  return (
    <>
      <ToastContainer />

      <div className="container mx-auto mt-5 px-4">
        <div className="flex justify-center mt-4">
          <div className="w-full">
            <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg mt-14">
              {/* Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {/* Card Header */}
                <div className="text-white text-center text-xl font-semibold px-6 py-4 
                bg-gradient-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-900">
                  Assign Role to a User
                </div>


                {/* Card Body */}
                <div className="p-6 overflow-x-auto">
                  {/* Search */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by user name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Loading Skeleton */}
                  {loading ? (
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-600">
                        <thead>
                          <tr>
                            <th className="p-2 border border-gray-300 dark:border-gray-600">
                              <Skeleton width={100} />
                            </th>
                            {[...Array(5)].map((_, idx) => (
                              <th
                                key={idx}
                                className="p-2 border border-gray-300 dark:border-gray-600"
                              >
                                <Skeleton width={100} />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...Array(5)].map((_, idx) => (
                            <tr key={idx}>
                              <td className="p-2 border border-gray-300 dark:border-gray-600">
                                <Skeleton width={120} />
                              </td>
                              {[...Array(5)].map((__, subIdx) => (
                                <td
                                  key={subIdx}
                                  className="p-2 border border-gray-300 dark:border-gray-600 text-center"
                                >
                                  <Skeleton circle width={20} height={20} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Users Table */
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-600">
                        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                          <tr>
                            <th className="p-3 text-left font-semibold">User</th>
                            {roles.map((role) => (
                              <th key={role.id} className="p-3 text-left font-semibold">
                                {role.display_name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800">
                          {filteredUsers.map((user) => (
                            <tr
                              key={user.id}
                              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <td className="p-3 font-semibold text-gray-900 dark:text-gray-200">
                                {user.name}
                              </td>
                              {roles.map((role) => (
                                <td
                                  key={role.id}
                                  className="p-3 text-center text-gray-900 dark:text-gray-200"
                                >
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                                    checked={Number(user.role_id) === Number(role.id)}
                                    onChange={() =>
                                      handleCheckboxChange(user.id, role.id)
                                    }
                                    disabled={Number(user.role_id) === Number(role.id)}
                                  />
                                </td>
                              ))}
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
      </div>
    </>

  );
}

export default AssignRoleToUser;
