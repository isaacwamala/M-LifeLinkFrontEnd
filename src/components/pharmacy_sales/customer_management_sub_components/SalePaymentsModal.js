import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, CreditCard, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';
import Skeleton from 'react-loading-skeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function paymentStatusBadge(status) {
    if (status === 'paid')    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'partial') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
}

function paymentStatusLabel(status) {
    if (status === 'paid')    return 'Paid';
    if (status === 'partial') return 'Partial';
    return 'Unpaid';
}

const fmt = (v) => `UGX ${Number(v || 0).toLocaleString()}`;

// ── Component ─────────────────────────────────────────────────────────────────

export function SalePaymentsModal({ isOpen, onClose, saleId, saleNumber, token }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchPayments = useCallback(async () => {
        if (!saleId) return;
        setLoading(true);
        try {
            //Endpoint returns subsequent payments which were made next to cover up specific sale which left balance
            const res = await axios.get(`${API_BASE_URL}customers/getPaymentsForPharmacySale`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { pharmacy_sale_id: saleId },
            });
            setData(res.data.data || null);
        } catch (err) {
            toast.error('Failed to load payment history');
        } finally {
            setLoading(false);
        }
    }, [saleId, token]);

    useEffect(() => {
        if (isOpen && saleId) fetchPayments();
        if (!isOpen) setData(null);
    }, [isOpen, saleId, fetchPayments]);

    if (!isOpen) return null;

    const sale     = data?.sale;
    const payments = data?.payments || [];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-fade-in">

                {/* ── Header ── */}
                <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Payments</p>
                                <p className="text-sky-100 text-xs mt-0.5">{saleNumber}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <div className="space-y-3">
                            <Skeleton height={60} className="rounded-xl" />
                            {[1, 2, 3].map(i => <Skeleton key={i} height={44} />)}
                        </div>
                    ) : (
                        <>
                            {/* ── Sale summary ── */}
                            {sale && (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Paid</span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(sale.amount_paid)}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Balance</span>
                                        <span className={`text-sm font-bold ${Number(sale.balance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {fmt(sale.balance)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</span>
                                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold w-fit ${paymentStatusBadge(sale.payment_status)}`}>
                                            {paymentStatusLabel(sale.payment_status)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* ── Payment list ── */}
                            {payments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-600">
                                    <AlertCircle className="w-8 h-8 mb-2" />
                                    <p className="text-sm">No payments recorded on this sale yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {payments.map((p, i) => (
                                        <div key={p.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800">
                                            <div>
                                                <p className="text-sm font-semibold text-green-700 dark:text-green-300">{fmt(p.amount_paid)}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {p.payment_method}
                                                    {p.recorded_by?.name ? ` · ${p.recorded_by.name}` : ''}
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 pb-5">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
}
