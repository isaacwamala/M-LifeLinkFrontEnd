import React, { useState } from 'react';
import axios from 'axios';
import { X, UserPlus } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';

export function RegisterCustomerDrawer({ isOpen, onClose, token, onSuccess }) {
    const [form, setForm] = useState({
        name: '',
        phone_number: '',
        email: '',
        location: '',
        credit_limit: 0,
        credit_notes: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const reset = () => setForm({ name: '', phone_number: '', email: '', location: '', credit_limit: 0, credit_notes: '' });

    const handleClose = () => { reset(); onClose(); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await axios.post(`${API_BASE_URL}customers/addCustomer`, form, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            toast.success(res.data.message || 'Customer registered successfully');
            reset();
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to register customer');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors";
    const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Register Customer</h2>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4">
                    <div>
                        <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. Jane Doe" value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. 0700000000" value={form.phone_number}
                            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Email</label>
                        <input type="email" placeholder="Optional" value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Location / Address</label>
                        <input type="text" placeholder="Optional" value={form.location}
                            onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Credit Limit (UGX)</label>
                        <input type="number" min="0" step="0.01" value={form.credit_limit}
                            onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} className={inputCls} />
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Maximum amount this customer can owe on credit. Leave at 0 to disable credit.</p>
                    </div>
                    <div>
                        <label className={labelCls}>Credit Notes</label>
                        <textarea rows={3} placeholder="Any notes about this customer's credit arrangement…" value={form.credit_notes}
                            onChange={e => setForm(f => ({ ...f, credit_notes: e.target.value }))}
                            className={`${inputCls} resize-none`} />
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={handleClose}
                            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                            {submitting ? 'Registering…' : 'Register Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
