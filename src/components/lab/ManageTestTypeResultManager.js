import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Save, Pencil, Check, X } from 'lucide-react';
import { fetchTestTypes } from '../patients/patients_lab_tests_helper';
import { API_BASE_URL } from '../general/constants';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';


/**
 * This function component is intended to set or configure the test result paramters for the specific test type.
 * WHY Setting test result paramters?
 * 
 * Were setting these parameters, to ensure that while entering results forthe specific test type, we already know the paramters or the kind
 * Of results acertain test type has.
 * 
 * Ie we can set testtype like Liverfunction test to have ie parameter name AST, code AST, SIUnit, gl/l
 * and may be reference range (2.4 - 5.8).
 * 
 * That will help us on the time of entering results for that test type to select or enter additional results, for 
 * that test type paramter ie AST,ALT,Albumin for Liver function test if they were set here
 * 
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
    si_unit: '',
    result_type: 'numeric',
    reference_range: '',
    normal_min: null,
    normal_max: null,
    flag_low_label: 'Low',
    flag_normal_label: 'Normal',
    flag_high_label: 'High',
    is_active: true
  });

  // Fetch parameters when test type is selected
  useEffect(() => {
    if (selectedTestTypeId) {
      fetchParameters(selectedTestTypeId);
    } else {
      setParameters([]);
    }
  }, [selectedTestTypeId]);

  //Endpoint that fetches all test types
  const loadAllTestTypes = async () => {
    setLoading(true);
    const data = await fetchTestTypes(token);
    setAllTestTypes(data);
    setLoading(false);
  };

  // Fetch all test types on mount
  useEffect(() => {
    loadAllTestTypes();
  }, []);


  //Fetch Test result Parameters for aspecific test type by id
  const fetchParameters = async (testTypeId) => {
    setLoading(true);
    try {

      //End point to return test parameters for the selected test type
      //This ensures we can add, remove or update atest result parameter for the test type
      const response = await axios.get(
        `${API_BASE_URL}test_results/getTestTypeResultWithItsParameters`,
        {
          //Pass the test type id for the selected test type, to get its paramters if they are there
          params: {
            test_type_id: testTypeId
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      //Return test type parameters for the test type selected
      const testTypeParameters = response.data.test_type_parameters;


      const parsedData = testTypeParameters.map(param => ({
        ...param,
        normal_min: param.normal_min ? parseFloat(param.normal_min) : null,
        normal_max: param.normal_max ? parseFloat(param.normal_max) : null
      }));

      //Set these parameters in state
      setParameters(parsedData);

    } catch (error) {
      console.error('Error fetching parameters:', error);
    } finally {
      setLoading(false);
    }
  };


  const parseReferenceRange = (range) => {
    if (!range || range.trim() === '') return { min: null, max: null };

    const parts = range.split('-').map(p => p.trim());
    if (parts.length === 2) {
      const min = parseFloat(parts[0]);
      const max = parseFloat(parts[1]);
      if (!isNaN(min) && !isNaN(max)) {
        return { min, max };
      }
    }
    return { min: null, max: null };
  };


  const handleReferenceRangeChange = (value, isEdit, paramId) => {
    const { min, max } = parseReferenceRange(value);

    if (isEdit && paramId !== undefined) {
      setParameters(params =>
        params.map(p =>
          p.id === paramId
            ? { ...p, reference_range: value, normal_min: min, normal_max: max }
            : p
        )
      );
    } else {
      setNewParameter(prev => ({
        ...prev,
        reference_range: value,
        normal_min: min,
        normal_max: max
      }));
    }
  };

  //Handle the update of the parameter
  const handleParameterUpdate = (paramId, field, value) => {
    setParameters(params =>
      params.map(p =>
        p.id === paramId ? { ...p, [field]: value } : p
      )
    );
  };

  const handleResultTypeChange = (paramId, resultType) => {
    setParameters(params =>
      params.map(p => {
        if (p.id === paramId) {
          if (resultType === 'text') {
            return {
              ...p,
              result_type: resultType,
              si_unit: null,
              reference_range: null,
              normal_min: null,
              normal_max: null,
              flag_low_label: null,
              flag_normal_label: null,
              flag_high_label: null
            };
          } else {
            return {
              ...p,
              result_type: resultType,
              si_unit: p.si_unit || '',
              flag_low_label: p.flag_low_label || 'Low',
              flag_normal_label: p.flag_normal_label || 'Normal',
              flag_high_label: p.flag_high_label || 'High'
            };
          }
        }
        return p;
      })
    );
  };

  //Function that adds and render fields based on selected result type
  //If either test, or numeric we render specific fields that matter
  const handleNewParameterResultTypeChange = (resultType) => {
    if (resultType === 'text') {
      setNewParameter({
        ...newParameter,
        result_type: resultType,
        si_unit: null,
        reference_range: null,
        normal_min: null,
        normal_max: null,
        flag_low_label: null,
        flag_normal_label: null,
        flag_high_label: null
      });
    } else {
      setNewParameter({
        ...newParameter,
        result_type: resultType,
        si_unit: '',
        flag_low_label: 'Low',
        flag_normal_label: 'Normal',
        flag_high_label: 'High'
      });
    }
  };

  //Function to delete parameter
  const handleDeleteParameter = (paramKey) => {
    setParameters(params =>
      params.filter(p => (p.id ?? p.tempId) !== paramKey)
    );
  };


  //Function that adds anew parameter
  const handleAddParameter = () => {
    if (!newParameter.parameter_name.trim()) {
      toast.error('Parameter name is required');
      return;
    }

    const newParam = {
      ...newParameter,
      id: null,                          //  must be null
      tempId: crypto.randomUUID(),       // frontend-only key
      test_type_id: selectedTestTypeId,
    };


    setParameters([...parameters, newParam]);
    setNewParameter({
      parameter_name: '',
      parameter_code: '',
      si_unit: '',
      result_type: 'numeric',
      reference_range: '',
      normal_min: null,
      normal_max: null,
      flag_low_label: 'Low',
      flag_normal_label: 'Normal',
      flag_high_label: 'High',
      is_active: true
    });
    setShowAddForm(false);
  };

  const validateNumericParameter = (p) => {
    if (p.result_type !== "numeric") return null;

    if (!p.si_unit || p.si_unit.trim() === "") {
      return "SI Unit is required for numeric parameters";
    }

    if (!p.reference_range || p.reference_range.trim() === "") {
      return "Reference range is required for numeric parameters";
    }

    return null; // valid
  };


  //Handle the submission of the parameter whether 
  //adding new,  or removing  updating anew parameter,
  const handleSubmit = async () => {
    if (!selectedTestTypeId) {
      alert("Please select a test type");
      return;
    }

    try {
      setSubmitting(true);

      // 🔐 Authoritative separation
      const updateParams = parameters.filter(p => p.id != null);
      const newParams = parameters.filter(p => p.id == null);

      // 🚨 Validate all parameters before submission
      for (const p of parameters) {
        const error = validateNumericParameter(p);
        if (error) {
          toast.error(`${p.parameter_name}: ${error}`);
          setSubmitting(false);
          return;
        }
      }


      console.log('newParams', newParams);
      console.log('updateParams', updateParams);
      // 1️⃣ Update existing parameters
      if (updateParams.length > 0) {
        const updatePayload = {
          test_type_id: selectedTestTypeId,
          parameters: updateParams.map(p => ({
            id: p.id, // guaranteed DB ID
            parameter_name: p.parameter_name,
            code: p.parameter_code,
            si_unit: p.si_unit,
            result_type: p.result_type,
            reference_range: p.reference_range,
            normal_min: p.normal_min,
            normal_max: p.normal_max,
            flag_low_label: p.flag_low_label,
            flag_normal_label: p.flag_normal_label,
            flag_high_label: p.flag_high_label,
            is_active: p.is_active
          }))
        };

        const updateResponse = await axios.post(
          `${API_BASE_URL}test_results/updateTestResultParameterMeasure`,
          updatePayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        toast.success(updateResponse.data.message || "Updated parameters successfully!");
      }

      // 2️⃣ Create new parameters
      if (newParams.length > 0) {
        for (const p of newParams) {
          const newPayload = {
            test_type_id: selectedTestTypeId,
            parameter_name: p.parameter_name,
            parameter_code: p.parameter_code,
            si_unit: p.si_unit,
            result_type: p.result_type,
            reference_range: p.reference_range,
            normal_min: p.normal_min,
            normal_max: p.normal_max,
            flag_low_label: p.flag_low_label,
            flag_normal_label: p.flag_normal_label,
            flag_high_label: p.flag_high_label,
            is_active: p.is_active
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
      console.error("Error submitting parameters:", error);
      toast.error(
        error.response?.data?.message || "An error occurred while saving parameters"
      );
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-5">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-6 mb-6">
          <h1 className="mb-6 text-3xl text-gray-900 dark:text-white">
           Set Up Test Type Result Parameters(Which Results Do you Need For specific Test Types?)
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

                        {editingId === param.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                Parameter Name (ie ALT,AST for Liver Function Test)*
                              </label>
                              <input
                                type="text"
                                value={param.parameter_name}
                                onChange={(e) =>
                                  handleParameterUpdate(
                                    param.id,
                                    "parameter_name",
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
                                value={param.parameter_code || ""}
                                onChange={(e) =>
                                  handleParameterUpdate(
                                    param.id,
                                    "parameter_code",
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
                                  handleResultTypeChange(param.id, e.target.value)
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
                                value={param.si_unit || ""}
                                onChange={(e) =>
                                  handleParameterUpdate(
                                    param.id,
                                    "si_unit",
                                    e.target.value
                                  )
                                }
                                disabled={param.result_type === "text"}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* If the result type is reference range ,show this */}
                            {param.result_type === "numeric" && (
                              <>
                                <div>
                                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                    Reference Range (e.g., 5.4 - 39.9)
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={param.reference_range || ""}
                                    onChange={(e) =>
                                      handleReferenceRangeChange(
                                        e.target.value,
                                        true,
                                        param.id
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="min - max"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                      Normal Min (auto)
                                    </label>
                                    <input
                                      type="number"
                                      value={param.normal_min || ""}
                                      disabled
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-100 cursor-not-allowed"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                      Normal Max (auto)
                                    </label>
                                    <input
                                      type="number"
                                      value={param.normal_max || ""}
                                      disabled
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-100 cursor-not-allowed"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                    Flag Low Label
                                  </label>
                                  <input
                                    type="text"
                                    disabled
                                    value={param.flag_low_label || ""}
                                    onChange={(e) =>
                                      handleParameterUpdate(
                                        param.id,
                                        "flag_low_label",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                    Flag Normal Label
                                  </label>
                                  <input
                                    disabled
                                    type="text"
                                    value={param.flag_normal_label || ""}
                                    onChange={(e) =>
                                      handleParameterUpdate(
                                        param.id,
                                        "flag_normal_label",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                    Flag High Label
                                  </label>
                                  <input
                                    disabled
                                    type="text"
                                    value={param.flag_high_label || ""}
                                    onChange={(e) =>
                                      handleParameterUpdate(
                                        param.id,
                                        "flag_high_label",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </>
                            )}


                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Paramter Code:</span>{" "}
                              <span className="text-gray-800 dark:text-gray-100">
                                {param.parameter_code || "N/A"}
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-600 dark:text-gray-400">
                                Result Type:
                              </span>{" "}
                              <span className="capitalize text-gray-800 dark:text-gray-100">
                                {param.result_type}
                              </span>
                            </div>

                            {/* Display these if the result type is numeric */}
                            {param.result_type === "numeric" && (
                              <>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    SI Unit:
                                  </span>{" "}
                                  <span className="text-gray-800 dark:text-gray-100">
                                    {param.si_unit || "N/A"}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Reference Range:
                                  </span>{" "}
                                  <span className="text-gray-800 dark:text-gray-100">
                                    {param.reference_range || "N/A"}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Normal Min:
                                  </span>{" "}
                                  <span className="text-gray-800 dark:text-gray-100">
                                    {param.normal_min ?? "N/A"}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Normal Max:
                                  </span>{" "}
                                  <span className="text-gray-800 dark:text-gray-100">
                                    {param.normal_max ?? "N/A"}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Diagnostic Flag Labels:
                                  </span>{" "}
                                  <span className="text-gray-800 dark:text-gray-100">
                                    {param.flag_low_label} / {param.flag_normal_label} /{" "}
                                    {param.flag_high_label}
                                  </span>
                                </div>
                              </>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                            Parameter Name (ie AST,ALT for Liver test)*
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
                            value={newParameter.parameter_code || ""}
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
                            value={newParameter.si_unit || ""}
                            onChange={(e) =>
                              setNewParameter({
                                ...newParameter,
                                si_unit: e.target.value,
                              })
                            }
                            disabled={newParameter.result_type === "text"}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., U/l, mg/dL"
                          />
                        </div>

                        {/* If the result type is numeric */}
                        {newParameter.result_type === "numeric" && (
                          <>
                            <div>
                              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                Reference Range (e.g., 5.4 - 39.9)
                              </label>
                              <input
                                type="text"
                                required
                                value={newParameter.reference_range || ""}
                                onChange={(e) =>
                                  handleReferenceRangeChange(e.target.value, false)
                                }
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="min - max"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                  Normal Min (auto)
                                </label>
                                <input
                                  type="number"
                                  value={newParameter.normal_min || ""}
                                  disabled
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-100 cursor-not-allowed"
                                />
                              </div>

                              <div>
                                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                  Normal Max (auto)
                                </label>
                                <input
                                  type="number"
                                  value={newParameter.normal_max || ""}
                                  disabled
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-100 cursor-not-allowed"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                Flag Low Label
                              </label>
                              <input
                                type="text"
                                disabled
                                value={newParameter.flag_low_label || ""}
                                onChange={(e) =>
                                  setNewParameter({
                                    ...newParameter,
                                    flag_low_label: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                Flag Normal Label
                              </label>
                              <input
                                type="text"
                                disabled
                                value={newParameter.flag_normal_label || ""}
                                onChange={(e) =>
                                  setNewParameter({
                                    ...newParameter,
                                    flag_normal_label: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                                Flag High Label
                              </label>
                              <input
                                type="text"
                                disabled
                                value={newParameter.flag_high_label || ""}
                                onChange={(e) =>
                                  setNewParameter({
                                    ...newParameter,
                                    flag_high_label: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </>
                        )}

                      
                      </div>

                      <button
                        onClick={handleAddParameter}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check size={20} />
                        Add Parameter
                      </button>
                    </div>
                  )}
                </div>

                {/* Save All Changes Button */}
                {/* Save All Changes Button , ensure this button is visible if there are two or more parameters*/}
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
    ${submitting ? "opacity-50 cursor-not-allowed" : ""}
  `}
                >
                  <Save size={20} />
                  {submitting ? "Saving..." : "Save All Changes"}
                </button>




              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ManageTestTypeResultManager;
