import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast, ToastContainer } from "react-toastify";
import { Trash2, Plus, Pill, X, AlertCircle } from "lucide-react";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import { fetchProductsForAsyncSelect } from "../products/products_helper";
import { getSelectClassNames } from "../general/searchSelectStyles";

export function CreatePrescriptionRequest() {
  const { visitId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const visit = state?.visit;

  // ── Prescription-level fields ──────────────────────────────────────────
  const [prescriptionSource, setPrescriptionSource] = useState("direct");
  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [prescriptionNotes, setPrescriptionNotes] = useState("");

  // ── Current item being built ───────────────────────────────────────────
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [selectedUom, setSelectedUom] = useState(null);   // { value, label, multiplier }
  const [strength, setStrength] = useState("");
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState("");
  const [durationDays, setDurationDays] = useState("");

  // ── UOM conversion data ────────────────────────────────────────────────
  // Fetched once on mount from sales/getSellableProductBatchesWithUom.
  // Only base_uom + uom_conversions are consumed here — price/stock fields
  // from the same response are intentionally ignored (doctor must not see them).
  const [conversions, setConversions] = useState([]);

  // ── UOM warning modal ──────────────────────────────────────────────────
  const [showUomModal, setShowUomModal] = useState(false);
  const [uomModalMsg, setUomModalMsg] = useState({ drug: "", uom: "" });

  // ── Added items list ───────────────────────────────────────────────────
  const [addedItems, setAddedItems] = useState([]);

  // ── UI state ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── AsyncSelect debounce ───────────────────────────────────────────────
  const productDebounceRef = useRef(null);
  const loadProductOptions = (inputValue) =>
    new Promise((resolve) => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
      productDebounceRef.current = setTimeout(() => {
        fetchProductsForAsyncSelect(token, inputValue).then(resolve);
      }, 350);
    });

  // ── Fetch UOM conversions on mount ─────────────────────────────────────
  useEffect(() => {
    const fetchConversions = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}items/getProductBaseUomAndItsUomConversions`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        if (res.data.status === "success") {
          setConversions(res.data.products ?? []);
          console.log('conversions', res.data);
        }
      } catch {
        // Silent — UOM selects will just be empty if this fails
      }
    };
    fetchConversions();
  }, [token]);

  // ── UOM options for the currently selected drug ────────────────────────
  // Reads only uom_conversions (non-base UOMs that have a configured multiplier).
  const drugUomOptions = useMemo(() => {
    if (!selectedDrug) return [];
    // items/getProductBaseUomAndItsUomConversions identifies each product by
    // `id`, not `product_id` (unlike the sales-side batch endpoint). Also
    // compare as numbers — selectedDrug.value may come back as a string from
    // the AsyncSelect option, while conversions[].id is a number from JSON.
    const product = conversions.find((p) => Number(p.id) === Number(selectedDrug.value));
    if (!product) return [];

    return (product.uom_conversions ?? []).map((c) => ({
      value: c.uom_id,
      label: c.name,
      multiplier: c.multiplier,
    }));
  }, [selectedDrug, conversions]);

  // ── Handles drug change: reset UOM whenever the drug changes ──────────
  const handleDrugChange = (option) => {
    setSelectedDrug(option);
    setSelectedUom(null);
  };

  // ── Handles UOM change: check conversion exists, show modal if not ────
  const handleUomChange = (option) => {
    setSelectedUom(option);
    if (!option) return;

    // Verify the selected UOM has a converter for this drug
    const exists = drugUomOptions.some((u) => u.value === option.value);
    if (!exists) {
      setUomModalMsg({ drug: selectedDrug?.label ?? "", uom: option.label });
      setShowUomModal(true);
      setSelectedUom(null);
    }
  };

  // ── Small blue conversion info box ─────────────────────────────────────
  const renderUnitConversionHint = () => {
    if (!selectedUom || !selectedDrug) return null;
    const product = conversions.find((p) => Number(p.id) === Number(selectedDrug.value));
    if (!product) return null;

    const baseUomName = product.base_uom?.name ?? "";
    return (
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-300 flex-shrink-0" />
          <p className="text-sm text-blue-900 dark:text-white">
            <span className="font-semibold">Unit Conversion:</span>{" "}
            1 {selectedUom.label} = {selectedUom.multiplier} {baseUomName}
            {selectedUom.multiplier > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    );
  };

  // ── Reset the item entry form ──────────────────────────────────────────
  const resetItemForm = () => {
    setSelectedDrug(null);
    setSelectedUom(null);
    setStrength("");
    setInstructions("");
    setQuantity("");
    setDurationDays("");
  };

  // ── Add item to the prescription list ─────────────────────────────────
  const handleAddToList = () => {
    if (!selectedDrug) {
      toast.error("Please select a medicine");
      return;
    }
    if (!selectedUom) {
      toast.error("Please select a dispensing unit for this medicine");
      return;
    }
    if (!instructions.trim()) {
      toast.error("Instructions are required");
      return;
    }
    if (quantity === "" || Number(quantity) <= 0) {
      toast.error("Quantity is required and must be at least 1");
      return;
    }
    if (durationDays !== "" && Number(durationDays) <= 0) {
      toast.error("Duration must be greater than 0 if provided");
      return;
    }

    // Warn (not block) if same drug already in list
    const duplicate = addedItems.some((i) => i.drug_id === selectedDrug.value);
    if (duplicate) {
      toast.warning("This medicine is already in the list — check for duplicates");
    }

    const newItem = {
      id: Date.now().toString(),
      drug_id: selectedDrug.value,
      drug_name: selectedDrug.label,
      selected_uom_id: selectedUom.value,
      uom_label: selectedUom.label,
      multiplier: selectedUom.multiplier,
      strength: strength.trim(),
      instructions: instructions.trim(),
      quantity: quantity !== "" ? Number(quantity) : null,
      duration_days: durationDays !== "" ? Number(durationDays) : null,
    };

    setAddedItems((prev) => [...prev, newItem]);
    resetItemForm();
    toast.success("Medicine added to list");
  };

  const handleRemoveItem = (id) => {
    setAddedItems((prev) => prev.filter((item) => item.id !== id));
    toast.success("Medicine removed from list");
  };

  // ── Pre-submit validation ──────────────────────────────────────────────
  const handleSubmitClick = () => {
    for (let i = 0; i < addedItems.length; i++) {
      const item = addedItems[i];
      if (!item.drug_id) { toast.error(`Item ${i + 1}: medicine is missing`); return; }
      if (!item.selected_uom_id) { toast.error(`Item ${i + 1}: dispensing unit is missing`); return; }
      if (!item.instructions) { toast.error(`Item ${i + 1}: instructions are required`); return; }
      if (!item.quantity || item.quantity <= 0) { toast.error(`Item ${i + 1}: quantity is required`); return; }
      if (item.duration_days !== null && item.duration_days <= 0) {
        toast.error(`Item ${i + 1}: provide a valid duration`);
        return;
      }
    }
    setShowConfirm(true);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    const payload = {
      patient_visit_id: visit.id,
      prescription_source: prescriptionSource,
      prescription_date: prescriptionDate,
      prescription_notes: prescriptionNotes.trim() || null,
      items: addedItems.map(({ drug_id, selected_uom_id, strength, instructions, quantity, duration_days }) => ({
        drug_id,
        selected_uom_id,
        strength: strength || null,
        instructions,
        quantity: quantity ?? null,
        duration_days: duration_days ?? null,
      })),
    };

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}sales/storePrescription`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success(res.data?.message || "Prescription created successfully");
      setTimeout(() => { navigate("/medical/prescriptions"); }, 1500);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit prescription");
    } finally {
      setLoading(false);
    }
  };

  // ── No visit guard ─────────────────────────────────────────────────────
  if (!visit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Visit data not found</p>
      </div>
    );
  }

  const canAdd = !!selectedDrug && !!selectedUom && instructions.trim().length > 0 && quantity !== "" && Number(quantity) >= 1;

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-5">
        <div className="w-full">

          {/* ── Header ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Pill className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create Medical Prescription
              </h1>
            </div>

            {/* Patient Visit Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Patient Visit Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient Name</p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    {visit.patient?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    {visit.patient?.phone_number || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    {visit.patient?.address || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Visit Number</p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    #{visit.visit_number}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Visit Date</p>
                  <p className="mt-1 text-gray-900 dark:text-white font-semibold">
                    {visit.visit_date}
                  </p>
                </div>

                {/* Prescription Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Prescription Date
                  </label>
                  <input
                    type="date"
                    value={prescriptionDate}
                    onChange={(e) => setPrescriptionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Prescription Source
                  </label>
                  <select
                    value={prescriptionSource}
                    onChange={(e) => setPrescriptionSource(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="direct">Direct</option>
                    <option value="from_lab">From Lab</option>
                    <option value="external">External</option>
                  </select>
                </div>
              </div>

              {/* Prescription Notes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Prescription Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  placeholder="Additional clinical instructions…"
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* ── Two-column panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Panel — Add Medicine */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-white dark:text-white mb-4 font-semibold">Add Medicine/Medication</h2>

              {/* Medicine Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Medicine <span className="text-red-500">*</span>
                </label>
                <AsyncSelect
                  loadOptions={loadProductOptions}
                  defaultOptions
                  value={selectedDrug}
                  onChange={handleDrugChange}
                  classNames={getSelectClassNames()}
                  isClearable
                  placeholder="Search medicine..."
                />
              </div>

              {/* Dispensing Unit */}
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dispensing Unit <span className="text-red-500">*</span>
                </label>
                <Select
                  options={drugUomOptions}
                  value={selectedUom}
                  onChange={handleUomChange}
                  classNames={getSelectClassNames()}
                  isClearable
                  isDisabled={!selectedDrug}
                  placeholder={selectedDrug ? "Select dispensing unit…" : "Select a medicine first"}
                />
              </div>

              {/* Conversion hint */}
              <div className="mb-4">
                {renderUnitConversionHint()}
              </div>

              {/* Strength */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Strength (optional)
                </label>
                <input
                  type="text"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="e.g. 500mg, 250mg/5ml"
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              {/* Instructions */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instructions <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take 1 tablet twice daily after meals"
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              {/* Quantity & Duration */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity{selectedUom ? ` (in ${selectedUom.label})` : ""} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={selectedUom ? "e.g. 3" : "Select a unit first"}
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (days, optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              {/* Add to List Button */}
              <button
                onClick={handleAddToList}
                disabled={!canAdd}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 disabled:opacity-50 text-white font-medium shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                Add to Prescription List
              </button>
            </div>

            {/* Right Panel — Prescription List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white dark:text-white font-semibold">Prescription List</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {addedItems.length} {addedItems.length === 1 ? "item" : "items"} added
                </span>
              </div>

              {addedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <Pill className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-center">
                    No medicines added yet.
                    <br />
                    Search for a medicine and fill in the details to add.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {addedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 relative group"
                    >
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <h3 className="text-white dark:text-white mb-2 font-semibold pr-10">
                        {item.drug_name}
                      </h3>

                      <div className="space-y-1 text-sm">
                        {item.strength && (
                          <div className="flex gap-2">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Strength:</span>
                            <span className="text-white dark:text-white">{item.strength}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Instructions:</span>
                          <span className="text-white dark:text-white">{item.instructions}</span>
                        </div>
                        {item.quantity !== null && (
                          <div className="flex gap-2">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Quantity:</span>
                            <span className="text-white dark:text-white">
                              {item.quantity} {item.uom_label}{item.quantity !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Unit:</span>
                          <span className="text-white dark:text-white">
                            {item.uom_label} (×{item.multiplier})
                          </span>
                        </div>
                        {item.duration_days !== null && (
                          <div className="flex gap-2">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Duration:</span>
                            <span className="text-white dark:text-white">{item.duration_days} day(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              {addedItems.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSubmitClick}
                    disabled={loading}
                    className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Submit Prescription"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">Confirm Prescription</p>
                <p className="text-purple-100 text-xs mt-0.5">Review before submitting</p>
              </div>
              <button onClick={() => setShowConfirm(false)} className="rounded-full p-1 hover:bg-white/20 transition">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Patient</span>
                <span className="font-medium">{visit.patient?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Visit No.</span>
                <span className="font-medium">#{visit.visit_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Prescription Date</span>
                <span className="font-medium">{prescriptionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Medicines</span>
                <span className="font-medium">
                  {addedItems.length} {addedItems.length === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50 transition"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UOM Conversion Warning Modal ── */}
      {/* Simpler than StockAdjustments version: no "Go to Unit Converter" nav button
          since the prescriber is not the right role to fix product UOM config. */}
      {showUomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900 px-6 py-4 border-b border-red-200 dark:border-red-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h2 className="font-semibold text-red-900 dark:text-white text-sm">
                  Unit Conversion Not Found
                </h2>
              </div>
              <button onClick={() => setShowUomModal(false)} className="text-red-400 hover:text-red-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-200 text-sm mb-4">
                The unit <span className="font-semibold text-gray-900 dark:text-white">{uomModalMsg.uom}</span> is
                not configured as a dispensing unit for{" "}
                <span className="font-semibold text-gray-900 dark:text-white">{uomModalMsg.drug}</span>.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-5">
                <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                  A pharmacy administrator needs to add this unit conversion in the Product Unit Converter before it can be used for prescribing.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowUomModal(false)}
                  className="px-5 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
                >
                  Choose a different unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
