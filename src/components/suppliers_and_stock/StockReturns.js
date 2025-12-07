import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, AlertCircle, Package } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { fetchUoms } from '../products/products_helper';
import { useNavigate } from 'react-router-dom';


const StockReturns = () => {
    const [returns, setReturns] = useState([]);
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [filteredReturns, setFilteredReturns] = useState([]);
    const [productWithBatches, setProductWithBatches] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [uoms, setUoms] = useState([]);
    const [modalMessage, setModalMessage] = useState({ product: '', uom: '' });
    const [submitting, setSubmitting] = useState(false);
    const token = localStorage.getItem('access_token');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const now = new Date();

    //State to confirm warning ,to create areturn
    const [confirmedWarning, setConfirmedWarning] = useState(false);

    //New state that observes aproduct  missing aconversion set
    const [conversionMissing, setConversionMissing] = useState(false);
    const [conversions, setConversions] = useState([]);

    const [expandedRow, setExpandedRow] = useState(null);

    const toggleExpand = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };


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
        selected_uom_id: "",
        return_reason: "",
        return_date: new Date().toISOString().split('T')[0],
    });
    //Fetch products with their conversions
    const fetchProductsWithTheirUomConversions = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}items/getProductBaseUomAndItsUomConversions`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (response.data.status === "success") {
                toast.success(response.data.message);
                const data = response.data.products;
                setConversions(data);
                console.log("conversions:", data);
            }
        } catch (error) {
            console.error("Error returning products with their conversions:", error);
        } finally {
            setLoading(false);
        }
    };



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

    //fetch uoms
    const loadUoms = async () => {
        const data = await fetchUoms(token);
        setUoms(data);
    };

    // Set fetched data on component mount
    useEffect(() => {
        fetchStockReturns(1); // always reset to page 1 when dates change
        fetchProductWithTheirBatches();
        loadUoms();
        fetchProductsWithTheirUomConversions();
    }, [dateFrom, dateTo]);

    // Handle resetting to default
    const handleResetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchStockReturns(1); // reload default data from backend
    };


    //Check if conversion exists for the selected product and entered unit of measure
    useEffect(() => {
        const { product_id, selected_uom_id } = formData;

        // Check if any productitem is missing a conversion
        if (!product_id || !selected_uom_id) {
            setConversionMissing(false);
            return;
        }
        //Find in conversions where product id matches like the one in formdata.product id
        const product = conversions.find(
            p => p.id.toString() === product_id.toString()
        );

        //If its missing, return false
        if (!product) {
            setConversionMissing(true);
            return;
        }

        //Check if the uom conversion exists for the selected unit of measure
        const hasConversion = product.uom_conversions.some(
            u => u.uom_id.toString() === selected_uom_id.toString()
        );

        setConversionMissing(!hasConversion);
    }, [formData, conversions]);

    //Handle the product and unit of measure selected change
    //To rule out if it really has aconversion or not
    //If its not having the conversion, simply return null and display 
    // amodal for the user to set it first

    //We ensure that we simplify stock adjustment, if the product has unit conversions, adjustmant becomes
    //simpler, ie we can adjust in sacks but as we convert in base units  if ie the product base uom is KG
    const handleProductOrUOMChange = (field, value) => {
        const updated = { ...formData, [field]: value };
        setFormData(updated);

        // If changing product, update selectedProduct + reset batch
        if (field === "product_id") {
            const prod = productWithBatches.find(p => p.id.toString() === value.toString());
            setSelectedProduct(prod || null);

            // Reset batch when product changes
            setFormData(prev => ({
                ...prev,
                product_id: value,
                batch_id: ""
            }));
        }

        // Existing UOM + conversion logic below...
        const { product_id, selected_uom_id } = updated;
        if (!product_id || !selected_uom_id) return;

        const selectedProductConv = conversions.find(
            p => p.id.toString() === product_id.toString()
        );
        if (!selectedProductConv) return;

        const hasConversion = selectedProductConv.uom_conversions.some(
            u => u.uom_id.toString() === selected_uom_id.toString()
        );

        if (!hasConversion) {
            const p = productWithBatches.find(pr => pr.id.toString() === product_id.toString());
            const u = uoms.find(um => um.id.toString() === selected_uom_id.toString());

            setModalMessage({
                product: p?.name || "",
                uom: u?.name || ""
            });

            setShowModal(true);
            setConversionMissing(true);
        } else {
            setConversionMissing(false);
        }
    };

    //Function to display the conversion of selected unit of measure.
    //ie if uom strip contains 5 tablets, for aspecific product
    //and its se;ected we show 1 strip contains 5 tablets
    const renderUnitConversion = (item) => {
        if (!item.product_id || !item.selected_uom_id) return null;

        // Find product with conversions
        const productConv = conversions.find(
            p => p.id.toString() === item.product_id.toString()
        );
        if (!productConv) return null;

        // Find UOM conversion entry for selected UOM
        const uomConv = productConv.uom_conversions.find(
            u => u.uom_id.toString() === item.selected_uom_id.toString()
        );
        if (!uomConv) return null;

        // Base UOM name
        const baseUOM = productConv.base_uom?.name || "";

        // Selected UOM name
        const uomName =
            uoms.find(u => u.id.toString() === item.selected_uom_id.toString())?.name ||
            "";

        const multiplier = uomConv.multiplier ?? 1;

        return (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    <p className="text-blue-900 dark:text-white">
                        <span className="font-semibold">Unit Conversion:</span>{' '}
                        1 {uomName} = {multiplier} {baseUOM}{multiplier > 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        );
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
        if (!formData.selected_uom_id) {
            toast.error("Please select unit of measure, this helps to know how to adjust the stock for better stock inventory");
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
                returned_quantity: "",
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
                                        {[
                                            "Date of return",
                                            "Product",
                                            "Batch",
                                            "Quantity returned",
                                            "Supplier",
                                            "Reason",
                                            "User",
                                            "Actions"
                                        ].map((th) => (
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
                                    {filteredReturns.map((adj) => (
                                        <React.Fragment key={adj.id}>
                                            {/* MAIN ROW */}
                                            <tr className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                                    {new Date(adj.return_date).toLocaleDateString()}
                                                </td>

                                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                    <div>{adj.product.name}</div>
                                                    {Array.isArray(adj.product.variant_options) &&
                                                        adj.product.variant_options.length > 0 && (
                                                            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                                {adj.product.variant_options
                                                                    .map((opt) => opt.option_value)
                                                                    .join(" / ")}
                                                            </div>
                                                        )}
                                                </td>

                                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{adj.batch.batch_number}</span>
                                                        <span className="text-xs font-bold dark:bg-red-900/20 text-red-600 dark:text-red-400">
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

                                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-white">
                                                    {adj.user.name}
                                                </td>

                                                <td className="px-4 sm:px-6 py-3">
                                                    <button
                                                        onClick={() => toggleExpand(adj.id)}
                                                        className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded"
                                                    >
                                                        {expandedRow === adj.id ? "Hide" : "Details"}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* EXPANDED DETAILS ROW */}
                                            {expandedRow === adj.id && (
                                                <tr className="bg-gray-50 dark:bg-gray-900">
                                                    <td colSpan="8" className="px-6 py-4">
                                                        <div className="space-y-4 text-sm text-gray-900 dark:text-gray-200">
                                                            {/* UOM Conversion */}
                                                            {adj.uom_conversion_used && (
                                                                <div>
                                                                    <h4 className="font-bold mb-1">UOM Conversion Used</h4>
                                                                    <p>
                                                                        Selected/Entered Unit Of Measure:{" "}
                                                                        <strong>{adj.uom_conversion_used.selected_uom.name || 'N/A'}</strong>
                                                                    </p>
                                                                    <p>
                                                                        Entered Qty Of Unit Of Measure:{" "}
                                                                        <strong>{adj.uom_conversion_used.entered_uom_quantity || 'N/A'}</strong>
                                                                    </p>
                                                                    <p>
                                                                        Entered Unit Of Measure Multiplier:{" "}
                                                                        <strong>{adj.uom_conversion_used.selected_uom.multiplier || 'N/A'}</strong>
                                                                    </p>
                                                                    <p className="font-bold mb-1 mt-2">
                                                                        Final Quantity In Base Units:{" "}
                                                                        <strong>{adj.uom_conversion_used.quantity_in_base_uom || 'N/A'}</strong>
                                                                    </p>
                                                                    <p>
                                                                        Product's Base UOM Name:{" "}
                                                                        <strong>{adj.uom_conversion_used.product_base_uom_name || 'N/A'}</strong>
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
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
                                        onChange={(e) =>
                                            handleProductOrUOMChange("product_id", e.target.value)
                                        }
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

                                {/* Show conversion information if available, for the selected product item's unit of measure */}
                                {renderUnitConversion(formData)}

                                {/* Unit of measure */}
                                <div>
                                    <label className="block text-gray-900 dark:text-gray-200 font-bold mb-2">
                                        Unit of Measure To Adjust<span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={formData.selected_uom_id}
                                        onChange={(e) => handleProductOrUOMChange("selected_uom_id", e.target.value)}
                                        required
                                    >
                                        <option value="">Select UOM</option>
                                        {uoms.map((uom) => (
                                            <option key={uom.id} value={uom.id}>
                                                {uom.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>


                                {/* Batch Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        Select Batch to make a return from*
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
                                        Quantity to be returned in UOM selected above*
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
                                        disabled={submitting || !confirmedWarning || conversionMissing || showModal}
                                        className={`px-6 py-2.5 rounded-lg text-white transition-colors shadow-md hover:shadow-lg flex items-center gap-2
            ${(submitting || !confirmedWarning || conversionMissing || showModal)
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

                {/* Modal to display UOM non existence */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                            <div className="bg-red-50 dark:bg-red-900 px-6 py-4 border-b border-red-200 dark:border-red-700 rounded-t-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                        <h2 className="text-red-900 dark:text-white">Unit Conversion Not Found</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>


                            <div className="p-6">
                                <p className="text-gray-700 dark:text-gray-200 mb-4">
                                    The selected UOM <span className="font-semibold text-gray-900 dark:text-white">{modalMessage.uom}</span> was not set
                                    for product <span className="font-semibold text-gray-900 dark:text-white">{modalMessage.product}</span> in the
                                    Product Unit Converter.
                                </p>

                                <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                                    <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                                        <strong>Action Required:</strong> Please set up the unit conversion for this product
                                        and UOM combination in the Product Unit Converter before proceeding.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            navigate('/convert_different_uoms_in_terms_of_product_base_unit');
                                        }}
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Go to Unit Converter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>


        </>
    );
};

export default StockReturns;
