import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";


export default function SupplierPurchaseOrderPayments() {
    const [payments, setPayments] = useState([]);
    const [Supplierpayments, setSupplierPayments] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [orders, setOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const token = localStorage.getItem('access_token');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [perPage, setPerPage] = useState(30);

    const [total, setTotal] = useState(0);

    const now = new Date(); // initialize now first
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]; // YYYY-MM-DD

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    const [dateFrom, setDateFrom] = useState(startOfMonth);
    const [dateTo, setDateTo] = useState(endOfMonth);

    const [formData, setFormData] = useState({
        order_id: '',
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        remarks: ''
    });



    // Fetch supplier order payments
    const fetchSupplierOrderPayments = async (page = 1) => {
        try {
            setLoading(true);

            const response = await axios.get(`${API_BASE_URL}purchase/getSupplierOrderPayments`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                params: {
                    from_date: dateFrom,
                    to_date: dateTo,
                    page: page
                }
            });

            const paginated = response.data.data; // paginator object

            setPayments(paginated.data);          // actual list
            setCurrentPage(paginated.current_page);
            setTotalPages(paginated.last_page);
            setTotal(paginated.total);
            setPerPage(paginated.per_page);

        } catch (error) {
            console.error("Error fetching supplier order payments:", error);
        } finally {
            setLoading(false);
        }
    };

    //FETCH purchase orders to be used when creating asupplier payment
    //Return purchase orders to be used when creating the supplier payment
    const fetchSupplierOrdersBasic = async () => {
        try {
            setLoading(true);

            const response = await axios.get(`${API_BASE_URL}purchase/getBasicPurchaseOrders`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },

            });

            //Return purchase orders to be used when creating the supplier payment
            const data = response.data.orders;
            setOrders(data);
            console.log('orders', data);

        } catch (error) {
            console.error("Error fetching supplier orders ", error);
            toast.error("Failed to fetch products with batches");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchSupplierOrderPayments(1);
    }, [token, dateFrom, dateTo]);

    useEffect(() => {
        fetchSupplierOrdersBasic();
    }, [token]);


    // Handle resetting to default
    const handleResetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchSupplierOrderPayments(1);
    };

    //filter supplier payments by order number, and ensure dates match payment dates of those payments
    const filteredSupplierPayments = useMemo(() => {
        return payments.filter(payment => {
            const matchesSearch =
                payment.order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())


            const matchesDateFrom = !dateFrom || new Date(payment.payment_date) >= new Date(dateFrom);
            const matchesDateTo = !dateTo || new Date(payment.payment_date) <= new Date(dateTo);

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [payments, searchTerm, dateFrom, dateTo]);


    // Handle submit of the supplier payment on the order
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: all fields except remarks are required
        if (!formData.order_id) {
            toast.error("Please select an order");
            return;
        }
        if (!formData.amount_paid || Number(formData.amount_paid) <= 0) {
            toast.error("Please enter a valid amount paid");
            return;
        }
        if (!formData.payment_date) {
            toast.error("Please select a payment date");
            return;
        }
        if (!formData.payment_method) {
            toast.error("Please select a payment method");
            return;
        }

        setIsSubmitting(true);

        const payload = {
            order_id: Number(formData.order_id),
            amount_paid: Number(formData.amount_paid),
            payment_date: formData.payment_date,
            payment_method: formData.payment_method,
            remarks: formData.remarks
        };

        try {
            const response = await axios.post(
                `${API_BASE_URL}purchase/createSupplierPayment`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setIsModalOpen(false);
            setFormData({
                order_id: "",
                amount_paid: "",
                payment_date: new Date().toISOString().split("T")[0],
                payment_method: "cash",
                remarks: ""
            });
            fetchSupplierOrderPayments(); // refresh payments list
            toast.success(response.data.message || "Failed to create payment");

        } catch (error) {
            console.error("Error creating supplier payment:", error);
            toast.error(error.response?.data.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    //Handle input change and ensure amount_paid is converted to int
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Convert to float if it's the amount_paid field
        const parsedValue = name === "amount_paid" ? parseInt(value) : value;


        setFormData((prev) => ({
            ...prev,
            [name]: parsedValue
        }));
    };

    return <>
        <ToastContainer />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="w-full">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-gray-900 dark:text-white mb-2">Supplier Payments</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage and track supplier payment transactions for the current month ,this year</p>
                </div>

                {/* Search and Filters */}
                {/* Search and Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap">

                        {/* Search */}
                        <div className="flex-1 min-w-[150px] md:min-w-[250px] md:max-w-md">
                            <label className="block text-gray-900 dark:text-white mb-2 text-sm md:text-base">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by order, supplier, method..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* From Date */}
                        <div className="flex-1 min-w-[150px] md:min-w-[250px] md:max-w-[350px]">
                            <label className="block text-gray-900 dark:text-white mb-2 text-sm md:text-base">From Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* To Date */}
                        <div className="flex-1 min-w-[150px] md:min-w-[250px] md:max-w-[350px]">
                            <label className="block text-gray-900 dark:text-white mb-2 text-sm md:text-base">To Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Reset Button */}
                        <button
                            onClick={handleResetFilters}
                            className="h-10 flex justify-center items-center gap-2 px-4 md:px-5 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-400 transition-colors font-medium shadow-md"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Add Payment Button */}
                    <div className="mt-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Add Supplier Payment
                        </button>
                    </div>
                </div>


                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-200 dark:bg-gray-700">
                                <tr>
                                    {["Order Number", "Supplier", "Total order Amount", "Amount Paid", "Balance", "Payment Date", "Payment Method", "Status", "User", "Remarks"].map((header) => (
                                        <th key={header} className="px-4 py-3 text-left text-gray-900 dark:text-white">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    // ============================
                                    // Skeleton Loader (10 rows)
                                    // ============================
                                    [...Array(10)].map((_, i) => (
                                        <tr key={i}>
                                            {[...Array(10)].map((__, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <SkeletonTheme baseColor="#374151" highlightColor="#4B5563" enableAnimation={true}>
                                                        <Skeleton height={20} />
                                                    </SkeletonTheme>
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredSupplierPayments.length > 0 ? (
                                    // ============================
                                    // Actual Data
                                    // ============================
                                    filteredSupplierPayments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">


                                            <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                {payment.order.order_number}
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="text-gray-900 dark:text-white">{payment.supplier.name}</div>

                                                <div className="text-gray-600 dark:text-gray-400">{payment.supplier.contact}</div>
                                            </td>

                                            <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                UGX {parseFloat(payment.order.order_total_amount).toLocaleString()}
                                            </td>

                                            <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                UGX {parseFloat(payment.amount_paid).toLocaleString()}
                                            </td>

                                            <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                UGX {parseFloat(payment.balance_after_payment).toLocaleString()}
                                            </td>

                                            <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                {payment.payment_date}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="text-gray-900 dark:text-white capitalize">
                                                    {payment.payment_method.replace('_', ' ')}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs ${payment.payment_status === 'paid'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                        : payment.payment_status === 'partial'
                                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                        }`}
                                                >
                                                    {payment.payment_status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                {payment.user.name}
                                            </td>

                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {payment.remarks}
                                            </td>

                                        </tr>
                                    ))
                                ) : (
                                    // ============================
                                    // No data
                                    // ============================
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
                                            No payments found
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                        </table>
                    </div>

                    {payments.length > 0 && (
                        <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 
                    flex items-center justify-between 
                    border-t border-gray-300 dark:border-gray-600">

                            {/* Showing X to Y of Z */}
                            <div className="text-gray-900 dark:text-white">
                                Showing {(currentPage - 1) * perPage + 1} to{" "}
                                {Math.min(currentPage * perPage, total)} of {total} results
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center gap-2">

                                <button
                                    onClick={() => fetchSupplierOrderPayments(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded bg-gray-200 dark:bg-gray-600 
                           text-gray-900 dark:text-white 
                           disabled:opacity-50 disabled:cursor-not-allowed 
                           hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <span className="text-gray-900 dark:text-white">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => fetchSupplierOrderPayments(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded bg-gray-200 dark:bg-gray-600 
                           text-gray-900 dark:text-white 
                           disabled:opacity-50 disabled:cursor-not-allowed 
                           hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>

                            </div>
                        </div>
                    )}


                </div>


                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">

                                {/* Modal Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-gray-900 dark:text-white text-lg font-semibold">
                                        Add Supplier Payment
                                    </h2>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Selected Order Details */}
                                {formData.order_id && (
                                    (() => {
                                        const selectedOrder = orders.find(o => o.id === Number(formData.order_id));
                                        if (!selectedOrder) return null;
                                        return (
                                            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                                                <p className="text-gray-900 dark:text-white"><strong>Order Number:</strong> {selectedOrder.order_number}</p>
                                                <p className="text-gray-900 dark:text-white"><strong>Order Date:</strong> {selectedOrder.order_date}</p>
                                                <p className="text-gray-900 dark:text-white"><strong>Supplier:</strong> {selectedOrder.supplier.name}</p>
                                                <p className="text-gray-900 dark:text-white"><strong>Total Amount:</strong> UGX {parseFloat(selectedOrder.order_total_amount).toLocaleString()}</p>
                                                <p className="text-gray-900 dark:text-white"><strong>Payment Status:</strong> {selectedOrder.supplier_order_payment_status}</p>
                                            </div>
                                        );
                                    })()
                                )}

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">

                                    {/* Order */}
                                    <div>
                                        <label className="block text-gray-800 dark:text-gray-200 mb-2">
                                            Order *
                                        </label>
                                        <select
                                            name="order_id"
                                            value={formData.order_id}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="">Select an order</option>
                                            {orders.map(order => (
                                                <option key={order.id} value={order.id}>
                                                    {order.order_number} - UGX {parseFloat(order.order_total_amount).toLocaleString()} ({order.supplier_order_payment_status})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Amount Paid */}
                                    <div>
                                        <label className="block text-gray-800 dark:text-gray-200 mb-2">
                                            Amount Paid *
                                        </label>
                                        <input
                                            type="number"
                                            name="amount_paid"
                                            value={formData.amount_paid}
                                            onChange={handleInputChange}
                                            required
                                            step="0.01"
                                            min="0"
                                            placeholder="Enter amount"
                                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Payment Date */}
                                    <div>
                                        <label className="block text-gray-800 dark:text-gray-200 mb-2">
                                            Payment Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="payment_date"
                                            value={formData.payment_date}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Payment Method */}
                                    <div>
                                        <label className="block text-gray-800 dark:text-gray-200 mb-2">
                                            Payment Method *
                                        </label>
                                        <select
                                            name="payment_method"
                                            value={formData.payment_method}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="mobile_money">Mobile Money</option>
                                        </select>
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                        <label className="block text-gray-800 dark:text-gray-200 mb-2">
                                            Remarks
                                        </label>
                                        <textarea
                                            name="remarks"
                                            value={formData.remarks}
                                            onChange={handleInputChange}
                                            rows={3}
                                            placeholder="Enter payment remarks"
                                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                        />
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Submitting..." : "Create Payment"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>

    </>;
}
