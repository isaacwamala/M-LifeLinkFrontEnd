import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, X, Package, TrendingUp, AlertCircle, Calendar, Printer } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import JsBarcode from 'jsbarcode';
import { API_BASE_URL } from '../general/constants';

import { fetchUoms } from './products_helper';
import { fetchProductCategories } from './products_helper';
import { AddUnitOfMeasureDrawer } from '../configurations/AddUnitOfMeasureDrawer';
import { fetchProductVariants } from './products_helper'; // kept as unused dead code
import { fetchProductsItemsPaginated } from './products_helper';
import { fetchActiveVariantOptionNames } from './products_helper';



export default function MedicalSuppliesItems() {
    const [products, setProducts] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const token = localStorage.getItem('access_token');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [variantOptionNames, setVariantOptionNames] = useState([]); // new variant option names from API
    const [removedVariantIds, setRemovedVariantIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Add-UOM drawer — opened from inside the product form when a UOM is missing
    const [isAddUomOpen, setIsAddUomOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingProduct, setViewingProduct] = useState(null);

    // Print barcode modal state
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printProduct, setPrintProduct] = useState(null);
    const [printCount, setPrintCount] = useState(30);
    const printBarcodeRef = useRef(null);

    // Debounce timer ref for search
    const searchDebounceRef = useRef(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        smallest_base_uom_id: '',
        category_id: '',
        minimum_order_level: '',
        maximum_stock_level: '',
        description: '',
        barcode: '',
        variant_options: [],
        is_expiry: false,
    });


    const loadCategories = async () => {
        const data = await fetchProductCategories(token);
        setCategories(data);
    };

    const loadProducts = async (page = 1, search = searchTerm, dFrom = dateFrom, dTo = dateTo) => {
        setLoading(true);
        const paginator = await fetchProductsItemsPaginated(token, { page, search, dateFrom: dFrom, dateTo: dTo });
        if (paginator) {
            setProducts(paginator.data || []);
            setCurrentPage(paginator.current_page || 1);
            setTotalPages(paginator.last_page || 1);
            setTotalCount(paginator.total || 0);
        } else {
            setProducts([]);
        }
        setLoading(false);
    };

    const loadUoms = async () => {
        const data = await fetchUoms(token);
        setUoms(data);
    };

    // Fired by AddUnitOfMeasureDrawer after a successful save.
    // Appends the new UOM to the dropdown list and auto-selects it in the form.
    const handleUomCreated = (newUom) => {
        setUoms((prev) => [...prev, newUom]);
        setFormData((prev) => ({ ...prev, smallest_base_uom_id: String(newUom.id) }));
    };

    const loadVariantOptionNames = async () => {
        const data = await fetchActiveVariantOptionNames(token);
        setVariantOptionNames(data);
    };


    useEffect(() => {
        loadCategories();
        loadProducts(1, '', '', '');
        loadUoms();
        loadVariantOptionNames();
    }, [token]);


    // Debounced search: fires loadProducts 400ms after the user stops typing
    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            loadProducts(1, searchTerm, dateFrom, dateTo);
        }, 400);
        return () => clearTimeout(searchDebounceRef.current);
    }, [searchTerm]);

    // Date filters fetch immediately on change, resetting to page 1
    const handleDateFromChange = (val) => {
        setDateFrom(val);
        loadProducts(1, searchTerm, val, dateTo);
    };

    const handleDateToChange = (val) => {
        setDateTo(val);
        loadProducts(1, searchTerm, dateFrom, val);
    };


    // Stats computed from the current page's products.
    // NOTE: these stats reflect only the currently loaded page of 20 products,
    // not the full filtered dataset — accepted trade-off for this phase.
    const stats = useMemo(() => {
        const total = totalCount; // use total from paginator for accurate count
        const lowStock = products.filter((p) => p.minimum_order_level > 0).length;
        const uniqueCategories = new Set(
            products
                .map((p) => p.category?.name)
                .filter(Boolean)
        ).size;

        return { total, lowStock, categories: uniqueCategories };
    }, [products, totalCount]);

    const openViewModal = (product) => {
        setViewingProduct(product);
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setViewingProduct(null);
    };

    const openPrintBarcodeModal = (product) => {
        setPrintProduct(product);
        setPrintCount(30);
        setIsPrintModalOpen(true);
    };

    const closePrintBarcodeModal = () => {
        setIsPrintModalOpen(false);
        setPrintProduct(null);
    };

    // Render barcodes into SVG elements after the modal opens
    useEffect(() => {
        if (!isPrintModalOpen || !printProduct) return;

        // Wait one tick for the DOM to render the SVG elements
        const timer = setTimeout(() => {
            const svgs = document.querySelectorAll('.barcode-svg');
            svgs.forEach((svg) => {
                try {
                    JsBarcode(svg, printProduct.internal_barcode, {
                        format: 'CODE128',
                        width: 2,
                        height: 50,
                        displayValue: true,
                        fontSize: 12,
                    });
                } catch (err) {
                    // Ignore individual render errors
                }
            });
        }, 50);

        return () => clearTimeout(timer);
    }, [isPrintModalOpen, printProduct, printCount]);

    const handlePrint = () => {
        // Collect already-rendered SVG elements and open a dedicated print window.
        // This avoids the parent-visibility problem where window.print() hides the
        // modal overlay and the nested sheet disappears with it.
        const svgs = document.querySelectorAll('.barcode-svg');
        if (!svgs.length) return;

        const items = Array.from(svgs).map((svg, i) => `
            <div style="display:flex;flex-direction:column;align-items:center;padding:4px;
                        border:1px solid #e5e7eb;border-radius:4px;background:#fff;
                        page-break-inside:avoid;">
                ${svg.outerHTML}
                <span style="font-size:10px;color:#374151;margin-top:2px;text-align:center;">
                    ${printProduct?.name ?? ''}
                </span>
            </div>`).join('');

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Barcodes</title>
            <style>
                body { margin: 0; padding: 8px; }
                .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
                @media print { @page { margin: 10mm; } }
            </style></head><body>
            <div class="grid">${items}</div>
            </body></html>`);
        printWindow.document.close();
        printWindow.focus();
        // Small delay lets the browser finish rendering SVGs before the print dialog opens
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    };


    //Open modal with existing data during update
    const openModal = (product) => {
        // Defensively normalize variant_options in case it comes back as an
        // object instead of an array (can happen with malformed/legacy data)
        const rawVariants = product?.variant_options;
        const normalizedVariants = Array.isArray(rawVariants)
            ? rawVariants
            : rawVariants && typeof rawVariants === 'object'
                ? Object.values(rawVariants)
                : [];

        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                smallest_base_uom_id: product.smallest_base_uom_id?.toString() || '',
                category_id: product.category_id?.toString() || '',
                minimum_order_level: product.minimum_order_level?.toString() || '',
                maximum_stock_level: product.maximum_stock_level?.toString() || '',
                description: product.description || '',
                barcode: product.barcode || '',
                variant_options: normalizedVariants.map(v => ({
                    id: v.id ?? null,
                    option_name: v.option_name || '',
                    option_value: v.option_value || '',
                })),
                is_expiry: !!product.is_expiry,
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                smallest_base_uom_id: '',
                category_id: '',
                minimum_order_level: '',
                maximum_stock_level: '',
                description: '',
                barcode: '',
                variant_options: [],
                is_expiry: false,
            });
        }

        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        if (!formData) return;

        // Validate required variant fields
        const invalidVariant = formData.variant_options?.some(
            v => !v?.option_name || !v?.option_value
        );

        if (invalidVariant) {
            toast.error("Please select both Option Name and Value for all variants");
            setSubmitting(false);
            return;
        }

        // Prepare variant options for API
        const payloadVariants = formData.variant_options?.map(v => {
            if (!v) return null;

            if (editingProduct) {
                return v.id
                    ? { id: v.id, option_name: v.option_name, option_value: v.option_value }
                    : { option_name: v.option_name, option_value: v.option_value };
            }
            return { option_name: v.option_name, option_value: v.option_value };
        }).filter(Boolean);

        const payload = {
            id: editingProduct?.id,
            name: formData.name || "",
            smallest_base_uom_id: parseInt(formData.smallest_base_uom_id || 0),
            category_id: parseInt(formData.category_id || 0),
            minimum_order_level: parseInt(formData.minimum_order_level || 0),
            maximum_stock_level: parseInt(formData.maximum_stock_level || 0),
            description: formData.description || "",
            barcode: formData.barcode || "",  // backend coerces "" to null
            variant_options: payloadVariants,
            images: editingProduct ? undefined : null,
            is_expiry: formData.is_expiry,
        };

        const url = editingProduct
            ? `${API_BASE_URL}items/updateProductItem`
            : `${API_BASE_URL}items/registerProductItem`;

        try {
            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json",
                },
            });

            toast.success(editingProduct ? "Product updated!" : "Product added!");
            loadProducts(currentPage, searchTerm, dateFrom, dateTo);
            closeModal();
        } catch (error) {
            console.error("API Error:", error.response?.data || error.message || error);
            toast.error(error.response?.data?.message || "An error occurred.");
        } finally {
            setSubmitting(false);
        }
    };



    const addVariantOption = () => {
        setFormData({
            ...formData,
            variant_options: [
                ...formData.variant_options,
                { option_name: '', option_value: '' },
            ],
        });
    };

    const updateVariantOption = (index, field, value) => {
        const updated = [...formData.variant_options];

        if (field === 'option_name') {
            updated[index] = { ...updated[index], option_name: value, option_value: '' };
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }

        setFormData({ ...formData, variant_options: updated });
    };


    const removeVariantOption = (index) => {
        const removed = formData.variant_options[index];
        if (removed.id) {
            setRemovedVariantIds([...removedVariantIds, removed.id]);
        }
        setFormData({
            ...formData,
            variant_options: formData.variant_options.filter((_, i) => i !== index),
        });
    };



    return (
        <>
            <ToastContainer />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden pt-10">
                <div className="w-full">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow">
                        <div className="mb-4 md:mb-0">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Medical supplies / Items</h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-300 text-lg">
                                Register and manage your daily medical product items you use. These will be used when registering your inventory later
                            </p>
                        </div>

                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow"
                        >
                            <Plus className="w-5 h-5" />
                            Add Product
                        </button>
                    </div>


                    <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6" borderRadius="0.75rem">
                        {loading ? (
                            <>
                                {/* Stats Skeleton */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg animate-pulse h-24"
                                        />
                                    ))}
                                </div>

                                {/* Filters Skeleton */}
                                <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg mb-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="h-12 w-full bg-gray-200 dark:bg-gray-600 rounded animate-pulse"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Products Table Skeleton */}
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto p-6 space-y-4">
                                        {Array.from({ length: 20 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="h-8 w-full bg-gray-200 dark:bg-gray-600 rounded animate-pulse"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {/* Total Products */}
                                    <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-700 dark:text-gray-100 mb-1">Total Products</p>
                                                <p className="text-3xl text-gray-700 dark:text-gray-300">{stats.total}</p>
                                            </div>
                                            <Package className="w-12 h-12 text-blue-500" />
                                        </div>
                                    </div>

                                    {/* Categories */}
                                    <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-700 dark:text-gray-300 mb-1">Categories</p>
                                                <p className="text-3xl text-gray-700 dark:text-gray-300">{stats.categories}</p>
                                            </div>
                                            <TrendingUp className="w-12 h-12 text-green-500" />
                                        </div>
                                    </div>

                                    {/* Tracked Items */}
                                    <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-700 dark:text-gray-300 mb-1">Tracked Items</p>
                                                <p className="text-3xl text-gray-700 dark:text-gray-300">{stats.lowStock}</p>
                                            </div>
                                            <AlertCircle className="w-12 h-12 text-yellow-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg mb-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Search */}
                                        <div className="md:col-span-1">
                                            <label className="block text-gray-700 dark:text-gray-300 mb-2">Search</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Name, SKU, or Barcode"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Date From */}
                                        <div>
                                            <label className="block text-gray-700 dark:text-gray-300 mb-2">From Date</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={(e) => handleDateFromChange(e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Date To */}
                                        <div>
                                            <label className="block text-gray-700 dark:text-gray-300 mb-2">To Date</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={(e) => handleDateToChange(e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Products Table */}
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-200 dark:bg-gray-600">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Name</th>
                                                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">SKU</th>
                                                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Barcode</th>
                                                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Category</th>
                                                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Base UOM</th>
                                                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Min/Max</th>
                                                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Created</th>
                                                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {products.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                                            No products found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    products.map((product) => (
                                                        <tr
                                                            key={product.id}
                                                            onClick={() => openViewModal(product)}
                                                            className="border-t border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                                        >
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{product.name}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{product.sku}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{product.barcode}</td>
                                                            <td className="px-4 py-3"><span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">{product.category?.name || 'N/A'}</span></td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{product.uom?.name}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                {product.minimum_order_level} / {product.maximum_stock_level}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                {new Date(product.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openModal(product); }}
                                                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                                                >
                                                                    <Edit2 className="w-5 h-5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination controls */}
                                    <div className="flex justify-center items-center gap-3 mt-4 p-4 bg-gray-100 dark:bg-gray-700">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => loadProducts(currentPage - 1, searchTerm, dateFrom, dateTo)}
                                            className={`px-4 py-2 rounded ${currentPage === 1
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                        >
                                            Previous
                                        </button>

                                        <span className="text-gray-700 dark:text-gray-300">
                                            Page {currentPage} of {totalPages}
                                        </span>

                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => loadProducts(currentPage + 1, searchTerm, dateFrom, dateTo)}
                                            className={`px-4 py-2 rounded ${currentPage === totalPages
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </SkeletonTheme>

                </div>

                {/* Add / Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">

                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-gray-900 dark:text-white">
                                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {/* Product Name */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Product Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Barcode — optional */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Barcode</label>
                                        <span className="block text-gray-400 dark:text-gray-400 text-xs mb-1">
                                            Optional — leave blank to auto-generate an internal barcode you can print.
                                        </span>
                                        <input
                                            type="text"
                                            value={formData.barcode}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Unit of Measure */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Base Unit of Measure *</label>
                                        <span className="block text-gray-400 dark:text-gray-400 text-xs mb-1">
                                            Set the <strong>smallest</strong> unit this product is measured in (e.g. Tablet, ml, piece). Cannot be changed once stock exists.
                                        </span>
                                        <select
                                            required
                                            disabled={editingProduct?.has_stock}
                                            value={formData.smallest_base_uom_id}
                                            onChange={(e) => setFormData({ ...formData, smallest_base_uom_id: e.target.value })}
                                            className={`w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 ${editingProduct?.has_stock ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                            <option value="">Select UOM</option>
                                            {uoms.map((uom) => (
                                                <option key={uom.id} value={uom.id}>
                                                    {uom.name}
                                                </option>
                                            ))}
                                        </select>
                                        {editingProduct?.has_stock && (
                                            <span className="block text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                Locked — stock already exists for this product. Changing the base unit would break inventory tracking.
                                            </span>
                                        )}
                                        {!editingProduct?.has_stock && (
                                            <button
                                                type="button"
                                                onClick={() => setIsAddUomOpen(true)}
                                                className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add UOM
                                            </button>
                                        )}
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                                        <select
                                            required
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Minimum Order Level */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Minimum Order Level *</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.minimum_order_level}
                                            onChange={(e) => setFormData({ ...formData, minimum_order_level: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Maximum Stock Level */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Maximum Stock Level *</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.maximum_stock_level}
                                            onChange={(e) => setFormData({ ...formData, maximum_stock_level: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Expiry Tracking */}
                                    <div className="md:col-span-2">
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Expiry Tracking</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="is_expiry"
                                                checked={formData.is_expiry}
                                                onChange={(e) => setFormData({ ...formData, is_expiry: e.target.checked })}
                                                className="w-4 h-4"
                                            />
                                            <label htmlFor="is_expiry" className="text-gray-700 dark:text-gray-300">
                                                This product tracks expiry dates
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mb-4">
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Variant Options */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-gray-700 dark:text-gray-300">Variant Options</label>
                                        <button
                                            type="button"
                                            onClick={addVariantOption}
                                            disabled={formData.variant_options.length >= 2}
                                            className={`flex items-center gap-1 ${formData.variant_options.length >= 2
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                                                }`}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Option
                                        </button>
                                    </div>

                                    {formData.variant_options.map((option, index) => {
                                        // Find the matching option name entry to get its values
                                        const matchedOption = variantOptionNames.find(o => o.name === option.option_name);
                                        const availableValues = matchedOption?.values ?? [];

                                        return (
                                            <div key={index} className="flex gap-2 mb-2">
                                                {/* Option Name */}
                                                <select
                                                    value={option.option_name || ""}
                                                    onChange={(e) => updateVariantOption(index, 'option_name', e.target.value)}
                                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="">Select Option Name</option>
                                                    {variantOptionNames.map(o => (
                                                        <option key={o.id} value={o.name}>
                                                            {o.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Option Value */}
                                                <select
                                                    value={option.option_value || ""}
                                                    onChange={(e) => updateVariantOption(index, 'option_value', e.target.value)}
                                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                    disabled={!option.option_name}
                                                >
                                                    <option value="">Select Value</option>
                                                    {availableValues.map(v => (
                                                        <option key={v.id} value={v.value}>
                                                            {v.value}
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Remove button */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeVariantOption(index)}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        );
                                    })}

                                </div>


                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            editingProduct ? 'Update Product' : 'Create Product'
                                        )}
                                    </button>

                                </div>
                            </form>
                        </div>
                    </div>
                )}


                {/* View Details Modal */}
                {isViewModalOpen && viewingProduct && (() => {
                    const rawVariants = viewingProduct?.variant_options;
                    const normalizedVariants = Array.isArray(rawVariants)
                        ? rawVariants
                        : rawVariants && typeof rawVariants === 'object'
                            ? Object.values(rawVariants)
                            : [];

                    return (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white dark:bg-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">

                                {/* Header */}
                                <div className="sticky top-0 bg-white dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
                                    <h2 className="text-gray-900 dark:text-white text-lg font-semibold">
                                        Product Details
                                    </h2>
                                    <button
                                        onClick={closeViewModal}
                                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Product Name</p>
                                            <p className="text-gray-900 dark:text-white font-medium">{viewingProduct.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SKU</p>
                                            <p className="text-gray-900 dark:text-white font-medium">{viewingProduct.sku}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Barcode</p>
                                            <p className="text-gray-900 dark:text-white font-medium">{viewingProduct.barcode || <span className="italic text-gray-400">None</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Internal Barcode</p>
                                            <p className="text-gray-900 dark:text-white font-medium">{viewingProduct.internal_barcode}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
                                            <p className="text-gray-900 dark:text-white font-medium">{viewingProduct.category?.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Base Unit of Measure</p>
                                            <p className="text-gray-900 dark:text-white font-medium">{viewingProduct.uom?.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Min / Max Stock Level</p>
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {viewingProduct.minimum_order_level} / {viewingProduct.maximum_stock_level}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expiry Tracking</p>
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {viewingProduct.is_expiry ? 'Enabled' : 'Disabled'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {new Date(viewingProduct.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {viewingProduct.description && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                                            <p className="text-gray-700 dark:text-gray-300">{viewingProduct.description}</p>
                                        </div>
                                    )}

                                    {/* Variant Options */}
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Variant Options</p>
                                        {normalizedVariants.length === 0 ? (
                                            <p className="text-sm text-gray-400 italic">No variant options set for this product.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {normalizedVariants.map((v, i) => (
                                                    <span
                                                        key={v.id ?? i}
                                                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                                    >
                                                        <span className="font-semibold mr-1">{v.option_name}:</span> {v.option_value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 border-t border-gray-300 dark:border-gray-600 flex justify-end gap-3 flex-wrap">
                                    {!viewingProduct.barcode && viewingProduct.internal_barcode && (
                                        <button
                                            onClick={() => { closeViewModal(); openPrintBarcodeModal(viewingProduct); }}
                                            className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2"
                                        >
                                            <Printer className="w-4 h-4" /> Print Barcode
                                        </button>
                                    )}
                                    <button
                                        onClick={closeViewModal}
                                        className="px-5 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => { closeViewModal(); openModal(viewingProduct); }}
                                        className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2"
                                    >
                                        <Edit2 className="w-4 h-4" /> Edit Product
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}


                {/* Print Barcode Modal */}
                {isPrintModalOpen && printProduct && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">

                            {/* Header */}
                            <div className="sticky top-0 bg-white dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-gray-900 dark:text-white text-lg font-semibold">
                                    Print Barcode — {printProduct.name}
                                </h2>
                                <button
                                    onClick={closePrintBarcodeModal}
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Count input */}
                                <div className="mb-6 flex items-center gap-4">
                                    <label className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                        Number of barcodes to print:
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={printCount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (val > 0) setPrintCount(val);
                                        }}
                                        className="w-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Barcode preview grid */}
                                <div
                                    id="print-barcode-sheet"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '8px',
                                        padding: '8px',
                                    }}
                                >
                                    {Array.from({ length: printCount }).map((_, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                padding: '4px',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '4px',
                                                background: '#fff',
                                                pageBreakInside: 'avoid',
                                            }}
                                        >
                                            <svg className="barcode-svg" />
                                            <span style={{ fontSize: '10px', color: '#374151', marginTop: '2px', textAlign: 'center' }}>
                                                {printProduct.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-300 dark:border-gray-600 flex justify-end gap-3">
                                <button
                                    onClick={closePrintBarcodeModal}
                                    className="px-5 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2"
                                >
                                    <Printer className="w-4 h-4" /> Print
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Add UOM drawer — mounted at root level so it sits above the product modal (z-[75]) */}
            <AddUnitOfMeasureDrawer
                isOpen={isAddUomOpen}
                onClose={() => setIsAddUomOpen(false)}
                token={token}
                onCreated={handleUomCreated}
            />
        </>
    );
}
