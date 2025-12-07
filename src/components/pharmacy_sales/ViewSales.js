import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, HandCoins, Package, User, Phone, MapPin, CreditCard, DollarSign, Hash, ChevronRight, ChevronLeft } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";


export function ViewSales() {
    const [sales, setSales] = useState([]);
    //const [filteredSales, setFilteredSales] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(false);


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


    //Fetch sales frombackend
    const fetchAllPharmacySales = async (page = 1) => {
        setLoading(true);

        try {
            const response = await axios.get(`${API_BASE_URL}sales/getPharmacySales`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                params: {
                    from_date: dateFrom,
                    to_date: dateTo,
                    page: page,
                },
            });

            const data = response.data.sales;

            setSales(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);

            console.log("sales:", data);

        } catch (error) {
            console.error("Error fetching pharmacy sales:", error);
        } finally {
            setLoading(false);
        }
    };

    //Mount the component
    useEffect(() => {
        fetchAllPharmacySales(1);
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => {
        fetchAllPharmacySales(1);
    };

    //Reset filtersto default that is current month
    // and also the single page fetch from back end
    const resetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        fetchAllPharmacySales(1);
    };

    //Determine filtered sales based on search term and date range
    //Ensure that if the date filters or searches ,we filter from the full sales list
    //from the back end data
    const filteredSales = useMemo(() => {
        // If no search term, no date filters → return full list
        if (!searchTerm.trim() && !dateFrom && !dateTo) {
            return sales;
        }

        const term = searchTerm.toLowerCase();

        return sales.filter((sale) => {
            // -------------------------------------------
            // SEARCH TERM FILTER
            // -------------------------------------------
            const matchesSearch =
                (!searchTerm.trim()) ||
                sale.sale_number?.toLowerCase().includes(term) ||
                sale.user?.toLowerCase().includes(term) ||
                sale.branch?.toLowerCase().includes(term) ||
                sale.customer_details?.name?.toLowerCase().includes(term) ||
                sale.payment_method?.toLowerCase().includes(term) ||
                sale.products?.some(
                    (product) => product.name?.toLowerCase().includes(term)
                );

            // -------------------------------------------
            // DATE RANGE FILTERS
            // -------------------------------------------
            const saleDate = new Date(sale.payment_date);

            const matchesDateFrom =
                !dateFrom || saleDate >= new Date(dateFrom);

            const matchesDateTo =
                !dateTo || saleDate <= new Date(dateTo);

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [sales, searchTerm, dateFrom, dateTo]);



    const toggleRow = (saleNumber) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(saleNumber)) {
            newExpanded.delete(saleNumber);
        } else {
            newExpanded.add(saleNumber);
        }
        setExpandedRows(newExpanded);
    };

    //Format to UGX
    const formatCurrency = (amount) => {
        const value = typeof amount === "string" ? parseFloat(amount) : amount;

        return new Intl.NumberFormat("en-UG", {
            style: "currency",
            currency: "UGX",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-5">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">

                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                                Pharmacy Sales Management
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Sales displayed is for the current month ({new Date().toLocaleString('default', { month: 'long' })}) of {new Date().getFullYear()}. Adjust the filters above to view sales made other periods.
                        </p>
                    </div>
                </div>
                {/* Header Row */}



                {/* Filters Section */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search sales, customer, products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Date Filters */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            <button
                                onClick={applyDateFilter}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 justify-center"
                            >
                                <Filter className="w-4 h-4" />
                                Apply
                            </button>

                            <button
                                onClick={resetFilters}
                                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2 justify-center"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reset
                            </button>
                        </div>
                    </div>

                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 font-bold border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {[
                                    "Sale No",
                                    "Pay Date",
                                    "User",
                                    "Branch",
                                    "Customer",
                                    "Total Paid",
                                    "Payment Method",
                                    "Actions",
                                ].map((head) => (
                                    <th
                                        key={head}
                                        className="px-6 py-3 text-left text-xs text-gray-500 font-bold dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">

                            {/* Loading */}
                            {loading ? (
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
                            ) : filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No sales found matching your criteria
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => (
                                    <React.Fragment key={sale.sale_number}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-blue-600 font-bold dark:text-blue-400">{sale.sale_number}</span>
                                            </td>
                                            <td className="px-6 py-4 font-bold  text-gray-900 dark:text-gray-200">
                                                {formatDate(sale.payment_date)}
                                            </td>
                                            <td className="px-6 py-4 font-bold  text-gray-900 dark:text-gray-200">{sale.user}</td>
                                            <td className="px-6 py-4 font-bold  text-gray-900 dark:text-gray-200">{sale.branch}</td>
                                            <td className="px-6 py-4 font-bold  text-gray-900 dark:text-gray-200">
                                                {sale.customer_details.name || 'Walk-in Customer'}
                                            </td>
                                            <td className="px-6 py-4 font-bold  text-gray-900 dark:text-gray-200">
                                                {formatCurrency(sale.total_amount)}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium">
                                                    {sale.payment_method
                                                        .split("_")
                                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                        .join(" ")}
                                                </span>
                                            </td>



                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleRow(sale.sale_number)}
                                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    {expandedRows.has(sale.sale_number) ? (
                                                        <ChevronUp className="w-5 h-5" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded Row */}
                                        {expandedRows.has(sale.sale_number) && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                                        {/* Customer */}
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                Customer Details
                                                            </h4>

                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex items-start gap-2">
                                                                    <User className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                                                                    <span className="text-gray-500 dark:text-gray-400">
                                                                        Name:
                                                                        <span className="ml-2 text-gray-900 dark:text-gray-200">
                                                                            {sale.customer_details.name || 'Walk-in Customer'}
                                                                        </span>
                                                                    </span>
                                                                    <span className="text-gray-500 dark:text-gray-400">
                                                                        Phone:
                                                                        <span className="ml-2 text-gray-900 dark:text-gray-200">
                                                                            {sale.customer_details.phone || 'N/A'}
                                                                        </span>
                                                                    </span>
                                                                </div>

                                                                {sale.customer_details.phone && (
                                                                    <div className="flex items-start gap-2">
                                                                        <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                                                                        <span className="text-gray-500 dark:text-gray-400">
                                                                            Phone:
                                                                            <span className="ml-2 text-gray-900 dark:text-gray-200">
                                                                                {sale.customer_details.phone}
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {sale.customer_details.address && (
                                                                    <div className="flex items-start gap-2">
                                                                        <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                                                                        <span className="text-gray-500 dark:text-gray-400">
                                                                            Address:
                                                                            <span className="ml-2 text-gray-900 dark:text-gray-200">
                                                                                {sale.customer_details.address}
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Payment */}
                                                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                Payment Details
                                                            </h4>

                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
                                                                    <span className="text-gray-900 dark:text-gray-200">
                                                                        {formatCurrency(sale.total_amount)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500 dark:text-gray-400">Balance:</span>
                                                                    <span
                                                                        className={
                                                                            parseFloat(sale.balance) > 0
                                                                                ? "text-red-600 dark:text-red-400"
                                                                                : "text-green-600 dark:text-green-400"
                                                                        }
                                                                    >
                                                                        {formatCurrency(sale.balance)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500 dark:text-gray-400">Payment Method:</span>
                                                                    <span className="text-gray-900 dark:text-gray-200 capitalize">
                                                                        {sale.payment_method}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Products */}
                                                        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                Products Sold({sale.products.length})
                                                            </h4>

                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-sm font-bold">
                                                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                                                        <tr>
                                                                            {["Product", "Batch No.", "Expiry", "QTY(uom entered)", "QTY(Base Units)", "Unit Price(BaseUnit)", "Subtotal"].map(
                                                                                (item) => (
                                                                                    <th
                                                                                        key={item}
                                                                                        className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold"
                                                                                    >
                                                                                        {item}
                                                                                    </th>
                                                                                )
                                                                            )}
                                                                        </tr>
                                                                    </thead>


                                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                                        {sale.products.map((product, idx) => (
                                                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                                                <td className="px-3 py-3">
                                                                                    <div>
                                                                                        <div className="text-gray-900 dark:text-gray-200">
                                                                                            {product.name}
                                                                                        </div>

                                                                                        {product.variant_options.length > 0 && (
                                                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                                                {product.variant_options
                                                                                                    .map((opt) => opt.option_value)
                                                                                                    .join(", ")}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>

                                                                                <td className="px-3 py-3  font-bold text-gray-900 dark:text-gray-200">
                                                                                    {product.batch_number}
                                                                                </td>

                                                                                <td className="px-3 py-3">
                                                                                    <span
                                                                                        className={`text-xs ${new Date(product.expiry_date) < new Date()
                                                                                            ? "text-red-600 dark:text-red-400"
                                                                                            : "text-gray-900 dark:text-gray-200"
                                                                                            }`}
                                                                                    >
                                                                                        {formatDate(product.expiry_date)}
                                                                                    </span>
                                                                                </td>

                                                                                <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                    {product.quantity_of_selected_uom}{" "}
                                                                                    {product.selected_uom_name}
                                                                                </td>

                                                                                <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                    {product.quantity_in_base_uom}
                                                                                </td>

                                                                                <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                    {formatCurrency(product.selling_price)}
                                                                                </td>

                                                                                <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                    {formatCurrency(product.sub_total)}
                                                                                </td>


                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>

                                                                {/* Unit of conversion Analysis*/}
                                                                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                    <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                        <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                        Breakdown of Base Unit Conversion for Sold Products respectively (UOM Analysis)
                                                                    </h4>

                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full text-sm font-bold">
                                                                            <thead className="bg-gray-50 dark:bg-gray-800">
                                                                                <tr>
                                                                                    {[
                                                                                        "Product",
                                                                                        "PDT Base UOM",
                                                                                        "Selected UOM",
                                                                                        "Qty (UOM Entered)",
                                                                                        "Multiplier",

                                                                                        "Qty (Base Units)"
                                                                                    ].map((header) => (
                                                                                        <th
                                                                                            key={header}
                                                                                            className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold"
                                                                                        >
                                                                                            {header}
                                                                                        </th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>

                                                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                                                {sale.products.map((product, idx) => (
                                                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                                                        <td className="px-3 py-3">
                                                                                            <div>
                                                                                                <div className="text-gray-900 dark:text-gray-200">
                                                                                                    {product.name}
                                                                                                </div>

                                                                                                {product.variant_options.length > 0 && (
                                                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                                                        {product.variant_options
                                                                                                            .map((opt) => opt.option_value)
                                                                                                            .join(", ")}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>

                                                                                        {/* Product's base unit of measure */}
                                                                                        <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                            {product.product_base_uom_name}
                                                                                        </td>

                                                                                        <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                            {product.selected_uom_name}
                                                                                        </td>

                                                                                        <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                            {product.quantity_of_selected_uom}
                                                                                        </td>

                                                                                        <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                            {product.selected_uom_multiplier}
                                                                                        </td>



                                                                                        <td className="px-3 py-3 text-gray-900 dark:text-gray-200">
                                                                                            {product.quantity_in_base_uom}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>


                                                            </div>
                                                        </div>




                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                    {/* Showing info */}
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                        Showing {filteredSales.length} of {totalPages} results
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchAllPharmacySales(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => fetchAllPharmacySales(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

        </>
    );
}
