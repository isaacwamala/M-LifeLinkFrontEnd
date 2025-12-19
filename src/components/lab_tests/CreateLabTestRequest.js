import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast, ToastContainer } from "react-toastify";
import { Trash2, Plus, FlaskConical } from "lucide-react";
import { fetchSpecimenTypes } from "../patients/patients_lab_tests_helper";
import { fetchTestTypes } from "../patients/patients_lab_tests_helper";



export function CreateLabTestRequest() {
  const { visitId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const visit = state?.visit;

  // Specimen and test types data
  const [specimens, setSpecimens] = useState([]);
  const [allTestTypes, setAllTestTypes] = useState([]);

  // Current selection state
  const [selectedSpecimenId, setSelectedSpecimenId] = useState(null);
  const [availableTestTypes, setAvailableTestTypes] = useState([]);
  const [selectedTestTypeIds, setSelectedTestTypeIds] = useState([]);
  const [testDescription, setTestDescription] = useState("");
  const [methodUsed, setMethodUsed] = useState("");

  // Added tests list
  const [addedTests, setAddedTests] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Fetch all specimens on mount
  useEffect(() => {
    loadAllSpecimenTypes();
    loadAllTestTypes();
  }, []);

  // Fetch test types for selected specimen
  useEffect(() => {
    if (selectedSpecimenId !== null) {
      fetchSpecimenTestTypes(selectedSpecimenId);
    } else {
      setAvailableTestTypes([]);
      setSelectedTestTypeIds([]);
    }
  }, [selectedSpecimenId]);

  //Endpoint that fetches all specimen types
  const loadAllSpecimenTypes = async () => {
    setLoading(true);
    const data = await fetchSpecimenTypes(token);
    setSpecimens(data);
    setLoading(false);
  };

  //Endpoint that fetches all test types
  const loadAllTestTypes = async () => {
    setLoading(true);
    const data = await fetchTestTypes(token);
    setAllTestTypes(data);
    setLoading(false);
  };

  //Endpoint that fetches test types for a given selected specimen
  const fetchSpecimenTestTypes = async (specimenId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}config/getSpecimenWithTestTypes`,
        {
          params: { specimen_type_id: specimenId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const testTypes = response.data?.specimen?.test_types || [];
      setAvailableTestTypes(testTypes);
    } catch (error) {
      toast.error("Failed to load test types for specimen");
    } finally {
      setLoading(false);
    }
  };

  const handleTestTypeToggle = (testTypeId) => {
    setSelectedTestTypeIds((prev) =>
      prev.includes(testTypeId)
        ? prev.filter((id) => id !== testTypeId)
        : [...prev, testTypeId]
    );
  };

  //Handle the addition of a test to the list
  const handleAddToList = () => {
    if (!selectedSpecimenId) {
      toast.error("Please select a specimen");
      return;
    }

    if (selectedTestTypeIds.length === 0) {
      toast.error("Please select at least one test type");
      return;
    }

    //check id's already added for the selected specimen
    const specimen = specimens.find((s) => s.id === selectedSpecimenId);
    if (!specimen) return;

    const selectedTests = availableTestTypes.filter((tt) =>
      selectedTestTypeIds.includes(tt.id)
    );

    //Add new test to the list
    const newTest = {
      id: Date.now().toString(),
      specimen_id: selectedSpecimenId,
      specimen_name: specimen.specimen_name,
      test_types: selectedTests,
      test_description: testDescription,
      method_used: methodUsed,
    };

    //Set added tests to the list
    setAddedTests([...addedTests, newTest]);

    // Reset form
    setSelectedSpecimenId(null);
    setSelectedTestTypeIds([]);
    setTestDescription("");
    setMethodUsed("");

    toast.success("Test added to list");
  };

  //Function to remove test from the list
  const handleRemoveTest = (id) => {
    setAddedTests(addedTests.filter((test) => test.id !== id));
    toast.success("Test removed from list");
  };


  //Handle the function to submit the lab test request
  const handleSubmit = async () => {
    if (addedTests.length === 0) {
      toast.error("Please add at least one test");
      return;
    }

    //Pay load to submit to backend
    const payload = {
      visit_id: visit.id,
      patient_id: visit.patient_id,
      test_date: testDate,
      tests: addedTests.flatMap((test) =>
        test.test_types.map((tt) => ({
          specimen_type_id: test.specimen_id,
          test_type_id: tt.id,
          test_description: test.test_description,
          method_used: test.method_used,
        }))
      ),

    };

    console.log("aded test", addedTests);

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}tests/registerLabTestRequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Lab test request created successfully");
      setTimeout(() => {
        navigate("/patient_lab/test/requests");
      }, 1500);
    } catch (error) {
      console.error("Error submitting lab test request:", error);
      toast.error(
        error?.response?.data?.message || "Failed to submit request"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!visit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Visit data not found</p>
      </div>
    );
  }

  const selectedSpecimen = specimens.find(
    (s) => s.id === selectedSpecimenId
  );

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-5">
        <div className="w-full">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 mb-8 border border-gray-200 dark:border-gray-700">
            {/* Title */}
            <div className="flex items-center gap-3 mb-6">
              <FlaskConical className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Laboratory Test Request
              </h1>
            </div>

            {/* Visit Details */}
            {/* Patient Visit Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Patient Visit Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Patient Name */}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Patient Name
                  </p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    {visit.patient?.name || "N/A"}
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Phone Number
                  </p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    {visit.patient?.phone_number || "N/A"}
                  </p>
                </div>

                {/* Address */}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Address
                  </p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    {visit.patient?.address || "N/A"}
                  </p>
                </div>

                {/* Visit Number */}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Visit Number
                  </p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    #{visit.visit_number}
                  </p>
                </div>

                {/* Visit Date */}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Visit Date
                  </p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    {visit.visit_date}
                  </p>
                </div>

                {/* Test Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Test Date
                  </label>
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Selection Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-white dark:text-white mb-4">Add Test</h2>

              {/* Specimen Selection */}
              <div className="mb-6">
                <label
                  htmlFor="specimen-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                >
                  Select Specimen
                </label>

                <select
                  id="specimen-select"
                  value={selectedSpecimenId || ""}
                  onChange={(e) =>
                    setSelectedSpecimenId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a specimen --</option>
                  {specimens.map((specimen) => (
                    <option key={specimen.id} value={specimen.id}>
                      {specimen.specimen_name}
                    </option>
                  ))}
                </select>

              </div>

              {/* Test Types Selection */}
              {selectedSpecimenId && (
                <div className="mb-6">
                  <label className="text-white dark:text-white mb-3 block">
                    Select Test Types for {selectedSpecimen?.specimen_name}
                  </label>

                  {loading ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Loading test types...
                    </div>
                  ) : availableTestTypes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No test types available for this specimen
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {availableTestTypes.map((testType) => {
                        const isSelected = selectedTestTypeIds.includes(testType.id);
                        return (
                          <label
                            key={testType.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected
                              ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-600"
                              : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-650 border-2 border-gray-200 dark:border-gray-600"
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTestTypeToggle(testType.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />

                            <div className="flex-1">
                              <div className="text-white dark:text-white">{testType.name}</div>
                              {testType.description && (
                                <div className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                                  {testType.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {/* Additional Info */}
              {selectedSpecimenId && selectedTestTypeIds.length > 0 && (
                <div className="space-y-6 mb-6">
                  {/* Test Description */}
                  <div className="flex flex-col">
                    <label
                      htmlFor="description"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Test Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={testDescription}
                      onChange={(e) => setTestDescription(e.target.value)}
                      placeholder="Enter test description or special notes..."
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>

                  {/* Method Used */}
                  <div className="flex flex-col">
                    <label
                      htmlFor="method"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Method Used
                    </label>
                    <input
                      id="method"
                      type="text"
                      placeholder="e.g., PCR, ELISA, Culture..."
                      value={methodUsed}
                      onChange={(e) => setMethodUsed(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Add to List Button */}
              {selectedSpecimenId && (
                <button
                  onClick={handleAddToList}
                  disabled={selectedTestTypeIds.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 text-white font-medium shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  Add to Test List
                </button>
              )}

            </div>

            {/* Right Panel - Added Tests List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white dark:text-white">Test List</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {addedTests.length} {addedTests.length === 1 ? "test" : "tests"} added
                </span>
              </div>

              {addedTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <FlaskConical className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-center">
                    No tests added yet.
                    <br />
                    Select a specimen and test types to add.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {addedTests.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 relative group"
                    >
                      <button
                        onClick={() => handleRemoveTest(test.id)}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <h3 className="text-white dark:text-white mb-2">
                        {test.specimen_name}
                      </h3>

                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            Test Types:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {test.test_types.map((tt) => (
                              <span
                                key={tt.id}
                                className="px-2 py-1 text-sm rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                              >
                                {tt.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {test.test_description && (
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Description:
                            </p>
                            <p className="text-sm text-white dark:text-white">
                              {test.test_description}
                            </p>
                          </div>
                        )}

                        {test.method_used && (
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Method:
                            </p>
                            <p className="text-sm text-white dark:text-white">
                              {test.method_used}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              {addedTests.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Submit Lab Test Request"}
                  </button>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
