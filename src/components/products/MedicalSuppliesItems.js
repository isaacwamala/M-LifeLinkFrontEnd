import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Edit2, X, Package, TrendingUp, AlertCircle, Calendar,} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from '../general/constants';

//import uoms,categories,variants,and medical items(products)
import { fetchUoms } from './products_helper';
import { fetchProductCategories } from './products_helper';
import { fetchProductVariants } from './products_helper';
import { fetchProductsItems } from './products_helper';



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
    const [variants, setVariants] = useState([]);
    const [removedVariantIds, setRemovedVariantIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);


    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        smallest_base_uom_id: '',
        category_id: '',
        minimum_order_level: '',
        maximum_stock_level: '',
        description: '',
        barcode: '',
        sku: '',
        variant_options: [],
    });


    //use fetched categories
    const loadCategories = async () => {
        setLoading(true);
        const data = await fetchProductCategories(token);
        setCategories(data);
        setLoading(false);
    };

    const loadProducts = async () => {
        setLoading(true);
        const data = await fetchProductsItems(token);
        console.log(products)
        setProducts(data);
        setLoading(false);
    };

    const loadUoms = async () => {
        setLoading(true);
        const data = await fetchUoms(token);
        console.log('uoms', data);
        setUoms(data);
        setLoading(false);
    };

    const loadVariants = async () => {
        setLoading(true);
        const data = await fetchProductVariants(token);
        setVariants(data);
        console.log('variants', data);
        setLoading(false);
    };


    useEffect(() => {
        loadCategories();
        loadProducts();
        loadUoms();
        loadVariants();
    }, [token]);


    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            // Search filter
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                searchTerm === '' ||
                product.name.toLowerCase().includes(searchLower) ||
                product.sku.toLowerCase().includes(searchLower) ||
                product.barcode.toLowerCase().includes(searchLower);

            // Date range filter
            const productDate = new Date(product.created_at);
            const fromDate = dateFrom ? new Date(dateFrom) : null;
            const toDate = dateTo ? new Date(dateTo) : null;

            const matchesDateRange =
                (!fromDate || productDate >= fromDate) &&
                (!toDate || productDate <= toDate);

            return matchesSearch && matchesDateRange;
        });
    }, [products, searchTerm, dateFrom, dateTo]);

    // Stats calculations
    const stats = useMemo(() => {
        const total = filteredProducts.length;
        const lowStock = filteredProducts.filter((p) => p.minimum_order_level > 0).length;
        const categories = new Set(
            filteredProducts
                .map((p) => p.category?.name) // optional chaining
                .filter(Boolean) // remove undefined/null
        ).size;

        return { total, lowStock, categories };
    }, [filteredProducts]);


    // Paginated Data
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filteredProducts.slice(start, end);
    }, [filteredProducts, currentPage]);

    //Reset  page when filters change3
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFrom, dateTo]);


    //Open modal with existing data during update
    const openModal = (product) => {
        //Normalize products variants with their ID's
        const normalizedVariantOptions = product?.variant_options?.map(v => ({
            id: v.id || null,           // keep the existing id
            option_name: v.option_name || '',
            option_value: v.option_value || '',
        })) || [];


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
                sku: product.sku || '',

                variant_options: product.variant_options?.map(v => ({
                    id: v.id ?? null,           // keep existing ID
                    option_name: v.option_name || '',
                    option_value: v.option_value || '',
                })) || [],
            });
        } else {
            //Else reset form for new product
            setEditingProduct(null);
            setFormData({
                name: '',
                smallest_base_uom_id: '',
                category_id: '',
                minimum_order_level: '',
                maximum_stock_level: '',
                description: '',
                barcode: '',
                sku: '',
                variant_options: [],
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
        setSubmitting(true); // start loader
        if (!formData) return;

        // Validate required variant fields
        const invalidVariant = formData.variant_options?.some(
            v => !v?.option_name || !v?.option_value
        );

        if (invalidVariant) {
            toast.error("Please select both Option Name and Value for all variants");
            return;
        }

        // Prepare variant options for API
        const payloadVariants = formData.variant_options?.map(v => {
            if (!v) return null; // skip undefined entries

            if (editingProduct) {
                return v.id
                    ? { id: v.id, option_name: v.option_name, option_value: v.option_value }
                    : { option_name: v.option_name, option_value: v.option_value };
            }
            return { option_name: v.option_name, option_value: v.option_value };
        }).filter(Boolean); // remove any null entries

        // Prepare full payload
        const payload = {
            id: editingProduct?.id,  // include id for updates
            name: formData.name || "", // explicitly include name
            smallest_base_uom_id: parseInt(formData.smallest_base_uom_id || 0),
            category_id: parseInt(formData.category_id || 0),
            minimum_order_level: parseInt(formData.minimum_order_level || 0),
            maximum_stock_level: parseInt(formData.maximum_stock_level || 0),
            description: formData.description || "",
            barcode: formData.barcode || "",
            sku: formData.sku || "",
            variant_options: payloadVariants,
            images: editingProduct ? undefined : null // only add images for new products
        };

        console.log("Submitting payload:", payload);

        const url = editingProduct
            ? `${API_BASE_URL}items/updateProductItem`
            : `${API_BASE_URL}items/registerProductItem`;

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json",
                },
            });

            toast.success(editingProduct ? "Product updated!" : "Product added!");

            //Refresh products
            loadProducts();


            closeModal();
        } catch (error) {
            console.error("API Error:", error.response?.data || error.message || error);
            toast.error(error.response?.data.message);
        } finally {
            setSubmitting(false); // stop loader
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

    //This ensures that the option name selected
    const updateVariantOption = (index, field, value) => {
        const updated = [...formData.variant_options];

        // If changing option_name, reset option_value
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

    //Helper function to get avariant by by options



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
                                Register and manage your daily medical supplies you use
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
                                        {Array.from({ length: itemsPerPage }).map((_, i) => (
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
                                                    onChange={(e) => setDateFrom(e.target.value)}
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
                                                    onChange={(e) => setDateTo(e.target.value)}
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
                                                {paginatedProducts.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                                            No products found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedProducts.map((product) => (
                                                        <tr
                                                            key={product.id}
                                                            className="border-t border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                        >
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{product.name}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{product.sku}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{product.barcode}</td>
                                                            <td className="px-4 py-3"><span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">{product.category?.name || 'N/A'}</span></td>

                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{product.uom.name}</td>

                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                {product.minimum_order_level} / {product.maximum_stock_level}
                                                            </td> 
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                {new Date(product.created_at).toLocaleDateString()} 
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <button
                                                                    onClick={() => openModal(product)}
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

                                    {/* Pagination controls moved OUTSIDE scrollable area */}
                                    <div className="flex justify-center items-center gap-3 mt-4 p-4 bg-gray-100 dark:bg-gray-700">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className={`px-4 py-2 rounded ${currentPage === 1
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                        >
                                            Previous
                                        </button>

                                        <span className="text-gray-700 dark:text-gray-300">
                                            Page {currentPage} of {Math.ceil(filteredProducts.length / itemsPerPage)}
                                        </span>

                                        <button
                                            disabled={currentPage === Math.ceil(filteredProducts.length / itemsPerPage)}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className={`px-4 py-2 rounded ${currentPage === Math.ceil(filteredProducts.length / itemsPerPage)
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

                {/* Modal */}
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

                                    {/* SKU */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">SKU *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Barcode */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Barcode *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.barcode}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Unit of Measure */}
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">Base Unit of Measure *</label>
                                        <select
                                            required
                                            value={formData.smallest_base_uom_id}
                                            onChange={(e) => setFormData({ ...formData, smallest_base_uom_id: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Select UOM</option>
                                            {uoms.map((uom) => (
                                                <option key={uom.id} value={uom.id}>
                                                    {uom.name}
                                                </option>
                                            ))}
                                        </select>
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
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Option
                                        </button>
                                    </div>

                                    {formData.variant_options.map((option, index) => {
                                        // Only filter variants if option_name is selected
                                        const filteredValues = option.option_name
                                            ? variants.filter(v => v.option_name === option.option_name)
                                            : [];

                                        return (
                                            <div key={index} className="flex gap-2 mb-2">
                                                {/* Option Name */}
                                                <select
                                                    value={option.option_name || ""}
                                                    onChange={(e) => updateVariantOption(index, 'option_name', e.target.value)}
                                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="">Select Option Name</option>
                                                    {[...new Set(variants.map(v => v.option_name))].map(name => (
                                                        <option key={name} value={name}>
                                                            {name}
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Option Value */}
                                                <select
                                                    value={option.option_value || ""}
                                                    onChange={(e) => updateVariantOption(index, 'option_value', e.target.value)}
                                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                    disabled={!option.option_name} // disable until option_name is selected
                                                >
                                                    <option value="">Select Value</option>
                                                    {filteredValues.map(v => (
                                                        <option key={v.id || v.option_value} value={v.option_value}>
                                                            {v.option_value}
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
                                        disabled={submitting} // prevent multiple clicks
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

            </div>
        </>
    );
}
