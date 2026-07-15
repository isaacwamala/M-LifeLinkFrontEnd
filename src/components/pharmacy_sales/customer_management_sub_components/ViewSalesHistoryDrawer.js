import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, ShoppingBag, AlertCircle, CreditCard } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { toast } from 'react-toastify';
import Skeleton from 'react-loading-skeleton';
import { SalePaymentsModal } from './SalePaymentsModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function paymentStatusBadge(status) {
    if (status === 'paid') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'partial') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
}

function paymentStatusLabel(status) {
    if (status === 'paid') return 'Paid';
    if (status === 'partial') return 'Partial';
    return 'Unpaid';
}

const fmt = (v) => `UGX ${Number(v || 0).toLocaleString()}`;

// ── Component ─────────────────────────────────────────────────────────────────

export function ViewSalesHistoryDrawer({ isOpen, onClose, customer, token }) {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSaleId, setModalSaleId] = useState(null);
    const [modalSaleNum, setModalSaleNum] = useState('');

    const fetchSales = useCallback(async () => {
        if (!customer?.id) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}sales/getPharmacySales`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                //Only query sales made by this customer
                params: { customer_id: customer.id },
            });
            setSales(res.data.sales?.data || []);
        } catch (err) {
            toast.error('Failed to load sales history');
        } finally {
            setLoading(false);
        }
    }, [customer?.id, token]);

    useEffect(() => {
        if (isOpen && customer) fetchSales();
        if (!isOpen) { setSales([]); setIsModalOpen(false); setModalSaleId(null); }
    }, [isOpen, customer, fetchSales]);

    const openModal = (sale) => {
        setModalSaleId(sale.id);
        setModalSaleNum(sale.sale_number);
        setIsModalOpen(true);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex">
                <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                <div className="relative ml-auto h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-right">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="w-5 h-5 text-sky-600" />
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-white text-base">Sales History</h2>
                                {customer && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {customer.name}{customer.phone_number ? ` · ${customer.phone_number}` : ''}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} height={52} className="rounded-xl" />)}
                            </div>
                        ) : sales.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-600">
                                <AlertCircle className="w-10 h-10 mb-2" />
                                <p className="text-sm">No sales recorded for this customer yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            {['Sale #', 'Date', 'Total', 'Paid', 'Balance', 'Status', ''].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                        {sales.map((sale, i) => (
                                            <tr key={sale.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                                                <td className="px-3 py-2.5 font-mono font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {sale.sale_number}
                                                </td>
                                                <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {sale.payment_date ? new Date(sale.payment_date).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {fmt(sale.total_amount)}
                                                </td>
                                                <td className="px-3 py-2.5 text-green-600 dark:text-green-400 whitespace-nowrap">
                                                    {fmt(sale.amount_paid)}
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <span className={Number(sale.balance) > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}>
                                                        {fmt(sale.balance)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${paymentStatusBadge(sale.payment_status)}`}>
                                                        {paymentStatusLabel(sale.payment_status)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openModal(sale)}
                                                        title="View payments"
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-transparent transition whitespace-nowrap"
                                                    >
                                                        <CreditCard className="w-3.5 h-3.5" />
                                                        View Payments
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Render the modal that displays the subsequent 
            payments which were made to cover up the sale that left balances */}
            <SalePaymentsModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setModalSaleId(null); }}
                saleId={modalSaleId}
                saleNumber={modalSaleNum}
                token={token}
            />

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </>
    );
}
