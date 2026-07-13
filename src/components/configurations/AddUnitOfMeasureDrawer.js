// Standalone drawer for creating a Unit of Measure.
// Can be mounted anywhere — used both on the /unit_of_measure page and
// inline inside the product item form so users never need to navigate away.
//
// Props:
//   isOpen    : boolean
//   onClose   : () => void
//   token     : string
//   onCreated : (newUom: { id, name, uom_code }) => void
//              fired after a successful save — caller uses it to refresh
//              its own UOM list and/or auto-select the new entry

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Loader2, Ruler } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../general/constants';

const inputCls =
    'w-full rounded-lg px-4 py-2 ' +
    'bg-white dark:bg-gray-800 ' +
    'border border-gray-300 dark:border-gray-600 ' +
    'text-gray-900 dark:text-white ' +
    'focus:outline-none focus:border-blue-500 ' +
    'placeholder-gray-400 dark:placeholder-gray-500 ' +
    'transition-colors';

export function AddUnitOfMeasureDrawer({ isOpen, onClose, token, onCreated }) {
    const [formData, setFormData] = useState({ name: '', uom_code: '' });
    const [saving, setSaving]     = useState(false);

    // Reset form every time the drawer opens
    useEffect(() => {
        if (isOpen) setFormData({ name: '', uom_code: '' });
    }, [isOpen]);

    const handleInput = (e) =>
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.uom_code.trim()) {
            toast.error('Both Name and UOM Code are required.');
            return;
        }

        setSaving(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}config/createUnitOfMeasure`,
                { name: formData.name.trim(), uom_code: formData.uom_code.trim() },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );

            toast.success('Unit of Measure added successfully.');
            // Pass back the real UOM object (including its new id) to the caller
            onCreated(res.data.uom);
            onClose();
        } catch (err) {
            const msg =
                err.response?.data?.errors
                    ? Object.values(err.response.data.errors).flat().join(' ')
                    : err.response?.data?.message ?? 'Failed to save Unit of Measure.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-[75]
                flex flex-col animate-slide-in-right">

                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-purple-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Ruler className="w-5 h-5" /> Add Unit of Measure
                        </h2>
                        <p className="text-blue-200 text-xs mt-0.5">Define a new base measurement unit</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleInput}
                            placeholder="e.g. Tablet, Vial, ml"
                            className={inputCls}
                            required
                            autoFocus
                        />
                    </div>

                    {/* UOM Code */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            UOM Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="uom_code"
                            value={formData.uom_code}
                            onChange={handleInput}
                            placeholder="e.g. TAB, VL, ML"
                            className={inputCls}
                            required
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Short abbreviation used in reports and labels.
                        </p>
                    </div>

                    {/* Footer actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                                bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
                                hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-lg text-white text-sm font-semibold
                                bg-gradient-to-r from-blue-700 to-purple-800
                                hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
                                flex items-center gap-2 transition"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saving ? 'Saving…' : 'Save UOM'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
