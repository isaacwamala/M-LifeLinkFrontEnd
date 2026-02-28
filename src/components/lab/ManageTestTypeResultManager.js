import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Save, Pencil, Check, X } from 'lucide-react';
import { fetchTestTypes } from '../patients/patients_lab_tests_helper';
import { API_BASE_URL } from '../general/constants';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';

/**
 * This function component is intended to set or configure the test result parameters for the specific test type.
 * WHY Setting test result parameters?
 * 
 * We're setting these parameters to ensure that while entering results for the specific test type, we already know the parameters
 * or the kind of results a certain test type has.
 * 
 * i.e. we can set test type like Liver function test to have parameters like AST, ALT, Albumin
 * and may be reference range (2.4 - 5.8) for specific age and gender groups.
 * 
 * That will help us on the time of entering results for that test type to select or enter additional results for 
 * that test type parameter i.e. AST, ALT, Albumin for Liver function test if they were set here
 */
const ManageTestTypeResultManager = () => {
  const [testTypes, setAllTestTypes] = useState([]);
  const [selectedTestTypeId, setSelectedTestTypeId] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('access_token');
  const [submitting, setSubmitting] = useState(false);


  // New parameter form state
  const [newParameter, setNewParameter] = useState({
    parameter_name: '',
    parameter_code: '',
    target_turnaround_time: '',
    turnaround_time_duration: '',
    si_unit: '',
    result_type: 'numeric',
    is_active: true,
    reference_ranges: []
  });

  // Fetch parameters when test type is selected
  useEffect(() => {
    if (selectedTestTypeId) {
      fetchParameters(selectedTestTypeId);
    } else {
      setParameters([]);
    }
  }, [selectedTestTypeId]);

  // Endpoint that fetches all test types
  const loadAllTestTypes = async () => {
    setLoading(true);
    const data = await fetchTestTypes(token);
    setAllTestTypes(data);
    setLoading(false);
  };

  // Fetch all test types on mount
  useEffect(() => {
    if (token) {
      loadAllTestTypes();
    }
  }, [token]);

  // Fetch Test result Parameters for a specific test type by id
  const fetchParameters = async (testTypeId) => {
    setLoading(true);
    try {
      // Endpoint to return test parameters for the selected test type
      const response = await axios.get(
        `${API_BASE_URL}test_results/getTestTypeResultWithItsParameters`,
        {
          params: {
            test_type_id: testTypeId
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Return test type parameters for the test type selected
      const testTypeParameters = response.data.test_type_parameters;

      // Set these parameters in state
      setParameters(testTypeParameters || []);

    } catch (error) {
      console.error('Error fetching parameters:', error);
      toast.error('Failed to fetch parameters');
    } finally {
      setLoading(false);
    }
  };

  // Handle the update of the parameter
  const handleParameterUpdate = (paramKey, field, value) => {
    setParameters(params =>
      params.map(p =>
        (p.id ?? p.tempId) === paramKey ? { ...p, [field]: value } : p
      )
    );
  };

  const handleResultTypeChange = (paramKey, resultType) => {
    setParameters(params =>
      params.map(p => {
        if ((p.id ?? p.tempId) === paramKey) {
          if (resultType === 'text') {
            return {
              ...p,
              result_type: resultType,
              si_unit: null,
              reference_ranges: []
            };
          } else {
            return {
              ...p,
              result_type: resultType,
              si_unit: p.si_unit || '',
              reference_ranges: p.reference_ranges || []
            };
          }
        }
        return p;
      })
    );
  };

  // Function that adds and renders fields based on selected result type
  const handleNewParameterResultTypeChange = (resultType) => {
    if (resultType === 'text') {
      setNewParameter({
        ...newParameter,
        result_type: resultType,
        si_unit: null,
        reference_ranges: []
      });
    } else {
      setNewParameter({
        ...newParameter,
        result_type: resultType,
        si_unit: '',
        reference_ranges: []
      });
    }
  };

  // Function to delete parameter
  const handleDeleteParameter = (paramKey) => {
    setParameters(params =>
      params.filter(p => (p.id ?? p.tempId) !== paramKey)
    );
  };

  // Add a new reference range to a parameter
  const handleAddReferenceRange = (paramKey) => {
    const newRange = {
      gender: 'male',
      age_min: 0,
      age_max: 100,
      normal_min: '',
      normal_max: '',
      reference_range: '',
      flag_low_label: 'Low',
      flag_normal_label: 'Normal',
      flag_high_label: 'High',
      is_active: true
    };

    setParameters(params =>
      params.map(p => {
        if ((p.id ?? p.tempId) === paramKey) {
          return {
            ...p,
            reference_ranges: [...p.reference_ranges, newRange]
          };
        }
        return p;
      })
    );
  };

  // Add reference range to new parameter
  const handleAddReferenceRangeToNew = () => {
    const newRange = {
      gender: 'male',
      age_min: 0,
      age_max: 100,
      normal_min: '',
      normal_max: '',
      reference_range: '',
      flag_low_label: 'Low',
      flag_normal_label: 'Normal',
      flag_high_label: 'High',
      is_active: true
    };

    setNewParameter({
      ...newParameter,
      reference_ranges: [...newParameter.reference_ranges, newRange]
    });
  };

  // Update a reference range for a parameter
  const handleUpdateReferenceRange = (paramKey, rangeIndex, field, value) => {
    setParameters(params =>
      params.map(p => {
        if ((p.id ?? p.tempId) === paramKey) {
          const updatedRanges = [...p.reference_ranges];
          updatedRanges[rangeIndex] = {
            ...updatedRanges[rangeIndex],
            [field]: value
          };

          // Auto-update reference_range string if normal_min or normal_max changes
          if (field === 'normal_min' || field === 'normal_max') {
            const range = updatedRanges[rangeIndex];
            if (range.normal_min && range.normal_max) {
              updatedRanges[rangeIndex].reference_range = `${range.normal_min} - ${range.normal_max}`;
            }
          }

          return { ...p, reference_ranges: updatedRanges };
        }
        return p;
      })
    );
  };

  // Update reference range for new parameter
  const handleUpdateNewReferenceRange = (rangeIndex, field, value) => {
    const updatedRanges = [...newParameter.reference_ranges];
    updatedRanges[rangeIndex] = {
      ...updatedRanges[rangeIndex],
      [field]: value
    };

    // Auto-update reference_range string if normal_min or normal_max changes
    if (field === 'normal_min' || field === 'normal_max') {
      const range = updatedRanges[rangeIndex];
      if (range.normal_min && range.normal_max) {
        updatedRanges[rangeIndex].reference_range = `${range.normal_min} - ${range.normal_max}`;
      }
    }

    setNewParameter({
      ...newParameter,
      reference_ranges: updatedRanges
    });
  };

  // Delete a reference range
  const handleDeleteReferenceRange = (paramKey, rangeIndex) => {
    setParameters(params =>
      params.map(p => {
        if ((p.id ?? p.tempId) === paramKey) {
          return {
            ...p,
            reference_ranges: p.reference_ranges.filter((_, idx) => idx !== rangeIndex)
          };
        }
        return p;
      })
    );
  };

  // Delete reference range from new parameter
  const handleDeleteNewReferenceRange = (rangeIndex) => {
    setNewParameter({
      ...newParameter,
      reference_ranges: newParameter.reference_ranges.filter((_, idx) => idx !== rangeIndex)
    });
  };

  // Function that adds a new parameter
  const handleAddParameter = () => {
    if (!newParameter.parameter_name.trim()) {
      toast.error('Parameter name is required');
      return;
    }

    if (newParameter.result_type === 'numeric') {
      if (!newParameter.si_unit || newParameter.si_unit.trim() === '') {
        toast.error('SI Unit is required for numeric parameters');
        return;
      }
      if (newParameter.reference_ranges.length === 0) {
        toast.error('At least one reference range is required for numeric parameters');
        return;
      }
    }

    const newParam = {
      ...newParameter,
      id: null,
      tempId: crypto.randomUUID(),
      test_type_id: selectedTestTypeId,
    };

    setParameters([...parameters, newParam]);
    setNewParameter({
      parameter_name: '',
      parameter_code: '',
      turnaround_time_duration: '',
      target_turnaround_time: '',
      si_unit: '',
      result_type: 'numeric',
      is_active: true,
      reference_ranges: []
    });
    setShowAddForm(false);
  };

  const validateNumericParameter = (p) => {
    if (p.result_type !== 'numeric') return null;

    if (!p.si_unit || p.si_unit.trim() === '') {
      return 'SI Unit is required for numeric parameters';
    }

    if (p.reference_ranges.length === 0) {
      return 'At least one reference range is required for numeric parameters';
    }

    for (let i = 0; i < p.reference_ranges.length; i++) {
      const range = p.reference_ranges[i];
      if (!range.normal_min || !range.normal_max) {
        return `Reference range ${i + 1}: Normal min and max are required`;
      }
      if (range.age_min < 0 || range.age_max <= range.age_min) {
        return `Reference range ${i + 1}: Invalid age range`;
      }
    }

    return null;
  };

  // Handle the submission of parameters
  const handleSubmit = async () => {
    if (!selectedTestTypeId) {
      toast.error('Please select a test type');
      return;
    }

    try {
      setSubmitting(true);

      // Validate all parameters
      for (const p of parameters) {
        const error = validateNumericParameter(p);
        if (error) {
          toast.error(`${p.parameter_name}: ${error}`);
          setSubmitting(false);
          return;
        }
      }

      // Separate new and existing parameters
      const updateParams = parameters.filter(p => p.id != null);
      const newParams = parameters.filter(p => p.id == null);

      // Update existing parameters
      if (updateParams.length > 0) {
        const updatePayload = {
          test_type_id: selectedTestTypeId,
          parameters: updateParams.map(p => ({
            id: p.id,
            parameter_name: p.parameter_name,
            parameter_code: p.parameter_code,
            turnaround_time_duration: p.turnaround_time_duration,
            target_turnaround_time: p.target_turnaround_time,
            si_unit: p.si_unit,
            result_type: p.result_type,
            is_active: p.is_active,
            reference_ranges: p.reference_ranges.map(r => ({
              id: r.id,
              gender: r.gender,
              age_min: r.age_min,
              age_max: r.age_max,
              normal_min: r.normal_min,
              normal_max: r.normal_max,
              reference_range: r.reference_range,
              flag_low_label: r.flag_low_label,
              flag_normal_label: r.flag_normal_label,
              flag_high_label: r.flag_high_label,
              is_active: r.is_active
            }))
          }))
        };

        const updateResponse = await axios.post(
          `${API_BASE_URL}test_results/updateTestResultParameterMeasure`,
          updatePayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        toast.success(updateResponse.data.message || 'Updated parameters successfully!');
      }

      // Create new parameters
      if (newParams.length > 0) {
        for (const p of newParams) {
          const newPayload = {
            test_type_id: selectedTestTypeId,
            parameter_name: p.parameter_name,
            parameter_code: p.parameter_code,
            turnaround_time_duration: p.turnaround_time_duration,
            target_turnaround_time: p.target_turnaround_time,
            si_unit: p.si_unit,
            result_type: p.result_type,
            is_active: p.is_active,
            reference_ranges: p.reference_ranges.map(r => ({
              gender: r.gender,
              age_min: r.age_min,
              age_max: r.age_max,
              normal_min: r.normal_min,
              normal_max: r.normal_max,
              reference_range: r.reference_range,
              flag_low_label: r.flag_low_label,
              flag_normal_label: r.flag_normal_label,
              flag_high_label: r.flag_high_label,
              is_active: r.is_active
            }))
          };

          const newResponse = await axios.post(
            `${API_BASE_URL}test_results/storeTestResultParameterMeasure`,
            newPayload,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          toast.success(
            newResponse.data.message || `Added ${p.parameter_name} successfully!`
          );
        }
      }

      fetchParameters(selectedTestTypeId);

    } catch (error) {
      console.error('Error submitting parameters:', error);

      let combinedMessage = 'An error occurred while saving parameters';

      if (error.response?.data) {
        const { message, error: singleError, errors } = error.response.data;
        let parts = [];

        // Main message
        if (message) {
          parts.push(message);
        }

        // Single error string
        if (singleError) {
          parts.push(singleError);
        }

        // Validation error bag
        if (errors && typeof errors === 'object') {
          const flattened = Object.values(errors).flat();
          parts.push(...flattened);
        }

        if (parts.length > 0) {
          combinedMessage = parts.join(' | ');
        }
      } else if (error.message) {
        combinedMessage = error.message;
      }

      toast.error(combinedMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Render reference range form
  const renderReferenceRangeForm = (range, index, paramKey, isNew = false) => {
    return (
      <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Reference Range {index + 1}
          </h4>
          <button
            onClick={() => {
              if (isNew) {
                handleDeleteNewReferenceRange(index);
              } else if (paramKey !== null) {
                handleDeleteReferenceRange(paramKey, index);
              }
            }}
            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            title="Delete reference range"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              Gender *
            </label>
            <select
              value={range.gender}
              onChange={(e) => {
                if (isNew) {
                  handleUpdateNewReferenceRange(index, 'gender', e.target.value);
                } else if (paramKey !== null) {
                  handleUpdateReferenceRange(paramKey, index, 'gender', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              Age Min *
            </label>
            <input
              type="number"
              value={range.age_min}
              onChange={(e) => {
                if (isNew) {
                  handleUpdateNewReferenceRange(index, 'age_min', parseInt(e.target.value) || 0);
                } else if (paramKey !== null) {
                  handleUpdateReferenceRange(paramKey, index, 'age_min', parseInt(e.target.value) || 0);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              Age Max *
            </label>
            <input
              type="number"
              value={range.age_max}
              onChange={(e) => {
                if (isNew) {
                  handleUpdateNewReferenceRange(index, 'age_max', parseInt(e.target.value) || 0);
                } else if (paramKey !== null) {
                  handleUpdateReferenceRange(paramKey, index, 'age_max', parseInt(e.target.value) || 0);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              Normal Min *
            </label>
            <input
              type="text"
              value={range.normal_min}
              onChange={(e) => {
                if (isNew) {
                  handleUpdateNewReferenceRange(index, 'normal_min', e.target.value);
                } else if (paramKey !== null) {
                  handleUpdateReferenceRange(paramKey, index, 'normal_min', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              Normal Max *
            </label>
            <input
              type="text"
              value={range.normal_max}
              onChange={(e) => {
                if (isNew) {
                  handleUpdateNewReferenceRange(index, 'normal_max', e.target.value);
                } else if (paramKey !== null) {
                  handleUpdateReferenceRange(paramKey, index, 'normal_max', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              Reference Range (auto)
            </label>
            <input
              type="text"
              value={range.reference_range}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-100 cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-5">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-6 mb-6">
          <h1 className="mb-6 text-3xl text-gray-900 dark:text-white">
            Set Up Test Type Result Parameters (Which Results Do you Need For specific Test Types?)
          </h1>

          {/* Info Alert */}
          <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-blue-600 dark:text-blue-400">
                ℹ️
              </div>

              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-medium mb-2">
                  Why configure Test Type result parameters before recording Test results?
                </p>

                <p className="mb-2">
                  Each laboratory <strong>Test Type must have a predefined set of result parameters</strong>
                  before any patient results can be recorded. These parameters define exactly
                  <strong> how results for that test are captured, validated, and interpreted</strong>
                  by the system.
                </p>

                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Establishes the <strong>expected result structure</strong> for each test
                    (numeric, text, qualitative, or semi-quantitative).
                  </li>
                  <li>
                    Defines <strong>units, reference ranges, and normal limits</strong> used to
                    automatically classify numeric results as <em>Low</em>, <em>Normal</em>, or
                    <em> High</em>.
                  </li>
                  <li>
                    Supports <strong>multiple reference ranges</strong> for different age groups and genders,
                    ensuring accurate interpretation across demographics.
                  </li>
                  <li>
                    Standardizes non-numeric results such as
                    <em> Positive/Negative</em> or <em>+ to +++</em>, ensuring uniform data entry
                    across all patients and staff.
                  </li>
                  <li>
                    Provides clinicians with <strong>clear diagnostic context</strong> for every
                    reported value, reducing interpretation errors.
                  </li>
                  <li>
                    Preserves an <strong>audit-ready interpretation baseline</strong>, allowing the
                    system to trace which parameter definitions were used when results were generated.
                  </li>
                </ul>

                <p className="mt-2">
                  In short, test results are <strong>always evaluated against their configured
                    parameters</strong>. Without this setup, results cannot be reliably interpreted,
                  compared, or audited.
                </p>
              </div>
            </div>
          </div>

          {/* Test Type Selection */}
          <div className="mb-8">
            <label
              htmlFor="testType"
              className="block mb-2 text-gray-700 dark:text-gray-300"
            >
              Select Test Type
            </label>

            <select
              id="testType"
              value={selectedTestTypeId || ''}
              onChange={(e) => setSelectedTestTypeId(Number(e.target.value) || null)}
              className="
                w-full max-w-md px-4 py-2 rounded-lg
                border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            >
              <option value="">-- Select a Test Type --</option>
              {testTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parameters Section */}
        {selectedTestTypeId && (
          <div className="space-y-6">
            {/* Existing Parameters */}
            {loading ? (
              <div className="text-center text-gray-800 dark:text-gray-100 py-8">Loading parameters...</div>
            ) : (
              <>
                {parameters.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="mb-4 text-2xl text-gray-800 dark:text-gray-100">
                      Existing Test type Parameters for selected Test type
                    </h2>

                    {parameters.map((param) => (
                      <div
                        key={param.id ?? param.tempId}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-gray-800 dark:text-gray-100">
                              {param.parameter_name}
                            </h3>

                            {editingId === (param.id ?? param.tempId) ? (
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                title="Done editing"
                              >
                                <Check size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingId(param.id ?? param.tempId)}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title="Edit parameter"
                              >
                                <Pencil size={18} />
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteParameter(param.id ?? param.tempId)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete parameter"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>

                        {editingId === (param.id ?? param.tempId) ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                  Parameter Name (i.e. ALT, AST for Liver Function Test)*
                                </label>
                                <input
                                  type="text"
                                  value={param.parameter_name}
                                  onChange={(e) =>
                                    handleParameterUpdate(
                                      param.id ?? param.tempId,
                                      'parameter_name',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                  Parameter Code
                                </label>
                                <input
                                  type="text"
                                  value={param.parameter_code || ''}
                                  onChange={(e) =>
                                    handleParameterUpdate(
                                      param.id ?? param.tempId,
                                      'parameter_code',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                  Result Type *
                                </label>
                                <select
                                  value={param.result_type}
                                  onChange={(e) =>
                                    handleResultTypeChange(param.id ?? param.tempId, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="numeric">Numeric</option>
                                  <option value="text">Text</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                  SI Unit
                                </label>
                                <input
                                  type="text"
                                  value={param.si_unit || ''}
                                  onChange={(e) =>
                                    handleParameterUpdate(
                                      param.id ?? param.tempId,
                                      'si_unit',
                                      e.target.value
                                    )
                                  }
                                  disabled={param.result_type === 'text'}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Turn around time */}
                              <div>
                                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                  Target Turn around time
                                </label>
                                <input
                                  type="number"
                                  value={param.target_turnaround_time || ''}
                                  onChange={(e) =>
                                    handleParameterUpdate(
                                      param.id ?? param.tempId,
                                      'target_turnaround_time',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Turn around time duration */}
                              <div>
                                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                  Turn around time duration
                                </label>
                                <select
                                  value={param.turnaround_time_duration}
                                  onChange={(e) =>
                                    handleParameterUpdate(
                                      param.id ?? param.tempId,
                                      'turnaround_time_duration',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">None</option>
                                  <option value="seconds">seconds</option>
                                  <option value="minutes">minutes</option>
                                  <option value="hours">hours</option>
                                  <option value="week">week</option>
                                  <option value="month">month</option>
                                  <option value="year">year</option>
                                </select>
                              </div>
                            </div>

                            {/* Reference Ranges Section for Numeric Type */}
                            {param.result_type === 'numeric' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                    Reference Ranges
                                  </h4>
                                  <button
                                    onClick={() => handleAddReferenceRange(param.id ?? param.tempId)}
                                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    <Plus size={16} />
                                    Add Range
                                  </button>
                                </div>

                                {param.reference_ranges.map((range, idx) =>
                                  renderReferenceRangeForm(range, idx, param.id ?? param.tempId)
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Parameter Code:</span>{' '}
                                <span className="text-gray-800 dark:text-gray-100">
                                  {param.parameter_code || 'N/A'}
                                </span>
                              </div>

                              <div>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Result Type:
                                </span>{' '}
                                <span className="capitalize text-gray-800 dark:text-gray-100">
                                  {param.result_type}
                                </span>
                              </div>

                               <div>
                                <span className="text-gray-600 dark:text-gray-400 font-bold">
                                  Target turn around time and duration:
                                </span>{' '}
                                <span className="capitalize text-gray-800 dark:text-gray-100">
                                  {param.target_turnaround_time} {param.turnaround_time_duration}
                                </span>
                              </div>



                              {param.result_type === 'numeric' && (
                                <>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">
                                      SI Unit:
                                    </span>{' '}
                                    <span className="text-gray-800 dark:text-gray-100">
                                      {param.si_unit || 'N/A'}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Display Reference Ranges */}
                            {param.result_type === 'numeric' && param.reference_ranges.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Reference Ranges ({param.reference_ranges.length})
                                </h4>
                                <div className="space-y-2">
                                  {param.reference_ranges.map((range, idx) => (
                                    <div
                                      key={idx}
                                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 text-sm"
                                    >
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Gender:</span>{' '}
                                          <span className="capitalize text-gray-800 dark:text-gray-100">
                                            {range.gender}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Age:</span>{' '}
                                          <span className="text-gray-800 dark:text-gray-100">
                                            {range.age_min} - {range.age_max} yrs
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Range:</span>{' '}
                                          <span className="text-gray-800 dark:text-gray-100">
                                            {range.reference_range}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Labels:</span>{' '}
                                          <span className="text-gray-800 dark:text-gray-100">
                                            {range.flag_low_label} / {range.flag_normal_label} / {range.flag_high_label}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Parameter */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                  {!showAddForm ? (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={20} />
                      Add New Parameter
                    </button>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-800 dark:text-gray-100">
                          Add New Parameter
                        </h3>
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                              Parameter Name (i.e. AST, ALT for Liver test)*
                            </label>
                            <input
                              type="text"
                              value={newParameter.parameter_name}
                              onChange={(e) =>
                                setNewParameter({
                                  ...newParameter,
                                  parameter_name: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter parameter name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                              Parameter Code
                            </label>
                            <input
                              type="text"
                              value={newParameter.parameter_code || ''}
                              onChange={(e) =>
                                setNewParameter({
                                  ...newParameter,
                                  parameter_code: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter code"
                            />
                          </div>

                          <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                              Result Type *
                            </label>
                            <select
                              value={newParameter.result_type}
                              onChange={(e) =>
                                handleNewParameterResultTypeChange(e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="numeric">Numeric</option>
                              <option value="text">Text</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                              SI Unit
                            </label>
                            <input
                              type="text"
                              value={newParameter.si_unit || ''}
                              onChange={(e) =>
                                setNewParameter({
                                  ...newParameter,
                                  si_unit: e.target.value,
                                })
                              }
                              disabled={newParameter.result_type === 'text'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., U/L, mg/dL"
                            />
                          </div>

                          {/* Turn around time */}
                          <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                              Target Turn around time
                            </label>
                            <input
                              type="number"
                              value={newParameter.target_turnaround_time || ''}
                              onChange={(e) =>
                                setNewParameter({
                                  ...newParameter,
                                  target_turnaround_time: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter Tarteg TAT"
                            />
                          </div>

                          {/* Turn around time duration */}
                          <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                              Turn around time duration
                            </label>
                            <select
                              value={newParameter.turnaround_time_duration}
                              onChange={(e) =>
                                setNewParameter({
                                  ...newParameter,
                                  turnaround_time_duration: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">None</option>
                              <option value="seconds">seconds</option>
                              <option value="minutes">minutes</option>
                              <option value="hours">hours</option>
                              <option value="day">week</option>
                              <option value="month">month</option>
                              <option value="year">year</option>
                            </select>
                          </div>


                        </div>

                        {/* Reference Ranges for New Parameter */}
                        {newParameter.result_type === 'numeric' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                Reference Ranges
                              </h4>
                              <button
                                onClick={handleAddReferenceRangeToNew}
                                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                <Plus size={16} />
                                Add Range
                              </button>
                            </div>

                            {newParameter.reference_ranges.map((range, idx) =>
                              renderReferenceRangeForm(range, idx, null, true)
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleAddParameter}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check size={20} />
                        Add Parameter
                      </button>
                    </div>
                  )}
                </div>

                {/* Save All Changes Button */}
                {parameters.length > 0 && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`
                      flex items-center gap-2
                      px-6 py-3
                      bg-blue-600 text-white
                      rounded-lg
                      hover:bg-blue-700
                      transition-colors
                      shadow-lg
                      ring-1 ring-blue-300 dark:ring-blue-500/30
                      ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Save size={20} />
                    {submitting ? 'Saving...' : 'Save All Changes'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ManageTestTypeResultManager;
