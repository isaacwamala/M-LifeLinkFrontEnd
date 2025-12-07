import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";



const StockReturns = () => {
    const [returns, setReturns] = useState([]);
    const [filteredReturns, setFilteredReturns] = useState([]);
    const [productWithBatches, setProductWithBatches] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const token = localStorage.getItem('access_token');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const now = new Date();

    //State to confirm warning ,to create areturn
    const [confirmedWarning, setConfirmedWarning] = useState(false);


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
        returned_quantity: "",
        return_reason: "",
        return_date: new Date().toISOString().split('T')[0],
    });



    //Return stock returns for current year and current month
    const fetchStockReturns = async (page = 1) => {
        try {
            setLoading(true);

            const response = await axios.get(`${API_BASE_URL}items/getStockReturns`, {
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

            setReturns(data.data);
            setFilteredReturns(data.data); // optional: still keep filtered copy if needed
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);

        } catch (error) {
            console.error("Error fetching stock returns", error);
            toast.error("Failed to fetch returns");
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
        fetchStockReturns(1); // always reset to page 1 when dates change
        fetchProductWithTheirBatches();
    }, [dateFrom, dateTo]);

    // Handle resetting to default
    const handleResetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchStockReturns(1); // reload default data from backend
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
        if (!formData.return_reason) {
            toast.error("Please choose reason.");
            return;
        }
        if (!formData.returned_quantity) {
            toast.error("Returned quantity must be greater than zero.");
            return;
        }

        if (!formData.return_date) {
            toast.error("Please select the return date.");
            return;
        }

        // Show loader
        setSubmitting(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}items/createStockReturn`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    }
                }
            );

            toast.success(response.data.message);

            // Refresh
            fetchStockReturns(1);

            setIsModalOpen(false);

            // Reset
            setFormData({
                product_id: "",
                batch_id: "",
                return_reason: "",
                returned_quantity: 1,
                return_date: new Date().toISOString().split("T")[0],
            });

            setSelectedProduct(null);

        } catch (error) {
            console.error(error);
            toast.error("Failed to submit stock return");
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
                                Stock Returns To Suppliers
                            </h1>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                            The stock returns displayed below reflect <b>the current month of the current year</b>.
                            You may adjust the filters to search for returns based on the
                            <b> return date</b>.
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
                                    Add stock return
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
                                        {["Date of return", "Product", "Batch", "Quantity returned", "Supplier", "Reason", "User"].map((th) => (
                                            <th key={th} className="px-4 sm:px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                {th}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredReturns.map((adj) => (
                                        <tr
                                            key={adj.id}
                                            className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                                {new Date(adj.return_date).toLocaleDateString()}
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

                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-500 dark:text-gray-300 max-w-[150px] truncate">
                                                {adj.returned_quantity}
                                            </td>

                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-500 dark:text-gray-300 max-w-[150px] truncate">
                                                {adj.supplier?.name}
                                            </td>

                                            <td className="px-4 sm:px-6 py-3 text-sm text-gray-500 dark:text-gray-300 max-w-[150px] truncate">
                                                {adj.return_reason}
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
                                    Showing {filteredReturns.length} of {returns.length} returns
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => fetchStockReturns(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchStockReturns(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>

                                    <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchStockReturns(Math.min(totalPages, currentPage + 1))}
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
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Register Stock Return</h2>
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



                                {/* Quantity */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Quantity to be returned*
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.returned_quantity}
                                        onChange={(e) => setFormData({ ...formData, returned_quantity: Number(e.target.value) })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Date of return *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.return_date}
                                        onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Reason for return *
                                    </label>

                                    <select
                                        value={formData.return_reason}
                                        onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg 
                                        focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="" disabled>Select return reason</option>

                                        <option value="Expired Stock">Expired Stock</option>
                                        <option value="Near Expiry">Near Expiry</option>
                                        <option value="Wrong Item Supplied">Wrong Item Supplied</option>
                                        <option value="Wrong Batch Supplied">Wrong Batch Supplied</option>
                                        <option value="Quality Issues / Defective Product">Quality Issues / Defective Product</option>
                                        <option value="Packaging Damage">Packaging Damage</option>
                                        <option value="Supplier Recall">Supplier Recall</option>
                                        <option value="Overstock (Excess Supply)">Overstock (Excess Supply)</option>
                                        <option value="Price Discrepancy / Wrong Invoice">Price Discrepancy / Wrong Invoice</option>
                                    </select>
                                </div>

                                {/* Warning Section */}
                                <div className="w-full px-4 py-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 
    text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 
    text-sm font-semibold flex flex-col gap-3">

                                    <span>
                                        ⚠️ Once a stock return is created, it cannot be edited.
                                        Please review all details before submitting.
                                    </span>

                                    {/* Confirm Button */}
                                    <button
                                        type="button"
                                        onClick={() => setConfirmedWarning(true)}
                                        disabled={confirmedWarning}
                                        className={`self-start px-4 py-2 rounded-md text-sm font-medium border
            ${confirmedWarning
                                                ? 'bg-green-600 text-white cursor-not-allowed border-green-700'
                                                : 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 border-yellow-400 dark:border-yellow-600 hover:bg-yellow-300 dark:hover:bg-yellow-700'
                                            }`}
                                    >
                                        {confirmedWarning ? "Acknowledged ✔" : "I Understand"}
                                    </button>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 
            text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
            transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting || !confirmedWarning}
                                        className={`px-6 py-2.5 rounded-lg text-white transition-colors shadow-md hover:shadow-lg flex items-center gap-2
            ${(submitting || !confirmedWarning)
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                                                Submitting...
                                            </>
                                        ) : (
                                            "Create Return"
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

export default StockReturns;
