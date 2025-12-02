import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";


// This returns and shows Stock adjustement Logs FROM 'stock_adjustment_logs' Table
const StockAdjustmentsLogs = () => {
    const [adjustments, setAdjustments] = useState([]);
    const [filteredAdjustments, setFilteredAdjustments] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(true);
    const now = new Date();

    // Ensure we show data for this month of the current year, as back end returns them by default
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]; // YYYY-MM-DD
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    const [dateFrom, setDateFrom] = useState(startOfMonth);
    const [dateTo, setDateTo] = useState(endOfMonth);


    //Return all stock adjustments, it returns all, for current year and current month
    const fetchStockAdjustmentLogs = async (page = 1) => {
        try {
            setLoading(true);

            const response = await axios.get(`${API_BASE_URL}items/getStockAdjustmentsLogs`, {
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

            const data = response.data.data;

            setAdjustments(data.data);
            setFilteredAdjustments(data.data); // optional: still keep filtered copy if needed
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);

        } catch (error) {
            console.error("Error fetching stock adjustments", error);
            toast.error("Failed to fetch adjustments");
        } finally {
            setLoading(false);
        }
    };


    // Set fetched data on component mount
    useEffect(() => {
        fetchStockAdjustmentLogs(1); // always reset to page 1 when dates change
    }, [dateFrom, dateTo]);

    // Handle resetting to default
    const handleResetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchStockAdjustmentLogs(1); // reload default data from backend
    };



    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-8 transition-colors duration-300">
                <div className="w-full">
                    {/* Header */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4 flex-wrap">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                Stock Adjustments Logging
                            </h1>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                            The adjustment logs displayed below reflect <b>the current month of the current year</b>.
                            You may adjust the filters to search for adjustments based on the
                            <b> date of adjustment</b>.
                        </p>
                    </div>

                    {/* Filters & Actions */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                            {/* Date From */}
                            <div className="w-full sm:w-1/3">
                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    Date From
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Date To */}
                            <div className="w-full sm:w-1/3">
                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    Date To
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="w-full sm:w-auto flex gap-2">
                                <button
                                    onClick={handleResetFilters}
                                    className="flex w-full sm:w-auto justify-center items-center gap-2 px-5 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-400 transition-colors font-medium shadow-md"
                                >
                                    Reset
                                </button>

                            </div>


                        </div>
                    </div>


                    {/* Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                        {loading ? (
                            <div className="p-6">
                                <Skeleton count={8} height={30} className="mb-3" />
                            </div>
                        ) : (
                            <table className="w-full min-w-[700px]">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        {["Date of Adjustment", "Product", "Batch", "Type", "Quantity", "Before → After", "Reason", "User"].map((th) => (
                                            <th
                                                key={th}
                                                className="px-4 sm:px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"
                                            >
                                                {th}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredAdjustments.map((adj) => {
                                        const type = adj.quantity_changed > 0 ? "increase" : "decrease";
                                        return (
                                            <tr
                                                key={adj.id}
                                                className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                            >
                                                {/* Date */}
                                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                                    {new Date(adj.date_of_adjustment).toLocaleDateString()}
                                                </td>

                                                {/* Product */}
                                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                    <div>{adj.product.name}</div>
                                                    {Array.isArray(adj.product.variant_options) && adj.product.variant_options.length > 0 && (
                                                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                            {adj.product.variant_options.map((opt) => opt.option_value).join(" / ")}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Batch */}
                                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{adj.batch.batch_number}</span>
                                                        <span className="text-xs font-bold dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                                            Exp: {adj.batch.expiry_date}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Type */}
                                                <td className="px-4 sm:px-6 py-3">
                                                    {type === "increase" ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                                            <TrendingUp className="w-3 h-3" /> Increase
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                                            <TrendingDown className="w-3 h-3" /> Decrease
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Quantity */}
                                                <td className="px-4 sm:px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                                    {adj.quantity_changed > 0 ? "+" : "-"}{Math.abs(adj.quantity_changed)}
                                                </td>

                                                {/* Before → After */}
                                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white">
                                                    <span className="text-gray-500 dark:text-gray-300">{adj.quantity_before}</span>
                                                    <span className="mx-2">→</span>
                                                    <span className="font-semibold">{adj.quantity_after}</span>
                                                </td>

                                                {/* Reason */}
                                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-500 dark:text-gray-300 max-w-[150px] truncate">
                                                    {adj.note}
                                                </td>

                                                {/* User */}
                                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white">
                                                    {adj.user.name}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                        )}

                        {/* Pagination */}
                        {!loading && (
                            <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                                <div className="text-sm text-gray-500 dark:text-gray-300">
                                    Showing {filteredAdjustments.length} of {adjustments.length} adjustments
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => fetchStockAdjustmentLogs(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchStockAdjustmentLogs(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>

                                    <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchStockAdjustmentLogs(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>



            </div>



        </>
    );
};

export default StockAdjustmentsLogs;
