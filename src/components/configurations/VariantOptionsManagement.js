import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, Check, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { API_BASE_URL } from "../general/constants";


export default function VariantOptionsManagement() {
  // Variant option names
  const [variantNames, setVariantNames] = useState([]);
  const [selectedVariantName, setSelectedVariantName] = useState(null);
  const [newVariantName, setNewVariantName] = useState('');
  const [isAddingName, setIsAddingName] = useState(false);
  const [editingNameId, setEditingNameId] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Variant option values
  const [variantValues, setVariantValues] = useState([]);
  const [newVariantValue, setNewVariantValue] = useState('');
  const [isAddingValue, setIsAddingValue] = useState(false);
  const [editingValueId, setEditingValueId] = useState(null);
  const [editingValueValue, setEditingValueValue] = useState('');

  // UI states
  const [loadingNames, setLoadingNames] = useState(false);
  const [loadingValues, setLoadingValues] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('access_token');

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  });


  //Fetch variant names
  const fetchVariantNames = async () => {
    setLoadingNames(true);
    setError(null);

    try {
      const res = await axios.get(
        `${API_BASE_URL}variants/getActiveVariantOptionNames`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );


      setVariantNames(res.data.data);

    } catch (err) {
      console.error(err);
      setError('Failed to fetch variant names');
    } finally {
      setLoadingNames(false);
    }
  };


  //Function to fetch variant values for a given variant option name by its ID
  const fetchVariantValues = async (variantOptionId) => {
    setLoadingValues(true);
    setError(null);

    try {
      const res = await axios.get(
        `${API_BASE_URL}variants/getAllVariantValuesForVariantNameByID`,
        {
          params: { variant_option_id: variantOptionId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (res.data.status) {
        setVariantValues(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch variant values');
    } finally {
      setLoadingValues(false);
    }
  };


  // Function to add a new variant name
  const handleAddVariantName = async () => {
    if (!newVariantName.trim()) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}variants/addVariantOptionName`,
        { name: newVariantName },
        authConfig()
      );

      setError(response.data.message);

      setNewVariantName('');
      setIsAddingName(false);
      fetchVariantNames();

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add variant name');
    }
  };

  // Function to update a variant name
  const handleUpdateVariantName = async (id, name) => {
    if (!name.trim()) return;

    try {
      await axios.post(
        `${API_BASE_URL}variants/updateVariantOptionName`,
        { id, name },
        authConfig()
      );

      setEditingNameId(null);
      setEditingNameValue('');
      fetchVariantNames();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update variant name');
      console.log(err);
    }
  };

  // Function to delete a variant name
  const handleDeleteVariantName = async (id) => {
    if (!window.confirm('Delete this variant option and all its values?')) return;

    try {
      await axios.delete(
        `${API_BASE_URL}variants/deleteVariantOptionName`,
        {
          data: { id },
          ...authConfig(),
        }
      );

      if (selectedVariantName?.id === id) {
        setSelectedVariantName(null);
        setVariantValues([]);
      }

      fetchVariantNames();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete variant name');

    }
  };


  // Function to add a variant value
  const handleAddVariantValue = async () => {
    if (!newVariantValue.trim() || !selectedVariantName) return;

    try {
      await axios.post(
        `${API_BASE_URL}variants/addVariantOptionValue`,
        {
          variant_option_id: selectedVariantName.id,
          value: newVariantValue,
        },
        authConfig()
      );


      setNewVariantValue('');
      setIsAddingValue(false);
      fetchVariantValues(selectedVariantName.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add variant value');
    }
  };

  // Function to update a variant value
  const handleUpdateVariantValue = async (id, value) => {
    if (!value.trim() || !selectedVariantName) return;

    try {
      await axios.post(
        `${API_BASE_URL}variants/updateVariantOptionValue`,
        {
          id,
          variant_option_id: selectedVariantName.id,
          value,
        },
        authConfig()
      );


      setEditingValueId(null);
      setEditingValueValue('');
      fetchVariantValues(selectedVariantName.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update variant value');
    }
  };

  // Function to delete a variant value
  const handleDeleteVariantValue = async (id) => {
    if (!window.confirm('Delete this variant value?')) return;

    try {
      await axios.delete(
        `${API_BASE_URL}variants/deleteVariantOptionValue`,
        {
          data: { id },
          ...authConfig(),
        }
      );


      fetchVariantValues(selectedVariantName.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete variant value');
    }
  };


  useEffect(() => {
    fetchVariantNames();
  }, []);

  useEffect(() => {
    if (selectedVariantName) {
      fetchVariantValues(selectedVariantName.id);
      setNewVariantValue('');
      setIsAddingValue(false);
    } else {
      setVariantValues([]);
    }
  }, [selectedVariantName]);

  return (
    <>
      <div className="p-4 border-2 border-blue-200 border-dashed rounded-lg dark:border-blue-700 dashboard">

        <div className="w-full mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Variant Options Management</h1>
                <p className="text-slate-600">Manage your product variant options and their values</p>
              </div>

            </div>
          </div>




          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Variant Option Names */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Variant Options</h2>
                <button
                  onClick={() => setIsAddingName(!isAddingName)}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              </div>

              <div className="p-6">
                {/* Add New Variant Name Form */}
                {isAddingName && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="text"
                      value={newVariantName}
                      onChange={(e) => setNewVariantName(e.target.value)}
                      placeholder="Enter option name (e.g., Color, Size)"
                      className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddVariantName()}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddVariantName}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingName(false);
                          setNewVariantName('');
                        }}
                        className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Variant Names List */}
                {loadingNames ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : variantNames.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p>No variant options yet.</p>
                    <p className="text-sm mt-2">Click "Add Option" to create your first variant option.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variantNames.map((variantName) => (
                      <div
                        key={variantName.id}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedVariantName?.id === variantName.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                          }`}
                      >
                        {editingNameId === variantName.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onKeyPress={(e) => e.key === 'Enter' && handleUpdateVariantName(variantName.id, editingNameValue)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateVariantName(variantName.id, editingNameValue)}
                              className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingNameId(null);
                                setEditingNameValue('');
                              }}
                              className="bg-slate-300 text-slate-700 p-2 rounded-lg hover:bg-slate-400 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div
                              onClick={() => setSelectedVariantName(variantName)}
                              className="flex-1"
                            >
                              <span className="font-medium text-slate-800 capitalize">{variantName.name}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNameId(variantName.id);
                                  setEditingNameValue(variantName.name);
                                }}
                                className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVariantName(variantName.id);
                                }}
                                className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Variant Option Values */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Variant Values</h2>
                  {selectedVariantName && (
                    <p className="text-emerald-100 text-sm mt-1">
                      for <span className="font-medium capitalize">{selectedVariantName.name}</span>
                    </p>
                  )}
                </div>
                {selectedVariantName && (
                  <button
                    onClick={() => setIsAddingValue(!isAddingValue)}
                    className="bg-white text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Value
                  </button>
                )}
              </div>

              <div className="p-6">
                {!selectedVariantName ? (
                  <div className="text-center py-12 text-slate-500">
                    <p>Select a variant option from the left panel</p>
                    <p className="text-sm mt-2">to view and manage its values.</p>
                  </div>
                ) : (
                  <>
                    {/* Add New Variant Value Form */}
                    {isAddingValue && (
                      <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <input
                          type="text"
                          value={newVariantValue}
                          onChange={(e) => setNewVariantValue(e.target.value)}
                          placeholder={`Enter ${selectedVariantName.name} value (e.g., ${selectedVariantName.name.toLowerCase() === 'color' ? 'Blue, Red, Green' :
                            selectedVariantName.name.toLowerCase() === 'size' ? 'S, M, L, XL' :
                              'value'
                            })`}
                          className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddVariantValue()}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddVariantValue}
                            className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingValue(false);
                              setNewVariantValue('');
                            }}
                            className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Variant Values List */}
                    {loadingValues ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                      </div>
                    ) : variantValues.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <p>No values for this variant option yet.</p>
                        <p className="text-sm mt-2">Click "Add Value" to create a new value.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {variantValues.map((variantValue) => (
                          <div
                            key={variantValue.id}
                            className="p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50 transition-all"
                          >
                            {editingValueId === variantValue.id ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={editingValueValue}
                                  onChange={(e) => setEditingValueValue(e.target.value)}
                                  className="px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateVariantValue(variantValue.id, editingValueValue)}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateVariantValue(variantValue.id, editingValueValue)}
                                    className="flex-1 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingValueId(null);
                                      setEditingValueValue('');
                                    }}
                                    className="flex-1 bg-slate-300 text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-400 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-800 capitalize">{variantValue.value}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingValueId(variantValue.id);
                                      setEditingValueValue(variantValue.value);
                                    }}
                                    className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVariantValue(variantValue.id)}
                                    className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 bg-white rounded-lg shadow p-4 text-center text-sm text-slate-600">
            <p>💡 Tip: Select a variant option on the left to manage its values on the right</p>
          </div>
        </div>
      </div>
    </>
  );

}
