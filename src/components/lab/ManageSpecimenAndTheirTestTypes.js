import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save } from 'lucide-react';
import { fetchTestTypes } from '../patients/patients_lab_tests_helper';
import { fetchSpecimenTypes } from '../patients/patients_lab_tests_helper';
import { toast, ToastContainer } from 'react-toastify';

import { API_BASE_URL } from '../general/constants';


export default function ManageSpecimenAndTheirTestTypes() {
  const [selectedSpecimenId, setSelectedSpecimenId] = useState(null);
  const [allTestTypes, setAllTestTypes] = useState([]);
  const [specimens, setSpecimens] = useState([]);
  const [assignedTestTypeIds, setAssignedTestTypeIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('access_token');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch all test types on mount
  useEffect(() => {
    loadAllTestTypes();
    loadAllSpecimenTypes();
  }, []);

  // Fetch assigned test types when specimen changes
  useEffect(() => {
    if (selectedSpecimenId !== null) {
      fetchSpecimenTestTypes(selectedSpecimenId);
    } else {
      setAssignedTestTypeIds([]);
    }
  }, [selectedSpecimenId]);



  //Endpoint that fetches all test types
  const loadAllTestTypes = async () => {
    setLoading(true);
    const data = await fetchTestTypes(token);
    setAllTestTypes(data);
    setLoading(false);
  };

  //Endpoint that fetches all specimen types
  const loadAllSpecimenTypes = async () => {
    setLoading(true);
    const data = await fetchSpecimenTypes(token);
    setSpecimens(data);
    setLoading(false);
  };

  //Now fetch test types assigned to the selected specimen type
  const fetchSpecimenTestTypes = async (specimenId) => {
    try {
      setLoading(true);

      //Get assigned test types for the selected specimen from backend
      const response = await axios.get(
        `${API_BASE_URL}config/getSpecimenWithTestTypes`,
        {
          params: {
            specimen_type_id: specimenId
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      //Get test types assigned to this specimen
      const testTypeIds = response.data.specimen.test_types.map(tt => tt.id);
      setAssignedTestTypeIds(testTypeIds);

    } catch (error) {
      console.error('Error fetching specimen test types:', error);
      showMessage('error', 'Failed to load specimen test types');
    } finally {
      setLoading(false);
    }
  };

  //Handle the preview of test types 
  const handleTestTypeToggle = (testTypeId) => {
    setAssignedTestTypeIds(prev => {
      if (prev.includes(testTypeId)) {
        return prev.filter(id => id !== testTypeId);
      } else {
        return [...prev, testTypeId];
      }
    });
  };

  
  // Handle saving the assigned test types to the specimen
  const handleSave = async () => {
    if (selectedSpecimenId === null) {
      showMessage('error', 'Please select a specimen first');
      return;
    }

    try {
      setSaving(true);
      // In production, use:
      const response = await axios.post(
        `${API_BASE_URL}config/assignTestTypesToSpecimen`,
        {
          specimen_type_id: selectedSpecimenId,
          test_type_ids: assignedTestTypeIds
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success(response.data.message);

    } catch (error) {
      console.error('Error saving test types:', error);
      toast.error(error.response.data?.message || 'Failed to save test types');
    } finally {
      setSaving(false);
    }
  };


  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  //Find selected specimen details
  const selectedSpecimen = specimens.find(
    s => s.id === selectedSpecimenId
  );

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white mt-7">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Test Types to Specimen Assignment Controller</h1>
          </div>

        </div>
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
            Here, you can select a specimen type from the dropdown and assign multiple test types to it. After making your selections, click "Save Changes" to update the assignments.
          </p>
        </div>


        {/* Message */}
        {message && (
          <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right">
            <div
              className={`px-6 py-3 rounded-lg shadow-lg ${message.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
                }`}
            >
              {message.text}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="w-full px-6 py-8">
          {/* Specimen Selection Dropdown */}
          <div className="mb-6">
            <label htmlFor="specimen-select" className="block text-sm mb-2 text-gray-900 dark:text-white">
              Select Specimen
            </label>
            <select
              id="specimen-select"
              value={selectedSpecimenId || ''}
              onChange={(e) => setSelectedSpecimenId(e.target.value ? Number(e.target.value) : null)}
              className="w-full md:w-96 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a specimen --</option>
              {specimens.map(specimen => (
                <option key={specimen.id} value={specimen.id}>
                  {specimen.specimen_name}
                </option>
              ))}
            </select>
          </div>

          {/* Test Types Assignment */}
          <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-gray-900 dark:text-white">
                {selectedSpecimen ? `Test Types for ${selectedSpecimen.specimen_name}` : 'Test Types'}
              </h2>
              <button
                onClick={handleSave}
                disabled={!selectedSpecimenId || saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${!selectedSpecimenId || saving
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white'
                  }`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {!selectedSpecimenId ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Please select a specimen to assign test types
              </div>
            ) : loading ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Loading test types...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {assignedTestTypeIds.length} of {allTestTypes.length} test types assigned
                </div>
                {allTestTypes.map(testType => {
                  const isAssigned = assignedTestTypeIds.includes(testType.id);
                  return (
                    <label
                      key={testType.id}
                      className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors ${isAssigned
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-600'
                        : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 border-2 border-gray-200 dark:border-transparent'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleTestTypeToggle(testType.id)}
                        className="mt-1 w-5 h-5 rounded accent-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{testType.name}</div>
                        {testType.description && (
                          <div className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                            {testType.description || 'No description available.'}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Section */}
          {selectedSpecimenId && (
            <div className="mt-6 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6">
              <h3 className="text-lg mb-3 text-gray-900 dark:text-white">Current Assignment Summary</h3>
              <div className="flex flex-wrap gap-2">
                {assignedTestTypeIds.length === 0 ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    No test types assigned yet
                  </span>
                ) : (
                  assignedTestTypeIds.map(id => {
                    const testType = allTestTypes.find(tt => tt.id === id);
                    return testType ? (
                      <span
                        key={id}
                        className="px-3 py-1 rounded-full text-sm bg-blue-500 dark:bg-blue-600 text-white"
                      >
                        {testType.name}
                      </span>
                    ) : null;
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
