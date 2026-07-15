// Drawer for recording a deposit to a patient's account.
// Slides in from the right, matching the AssignVisitToWard drawer pattern.

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, Wallet, Loader2, ChevronRight, Banknote, Smartphone, StickyNote, Info,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../../general/constants';

const textareaCls =
    'w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white ' +
    'border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 ' +
    'focus:border-transparent focus:outline-none text-sm transition-all ' +
    'placeholder-gray-400 dark:placeholder-gray-500 resize-none leading-relaxed';

const inputCls =
    'w-full rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-white ' +
    'border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 ' +
    'focus:border-transparent focus:outline-none text-sm transition-all ' +
    'placeholder-gray-400 dark:placeholder-gray-500';

const PAYMENT_METHODS = [
    { value: 'cash',         label: 'Cash',         icon: Banknote,    color: 'emerald' },
    { value: 'mobile_money', label: 'Mobile Money',  icon: Smartphone,  color: 'blue'    },
];

/**
 * AddPatientDeposit
 * Props:
 *   isOpen    – boolean
 *   onClose   – () => void
 *   patient   – patient object (needs patient.id, patient.name)
 *   token     – JWT string
 *   onSuccess – () => void  called after a successful deposit
 */
export function AddPatientDeposit({ isOpen, onClose, patient, token, onSuccess }) {
    const [amount, setAmount]         = useState('');
    const [method, setMethod]         = useState('cash');
    const [notes, setNotes]           = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reset form each time drawer opens
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setMethod('cash');
            setNotes('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed < 0.01) {
            toast.error('Please enter a valid amount (minimum 0.01).');
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(
                `${API_BASE_URL}patient/addDeposit`,
                {
                    patient_id:       patient.id,
                    amount_deposited:  parsed,
                    payment_method:   method,
                    additional_info:  notes.trim() || undefined,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            );

            toast.success(`Deposit of ${parsed.toLocaleString(undefined, { minimumFractionDigits: 2 })} recorded successfully.`);
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record deposit.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-xl z-50 flex flex-col
                bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800
                animate-slide-in-right">

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800
                    bg-gradient-to-r from-emerald-600 to-teal-600 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Add Patient Deposit
                        </h2>
                        <p className="text-emerald-100 text-xs mt-1">
                            Patient: <span className="font-semibold">{patient?.name}</span>
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="rounded-full p-2 hover:bg-white/20 text-white transition mt-0.5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20
                        border border-emerald-200 dark:border-emerald-800">
                        <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            The deposited amount will be added to the patient's account balance. This is recorded
                            for audit purposes and can be viewed in the deposit history.
                        </p>
                    </div>

                    {/* ── Amount ── */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 dark:text-white mb-2">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            className={inputCls}
                        />
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Enter the amount in local currency.</p>
                    </div>

                    {/* ── Payment Method ── */}
                    <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">
                            Payment Method <span className="text-red-500">*</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {PAYMENT_METHODS.map(({ value, label, icon: Icon, color }) => {
                                const selected = method === value;
                                const ring = color === 'emerald' ? 'ring-emerald-500 border-emerald-400' : 'ring-blue-500 border-blue-400';
                                const bg   = color === 'emerald'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'bg-blue-50 dark:bg-blue-900/20';
                                const iconBg = color === 'emerald'
                                    ? 'bg-emerald-600'
                                    : 'bg-blue-600';
                                const text = color === 'emerald'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-blue-700 dark:text-blue-300';

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setMethod(value)}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                                            ${selected
                                                ? `${ring} ${bg} ring-2`
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                                            ${selected ? iconBg : 'bg-gray-100 dark:bg-gray-700'}`}>
                                            <Icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                        </div>
                                        <span className={`text-xs font-semibold ${selected ? text : 'text-gray-600 dark:text-gray-300'}`}>
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Additional Info ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Additional Info</p>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(optional)</span>
                        </div>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Reference number, payer name, or any other relevant notes…"
                            className={textareaCls}
                        />
                    </div>

                </div>

                {/* ── Footer ── */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/80 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300
                            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                            hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !amount}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                            bg-gradient-to-r from-emerald-600 to-teal-600
                            hover:from-emerald-700 hover:to-teal-700
                            disabled:opacity-40 disabled:cursor-not-allowed
                            transition shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording…</>
                            : <><Wallet className="w-4 h-4" /> Record Deposit <ChevronRight className="w-4 h-4" /></>
                        }
                    </button>
                </div>

            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </>
    );
}
