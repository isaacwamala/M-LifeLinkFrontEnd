import React, { useState, useEffect } from "react";
import { Building2, Save, Loader2 } from "lucide-react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "../general/constants";

const EMPTY_FORM = { name: "", address: "", email: "", phone: "", consultation_revisit_window_days: "" };

export function BusinessSettings() {
  const token = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadBusiness = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}config/getBusiness`, { headers });
      if (data.success && data.data) {
        const b = data.data;
        setFormData({
          name:    b.name    ?? "",
          address: b.address ?? "",
          email:   b.email   ?? "",
          phone:   b.phone   ?? "",
          consultation_revisit_window_days: b.consultation_revisit_window_days ?? 0,
        });
      }
    } catch {
      toast.error("Failed to load business details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Business name is required.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}config/updateBusiness`,
        {
          ...formData,
          consultation_revisit_window_days: Number(formData.consultation_revisit_window_days || 0),
        },
        { headers }
      );
      if (data.success) {
        toast.success("Business details saved successfully.");
      }
    } catch (err) {
      const msg = err.response?.data?.message ?? "Failed to save business details.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 w-full">
      <ToastContainer position="top-right" autoClose={4000} />

      {/* Header */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Business Settings
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Facility details printed on invoices and receipts
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading business details…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Business name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={255}
              placeholder="e.g. Mutima Life Link Medical Center"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              This name appears on all generated PDF documents.
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              maxLength={500}
              placeholder="e.g. Kampala, Uganda"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email + Phone side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                maxLength={255}
                placeholder="info@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength={50}
                placeholder="+256 700 000000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Consultation Revisit Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Consultation Revisit Window (days)
            </label>
            <input
              type="number"
              name="consultation_revisit_window_days"
              value={formData.consultation_revisit_window_days}
              onChange={handleChange}
              min={0}
              placeholder="e.g. 14"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              If a patient returns within this many days of their last charged consultation, they will not be charged again. Set to 0 to always charge.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Business Details
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
