import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";



const StockAdjustments = () => {
    const [adjustments, setAdjustments] = useState([]);
    const [filteredAdjustments, setFilteredAdjustments] = useState([]);
    const [productWithBatches, setProductWithBatches] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const token = localStorage.getItem('access_token');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
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

    // Initialize for data
    const [formData, setFormData] = useState({
        product_id: "",
        batch_id: "",
        adjustment_type: "",
        quantity_base: "",
        reason_for_adjustment: "",
        date_of_adjustment: new Date().toISOString().split('T')[0],
    });



    //Return all stock adjustments, it returns all, for current year and current month
    const fetchStockAdjustments = async (page = 1) => {
        try {
            setLoading(true);

            const response = await axios.get(`${API_BASE_URL}items/getStockAdjustments`, {
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

    //Fetch products with their batches
    const fetchProductWithTheirBatches = async () => {
        try {
            setLoading(true);

            const response = await axios.get(`${API_BASE_URL}items/getProductsWithTheirBatches`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },

            });

            const data = response.data.products;
            setProductWithBatches(data);

        } catch (error) {
            console.error("Error fetching product with batches", error);
            toast.error("Failed to fetch products with batches");
        } finally {
            setLoading(false);
        }
    };

    // Set fetched data on component mount
    useEffect(() => {
        fetchStockAdjustments(1); // always reset to page 1 when dates change
        fetchProductWithTheirBatches();
    }, [dateFrom, dateTo]);

    // Handle resetting to default
    const handleResetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchStockAdjustments(1); // reload default data from backend
    };

    // Handle product change and batch
    const handleProductChange = (productId) => {
        const product = productWithBatches.find(p => p.id == productId);

        setSelectedProduct(product);

        setFormData({
            ...formData,
            product_id: productId,
            batch_id: ""    // reset because new product == new batches
        });
    };

    // Handle the submit of anew adjustment
    const handleSubmit = async (e) => {
        e.preventDefault();

        // --------------------------------------------
        // VALIDATION (All fields required)
        // --------------------------------------------
        if (!formData.product_id) {
            toast.error("Please select a product.");
            return;
        }
        if (!formData.batch_id) {
            toast.error("Please select a batch.");
            return;
        }
        if (!formData.adjustment_type) {
            toast.error("Please choose adjustment type.");
            return;
        }
        if (!formData.quantity_base || formData.quantity_base <= 0) {
            toast.error("Quantity must be greater than zero.");
            return;
        }
        if (!formData.reason_for_adjustment.trim()) {
            toast.error("Please enter a reason for adjustment.");
            return;
        }
        if (!formData.date_of_adjustment) {
            toast.error("Please select the date of adjustment.");
            return;
        }

        // Show loader
        setSubmitting(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}items/createStockAdjustment`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    }
                }
            );

            toast.success("Stock adjustment added successfully!");

            // Refresh
            fetchStockAdjustments(1);

            setIsModalOpen(false);

            // Reset
            setFormData({
                product_id: "",
                batch_id: "",
                adjustment_type: "increase",
                quantity_base: 1,
                reason_for_adjustment: "",
                date_of_adjustment: new Date().toISOString().split("T")[0],
            });

            setSelectedProduct(null);

        } catch (error) {
            console.error(error);
            toast.error("Failed to submit stock adjustment");
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="w-full">
                    {/* Header */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4 flex-wrap">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                Stock Adjustments
                            </h1>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                            The adjustments displayed below reflect <b>the current month of the current year</b>.
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

                                {/* Add Adjustment Button */}
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex w-full sm:w-auto justify-center items-center gap-2 px-5 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors font-medium shadow-md"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Adjustment
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
                                            <th key={th} className="px-4 sm:px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                {th}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredAdjustments.map((adj) => (
                                        <tr
                                            key={adj.id}
                                            className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                                {new Date(adj.date_of_adjustment).toLocaleDateString()}
                                            </td>

                                            <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                {/* Product Name + UOM */}
                                                <div>
                                                    {adj.product.name}{" "}
                                                </div>

                                                {/* Show product Variant Option Values (e.g., 100g/Black) */}
                                                {Array.isArray(adj.product.variant_options) && adj.product.variant_options.length > 0 && (
                                                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                        {adj.product.variant_options
                                                            .map((opt) => opt.option_value)
                                                            .join(" / ")
                                                        }
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{adj.batch.batch_number}</span>
                                                    <span className="text-xs font-bold  dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                                        Exp: {adj.batch.expiry_date}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-3">
                                                {adj.adjustment_type === "increase" ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                                        <TrendingUp className="w-3 h-3" /> Increase
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                                        <TrendingDown className="w-3 h-3" /> Decrease
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 sm:px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                                {adj.adjustment_type === "increase" ? "+" : "-"}
                                                {adj.quantity_base}
                                            </td>
                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white">
                                                <span className="text-gray-500 dark:text-gray-300">{adj.quantity_track.before}</span>
                                                <span className="mx-2">→</span>
                                                <span className="font-semibold">{adj.quantity_track.after}</span>
                                            </td>

                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-500 dark:text-gray-300 max-w-[150px] truncate">
                                                {adj.reason_for_adjustment}
                                            </td>

                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white">{adj.user.name}</td>
                                        </tr>
                                    ))}
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
                                        onClick={() => fetchStockAdjustments(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchStockAdjustments(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>

                                    <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchStockAdjustments(Math.min(totalPages, currentPage + 1))}
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

                {/* MODAL TO ADD NEW ADJUSTMENT */}
                {/* Modal to add stock adjustments */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-800/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Stock Adjustment</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-900 dark:text-white" />
                                </button>
                            </div>



                            {/* Modal Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <span className="block mt-2  text-gray-900 font-bold dark:text-white text-sm sm:text-base">
                                    Since each product belongs to aspecific batch/Lot, Lot selection will base on selected product
                                </span>
                                {/* Product Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Product *
                                    </label>
                                    <select
                                        value={formData.product_id || ''}
                                        onChange={(e) => handleProductChange(Number(e.target.value))}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Select a product</option>
                                        {/* Show product option values on selection */}
                                        {productWithBatches.map((product) => {
                                            // Combine variant options into a single text string
                                            const variantText = product.variant_options
                                                ? product.variant_options.map(v => `${v.option_value}`).join(" / ")
                                                : "";

                                            return (
                                                <option key={product.id} value={product.id}>
                                                    {product.name}
                                                    {variantText ? ` – ${variantText}` : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Batch Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Select Batch *
                                    </label>
                                    <select
                                        value={formData.batch_id || ''}
                                        onChange={(e) => setFormData({ ...formData, batch_id: Number(e.target.value) })}
                                        required
                                        disabled={!selectedProduct}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select a batch</option>
                                        {selectedProduct?.batch.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.batch_number} (Exp: {b.expiry_date})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Adjustment Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Adjustment Type *
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="increase"
                                                checked={formData.adjustment_type === 'increase'}
                                                onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value })}
                                                className="w-4 h-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                                            />
                                            <span className="text-gray-900 dark:text-white">Increase</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="decrease"
                                                checked={formData.adjustment_type === 'decrease'}
                                                onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value })}
                                                className="w-4 h-4 text-red-600 dark:text-red-400 focus:ring-red-500"
                                            />
                                            <span className="text-gray-900 dark:text-white">Decrease</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.quantity_base}
                                        onChange={(e) => setFormData({ ...formData, quantity_base: Number(e.target.value) })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Date of Adjustment *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date_of_adjustment}
                                        onChange={(e) => setFormData({ ...formData, date_of_adjustment: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Reason for Adjustment *
                                    </label>
                                    <textarea
                                        value={formData.reason_for_adjustment}
                                        onChange={(e) => setFormData({ ...formData, reason_for_adjustment: e.target.value })}
                                        required
                                        rows={3}
                                        placeholder="Enter reason for adjustment..."
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                    />
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={`px-6 py-2.5 rounded-lg text-white transition-colors shadow-md hover:shadow-lg flex items-center gap-2
                                ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                                `}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                                                Submitting...
                                            </>
                                        ) : (
                                            "Create Adjustment"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}


            </div>



        </>
    );
};

export default StockAdjustments;
