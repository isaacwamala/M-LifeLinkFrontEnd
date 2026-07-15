import React, { useState } from 'react';
import axios from 'axios';
import { X, HandCoins } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';

export function RecordSaleBalancePaymentDrawer({ isOpen, onClose, customer, token, onSuccess }) {
    const [form, setForm] = useState({ amount_paid: '', payment_method: 'cash', additional_info: '' });
    const [submitting, setSubmitting] = useState(false);

    const reset = () => setForm({ amount_paid: '', payment_method: 'cash', additional_info: '' });

    const handleClose = () => { reset(); onClose(); };

    const maxAmount = parseFloat(customer?.account_sale_balance || 0);
    const exceedsMax = parseFloat(form.amount_paid || 0) > maxAmount;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (exceedsMax) return;
        setSubmitting(true);
        try {
            const res = await axios.post(`${API_BASE_URL}customers/recordSaleBalancePayment`, {
                customer_id: customer.id,
                amount_paid: parseFloat(form.amount_paid),
                payment_method: form.payment_method,
                additional_info: form.additional_info || undefined,
            }, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            toast.success(res.data.message || 'Repayment recorded successfully');
            reset();
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record repayment');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !customer) return null;

    const inputCls = (hasError) => `w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
        hasError
            ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500'
    }`;
    const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";
    const methods = [
        { value: 'cash', label: 'Cash' },
        { value: 'card', label: 'Card' },
        { value: 'mobile_money', label: 'Mobile Money' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
                    <div className="flex items-center gap-2">
                        <HandCoins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Record Repayment</h2>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-4">
                    {/* Customer context */}
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Customer</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{customer.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{customer.phone_number}</p>
                        <div className="mt-2 pt-2 border-t border-amber-100 dark:border-amber-800/50">
                            <span className="text-xs text-amber-700 dark:text-amber-400">Outstanding balance: </span>
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                UGX {maxAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={labelCls}>Amount Paid (UGX) <span className="text-red-500">*</span></label>
                            <input type="number" required min="0.01" step="0.01" placeholder="0.00"
                                value={form.amount_paid}
                                onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
                                className={inputCls(exceedsMax)} />
                            {exceedsMax && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                    Amount cannot exceed the outstanding balance of UGX {maxAmount.toLocaleString()}.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={labelCls}>Payment Method <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                {methods.map(m => (
                                    <button key={m.value} type="button"
                                        onClick={() => setForm(f => ({ ...f, payment_method: m.value }))}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                            form.payment_method === m.value
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'
                                        }`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Additional Info</label>
                            <textarea rows={3} placeholder="Optional notes about this repayment…"
                                value={form.additional_info}
                                onChange={e => setForm(f => ({ ...f, additional_info: e.target.value }))}
                                className={`${inputCls(false)} resize-none`} />
                        </div>

                        <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <button type="button" onClick={handleClose}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting || exceedsMax}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                                {submitting ? 'Recording…' : 'Record Repayment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
