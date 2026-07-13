import { useState, useEffect, useRef } from 'react';
import { Package, Calendar, DollarSign, Hash, AlertCircle, X } from 'lucide-react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { fetchProductsForAsyncSelect } from './products_helper';
import { fetchUoms } from './products_helper';
import { fetchSuppliers } from './products_helper';
import { getSelectClassNames } from '../general/searchSelectStyles';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { useNavigate } from 'react-router-dom';

export default function RegisterMedicalStock() {
    const [formData, setFormData] = useState({
        product_id: '',
        entered_uom_id: '',
        quantity_for_uom_entered: '',
        supplier_id: '',
        batch_number: '',
        purchase_date: '',
        expiry_date: '',
        manufacturer: '',
        supplier_price: '',
        discounted_selling_price: '',
    });
    //   const [formData, setFormData] = useState({
    //     productId: '',
    //     uomId: '',
    //     supplierId: '',
    //     batchNumber: '',
    //     purchaseDate: '',
    //     expiryDate: '',
    //     quantity: '',
    //     supplierPrice: '',
    //     sellingPrice: '',
    // });

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState({ product: '', uom: '' });
    const [selectedProductOption, setSelectedProductOption] = useState(null);
    const productDebounceRef = useRef(null);
    const [uoms, setUoms] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const token = localStorage.getItem('access_token');
    const [conversions, setConversions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    //New state that pbserves aproduct  missing aconversion set
    const [conversionMissing, setConversionMissing] = useState(false);
    const [selectedUomOption, setSelectedUomOption] = useState(null);
    const [selectedSupplierOption, setSelectedSupplierOption] = useState(null);



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
        console.log('uoms', data);
        setUoms(data);
    };
    //fetch suppliers
    const loadSuppliers = async () => {
        const data = await fetchSuppliers(token);
        console.log('suppliers', data);
        setSuppliers(data);
    };

    const loadProductOptions = (inputValue) =>
        new Promise((resolve) => {
            if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
            productDebounceRef.current = setTimeout(() => {
                fetchProductsForAsyncSelect(token, inputValue).then(resolve);
            }, 350);
        });

    useEffect(() => {
        loadUoms();
        loadSuppliers();
        fetchProductsWithTheirUomConversions();
    }, [token]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };


    const selectedUOM = uoms.find(uom => uom.id.toString() === formData.entered_uom_id);

    const productWithConversion = conversions.find(
         conv => String(conv?.id) === String(formData.product_id)
    );

    //Check conversion based on the entered unit of the product
    const unitConversion = productWithConversion?.uom_conversions?.find(
        c => String(c?.uom_id) === String(formData.entered_uom_id)
    );

    // React-select option arrays (derived from loaded data)
    const uomOptions = uoms.map(u => ({ value: u.id.toString(), label: u.name }));
    const supplierOptions = suppliers.map(s => ({ value: s.id.toString(), label: s.name }));



    //Check if conversion exists for the selected product and entered unit of measure
    useEffect(() => {
        if (
            formData.product_id &&
            formData.entered_uom_id &&
            productWithConversion &&
            !unitConversion
        ) {
            setModalMessage({
                product: selectedProductOption?.raw?.name || selectedProductOption?.label || "",
                uom: selectedUOM?.name || "",
            });

            setShowModal(true);

            //disable submit, if the product doesnt have aconversion based on selected uom
            setConversionMissing(true);
        } else {
            setConversionMissing(false); // allow submit again
        }
    }, [
        formData.product_id,
        formData.entered_uom_id,
        productWithConversion,
        unitConversion,
        selectedProductOption,
        selectedUOM
    ]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        // VALIDATION — supplier_id and batch_number are optional
        const optionalFields = ['supplier_id', 'batch_number', 'expiry_date'];
        for (let key in formData) {
            if (optionalFields.includes(key)) continue;
            if (!formData[key]) {
                toast.error("Please fill all required fields.");
                return;
            }
        }

        // Enforce expiry_date when the selected product tracks expiry
        const selectedProductData = conversions.find(
            conv => conv?.id?.toString() === formData.product_id
        );
        if (selectedProductData?.is_expiry && !formData.expiry_date) {
            toast.error("Expiry date is required for this product.");
            return;
        }

        // Show loader
        setSubmitting(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}items/storeProductBatch`,
                {
                    product_id: formData.product_id,
                    entered_uom_id: formData.entered_uom_id,
                    quantity_for_uom_entered: formData.quantity_for_uom_entered,
                    supplier_price: formData.supplier_price,
                    discounted_selling_price: formData.discounted_selling_price,
                    batch_number: formData.batch_number,
                    purchased_date: formData.purchase_date,
                    expiry_date: formData.expiry_date,
                    manufacturer: formData.manufacturer,
                    supplier_id: formData.supplier_id
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            if (response.data.status === "success") {
                toast.success(response.data.message || 'Batch saved successfully');
                setFormData({
                    product_id: '',
                    entered_uom_id: '',
                    quantity_for_uom_entered: '',
                    supplier_id: '',
                    batch_number: '',
                    purchase_date: '',
                    expiry_date: '',
                    manufacturer: '',
                    supplier_price: '',
                    discounted_selling_price: '',
                });
                setSelectedProductOption(null);
                setSelectedUomOption(null);
                setSelectedSupplierOption(null);
            } else {
                toast.error(response.data.message || "Something went wrong.");
            }

        } catch (error) {
            console.error("Submit error:", error);
            toast.error("Failed to submit stock.");
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden pt-10">

                <div className="w-full">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 sm:px-8 sm:py-6">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                <h1 className="text-white text-xl sm:text-2xl">Register Your Medical Stock</h1>
                            </div>
                            {/* Info span */}
                            <span className="block mt-2 text-white text-sm sm:text-base">
                                Stock will be stored in the product's base unit of measure. It is recommended to register stock using the product's smallest/base unit to ensure accurate inventory tracking.
                            </span>
                        </div>



                        {/* Summary + Caution */}
                        <div className="bg-blue-50 dark:bg-gray-800 border-l-4 border-blue-600 p-6 sm:p-8 mt-6 mb-6 rounded-md mx-2 sm:mx-4">
                            <h2 className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg mb-3">
                                Before You Proceed
                            </h2>

                            <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                                This form allows you to register stock using <strong>Unit of Measure conversions</strong>.
                                When selecting a product and its corresponding UOM, the system checks if a valid
                                conversion exists. If an incorrect UOM is chosen, the resulting stock quantities
                                may become inaccurate.
                            </p>

                            <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base mt-4 leading-relaxed">
                                <span className="font-semibold">Caution:</span>
                                Ensure you select the correct product and UOM. Changing these values after filling in
                                quantities may cause mismatched conversions or trigger warnings. Double-check your
                                selections to avoid registering stock with incorrect multipliers.
                            </p>
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
                                                    1 {unitConversion.name} = {unitConversion.multiplier} {productWithConversion.base_uom?.name}
                                                    {unitConversion.multiplier > 1 ? 's' : ''}
                                                </span>
                                            </p>

                                            <p className="text-blue-700 dark:text-gray-300 text-sm mt-1">
                                                {selectedProductOption?.raw?.name || selectedProductOption?.label} - {productWithConversion.base_uom?.name} contains {unitConversion.multiplier}{' '}
                                                {productWithConversion.base_uom?.name}
                                                {unitConversion.multiplier > 1 ? 's' : ''}
                                            </p>

                                            {formData.quantity_for_uom_entered && (
                                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-gray-700">
                                                    <p className="text-blue-900 dark:text-white">
                                                        <span className="font-semibold">Total:</span>{' '}
                                                        <span className="text-blue-800 dark:text-gray-300">
                                                            {formData.quantity_for_uom_entered} {unitConversion.name}
                                                            {parseInt(formData.quantity_for_uom_entered) > 1 ? 's' : ''} ={' '}
                                                            <span className="text-lg font-semibold">
                                                                {parseInt(formData.quantity_for_uom_entered) * unitConversion.multiplier}
                                                            </span>{' '}
                                                            {productWithConversion.base_uom?.name}
                                                            {(parseInt(formData.quantity_for_uom_entered) * unitConversion.multiplier) > 1 ? 's' : ''}
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
                                    <AsyncSelect
                                        loadOptions={loadProductOptions}
                                        defaultOptions
                                        value={selectedProductOption}
                                        onChange={(option) => {
                                            setSelectedProductOption(option);
                                            setFormData(prev => ({ ...prev, product_id: option ? option.value : '' }));
                                        }}
                                        classNames={getSelectClassNames()}
                                        isClearable
                                        placeholder="Search product..."
                                    />
                                </div>

                                {/* UOM Select — searchable */}
                                <div className="space-y-2">
                                    <label className="block text-gray-700 dark:text-gray-200">
                                        Unit of Measure <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        options={uomOptions}
                                        value={selectedUomOption}
                                        onChange={(option) => {
                                            setSelectedUomOption(option);
                                            setFormData(prev => ({ ...prev, entered_uom_id: option ? option.value : '' }));
                                        }}
                                        classNames={getSelectClassNames()}
                                        isClearable
                                        placeholder="Search or select UOM..."
                                    />
                                </div>

                                {/* Product info card — full-width, shown after a product is selected */}
                                {selectedProductOption && productWithConversion && (
                                    <div className="md:col-span-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <p className="text-amber-900 dark:text-amber-100 font-semibold text-sm">
                                                    Selected: {productWithConversion.name}
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400">Base Unit of Measure:</span>
                                                        <span className="ml-1 font-semibold text-gray-900 dark:text-white">
                                                            {productWithConversion.base_uom?.name ?? '—'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400">Expiry Tracking:</span>
                                                        <span className={`ml-1 font-semibold ${productWithConversion.is_expiry ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                                            {productWithConversion.is_expiry ? 'Required' : 'Not required'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed border-t border-amber-200 dark:border-amber-700 pt-2 mt-1">
                                                    <strong>Important:</strong> If this is the <strong>first stock entry</strong> for this product,
                                                    confirm the base unit of measure above is correct.
                                                    Once stock exists, the base unit <strong>cannot be changed</strong> from the
                                                    Product Items page — go to <em>Medical Supplies / Items</em> to update it before proceeding.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Quantity */}
                                <div className="space-y-2">
                                    <label htmlFor="quantity" className="block text-gray-700 dark:text-gray-200">
                                        Quantity {selectedUOM && `(${selectedUOM.name})`} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                        <input
                                            type="number"
                                            id="quantity_for_uom_entered"
                                            name="quantity_for_uom_entered"
                                            value={formData.quantity_for_uom_entered}
                                            onChange={handleChange}
                                            required
                                            min="1"
                                            placeholder={`Enter quantity${selectedUOM ? ` in ${selectedUOM.name}` : ''}`}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Supplier Select — searchable, optional */}
                                <div className="space-y-2">
                                    <label className="block text-gray-700 dark:text-gray-200">
                                        Supplier <span className="text-gray-400 text-sm">(optional)</span>
                                    </label>
                                    <Select
                                        options={supplierOptions}
                                        value={selectedSupplierOption}
                                        onChange={(option) => {
                                            setSelectedSupplierOption(option);
                                            setFormData(prev => ({ ...prev, supplier_id: option ? option.value : '' }));
                                        }}
                                        classNames={getSelectClassNames()}
                                        isClearable
                                        placeholder="Search or select supplier..."
                                    />
                                </div>

                                {/* Batch Number */}
                                <div className="space-y-2">
                                    <label htmlFor="batchNumber" className="block text-gray-700 dark:text-gray-200">
                                        Batch Number <span className="text-gray-400 text-sm">(optional — auto-generated if blank)</span>
                                    </label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                        <input
                                            type="text"
                                            id="batch_number"
                                            name="batch_number"
                                            value={formData.batch_number}
                                            onChange={handleChange}
                                            placeholder="Enter batch number or leave blank"
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
                                            id="purchase_date"
                                            name="purchase_date"
                                            value={formData.purchase_date}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Expiry Date */}
                                <div className="space-y-2">
                                    <label htmlFor="expiryDate" className="block text-gray-700 dark:text-gray-200">
                                        Expiry Date{' '}
                                        {productWithConversion?.is_expiry
                                            ? <span className="text-red-500">*</span>
                                            : <span className="text-gray-400 text-sm">(optional)</span>
                                        }
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                        <input
                                            type="date"
                                            id="expiry_date"
                                            name="expiry_date"
                                            value={formData.expiry_date}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>



                                {/* Supplier Price */}
                                <div className="space-y-2">
                                    <label htmlFor="supplierPrice" className="block text-gray-700 dark:text-gray-200">
                                        Supplier Price per Smallest Unit <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                        <input
                                            type="number"
                                            id="supplier_price"
                                            name="supplier_price"
                                            value={formData.supplier_price}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            placeholder="Enter supplier price in smallest unit of measure"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Manufacturer */}
                                <div className="space-y-2">
                                    <label htmlFor="manufacturer" className="block text-gray-700 dark:text-gray-200">
                                        Manufacturer <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                        <input
                                            type="text"
                                            id="manufacturer"
                                            name="manufacturer"
                                            value={formData.manufacturer}
                                            onChange={handleChange}
                                            required

                                            placeholder="Enter manufaturer name"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Selling Price */}
                                <div className="space-y-2">
                                    <label htmlFor="sellingPrice" className="block text-gray-700 dark:text-gray-200">
                                        Selling Price per smallest unit <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                                        <input
                                            type="number"
                                            id="discounted_selling_price"
                                            name="discounted_selling_price"
                                            value={formData.discounted_selling_price}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            placeholder="Enter selling price for the smallest unit of measure"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({
                                            product_id: '',
                                            entered_uom_id: '',
                                            supplier_id: '',
                                            batch_number: '',
                                            purchase_date: '',
                                            expiry_date: '',
                                            manufacturer: '',
                                            quantity_for_uom_entered: '',
                                            supplier_price: '',
                                            discounted_selling_price: '',
                                        });
                                        setSelectedProductOption(null);
                                        setSelectedUomOption(null);
                                        setSelectedSupplierOption(null);
                                    }}
                                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || conversionMissing}
                                    className={`px-6 py-2.5 rounded-lg text-white transition-colors shadow-md hover:shadow-lg flex items-center gap-2
                                ${submitting || conversionMissing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                                `}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        "Register Stock"
                                    )}
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
            </div>

        </>

    );
}
