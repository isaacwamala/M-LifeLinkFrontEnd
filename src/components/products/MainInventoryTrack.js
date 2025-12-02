
import { Package, Search, TrendingUp, Layers, DollarSign } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";


const MainInventoryTrack = () => {
    const [searchTerm, setSearchTerm] = useState('');
    // const [inventoryData] = useState(dummyInventoryData);
    const token = localStorage.getItem('access_token');
    const [expandedRow, setExpandedRow] = useState(null);

    const [loading, setLoading] = useState(true);
    const [inventoryData, setInventory] = useState({
        data: {
            data: [],          // product array
            from: 0,
            to: 0,
            total: 0,
            current_page: 1,
            next_page_url: null,
            prev_page_url: null,
        },
        total_products: 0
    });





    //Return all stock adjustments, it returns all, for current year and current month
    const fetchInventoryData = async () => {
        try {
            setLoading(true);

            const response = await axios.get(`${API_BASE_URL}items/getProductsInventory`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                }
            });

            // response.data.data should have the full structure
            setInventory({
                data: response.data.data,         // paginated data
                total_products: response.data.total_products
            });

            console.log('inventory', response.data.data);

        } catch (error) {
            console.error("Error fetching inventory data", error);
            toast.error(error.response?.data.message);
        } finally {
            setLoading(false);
        }
    };


    // Set fetched data on component mount
    useEffect(() => {
        fetchInventoryData();
    }, [token])

    // Calculate insights
    const insights = useMemo(() => {
        const products = inventoryData?.data?.data || [];
        const totalStock = products.reduce((sum, p) => sum + p.total_quantity, 0);
        const totalBatches = products.reduce((sum, p) => sum + p.total_batches, 0);
    
        const outOfStockCount = products.filter(p => p.total_quantity === 0).length;

        return {
            totalProducts: inventoryData?.total_products || 0,
            totalStock,
            totalBatches,
            outOfStockCount
        };
    }, [inventoryData]);


    // Filter products by search term
    const filteredProducts = useMemo(() => {
        const products = inventoryData?.data?.data || [];
        return products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventoryData, searchTerm]);

    const handlePageChange = async (url) => {
        if (!url) return; // no URL, do nothing
        try {
            setLoading(true);
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                }
            });
            setInventory({
                data: response.data.data,
                total_products: response.data.total_products
            });
        } catch (error) {
            console.error("Error fetching inventory page", error);
            toast.error(error.response?.data.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <div className="min-h-screen dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-8 transition-colors">
                <div className="w-full">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                                Inventory Management
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm md:text-base">
                                Track and manage your pharmaceutical inventory
                            </p>
                        </div>

                    </div>

                    {/* Insights Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-3">
                        {/* Total Products */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <Package className="w-6 sm:w-8 h-6 sm:h-8 opacity-80" />
                                <div className="bg-white/20 rounded-full p-2">
                                    <TrendingUp className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold mb-1">{insights.totalProducts}</div>
                            <div className="text-xs sm:text-sm opacity-90">Total Products</div>
                        </div>

                        {/* Total Stock */}
                        <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-xl p-4 sm:p-6 text-white shadow-md hover:shadow-lg transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <Layers className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                                <div className="bg-white/20 rounded-full p-2">
                                    <TrendingUp className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold mb-1">{insights.totalStock}</div>
                            <div className="text-xs sm:text-sm opacity-90">Total Stock Units</div>
                        </div>

                        {/* Total Batches */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white shadow-md hover:shadow-lg transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <Package className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                                <div className="bg-white/20 rounded-full p-2">
                                    <Layers className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold mb-1">{insights.totalBatches}</div>
                            <div className="text-xs sm:text-sm opacity-90">Total Batches</div>
                        </div>

                   
                        {/* Out of Stock */}
                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 sm:p-6 text-white shadow-md hover:shadow-lg transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <Package className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                                <div className="bg-white/20 rounded-full p-2">
                                    <TrendingUp className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold mb-1">{insights.outOfStockCount}</div>
                            <div className="text-xs sm:text-sm opacity-90">Out of Stock</div>
                        </div>
                    </div>


                    <div className="pt-3">
                        {/* Search and Table */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden pt-6">
                            {/* Search */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/20 pt-3">
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <input
                                        type="text"
                                        placeholder="Search products by name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px] border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-900/20 border-b border-gray-300 dark:border-gray-700">
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Product Name</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Variants</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Base UOM</th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Stock Qty</th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Batches</th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Price Range</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {loading ? (
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <td className="px-6 py-4"><Skeleton width={150} height={20} /></td>
                                                    <td className="px-6 py-4"><Skeleton width={100} height={20} /></td>
                                                    <td className="px-6 py-4"><Skeleton width={80} height={20} /></td>
                                                    <td className="px-6 py-4 text-right"><Skeleton width={50} height={20} /></td>
                                                    <td className="px-6 py-4 text-right"><Skeleton width={50} height={20} /></td>
                                                    <td className="px-6 py-4 text-right"><Skeleton width={100} height={20} /></td>
                                                </tr>
                                            ))
                                        ) : filteredProducts.length > 0 ? (
                                            filteredProducts.map(product => (
                                                <React.Fragment key={product.id}>
                                                    {/* Main Product Row */}
                                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                        {/* Product Name */}
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-medical-100 dark:bg-gray-700 flex items-center justify-center text-white font-bold">
                                                                    {product.name ? product.name.charAt(0).toUpperCase() : ''}
                                                                </div>
                                                                <span className="font-semibold text-gray-900 dark:text-white">{product.name}</span>
                                                            </div>
                                                        </td>

                                                        {/* Variants */}
                                                        <td className="px-6 py-4 flex flex-wrap gap-1">
                                                            {product.variant_options.map(opt => (
                                                                <span
                                                                    key={opt.id}
                                                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                                >
                                                                    {opt.option_name}: {opt.option_value}
                                                                </span>
                                                            ))}
                                                        </td>

                                                        {/* Base UOM */}
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-700 text-white dark:bg-gray-700 dark:text-gray-200">
                                                                {product.uom.name}
                                                            </span>
                                                        </td>

                                                        {/* Stock Quantity */}
                                                        <td className="px-6 py-4 text-right">
                                                            <span
                                                                className={`text-sm font-semibold ${product.total_quantity === 0
                                                                    ? 'text-red-600 dark:text-red-400'
                                                                    : product.total_quantity < 20
                                                                        ? 'text-amber-600 dark:text-amber-400'
                                                                        : 'text-gray-900 dark:text-white'
                                                                    }`}
                                                            >
                                                                {product.total_quantity}
                                                            </span>
                                                        </td>

                                                        {/* Batches Button */}
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => setExpandedRow(expandedRow === product.id ? null : product.id)}
                                                                className="text-sm font-semibold text-blue-600 dark:text-blue-400 underline"
                                                            >
                                                                {product.total_batches} Batch{product.total_batches !== 1 ? 'es' : ''} ▼
                                                            </button>
                                                        </td>

                                                        {/* Price Range */}
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                            
                                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {product.min_price && product.max_price
                                                                        ? `${product.min_price} - ${product.max_price}`
                                                                        : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    
                                                    {/* Expanded Batch Details */}
                                                    {expandedRow === product.id && (
                                                        <tr className="bg-gray-50 dark:bg-gray-900">
                                                            <td colSpan={6} className="px-6 py-4">
                                                                <div className="space-y-3">
                                                                    {product.batches.length > 0 ? (
                                                                        product.batches.map(batch => (
                                                                            <div
                                                                                key={batch.batch_id}
                                                                                className="p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                                                                            >
                                                                                <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-800 dark:text-gray-200">

                                                                                    {/* Batch Number */}
                                                                                    <div>
                                                                                        <span className="font-semibold">Batch: </span> {batch.batch_number}
                                                                                    </div>

                                                                                    {/* Expiry Date */}
                                                                                    <div>
                                                                                        <span className="font-semibold">Expiry: </span>
                                                                                        <span className={`${new Date(batch.expiry_date) < new Date() ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
                                                                                            {batch.expiry_date}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Quantity */}
                                                                                    <div>
                                                                                        <span className="font-semibold">Qty:</span> {batch.quantity_in_base_uom}
                                                                                    </div>

                                                                                    {/* Price */}
                                                                                    <div>
                                                                                        <span className="font-semibold">Unit Price:</span> UGX {parseFloat(batch.discounted_selling_price).toFixed(2)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400">No batches available</p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}



                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center">
                                                    <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3 opacity-50" />
                                                    <p className="text-gray-600 dark:text-gray-400">No products found</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>


                            {/* Pagination */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/20 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    Showing {inventoryData.data.from} to {inventoryData.data.to} of {inventoryData.data.total} products
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={!inventoryData.data.prev_page_url}
                                        onClick={() => handlePageChange(inventoryData.data.prev_page_url)}
                                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>

                                    <button
                                        disabled={!inventoryData.data.next_page_url}
                                        onClick={() => handlePageChange(inventoryData.data.next_page_url)}
                                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>

                                </div>
                            </div>

                        </div>
                    </div>


                </div>
            </div>

        </>
    );
};

export default MainInventoryTrack;
