// BillingRates.js
//
// Admin screen for managing billing_rates configuration rows.
// Each row defines a machine-readable key and the monetary amount charged
// for that billing event. The system currently uses one active key:
//   - consultation_fee: charged when a doctor records an examination note
//     for an OPD/Others visit (PatientVisitWorkflowsController).
//
// Admins can view all rates, edit their label and amount, add new rates,
// and delete rates that are not actively referenced by billing logic.
//
// Create/delete isolation note:
//   The "Add Rate" button and the per-row "Delete" button are each wrapped
//   in a clearly marked comment block. Hiding either action later requires
//   only commenting out that block — no changes to the list or edit flow.

import React, { useState, useEffect } from "react";
import { Edit, X, Plus, Trash2, DollarSign, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export function BillingRates() {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const [rates, setRates]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
    const [currentRate, setCurrentRate] = useState(null);
    const [submitting, setSubmitting]   = useState(false);

    const EMPTY_FORM = { key: "", label: "", amount: "" };
    const [formData, setFormData] = useState(EMPTY_FORM);

    // ── Data loading ──────────────────────────────────────────────────────────
    const loadRates = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}config/getBillingRates`, { headers });
            setRates(res.data?.data ?? []);
        } catch {
            toast.error("Failed to load billing rates.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openEditModal = (rate) => {
        setModalMode("edit");
        setCurrentRate(rate);
        setFormData({ key: rate.key, label: rate.label, amount: rate.amount ?? "" });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentRate(null);
        setFormData(EMPTY_FORM);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ── Submit (add or edit) ──────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.label.trim()) {
            toast.error("Label is required.");
            return;
        }
        if (formData.amount === "" || Number(formData.amount) < 0) {
            toast.error("A valid amount (0 or more) is required.");
            return;
        }
        if (modalMode === "add") {
            if (!formData.key.trim()) {
                toast.error("Key is required.");
                return;
            }
            if (!/^[a-z0-9_]+$/.test(formData.key)) {
                toast.error("Key must contain only lowercase letters, numbers, and underscores.");
                return;
            }
        }

        try {
            setSubmitting(true);
            if (modalMode === "add") {
                await axios.post(
                    `${API_BASE_URL}config/createBillingRate`,
                    { key: formData.key, label: formData.label, amount: Number(formData.amount) },
                    { headers }
                );
                toast.success("Billing rate created successfully.");
            } else {
                await axios.post(
                    `${API_BASE_URL}config/updateBillingRate`,
                    { id: currentRate.id, label: formData.label, amount: Number(formData.amount) },
                    { headers }
                );
                toast.success("Billing rate updated successfully.");
            }
            loadRates();
            closeModal();
        } catch (err) {
            toast.error(err.response?.data?.message || "Operation failed.");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Delete (isolated — comment out handleDelete + the Delete button block
    //    below to hide the delete action from the UI) ──────────────────────────
    const handleDelete = async (rate) => {
        if (!window.confirm(`Delete "${rate.label}"? This cannot be undone.`)) return;
        try {
            await axios.delete(`${API_BASE_URL}config/deleteBillingRate`, {
                headers,
                data: { id: rate.id },
            });
            toast.success("Billing rate deleted.");
            loadRates();
        } catch (err) {
            // The server returns 409 with a specific message for protected keys
            toast.error(err.response?.data?.message || "Failed to delete billing rate.");
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 sm:p-8 transition-colors duration-300 dashboard">
                <div className="w-full">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Billing Rates</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {loading ? "Loading…" : `${rates.length} rate${rates.length !== 1 ? "s" : ""} configured`}
                                </p>
                            </div>
                        </div>

                        {/* ── Add Rate button — comment out this block to hide create ─────── */}
                        <button
                            onClick={() => {
                                setModalMode("add");
                                setFormData(EMPTY_FORM);
                                setIsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors w-full sm:w-auto justify-center shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Rate
                        </button>
                        {/* ──────────────────────────────────────────────────────────────── */}
                    </div>

                    {/* Rate list */}
                    <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6" borderRadius="0.75rem">
                        {loading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between"
                                    >
                                        <div>
                                            <Skeleton width={160} height={14} className="mb-1" />
                                            <Skeleton width={110} height={11} />
                                        </div>
                                        <Skeleton width={90} height={14} />
                                    </div>
                                ))}
                            </div>
                        ) : rates.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 py-16 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                                    <DollarSign className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">No billing rates configured yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rates.map((rate) => (
                                    <div
                                        key={rate.id}
                                        className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-sm transition-all duration-200"
                                    >
                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                            {/* Label + key */}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                    {rate.label}
                                                </p>
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                                                    {rate.key}
                                                </p>
                                            </div>

                                            {/* Amount + actions */}
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                                    UGX {Number(rate.amount).toLocaleString()}
                                                </span>

                                                <button
                                                    onClick={() => openEditModal(rate)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>

                                                {/* ── Delete button — comment out this block to hide delete ── */}
                                                <button
                                                    onClick={() => handleDelete(rate)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-800/40 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
                                                {/* ──────────────────────────────────────────────────────── */}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SkeletonTheme>
                </div>

                {/* Add / Edit modal */}
                {isModalOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 backdrop-blur-sm"
                            onClick={closeModal}
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">

                                {/* Modal header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                            {modalMode === "add" ? "Add Billing Rate" : "Edit Billing Rate"}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                                    {/* Key field — editable only when adding; read-only when editing */}
                                    {modalMode === "add" ? (
                                        /* ── Key input lives inside the Add form block ────────────── */
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                                Key <span className="text-red-500 ml-0.5">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="key"
                                                value={formData.key}
                                                onChange={handleInputChange}
                                                placeholder="e.g. ward_admission_fee"
                                                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 font-mono"
                                            />
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                                Lowercase letters, numbers, and underscores only (e.g.{" "}
                                                <span className="font-mono">ward_admission_fee</span>)
                                            </p>
                                        </div>
                                        /* ──────────────────────────────────────────────────────────── */
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                                Key
                                            </label>
                                            <p className="px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-mono">
                                                {formData.key}
                                            </p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                                Key cannot be changed after creation
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                            Label <span className="text-red-500 ml-0.5">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="label"
                                            value={formData.label}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Consultation Fee"
                                            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                            Amount (UGX) <span className="text-red-500 ml-0.5">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleInputChange}
                                            placeholder="e.g. 20000"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            disabled={submitting}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="animate-spin h-4 w-4" />
                                                    Saving…
                                                </>
                                            ) : modalMode === "add" ? "Add Rate" : "Save Changes"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
