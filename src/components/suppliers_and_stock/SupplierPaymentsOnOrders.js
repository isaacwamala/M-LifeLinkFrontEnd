import { useState, useEffect } from 'react';
import {
    Building2, CreditCard, Calendar, DollarSign, TrendingUp, FileText, CheckCircle2, AlertCircle, Clock, Wallet
} from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import { API_BASE_URL } from "../general/constants";
import { useNavigate } from 'react-router-dom';
import { fetchSuppliers } from '../products/products_helper';



export default function SupplierPaymentsOnOrders() {

    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);


    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [responseData, setResponseData] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");

    const orders = responseData?.data || [];  // ← FIX


    // Load suppliers
    const loadSuppliers = async () => {
        const data = await fetchSuppliers(token);
        setSuppliers(data);
    };


    //Load and fetch the analytical data for all this
    const fetchSupplierOrderPaymentsAnalysis = async () => {
        if (!selectedSupplierId || !fromDate || !toDate) {
            toast.error("Please select supplier and date range.");
            return;
        }

        setLoading(true);
        setResponseData(null);

        try {
            const response = await axios.get(
                `${API_BASE_URL}purchase/getPaymentsAndBalancesOnSupplierOrders`,
                {
                    params: {
                        supplier_id: Number(selectedSupplierId),
                        from_date: fromDate,
                        to_date: toDate
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                }
            );

            setResponseData(response.data);

        } catch (err) {
            console.log(err);
            toast.error("Failed to fetch payments. Please try again.");
        }

        setLoading(false);
    };


    //Load suppliers on component mount
    useEffect(() => {
        loadSuppliers();
        // fetchSupplierOrderPaymentsAnalysis();
        setLoading(false);
    }, [token]);

    const getStatusColor = (status) => {
        switch (status) {
            case "paid":
                return "bg-green-100 text-green-800 border-green-300";
            case "partial":
                return "bg-yellow-100 text-yellow-800 border-yellow-300";
            case "unpaid":
                return "bg-red-100 text-red-800 border-red-300";
            default:
                return "bg-gray-100 text-gray-800 border-gray-300";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "paid":
                return <CheckCircle2 className="w-5 h-5" />;
            case "partial":
                return <Clock className="w-5 h-5" />;
            case "unpaid":
                return <AlertCircle className="w-5 h-5" />;
            default:
                return null;
        }
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "UGX"
        }).format(Number(amount));

    const formatDate = (date) =>
        new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });

    const getPaymentMethodIcon = (method) => {
        switch (method.toLowerCase()) {
            case "cash":
                return <Wallet className="w-4 h-4" />;
            case "bank_transfer":
                return <Building2 className="w-4 h-4" />;
            case "cheque":
                return <FileText className="w-4 h-4" />;
            default:
                return <CreditCard className="w-4 h-4" />;
        }
    };


    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
                <div className="w-full">

                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <TrendingUp className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-gray-900 dark:text-gray-100">Supplier Payment Analysis</h1>
                                <p className="text-gray-600 dark:text-gray-400">Track and manage supplier order payments</p>
                            </div>
                        </div>
                    </div>




                    {/* FILTERS */}
                    {/* FILTERS */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-gray-700 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Supplier Selection */}
                            <div>
                                <label className="block mb-3 text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                    Select Supplier
                                </label>

                                <select
                                    value={selectedSupplierId || ''}
                                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                                    className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                >
                                    <option value="">-- Choose a supplier --</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* From Date */}
                            <div>
                                <label className="block mb-2 text-gray-700 dark:text-gray-200">From Date</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>

                            {/* To Date */}
                            <div>
                                <label className="block mb-2 text-gray-700 dark:text-gray-200">To Date</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border dark:border-gray-600 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>
                        </div>


                        {/* Action Buttons */}
                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={fetchSupplierOrderPaymentsAnalysis}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
                            >
                                Get Payments
                            </button>

                            <button
                                onClick={() => {
                                    setSelectedSupplierId("");
                                    setFromDate("");
                                    setToDate("");
                                    setResponseData(''); // optional: clear previous results
                                    toast.info("Filters reset");
                                }}
                                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl transition"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>



                    {/* Display askeleton before data is displayed */}

                    {/* Loading Skeleton */}
                    {loading && (
                        <div className="space-y-6 animate-pulse">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="rounded-2xl p-6 bg-gray-200 dark:bg-gray-700 shadow-lg">
                                        <div className="h-6 w-1/3 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                                        <div className="h-10 w-2/3 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                                        <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-600 rounded"></div>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                                <div className="h-6 w-1/4 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Section */}
                    {!loading && orders.length > 0 && orders.map((order) => (

                        <div key={order.order_id} className="space-y-6">

                            {/* Order Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                                {/* Order Number Card */}
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <FileText className="w-8 h-8 opacity-80" />
                                        <span className="text-blue-100 text-sm">Order</span>
                                    </div>
                                    <p className="text-3xl mb-1">{order.order_number}</p>
                                    <div className="flex items-center gap-2 text-blue-100 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(order.order_date)}
                                    </div>
                                </div>

                                {/* Total Amount Card */}
                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <DollarSign className="w-8 h-8 opacity-80" />
                                        <span className="text-purple-100 text-sm">Total</span>
                                    </div>
                                    <p className="text-3xl mb-1">{formatCurrency(order.order_total)}</p>
                                    <p className="text-purple-100 text-sm">Order Amount</p>
                                </div>

                                {/* Paid Amount Card */}
                                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <CheckCircle2 className="w-8 h-8 opacity-80" />
                                        <span className="text-green-100 text-sm">Paid</span>
                                    </div>
                                    <p className="text-3xl mb-1">{formatCurrency(order.total_paid_on_order)}</p>
                                    <p className="text-green-100 text-sm">
                                        {((order.total_paid_on_order / Number(order.order_total)) * 100).toFixed(0)}% Complete
                                    </p>
                                </div>

                                {/* Balance Card */}
                                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <AlertCircle className="w-8 h-8 opacity-80" />
                                        <span className="text-orange-100 text-sm">Balance</span>
                                    </div>
                                    <p className="text-3xl mb-1">{formatCurrency(order.balance_on_order)}</p>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mt-1 ${getStatusColor(order.order_payment_status)} border`}>
                                        {getStatusIcon(order.order_payment_status)}
                                        <span className="capitalize">{order.order_payment_status}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payments Table */}
                            {order.payments.length > 0 ? (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-slate-200 dark:border-gray-700">
                                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
                                        <div className="flex items-center gap-2 text-white">
                                            <CreditCard className="w-5 h-5" />
                                            <h2>Payment History</h2>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-100 dark:bg-gray-700 border-b border-slate-200 dark:border-gray-600">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-gray-700 dark:text-gray-200">Payment ID</th>
                                                    <th className="px-6 py-4 text-left text-gray-700 dark:text-gray-200">Date</th>
                                                    <th className="px-6 py-4 text-left text-gray-700 dark:text-gray-200">Method</th>
                                                    <th className="px-6 py-4 text-right text-gray-700 dark:text-gray-200">Amount Paid</th>
                                                    <th className="px-6 py-4 text-right text-gray-700 dark:text-gray-200">Balance After</th>
                                                    <th className="px-6 py-4 text-left text-gray-700 dark:text-gray-200">Remarks</th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                                                {order.payments.map((payment) => (
                                                    <tr key={payment.payment_id} className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-gray-100">
                                                                #{payment.payment_id}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-200">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                                {formatDate(payment.payment_date)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-200">
                                                                {getPaymentMethodIcon(payment.payment_method)}
                                                                <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">
                                                            {formatCurrency(payment.amount_paid)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-orange-600 dark:text-orange-400">
                                                            {formatCurrency(payment.balance_after_payment)}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                            {payment.remarks}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>

                                            <tfoot className="bg-slate-50 dark:bg-gray-700 border-t-2 border-slate-300 dark:border-gray-600">
                                                <tr>
                                                    <td colSpan="3" className="px-6 py-4 text-gray-700 dark:text-gray-200">Total Payments Made</td>
                                                    <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">
                                                        {formatCurrency(order.total_paid_on_order)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-orange-600 dark:text-orange-400">
                                                        {formatCurrency(order.balance_on_order)}
                                                    </td>
                                                    <td className="px-6 py-4"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-slate-200 dark:border-gray-700">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-gray-700 mb-4">
                                        <AlertCircle className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-gray-700 dark:text-gray-200 mb-2">No Payments Made</h3>
                                    <p className="text-gray-500 dark:text-gray-400">This order has no payment records yet.</p>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Empty State */}
                    {/* No Results Found After Searching */}
                    {/* No Results Found After Searching */}
                    {/* Empty / No Results State */}
                    {!loading && orders.length === 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-14 text-center border border-gray-200 dark:border-gray-700">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl 
            bg-gradient-to-br from-indigo-100 to-blue-200 
            dark:from-gray-700 dark:to-gray-600 shadow-md mb-6">
                                <AlertCircle className="w-12 h-12 text-indigo-600 dark:text-gray-200" />
                            </div>

                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                {selectedSupplierId || fromDate || toDate ? "No Results Found" : "Select Supplier & Date"}
                            </h2>

                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {selectedSupplierId || fromDate || toDate
                                    ? "Your selected date range or supplier did not match any records."
                                    : "Please select a supplier and date range above to see results."}
                            </p>

                            <p className="text-gray-500 dark:text-gray-400">
                                {selectedSupplierId || fromDate || toDate
                                    ? "Try adjusting the filters above or choose another supplier."
                                    : "Click 'Get Payments' after selecting filters."}
                            </p>
                        </div>
                    )}



                </div>
            </div>

        </>
    );
}
