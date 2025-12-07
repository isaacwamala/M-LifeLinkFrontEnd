import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Search, Calendar, X, Edit, Plus, Trash2, AlertCircle, ChevronLeft, ShoppingCart, ChevronRight } from 'lucide-react';
import { fetchProductsItems } from '../products/products_helper';
import { fetchUoms } from '../products/products_helper';
import { fetchSuppliers } from '../products/products_helper';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { useNavigate } from 'react-router-dom';

export default function MedicalStock() {
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [modalMessage, setModalMessage] = useState({ product: '', uom: '' });
    const [conversions, setConversions] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState(null);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [stockItems, setMedicalStockItems] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    //New state that pbserves aproduct  missing aconversion set
    const [conversionMissing, setConversionMissing] = useState(false);

    //Set current page due to paginations from back end
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

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


    //Fetch all purchase orders for the current month, current year from back end
    const fetchAllMedicalStockItems = async (page = 1) => {
        try {
            const response = await axios.get(`${API_BASE_URL}items/getAllProductBatches`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                params: {
                    from_date: dateFrom,
                    to_date: dateTo,
                    page: page
                },
            });
            const data = response.data.batches;

            // toast.success(response.data.message);
            setMedicalStockItems(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);
            console.log("medicalStockItems:", response.data.orders);

        } catch (error) {
            console.error("Error fetching  stock:", error);
        } finally {
            setLoading(false);
        }
    };

    //Fetch products base uom and their conversions
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


    //fetch uoms
    const loadUoms = async () => {
        const data = await fetchUoms(token);
        setUoms(data);
    };
    //fetch suppliers
    const loadSuppliers = async () => {
        const data = await fetchSuppliers(token);
        setSuppliers(data);
    };
    //fetch products
    const loadProducts = async () => {
        const data = await fetchProductsItems(token);
        setProducts(data);
    };

    useEffect(() => {
        loadProducts();
        loadUoms();
        loadSuppliers();
        fetchProductsWithTheirUomConversions();
    }, [token]);

    useEffect(() => {
        fetchAllMedicalStockItems(1);
    }, [token, dateFrom, dateTo]);

    // Handle resetting to default
    const handleResetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchAllMedicalStockItems(1);// reload default data from backend
    };

    //const filteredOrders
    const filteredStockItems = useMemo(() => {
        return stockItems.filter(stock => {
            const matchesSearch =
                stock.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                stock.product.name.toLowerCase().includes(searchTerm.toLowerCase())


            const matchesDateFrom = !dateFrom || new Date(stock.created_at) >= new Date(dateFrom);
            const matchesDateTo = !dateTo || new Date(stock.created_at) <= new Date(dateTo);

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [stockItems, searchTerm, dateFrom, dateTo]);


    const handleViewBatch = (stock) => {
        setSelectedBatch(stock);
        setIsViewModalOpen(true);
    };

    // Function to handle the opening of the modal with prefilled data
    const handleUpdateBatch = (stock) => {
        setSelectedBatch(stock);
        //Prefill data on opening the modal, we match id's to 
        // to api that returns batches each with its respective data passing stock
        // which is part of the state object
        setEditFormData({
            id: stock.id,
            product_id: stock.product_id,
            entered_uom_id: stock.entered_uom_id,
            quantity_for_uom_entered: stock.quantity_for_uom_entered,
            supplier_price: stock.supplier_price,
            discounted_selling_price: stock.discounted_selling_price,
            batch_number: stock.batch_number,
            purchased_date: stock.purchased_date,
            expiry_date: stock.expiry_date,
            supplier_id: stock.supplier.id,
        });
        setIsUpdateModalOpen(true);
    };

    const selectedUOM = editFormData
        ? uoms.find(uom => uom.id.toString() === editFormData.entered_uom_id)
        : null;

    const selectedProduct = editFormData
        ? products.find(p => p.id.toString() === editFormData.product_id)
        : null;

    const productWithConversion = editFormData
        ? conversions.find(conv => Number(conv?.id) === Number(editFormData.product_id))
        : null;

    const unitConversion = editFormData && productWithConversion
        ? productWithConversion?.uom_conversions?.find(
            c => Number(c?.uom_id) === Number(editFormData.entered_uom_id)
        )
        : null;


    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    //Handle product unit of measure change
    const handleProductUOMChange = (e) => {
        const { name, value } = e.target;

        const updated = {
            ...editFormData,
            [name]: value,
        };

        setEditFormData(updated);

        // --- Check conversion immediately ---
        const product = conversions.find(
            p => p.id === Number(updated.product_id) // make sure type matches
        );

        const hasConversion = product?.uom_conversions?.some(
            conv => conv.uom_id === Number(updated.entered_uom_id) // convert value to number
        );

        if (!hasConversion) {
            // Get the product name
            const productName =
                products.find(p => p.id === Number(updated.product_id))?.name || "";

            // Get the UOM name
            const uomName =
                uoms.find(u => u.id === Number(updated.entered_uom_id))?.name || "";

            // Set modal message with BOTH product and UOM names
            setModalMessage({ product: productName, uom: uomName });

            setShowModal(true);
            setConversionMissing(true);
        } else {
            setConversionMissing(false);
        }
    };


    // Update the Purchase Order 
    const handleSubmitUpdate = async () => {
        if (conversionMissing) {
            toast.error("Conversion missing — cannot update order.");
            return;
        }

        setIsSubmitting(true);

        try {
            //Prepare payload to send to backend
            const payload = {
                id: editFormData.id,
                product_id: editFormData.product_id,
                supplier_id: editFormData.supplier_id,
                entered_uom_id: editFormData.entered_uom_id,
                supplier_price: editFormData.supplier_price,
                quantity_for_uom_entered: editFormData.quantity_for_uom_entered,
                discounted_selling_price: editFormData.discounted_selling_price,
                batch_number: editFormData.batch_number,
                purchased_date: editFormData.purchased_date,
                expiry_date: editFormData.expiry_date,
                manufacturer: editFormData.manufacturer,
            };

            console.log("Submitting payload:", payload);

            const response = await axios.post(
                `${API_BASE_URL}items/updateProductBatch`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                        "Content-Type": "application/json"
                    },
                    maxBodyLength: Infinity
                }
            );

            toast.success(response.data.message);
            setIsUpdateModalOpen(false);

            fetchAllMedicalStockItems()//refresh list

        } catch (error) {
            console.error("Update error:", error);
            toast.error(error.response?.data.message);
        } finally {
            setIsSubmitting(false);
        }
    };



    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden pt-10">

                {/* Other jsx to be put here */}
                <div className="w-full">
                    <div className="flex flex-col mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">

                        {/* Header Row */}
                        <div className="flex flex-col gap-2 mb-4">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="w-8 h-8 text-blue-600" />
                                <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                                    Medical Stock
                                </h1>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                                Stock displayed is for the current month ({new Date().toLocaleString('default', { month: 'long' })}) of {new Date().getFullYear()}. Adjust the filters above to view stock purchased from suppliers in other periods.
                            </p>
                        </div>

                    </div>


                    {/* Filters Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">

                            {/* Search */}
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by product or supplier..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 
                    bg-white dark:bg-gray-900 
                    text-gray-900 dark:text-white 
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                            </div>

                            {/* Date From */}
                            <div className="relative w-full">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 
                    bg-white dark:bg-gray-900 
                    text-gray-900 dark:text-white 
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                            </div>

                            {/* Date To */}
                            <div className="relative w-full">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 
                    bg-white dark:bg-gray-900 
                    text-gray-900 dark:text-white 
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                            </div>

                            {/* Reset Button */}
                            <button
                                onClick={handleResetFilters}
                                className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-400 transition-colors font-medium shadow-md"
                            >
                                Reset
                            </button>

                        </div>
                    </div>


                    {/* Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-[800px] w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-red-700 font-bold dark:text-red-700">Batch Number</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Item</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Supplier</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Purchase Date</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">UOM entered</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Entered UOM QTY</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Actual QTY(BaseUnits)</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Expiry date</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Manufacturer</th>
                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">
                                            Adjusted?
                                        </th>

                                        <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">

                                    {/* Show skeletons while loading */}
                                    {loading && (
                                        <>
                                            {[1, 2, 3, 4, 5,].map((i) => (
                                                <tr key={i}>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                    <td className="px-6 py-4"><Skeleton /></td>
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                    {/* Show real data when loaded */}
                                    {!loading && filteredStockItems.length > 0 && filteredStockItems.map((stock) => (
                                        <tr key={stock.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 text-red-700 font-bold dark:text-white">{stock.batch_number}</td>
                                            <td className="px-6 py-4 text-gray-700 font-bold dark:text-white">{stock.product?.name}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{stock.supplier?.name}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {new Date(stock.purchased_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-red-700 font-bold dark:text-white">{stock.uom?.name}</td>
                                            <td className="px-6 py-4 text-red-700 font-bold dark:text-white">{stock.quantity_for_uom_entered}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-block px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 dark:text-green-100 dark:bg-green-700 rounded-full">
                                                    {stock.quantity_in_base_uom}
                                                </span>
                                            </td>


                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {new Date(stock.expiry_date).toLocaleDateString()}
                                            </td>

                                            <td className="px-6 py-4 text-red-700 font-bold dark:text-white">{stock.manufacturer}</td>

                                            <td className="px-6 py-4">
                                                {Number(stock.is_stock_adjusted) === 1 ? (
                                                    <span className="inline-block px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 
                                                      dark:text-green-100 dark:bg-green-700 rounded-full">
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-3 py-1 text-sm font-bold text-red-800 bg-red-200 
                                                      dark:text-red-900 dark:bg-red-500 rounded-full">
                                                        No
                                                    </span>
                                                )}
                                            </td>


                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleViewBatch(stock)}
                                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateBatch(stock)}
                                                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 rounded-lg"
                                                    >
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Show "No records" message */}
                                    {!loading && filteredStockItems.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="text-center py-6 text-gray-600 dark:text-gray-300">
                                                No records found
                                            </td>
                                        </tr>
                                    )}

                                </tbody>

                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                            {/* Showing info */}
                            <div className="text-sm text-gray-500 dark:text-gray-300">
                                Showing {filteredStockItems.length} of {totalPages} results
                            </div>

                            {/* Pagination controls */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchAllMedicalStockItems(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => fetchAllMedicalStockItems(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>


                    </div>
                </div>
                {/* Modals */}

                {/* View Modal */}
                {isViewModalOpen && selectedBatch && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">

                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-gray-900 dark:text-white font-bold lg">
                                    Batch Details - {selectedBatch.batch_number}
                                </h2>
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-900 dark:text-white" />
                                </button>
                            </div>

                            <div className="p-6">


                                {/* General Info */}
                                <div className="mb-6">
                                    <h3 className="mb-4 text-gray-900 dark:text-white text-lg font-semibold">General Information</h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-1">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Batch Number</span>
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBatch.batch_number}</h4>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-1">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Supplier</span>
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBatch.supplier?.name}</h4>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-1">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchased Date</span>
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {new Date(selectedBatch.purchased_date).toLocaleDateString()}
                                            </h4>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-1">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Expiry Date</span>
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {new Date(selectedBatch.expiry_date).toLocaleDateString()}
                                            </h4>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-1">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Product</span>
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBatch.product.name}</h4>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-1">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantity in base units</span>
                                            <span className="inline-block px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 dark:text-green-100 dark:bg-green-700 rounded-full">
                                                {selectedBatch.quantity_in_base_uom}
                                            </span>
                                        </div>

                                        {selectedBatch.uom_conversion_used && (
                                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-1 col-span-2">
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Used</span>
                                                {(() => {
                                                    const conversion = JSON.parse(selectedBatch.uom_conversion_used);
                                                    return (
                                                        <span className="inline-block px-3 py-1 text-sm font-semibold text-purple-800 bg-purple-100 dark:text-purple-100 dark:bg-purple-700 rounded-full">
                                                            1 {conversion.uom_name} = {conversion.multiplier} unit{conversion.multiplier > 1 ? "s in product base UOM" : ""}
                                                        </span>
                                                    );
                                                })()}

                                            </div>

                                        )}

                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-1">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Product's Base UOM</span>
                                            <span className="inline-block px-3 py-1 text-sm font-semibold text-purple-800 bg-purple-100 dark:text-purple-100 dark:bg-purple-700 rounded-full">
                                                {selectedBatch.product_basic_uom_used}
                                            </span>
                                        </div>

                                        {/* Variant Options */}
                                        <div className="col-span-2">
                                            <p className="text-gray-600 dark:text-gray-300 mb-1 text-lg font-bold">
                                                Product Variants
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {selectedBatch.product.variant_options.map(opt => (
                                                    <span
                                                        key={opt.id}
                                                        className="inline-block px-3 py-1 text-sm font-semibold text-blue-800 bg-blue-100 dark:text-blue-100 dark:bg-blue-700 rounded-full"
                                                    >
                                                        {opt.option_name}: {opt.option_value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Is stock adjusted by decreasing or reducing stock */}
                                        <div className="flex flex-col gap-1">
                                            <p className="text-gray-600 dark:text-gray-300 mb-1 text-lg font-bold">
                                                Is Stock Adjusted?
                                            </p>

                                            {Number(selectedBatch.is_stock_adjusted) === 1 ? (
                                                <span className="inline-block px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 
                                                      dark:text-green-100 dark:bg-green-700 rounded-full">
                                                    Yes
                                                </span>
                                            ) : (
                                                <span className="inline-block px-3 py-1 text-sm font-bold text-red-800 bg-red-200 
                                                      dark:text-red-900 dark:bg-red-500 rounded-full">
                                                    No
                                                </span>
                                            )}
                                        </div>

                                        {/* Date Created */}
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 shadow flex flex-col gap-2">
                                            <p className="text-gray-600 dark:text-gray-300 mb-1 text-lg font-bold">
                                                Date created?
                                            </p>

                                            <span className="inline-block px-3 py-1 text-sm font-semibold
                                             text-gray-800 bg-gray-100
                                             dark:text-gray-200 dark:bg-gray-700
                                              rounded-full">
                                                {new Date(selectedBatch.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>


                                {/* Item Table */}
                                <div>
                                    <h3 className="mb-4 text-gray-900 dark:text-white">Batch Item Details</h3>

                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden overflow-x-auto">
                                        <table className="w-full min-w-[600px]">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Product</th>
                                                    <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Entered UOM</th>
                                                    <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Quantity (UOM)</th>
                                                    <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Price</th>
                                                    <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300">Base Quantity</th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">

                                                <tr>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                        {selectedBatch.product.name}
                                                    </td>

                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                        {selectedBatch.uom?.name}
                                                    </td>

                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                        {selectedBatch.quantity_for_uom_entered}
                                                    </td>

                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                        {parseFloat(selectedBatch.supplier_price).toFixed(2)}/=
                                                    </td>

                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                        {selectedBatch.quantity_in_base_uom}
                                                    </td>
                                                </tr>

                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* UPDATE MODAL */}
                {/* ================== UPDATE PRODUCT BATCH MODAL ================== */}
                {isUpdateModalOpen && selectedBatch && editFormData && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">

                            {/* Header */}
                            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Update Product Batch – {selectedBatch.batch_number}
                                </h2>

                                <button
                                    onClick={() => setIsUpdateModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-900 dark:text-white" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">

                                {/* Unit Conversion Display */}
                                {/* Unit Conversion Display */}
                                {unitConversion && !conversionMissing && (
                                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-300 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-blue-900 dark:text-white">
                                                    <span className="font-semibold">From Unit Converter:</span>{' '}
                                                    <span className="text-blue-800 dark:text-gray-300">
                                                        1 {unitConversion.name} = {unitConversion.multiplier} {productWithConversion.base_uom?.name}
                                                        {unitConversion.multiplier > 1 ? 's' : ''}
                                                    </span>
                                                </p>


                                                {editFormData.quantity_for_uom_entered && (
                                                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-gray-700">
                                                        <p className="text-blue-900 dark:text-white">
                                                            <span className="font-semibold">Total:</span>{' '}
                                                            <span className="text-blue-800 dark:text-gray-300">
                                                                {editFormData.quantity_for_uom_entered} {unitConversion.name}
                                                                {parseInt(editFormData.quantity_for_uom_entered) > 1 ? 's' : ''} ={' '}
                                                                <span className="text-lg font-semibold">
                                                                    {parseInt(editFormData.quantity_for_uom_entered) * unitConversion.multiplier}
                                                                </span>{' '}
                                                                {productWithConversion.base_uom?.name}
                                                                {(parseInt(editFormData.quantity_for_uom_entered) * unitConversion.multiplier) > 1 ? 's' : ''}
                                                            </span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}


                                {/* Product */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Product</label>
                                    <select
                                        value={editFormData.product_id}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, product_id: parseInt(e.target.value) })
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                        {products.map((product) => {
                                            const variantText = product.variant_options
                                                ? product.variant_options.map(v => v.option_value).join(" / ")
                                                : "";

                                            return (
                                                <option key={product.id} value={product.id}>
                                                    {product.name}{variantText ? ` – ${variantText}` : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Supplier */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Supplier</label>
                                    <select
                                        value={editFormData.supplier_id}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, supplier_id: parseInt(e.target.value) })
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                        {suppliers.map((sup) => (
                                            <option key={sup.id} value={sup.id}>
                                                {sup.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* UOM */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Unit of Measure</label>

                                    <select
                                        name="entered_uom_id"
                                        value={editFormData.entered_uom_id}
                                        onChange={handleProductUOMChange}   // ← THIS IS THE IMPORTANT PART
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                                           border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                        <option value="">Select UOM</option>
                                        {uoms.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>


                                {/* Quantity */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Quantity for UOM Entered</label>
                                    <input
                                        type="number"
                                        value={editFormData.quantity_for_uom_entered}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                quantity_for_uom_entered: parseFloat(e.target.value)
                                            })
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                </div>

                                {/* Supplier Price */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Supplier Price</label>
                                    <input
                                        type="number"
                                        value={editFormData.supplier_price}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                supplier_price: parseFloat(e.target.value)
                                            })
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                </div>

                                {/* Discounted Selling Price */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                        Selling Price
                                    </label>
                                    <input
                                        type="number"
                                        value={editFormData.discounted_selling_price}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                discounted_selling_price: parseFloat(e.target.value)
                                            })
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                </div>

                                {/* Batch Number */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Batch Number</label>
                                    <input
                                        type="text"
                                        value={editFormData.batch_number}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, batch_number: e.target.value })
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                </div>
                                {/* Manufacturer */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Manufacturer</label>
                                    <input
                                        type="text"
                                        value={editFormData.manufacturer}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, manufacturer: e.target.value })
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Purchased Date</label>
                                        <input
                                            type="date"
                                            value={editFormData.purchased_date}
                                            onChange={(e) =>
                                                setEditFormData({ ...editFormData, purchased_date: e.target.value })
                                            }
                                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={editFormData.expiry_date}
                                            onChange={(e) =>
                                                setEditFormData({ ...editFormData, expiry_date: e.target.value })
                                            }
                                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Status</label>
                                    <select
                                        value={editFormData.status}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, status: parseInt(e.target.value) })
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                        <option value={0}>Active</option>
                                        <option value={1}>Inactive</option>
                                    </select>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => setIsUpdateModalOpen(false)}
                                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={handleSubmitUpdate}
                                        disabled={conversionMissing || isSubmitting} // ← disable if conversion missing
                                        className={`px-6 py-2 rounded-lg text-white ${conversionMissing || isSubmitting
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700"
                                            }`}
                                    >
                                        Update Batch
                                    </button>
                                </div>

                            </div>
                        </div>

                    </div>
                )}

                {/* Modal */}
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
}
