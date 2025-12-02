import { useState, useEffect } from 'react';
import { Package, Calendar, DollarSign, Hash, Tag, Plus, Trash2, AlertCircle, ShoppingCart, X } from 'lucide-react';
import { fetchProductsItems } from '../products/products_helper';
import { fetchUoms } from '../products/products_helper';
import { fetchSuppliers } from '../products/products_helper';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { useNavigate } from 'react-router-dom';



export default function CreatePurchaseOrder() {

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState({ product: '', uom: '' });
    const [products, setProducts] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const token = localStorage.getItem('access_token');
    const [conversions, setConversions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderDate, setOrderDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const navigate = useNavigate();

    //New state that pbserves aproduct  missing aconversion set
    const [conversionMissing, setConversionMissing] = useState(false);

    const [supplierId, setSupplierId] = useState("");

    const [items, setItems] = useState([
        {
            product_id: '',
            unit_of_measure: '',
            quantity_of_uom_entered: '',
            unit_price: '',
        },
    ]);


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

    const addItem = () => {
        setItems([
            ...items,
            {
                product_id: '',
                unit_of_measure: '',
                quantity_of_uom_entered: '',
                unit_price: '',
            },
        ]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    //Calculate the product item total, subtotal
    const calculateItemTotal = (item) => {
        const quantity =
            typeof item.quantity_of_uom_entered === 'number'
                ? item.quantity_of_uom_entered
                : 0;
        const price = typeof item.unit_price === 'number' ? item.unit_price : 0;
        return quantity * price;
    };

    //Calculate the order total of all items
    const calculateGrandTotal = () => {
        return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    };


    //Check if conversion exists for the selected product and entered unit of measure
    useEffect(() => {
        // Check if any item is missing a conversion
        const missing = items.some(item => {
            if (!item.product_id || !item.unit_of_measure) return false;

            const product = conversions.find(p => p.id.toString() === item.product_id.toString());
            if (!product) return true;

            const hasConversion = product.uom_conversions.some(
                u => u.uom_id.toString() === item.unit_of_measure.toString()
            );

            return !hasConversion;
        });

        setConversionMissing(missing);
    }, [items, conversions]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setItems(prev => ({ ...prev, [name]: value }));
    };

    //Handle the submission of order
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (showModal) return;
        // Validation
        if (!supplierId) {
            toast.error("Please select a supplier.");
            return;
        }

        if (items.some(item =>
            !item.product_id ||
            !item.unit_of_measure ||
            !item.quantity_of_uom_entered ||
            !item.unit_price
        )) {
            toast.error("Please fill all item fields.");
            return;
        }

        const payload = {
            supplier_id: supplierId,
            order_date: orderDate,
            items: items,
            grand_total: calculateGrandTotal()
        };

        console.log("SUBMITTING:", payload); // For debugging
        setIsSubmitting(false);
        try {

            const response = await axios.post(`${API_BASE_URL}purchase/createPurchaseOrder`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            toast.success("Order created successfully!");

            // Reset form
            setSupplierId("");
            setOrderDate(new Date().toISOString().split("T")[0]);
            setItems([
                {
                    product_id: "",
                    unit_of_measure: "",
                    quantity_of_uom_entered: "",
                    unit_price: "",
                },
            ]);

        } catch (error) {
            console.error("Error submitting:", error);
            toast.error("Order could not be created.");
        } finally {
            setIsSubmitting(false);
        }
    };


    //Handle the product and unit of measure selected change
    //To rule out if it really has aconversion or not
    const handleProductOrUOMChange = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = value;
        setItems(updated);

        const { product_id, unit_of_measure } = updated[index];

        if (!product_id || !unit_of_measure) return;

        // Find product WITH its conversions
        const selectedProduct = conversions.find(
            p => p.id.toString() === product_id.toString()
        );

        if (!selectedProduct) return;

        // Check if chosen UOM exists in conversions
        const hasConversion = selectedProduct.uom_conversions.some(
            u => u.uom_id.toString() === unit_of_measure.toString()
        );

        if (!hasConversion) {
            const p = products.find(pr => pr.id.toString() === product_id.toString());
            const u = uoms.find(um => um.id.toString() === unit_of_measure.toString());

            setModalMessage({
                product: p?.name || "",
                uom: u?.name || ""
            });

            setShowModal(true);
            setConversionMissing(true);  // block submit
        } else {
            setConversionMissing(false); // allow submit
        }
    };

    //Function to display the conversion of selected unit of measure.
    //ie if uom strip contains 5 tablets, for aspecific product
    //and its se;ected we show 1 strip contains 5 tablets
    const renderUnitConversion = (item) => {
        if (!item.product_id || !item.unit_of_measure) return null;

        //Check if the product in conversions of the same id, like the product were 
        //on
        const productConv = conversions.find(
            p => p.id.toString() === item.product_id.toString()
        );

        //if the product doesnt exist return null
        if (!productConv) return null;

        //Find if the unit of measure entered is valid ie,
        //if the entered uom is equal to any in the conversions
        const uomConv = productConv.uom_conversions.find(
            u => u.uom_id.toString() === item.unit_of_measure.toString()
        );

        //If the unit of measure doesnt exist ,return null
        if (!uomConv) return null;

        const baseUOM = productConv.base_uom?.name || '';//find product's unit of measure
        const multiplier = uomConv.multiplier || 1;  //find the multiplier
        const uomName = uoms.find(u => u.id.toString() === item.unit_of_measure.toString())?.name || '';

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


    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden pt-10">
                <div className="w-full">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <ShoppingCart className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-[30px]">Create Purchase Order</h1>
                        </div>


                        <form onSubmit={handleSubmit}>


                            {/* Order Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                        Supplier <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                        Order Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Items */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-gray-900 dark:text-white">Order Items</h2>

                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Item
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {items.map((item, index) => (
                                        <div
                                            key={index}
                                            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                                        >
                                            {/* Show conversion information if available, for the selected product item's unit of measure */}
                                            {renderUnitConversion(item)}

                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-black-600 font-bold dark:text-gray-400">Item #{index + 1}</span>

                                                {items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                                                {/* Product */}
                                                <div>
                                                    <label className="block text-black-700 font-bold dark:text-gray-300 mb-2">
                                                        Product <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={item.product_id}
                                                        onChange={(e) =>
                                                            handleProductOrUOMChange(index, "product_id", Number(e.target.value))
                                                        }

                                                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 max-h-40 overflow-y-auto"
                                                        required
                                                    >
                                                        <option value="">Select Product</option>

                                                        {/* Show product option values on selection */}
                                                        {products.map((product) => {
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

                                                {/* UOM */}
                                                <div>
                                                    <label className="block text-black-700 font-bold dark:text-gray-300 mb-2">
                                                        Unit of Measure <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={item.unit_of_measure}
                                                        onChange={(e) =>
                                                            handleProductOrUOMChange(index, "unit_of_measure", Number(e.target.value))
                                                        }

                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                                                {/* Quantity */}
                                                <div>
                                                    <label className="block text-black-700 font-bold dark:text-gray-300 mb-2">
                                                        Quantity of UOM entered <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={item.quantity_of_uom_entered}
                                                        onChange={(e) =>
                                                            updateItem(index, 'quantity_of_uom_entered', Number(e.target.value))
                                                        }
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        min="0"
                                                        required
                                                    />
                                                </div>

                                                {/* Unit Price */}
                                                <div>
                                                    <label className="block text-black-700 font-bold dark:text-gray-300 mb-2">
                                                        Unit Price per UOM <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={item.unit_price}
                                                        onChange={(e) =>
                                                            updateItem(index, 'unit_price', Number(e.target.value))
                                                        }
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Item Total */}
                                            {item.quantity_of_uom_entered &&
                                                item.unit_price &&
                                                typeof item.quantity_of_uom_entered === 'number' &&
                                                typeof item.unit_price === 'number' && (
                                                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
                                                        <div className="text-right text-gray-700 dark:text-gray-300">
                                                            Item Sub Total:{' '}
                                                            <span className="text-green-600 dark:text-green-400">
                                                                {calculateItemTotal(item).toFixed(2)}/=
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Grand Total */}
                            <div className="bg-blue-50 dark:bg-blue-900/40 p-4 rounded-lg mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-800 dark:text-gray-200">Grand Total:</span>
                                    <span className="text-blue-700 dark:text-blue-400">
                                        {calculateGrandTotal().toFixed(2)}/=
                                    </span>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-4">


                                <button
                                    type="submit"
                                    disabled={conversionMissing || isSubmitting || showModal}
                                    className={`flex-1 px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2
                                            ${conversionMissing || isSubmitting || showModal
                                            ? "bg-blue-400 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <span className="loader border-2 border-t-transparent border-white w-5 h-5 rounded-full animate-spin"></span>
                                    ) : (
                                        "Create Order"
                                    )}
                                </button>


                            </div>
                        </form>
                    </div>
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
        </>

    );
}
