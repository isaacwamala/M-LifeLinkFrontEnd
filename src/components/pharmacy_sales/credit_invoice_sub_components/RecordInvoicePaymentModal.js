import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CreditCard } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';

export function RecordInvoicePaymentModal({ isOpen, onClose, invoice, token, onSuccess }) {
    const today = new Date().toISOString().split('T')[0];

    const [amount, setAmount]               = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [reference, setReference]         = useState('');
    const [paidAt, setPaidAt]               = useState(today);
    const [notes, setNotes]                 = useState('');
    const [submitting, setSubmitting]       = useState(false);

    // Reset form when modal opens for a new invoice
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setPaymentMethod('cash');
            setReference('');
            setPaidAt(today);
            setNotes('');
        }
    }, [isOpen, invoice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen || !invoice) return null;

    const balanceDue      = parseFloat(invoice.balance_due || 0);
    const enteredAmount   = parseFloat(amount || 0);
    const exceedsBalance  = enteredAmount > balanceDue;
    const canSubmit       = enteredAmount > 0 && !exceedsBalance && paymentMethod && !submitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}credit-invoices/recordPayment`,
                {
                    invoice_id:     invoice.id,
                    amount:         enteredAmount,
                    payment_method: paymentMethod,
                    reference:      reference || null,
                    paid_at:        paidAt,
                    notes:          notes || null,
                },
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
            );
            toast.success(res.data.message || 'Payment recorded successfully');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-fade-in">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Record Payment</p>
                                <p className="text-blue-100 text-xs mt-0.5">{invoice.invoice_number}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Balance context */}
                <div className="px-6 pt-5 pb-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Balance Due</span>
                        <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                            UGX {balanceDue.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-4">

                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder={`Max: ${balanceDue.toLocaleString()}`}
                            required
                            className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition ${
                                exceedsBalance
                                    ? 'border-red-400 dark:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {exceedsBalance && (
                            <p className="mt-1 text-xs text-red-500">
                                Amount exceeds balance due (UGX {balanceDue.toLocaleString()})
                            </p>
                        )}
                    </div>

                    {/* Payment method */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Payment Method <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                        >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="mobile_money">Mobile Money</option>
                        </select>
                    </div>

                    {/* Reference */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Reference <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            placeholder="e.g. mobile money code"
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Paid at */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Payment Date
                        </label>
                        <input
                            type="date"
                            value={paidAt}
                            onChange={e => setPaidAt(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Notes <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-200 dark:shadow-blue-900/40"
                        >
                            {submitting ? 'Recording…' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
}
