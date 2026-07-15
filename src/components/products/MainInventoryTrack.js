
import { Package, Search, TrendingUp, Layers, ChevronDown } from 'lucide-react';
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
            <div className="min-h-screen dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black p-6 sm:p-8 transition-colors">
                <div className="w-full">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                                Inventory Management
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm md:text-base">
                                Track and manage your pharmaceutical inventory
                            </p>
                        </div>
                    </div>

                    {/* Insights Cards — 4 cards, 4-column max */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                        {/* Total Products */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-white/20 rounded-xl p-2.5">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                                <TrendingUp className="w-4 h-4 opacity-60" />
                            </div>
                            <div className="text-3xl font-extrabold mb-1 tracking-tight">{insights.totalProducts}</div>
                            <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Products</div>
                        </div>

                        {/* Total Stock */}
                        <div className="bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-white/20 rounded-xl p-2.5">
                                    <Layers className="w-5 h-5 text-white" />
                                </div>
                                <TrendingUp className="w-4 h-4 opacity-60" />
                            </div>
                            <div className="text-3xl font-extrabold mb-1 tracking-tight">{insights.totalStock}</div>
                            <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Stock Units</div>
                        </div>

                        {/* Total Batches */}
                        <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-white/20 rounded-xl p-2.5">
                                    <Layers className="w-5 h-5 text-white" />
                                </div>
                                <Package className="w-4 h-4 opacity-60" />
                            </div>
                            <div className="text-3xl font-extrabold mb-1 tracking-tight">{insights.totalBatches}</div>
                            <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Batches</div>
                        </div>

                        {/* Out of Stock */}
                        <div className="bg-gradient-to-br from-rose-500 to-red-700 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-white/20 rounded-xl p-2.5">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                                <TrendingUp className="w-4 h-4 opacity-60" />
                            </div>
                            <div className="text-3xl font-extrabold mb-1 tracking-tight">{insights.outOfStockCount}</div>
                            <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Out of Stock</div>
                        </div>
                    </div>

                    {/* Search and Table */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">

                        {/* Search Bar */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search products by name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px]">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Name</th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variants</th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Base UOM</th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock Qty</th>
                                        <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batches</th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price Range</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4"><Skeleton width={150} height={18} /></td>
                                                <td className="px-6 py-4"><Skeleton width={110} height={18} /></td>
                                                <td className="px-6 py-4"><Skeleton width={70} height={18} /></td>
                                                <td className="px-6 py-4 text-right"><Skeleton width={50} height={18} /></td>
                                                <td className="px-6 py-4 text-center"><Skeleton width={80} height={18} /></td>
                                                <td className="px-6 py-4 text-right"><Skeleton width={100} height={18} /></td>
                                            </tr>
                                        ))
                                    ) : filteredProducts.length > 0 ? (
                                        filteredProducts.map(product => (
                                            <React.Fragment key={product.id}>
                                                {/* Main Product Row */}
                                                <tr
                                                    className={`transition-colors ${expandedRow === product.id
                                                            ? 'bg-blue-50/60 dark:bg-blue-900/10 border-l-4 border-l-blue-500'
                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 border-l-4 border-l-transparent'
                                                        }`}
                                                >
                                                    {/* Product Name */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                                                                {product.name ? product.name.charAt(0).toUpperCase() : '?'}
                                                            </div>
                                                            <span className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</span>
                                                        </div>
                                                    </td>

                                                    {/* Variants */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {product.variant_options.map(opt => (
                                                                <span
                                                                    key={opt.id}
                                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                                                                >
                                                                    {opt.option_name}: {opt.option_value}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    {/* Base UOM */}
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-200 tracking-wide">
                                                            {product.uom.name}
                                                        </span>
                                                    </td>

                                                    {/* Stock Quantity */}
                                                    <td className="px-6 py-4 text-right">
                                                        <span
                                                            className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${product.total_quantity === 0
                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                    : product.total_quantity < 20
                                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                }`}
                                                        >
                                                            {product.total_quantity}
                                                        </span>
                                                    </td>

                                                    {/* Batches Toggle Button */}
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => setExpandedRow(expandedRow === product.id ? null : product.id)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${expandedRow === product.id
                                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                                    : 'bg-white dark:bg-gray-700 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                                                }`}
                                                        >
                                                            <span>{product.total_batches} Batch{product.total_batches !== 1 ? 'es' : ''}</span>
                                                            <ChevronDown
                                                                className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedRow === product.id ? 'rotate-180' : ''}`}
                                                            />
                                                        </button>
                                                    </td>

                                                    {/* Price Range */}
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                                                            {product.min_price && product.max_price
                                                                ? `${product.min_price} – ${product.max_price}`
                                                                : <span className="text-gray-400 dark:text-gray-500 font-normal">N/A</span>}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {/* Expanded Batch Details */}
                                                {expandedRow === product.id && (
                                                    <tr>
                                                        <td colSpan={6} className="p-0">
                                                            <div className="bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-800/50 border-t border-b border-blue-100 dark:border-blue-800/40 px-8 py-5">
                                                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                                                                    Batch Details — {product.name}
                                                                </p>
                                                                {product.batches.length > 0 ? (
                                                                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                                                        <table className="w-full text-sm">
                                                                            <thead>
                                                                                <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch #</th>
                                                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry Date</th>
                                                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                                                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit Price</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800/70">
                                                                                {product.batches.map(batch => (
                                                                                    <tr key={batch.batch_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                                                                        <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800 dark:text-gray-200">
                                                                                            {batch.batch_number ?? batch.internal_batch_number}
                                                                                        </td>
                                                                                        <td className="px-4 py-3">
                                                                                            <span className={`text-xs font-medium ${new Date(batch.expiry_date) < new Date() ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                                                {batch.expiry_date}
                                                                                                {new Date(batch.expiry_date) < new Date() && (
                                                                                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                                                                                                        Expired
                                                                                                    </span>
                                                                                                )}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900 dark:text-white tabular-nums">
                                                                                            {batch.quantity_in_base_uom}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right text-xs text-gray-700 dark:text-gray-300 tabular-nums">
                                                                                            UGX {parseFloat(batch.discounted_selling_price).toFixed(2)}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No batches available for this product.</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center">
                                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                                                    <Package className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                                                </div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No products found</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search term</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{inventoryData.data.from}</span>–<span className="font-semibold text-gray-700 dark:text-gray-300">{inventoryData.data.to}</span> of <span className="font-semibold text-gray-700 dark:text-gray-300">{inventoryData.data.total}</span> products
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={!inventoryData.data.prev_page_url}
                                    onClick={() => handlePageChange(inventoryData.data.prev_page_url)}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ← Previous
                                </button>
                                <button
                                    disabled={!inventoryData.data.next_page_url}
                                    onClick={() => handlePageChange(inventoryData.data.next_page_url)}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default MainInventoryTrack;
