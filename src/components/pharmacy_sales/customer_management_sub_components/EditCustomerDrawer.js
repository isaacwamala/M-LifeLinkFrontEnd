import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Edit2 } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';

export function EditCustomerDrawer({ isOpen, onClose, customer, token, onSuccess }) {
    const [form, setForm] = useState({
        name: '',
        phone_number: '',
        email: '',
        location: '',
        is_active: true,
        credit_enabled: false,
        credit_limit: '',
        credit_notes: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (customer) {
            setForm({
                name: customer.name || '',
                phone_number: customer.phone_number || '',
                email: customer.email || '',
                location: customer.location || '',
                is_active: customer.is_active ?? true,
                credit_enabled: customer.credit_enabled ?? false,
                credit_limit: customer.credit_limit ?? 0,
                credit_notes: customer.credit_notes || '',
            });
        }
    }, [customer]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await axios.post(`${API_BASE_URL}customers/updateCustomer`, {
                customer_id: customer.id,
                ...form,
            }, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            toast.success(res.data.message || 'Customer updated successfully');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update customer');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !customer) return null;

    const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors";
    const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
                    <div className="flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Edit Customer</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4">
                    <div>
                        <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                        <input type="text" required value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
                        <input type="text" required value={form.phone_number}
                            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Email</label>
                        <input type="email" value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Location / Address</label>
                        <input type="text" value={form.location}
                            onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputCls} />
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Account Status</label>
                            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                className={`w-full py-2 rounded-lg text-xs font-semibold border transition-all ${
                                    form.is_active
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                                }`}>
                                {form.is_active ? 'Active' : 'Inactive'}
                            </button>
                        </div>
                        <div>
                            <label className={labelCls}>Credit</label>
                            <button type="button" onClick={() => setForm(f => ({ ...f, credit_enabled: !f.credit_enabled }))}
                                className={`w-full py-2 rounded-lg text-xs font-semibold border transition-all ${
                                    form.credit_enabled
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                                }`}>
                                {form.credit_enabled ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Credit Limit (UGX)</label>
                        <input type="number" min="0" step="0.01" value={form.credit_limit}
                            onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Credit Notes</label>
                        <textarea rows={3} value={form.credit_notes}
                            onChange={e => setForm(f => ({ ...f, credit_notes: e.target.value }))}
                            className={`${inputCls} resize-none`} />
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                            {submitting ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
