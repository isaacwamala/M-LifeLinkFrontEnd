import { useState, useEffect } from 'react';
import { Package, Calendar, DollarSign, Hash, Tag, AlertCircle, X } from 'lucide-react';
import { fetchProductsItems } from './products_helper';
import { fetchUoms } from './products_helper';
import { fetchSuppliers } from './products_helper';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";

// Mock Data
const products = [
    { id: 1, name: 'Paracetamol' },
    { id: 2, name: 'Ibuprofen' },
    { id: 3, name: 'Amoxicillin' },
    { id: 4, name: 'Vitamin C' },
    { id: 5, name: 'Aspirin' },
];

const unitsOfMeasure = [
    { id: 1, name: 'Packet' },
    { id: 2, name: 'Tablet' },
    { id: 3, name: 'Strips' },
    { id: 4, name: 'Bottle' },
];

const suppliers = [
    { id: 1, name: 'Supplier A' },
    { id: 2, name: 'Supplier B' },
    { id: 3, name: 'Supplier C' },
];

// Product Unit Conversion API Data
const productUnitConversionAPI = [
    { productId: 1, productName: 'Paracetamol', uomId: 1, uomName: 'Packet', multiplier: 10, baseUOM: 'Tablet' },
    { productId: 1, productName: 'Paracetamol', uomId: 2, uomName: 'Tablet', multiplier: 1, baseUOM: 'Tablet' },
    { productId: 1, productName: 'Paracetamol', uomId: 3, uomName: 'Strips', multiplier: 5, baseUOM: 'Tablet' },

    { productId: 2, productName: 'Ibuprofen', uomId: 1, uomName: 'Packet', multiplier: 20, baseUOM: 'Tablet' },
    { productId: 2, productName: 'Ibuprofen', uomId: 2, uomName: 'Tablet', multiplier: 1, baseUOM: 'Tablet' },
    { productId: 2, productName: 'Ibuprofen', uomId: 3, uomName: 'Strips', multiplier: 10, baseUOM: 'Tablet' },

    { productId: 3, productName: 'Amoxicillin', uomId: 2, uomName: 'Tablet', multiplier: 1, baseUOM: 'Tablet' },
    { productId: 3, productName: 'Amoxicillin', uomId: 3, uomName: 'Strips', multiplier: 6, baseUOM: 'Tablet' },

    { productId: 4, productName: 'Vitamin C', uomId: 2, uomName: 'Tablet', multiplier: 1, baseUOM: 'Tablet' },
    { productId: 4, productName: 'Vitamin C', uomId: 4, uomName: 'Bottle', multiplier: 100, baseUOM: 'Tablet' },

    { productId: 5, productName: 'Aspirin', uomId: 1, uomName: 'Packet', multiplier: 12, baseUOM: 'Tablet' },
    { productId: 5, productName: 'Aspirin', uomId: 2, uomName: 'Tablet', multiplier: 1, baseUOM: 'Tablet' },
];

export default function RegisterMedicalStock() {
    const [formData, setFormData] = useState({
        productId: '',
        uomId: '',
        supplierId: '',
        batchNumber: '',
        purchaseDate: '',
        expiryDate: '',
        quantity: '',
        supplierPrice: '',
        sellingPrice: '',
    });

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState({ product: '', uom: '' });
    const [products, setProducts] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const token = localStorage.getItem('access_token');


    //fetch uoms
    const loadUoms = async () => {
        const data = await fetchUoms(token);
        console.log('uoms',data);
        setUoms(data);
    };
    //fetch suppliers
    const loadSuppliers = async () => {
        const data = await fetchSuppliers(token);
        console.log('suppliers', data);
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
    }, [token]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        alert('Stock registered successfully!');
    };

    const selectedUOM = unitsOfMeasure.find(uom => uom.id.toString() === formData.uomId);
    const selectedProduct = products.find(p => p.id.toString() === formData.productId);

    const unitConversion =
        formData.productId && formData.uomId
            ? productUnitConversionAPI.find(
                conv =>
                    conv.productId.toString() === formData.productId &&
                    conv.uomId.toString() === formData.uomId
            )
            : null;

    const checkConversion = () => {
        if (formData.productId && formData.uomId && !unitConversion) {
            setModalMessage({
                product: selectedProduct?.name || '',
                uom: selectedUOM?.name || '',
            });
            setShowModal(true);
        }
    };

    const handleProductUOMChange = (e) => {
        handleChange(e);

        setTimeout(() => {
            const updated = { ...formData, [e.target.name]: e.target.value };

            if (updated.productId && updated.uomId) {
                const conversion = productUnitConversionAPI.find(
                    conv =>
                        conv.productId.toString() === updated.productId &&
                        conv.uomId.toString() === updated.uomId
                );

                if (!conversion) {
                    const product = products.find(p => p.id.toString() === updated.productId);
                    const uom = unitsOfMeasure.find(u => u.id.toString() === updated.uomId);

                    setModalMessage({
                        product: product?.name || '',
                        uom: uom?.name || '',
                    });

                    setShowModal(true);
                }
            }
        }, 100);
    };

    return (
        <>
            <div className="w-full">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 sm:px-8 sm:py-6">
                        <div className="flex items-center gap-3">
                            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            <h1 className="text-white text-xl sm:text-2xl">Register Stock</h1>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                        {/* Unit Conversion Display */}
                        {unitConversion && (
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-300 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-blue-900 dark:text-white">
                                            <span className="font-semibold">Unit Conversion:</span>{' '}
                                            <span className="text-blue-800 dark:text-gray-300">
                                                1 {unitConversion.uomName} = {unitConversion.multiplier} {unitConversion.baseUOM}
                                                {unitConversion.multiplier > 1 ? 's' : ''}
                                            </span>
                                        </p>
                                        <p className="text-blue-700 dark:text-gray-300 text-sm mt-1">
                                            {selectedProduct?.name} - {unitConversion.uomName} contains {unitConversion.multiplier}{' '}
                                            {unitConversion.baseUOM}
                                            {unitConversion.multiplier > 1 ? 's' : ''}
                                        </p>

                                        {formData.quantity && parseInt(formData.quantity) > 0 && (
                                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-gray-700">
                                                <p className="text-blue-900 dark:text-white">
                                                    <span className="font-semibold">Total:</span>{' '}
                                                    <span className="text-blue-800 dark:text-gray-300">
                                                        {formData.quantity} {unitConversion.uomName}
                                                        {parseInt(formData.quantity) > 1 ? 's' : ''} ={' '}
                                                        <span className="text-lg font-semibold">
                                                            {parseInt(formData.quantity) * unitConversion.multiplier}
                                                        </span>{' '}
                                                        {unitConversion.baseUOM}
                                                        {(parseInt(formData.quantity) * unitConversion.multiplier) > 1 ? 's' : ''}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Product Select */}
                            <div className="space-y-2">
                                <label htmlFor="productId" className="block text-gray-700 dark:text-gray-200">
                                    Product <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <select
                                        id="productId"
                                        name="productId"
                                        value={formData.productId}
                                        onChange={handleProductUOMChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Select Product</option>
                                        {products.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* UOM Select */}
                            <div className="space-y-2">
                                <label htmlFor="uomId" className="block text-gray-700 dark:text-gray-200">
                                    Unit of Measure <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <select
                                        id="uomId"
                                        name="uomId"
                                        value={formData.uomId}
                                        onChange={handleProductUOMChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Select UOM</option>
                                        {unitsOfMeasure.map(uom => (
                                            <option key={uom.id} value={uom.id}>
                                                {uom.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Supplier Select */}
                            <div className="space-y-2">
                                <label htmlFor="supplierId" className="block text-gray-700 dark:text-gray-200">
                                    Supplier <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <select
                                        id="supplierId"
                                        name="supplierId"
                                        value={formData.supplierId}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(supplier => (
                                            <option key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Batch Number */}
                            <div className="space-y-2">
                                <label htmlFor="batchNumber" className="block text-gray-700 dark:text-gray-200">
                                    Batch Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <input
                                        type="text"
                                        id="batchNumber"
                                        name="batchNumber"
                                        value={formData.batchNumber}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter batch number"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Purchase Date */}
                            <div className="space-y-2">
                                <label htmlFor="purchaseDate" className="block text-gray-700 dark:text-gray-200">
                                    Purchase Date <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <input
                                        type="date"
                                        id="purchaseDate"
                                        name="purchaseDate"
                                        value={formData.purchaseDate}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Expiry Date */}
                            <div className="space-y-2">
                                <label htmlFor="expiryDate" className="block text-gray-700 dark:text-gray-200">
                                    Expiry Date <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <input
                                        type="date"
                                        id="expiryDate"
                                        name="expiryDate"
                                        value={formData.expiryDate}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Quantity */}
                            <div className="space-y-2">
                                <label htmlFor="quantity" className="block text-gray-700 dark:text-gray-200">
                                    Quantity {selectedUOM && `(${selectedUOM.name})`} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <input
                                        type="number"
                                        id="quantity"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        required
                                        min="1"
                                        placeholder={`Enter quantity${selectedUOM ? ` in ${selectedUOM.name}` : ''}`}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Supplier Price */}
                            <div className="space-y-2">
                                <label htmlFor="supplierPrice" className="block text-gray-700 dark:text-gray-200">
                                    Supplier Price <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <input
                                        type="number"
                                        id="supplierPrice"
                                        name="supplierPrice"
                                        value={formData.supplierPrice}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="Enter supplier price"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Selling Price */}
                            <div className="space-y-2">
                                <label htmlFor="sellingPrice" className="block text-gray-700 dark:text-gray-200">
                                    Selling Price <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                    <input
                                        type="number"
                                        id="sellingPrice"
                                        name="sellingPrice"
                                        value={formData.sellingPrice}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="Enter selling price"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        productId: '',
                                        uomId: '',
                                        supplierId: '',
                                        batchNumber: '',
                                        purchaseDate: '',
                                        expiryDate: '',
                                        quantity: '',
                                        supplierPrice: '',
                                        sellingPrice: '',
                                    })
                                }
                                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                            >
                                Register Stock
                            </button>
                        </div>
                    </form>
                </div>

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
                                            alert('Navigate to Product Unit Converter setup');
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
