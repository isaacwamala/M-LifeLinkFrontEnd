import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import CreateUserGroupModal from "./CreateUserGroupModel";
import UpdatePermission from "./UpdatePermission";
import { API_BASE_URL } from "../general/constants";
import apiRequest from "../general/common";



//DISPLAYS USER ACCOUNT TYPES ie Administrator,Marketing agent,etc with their permissions
function UserGroups() {
  const [userGroups, setUserGroups] = useState([]);
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(0);
  const [openDetails, setOpenDetails] = useState(false);
  const [branchSwitch, setBranchSwitch] = useState(false);
  const [loading, setLoading] = useState(false);

  const [refresh, setRefresh] = useState(false);
  const handleModal = () => {
    setOpen(!open);
  };

  const handleDetailsModal = () => {
    setOpenDetails(!openDetails);
  };

  const getUserGroups = () => {
    setLoading(true);

    const onSuccess = (response) => {
      setUserGroups(response.roles);
      setLoading(false);
    };

    const onError = (error) => {
      console.error('Error:', error);
      toast.error("Error Fetching Data.. Please try again");
      setLoading(false);
    };
    // Using the apiRequest function with correct parameters
    apiRequest("get", `${API_BASE_URL}roles/all_roles`, "", "", onSuccess, onError);
  };



  useEffect(() => {
    getUserGroups();
  }, [refresh]);

  return (
    <>
      <ToastContainer />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">


          <div className="w-full">

           
            <div className="p-4 border-2 border-gray-400 border-dashed rounded-lg dark:border-gray-500 mt-14">

              {/* Title + Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h1 className="text-2xl text-gray-900 dark:text-gray-100">
                  Account Types
                </h1>

                <button
                  type="button"
                  onClick={handleModal}
                  className="
                w-full sm:w-auto 
                text-white bg-gradient-to-r from-blue-400 via-green-500 to-blue-600
                hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-200
                font-medium rounded-lg text-sm px-5 py-2.5 text-center
              "
                >
                  + Create Account Type
                </button>
              </div>

              {/* Loading / Empty / List */}
              <div>
                {loading ? (
                  <div className="flex flex-col gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} role="status" className="w-full animate-pulse">
                        <div className="h-2.5 bg-gray-200 rounded-full w-48 mb-4"></div>
                        <div className="h-2 bg-gray-300 rounded-full w-full mb-2.5"></div>
                        <div className="h-2 bg-gray-300 rounded-full w-3/4 mb-2.5"></div>
                        <div className="h-2 bg-gray-300 rounded-full w-1/2 mb-2.5"></div>
                      </div>
                    ))}
                  </div>
                ) : userGroups.length === 0 ? (
                  <p className="text-gray-700 dark:text-gray-300">You have no UserGroups</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {userGroups.map((account, key) => (
                      <div
                        key={key}
                        className="w-full h-60 flex flex-col justify-between 
                       bg-white dark:bg-gray-800 
                       border-2 border-gray-200 dark:border-gray-600 
                       rounded-lg mb-6 py-5 px-4"
                      >
                        <div>
                          <h6 className="text-green-900 dark:text-green-300 font-bold mb-2">
                            {account.display_name}
                          </h6>
                          <p className="text-gray-800 dark:text-gray-300 text-sm">
                            Number of Permissions: {account.permissions.length}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-gray-500 dark:text-gray-300">
                            <div>
                              <p>Last Updated</p>
                              <p className="text-sm">
                                {new Date(account.updated_at).toLocaleString()}
                              </p>
                            </div>

                            <button
                              className="w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-100 dark:text-gray-800 
                            text-white flex items-center justify-center 
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black
                            hover:bg-black hover:text-white"
                              aria-label="edit note"
                              onClick={() => {
                                handleDetailsModal();
                                setId(account.id);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="icon icon-tabler icon-tabler-pencil"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path stroke="none" d="M0 0h24v24H0z"></path>
                                <path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-4-4L4 16v4"></path>
                                <line x1="13.5" y1="6.5" x2="17.5" y2="10.5"></line>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>


            {/* Modals */}
            <CreateUserGroupModal open={open} setOpen={setOpen} setRefresh={setRefresh} />
            <UpdatePermission
              open={openDetails}
              setOpen={setOpenDetails}
              refresh={refresh}
              setRefresh={setRefresh}
              id={id}
            />
          </div>
        </div>
      </div>

    </>

  );
}

export default UserGroups;
