import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, X, Package } from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import { toast, ToastContainer } from 'react-toastify';
import Select from "react-select";



function RegisterPharmacySales() {
    const token = localStorage.getItem("access_token") || "";
    const [submitting, setSubmitting] = useState(false);
    const [products, setProducts] = useState([]);
    const [productRows, setProductRows] = useState([
        {
            product_id: "",
            selected_uom_id: "",
            quantity_per_unit: 1,
            discounted_price: "0",
            stock_quantity: 0,
            base_uom_display: "",
        },
    ]);

    const [loading, setLoading] = useState(true);
    const [customerDetails, setCustomerDetails] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
    });

    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentDate, setPaymentDate] = useState("");

    //This fetches products along with their batches and UOM conversions
    //It also sorts the batches by expiry date (nearest first)
    //This ensures that we  sell products through batches that are near expiry first
    useEffect(() => {
        const fetchProductsBatchesWithUomConversions = async () => {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}sales/getProductsBaseUomWithUomConversions`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/json",
                        },
                    }
                );
                const data = response.data.products;

                // Sort batches by expiry date (nearest first)
                //This ensures that when a UOM is selected, 
                // the batch with the nearest expiry date is automatically chosen
                const sortedProducts = data.map(product => ({
                    ...product,
                    batches: (product.batches || []).sort(
                        (a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)
                    )
                }));

                setProducts(sortedProducts);
                console.log("products batch and conversions:", sortedProducts);
            } catch (error) {
                console.error("Error fetching product batches and their uom conversions:", error);
                toast.error("Failed to fetch products");
            } finally {
                setLoading(false);
            }
        };
        fetchProductsBatchesWithUomConversions();
    }, [token]);



    // Handle product change
    const handleProductChange = (index, productId) => {
        const prod = products.find(p => p.product_id === parseInt(productId));
        const updatedRows = [...productRows];

        if (!prod) return;

        // Find nearest batch (first in sorted batches by expiry date)
        const nearestBatch = prod.batches?.[0] || null;

        updatedRows[index] = {
            ...updatedRows[index],
            product_id: prod.product_id,
            base_uom_id: prod.base_uom?.uom_id || "",
            base_uom_display: prod.base_uom ? prod.base_uom.name : "",
            stock_quantity: nearestBatch?.quantity_in_base_uom ?? 0,
            discounted_price: nearestBatch?.selling_price ?? 0,
            selected_uom_id: "",
            quantity_per_unit: 1,
            uom_conversions: prod.uom_conversions || [],
            variant_options: prod.variant_options || [],
            batch_id: nearestBatch?.batch_id ?? null,
            batch_number: nearestBatch?.batch_number ?? null,
            expiry_date: nearestBatch?.expiry_date ?? null,
            supplier_price: nearestBatch?.supplier_price ?? 0,
        };

        setProductRows(updatedRows);
    };




    // Handle UOM change

    //Automatically display the batch with the nearest expiry date  when UOM is selected
    //We consider the nearest batch as the first batch in the sorted batches by expiry date
    const handleUOMChange = (index, uomId) => {
        const updatedRows = [...productRows];
        updatedRows[index].selected_uom_id = uomId;

        setProductRows(updatedRows);
    };




    // Handle quantity change
    const handleQuantityChange = (index, quantity) => {
        const updatedRows = [...productRows];
        updatedRows[index].quantity_per_unit = quantity;
        setProductRows(updatedRows);
    };

    // Remove product row
    const removeProductRow = (index) => {
        const updatedRows = productRows.filter((_, i) => i !== index);
        setProductRows(updatedRows);
    };

    // Add new product row
    const addProductRow = () => {
        setProductRows([
            ...productRows,
            {
                product_id: "",
                selected_uom_id: "",
                quantity_per_unit: 1,
                discounted_price: "0",
                stock_quantity: 0,
                base_uom_display: "",
            },
        ]);
    };

    // Calculate subtotal for a product row
    const calculateSubtotal = (row) => {
        const quantity = parseFloat(row.quantity_per_unit) || 0;
        const price = parseFloat(row.discounted_price) || 0;
        return (quantity * price).toFixed(2);
    };

    // Calculate proposed quantity to buy based on selected UOM
    const calculateProposedQuantity = (row) => {
        if (!row.product_id || !row.selected_uom_id) {
            return 0;
        }

        const selectedProduct = getProductById(row.product_id);
        if (!selectedProduct) return 0;

        // Find the selected UOM conversion
        const selectedUOM = selectedProduct.uom_conversions.find(
            uom => uom.uom_id === parseInt(row.selected_uom_id)
        );

        if (!selectedUOM) return 0;

        // Return proposed quantity directly quantity of UOM selected by the user
        // ie if the user selects Box, and enters 2 as quantity per unit,
        // in backend we send directly 2 as quantity, and 
        // the backend computes final quantity based on UOM multiplier
        const quantityPerUnit = parseFloat(row.quantity_per_unit) || 0;
        const proposedQuantity = quantityPerUnit * selectedUOM.multiplier;

        return proposedQuantity.toFixed(2);
    };

    // Check if all selected products have UOM conversions
    const allProductsHaveUOM = () => {
        // Filter out empty rows (no product selected)
        const selectedRows = productRows.filter(row => row.product_id !== "");

        // If no products are selected (empty form), allow submission to be enabled
        if (selectedRows.length === 0) return true;

        return selectedRows.every(row => {
            const product = getProductById(row.product_id);
            return product && product.uom_conversions && product.uom_conversions.length > 0;
        });
    };


    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Ensure we send quantity of uom selected 
        //Backend will handle the conversion of quantity in base units
        const transformedProducts = productRows.map(row => {
            return {
                product_id: parseInt(row.product_id),
                selected_uom_id: parseInt(row.selected_uom_id),
                //Backend computes the final quantity based on UOM quantity selected by user
                //So now we send the quantity of UOM selected
                quantity: parseInt(row.quantity_per_unit),
                quantity_per_unit: parseInt(row.quantity_per_unit), // Keep for reference if needed
                discounted_price: parseInt(row.discounted_price),
            };
        });

        const payload = {
            customer_details: customerDetails,
            //The back end doesnt compute final quantity based on uom entered by user, 
            // so we convert it here in transformed products
            products: transformedProducts,
            payment_method: paymentMethod,
            payment_date: paymentDate,
        };

        try {
            console.log("Sale payload:", payload);

            await new Promise((resolve) => setTimeout(resolve, 1000));

            setCustomerDetails({ name: "", phone: "", email: "", address: "" });
            setProductRows([
                {
                    product_id: "",
                    selected_uom_id: "",
                    quantity_per_unit: 1,
                    discounted_price: "0",
                    stock_quantity: 0,
                    base_uom_display: "",
                },
            ]);
            setPaymentMethod("cash");
            setPaymentDate("");


            const response = await axios.post(
                `${API_BASE_URL}sales/storeCustomerPharmacySale`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                }
            );
            toast.success(response.data.message);

        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // Get product by ID
    const getProductById = (productId) => {
        return products.find((p) => p.product_id === parseInt(productId));
    };


    //Handle Batch Change toensure if batch is selected for the product,
    //Automatically update the selling price and available stock

    const handleBatchChange = (index, batchId) => {
        const updatedRows = [...productRows];
        const product = getProductById(updatedRows[index].product_id);

        if (!product) return;

        const batch = product.batches.find(b => b.batch_id === batchId);

        if (!batch) return;

        updatedRows[index].batch_id = batchId;
        updatedRows[index].stock_quantity = batch.quantity_in_base_uom ?? 0;
        updatedRows[index].discounted_price = batch.selling_price ?? 0;
        updatedRows[index].supplier_price = batch.supplier_price ?? 0;

        setProductRows(updatedRows);
    };





    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading products...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <>
                <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-indigo-800 dark:via-blue-700 dark:to-black p-8 transition-colors duration-300">
                    <ToastContainer />

                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 border-2 border-dashed border-blue-200 dark:border-blue-700 transition-colors duration-300">
                        <h1 className="text-center mb-6 text-blue-700 dark:text-blue-400 text-3xl md:text-3xl font-bold">
                            Register Pharmacy Sale
                        </h1>


                        <form onSubmit={handleSubmit}>
                            {/* CUSTOMER DETAILS CARD */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 shadow-sm transition-colors duration-300">
                                <h2 className="mb-4 text-green-600 dark:text-green-400">
                                    Customer Details <span className="text-gray-500 dark:text-gray-400">(Optional)</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Customer Name"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={customerDetails.name}
                                            onChange={(e) =>
                                                setCustomerDetails({ ...customerDetails, name: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Phone"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={customerDetails.phone}
                                            onChange={(e) =>
                                                setCustomerDetails({ ...customerDetails, phone: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={customerDetails.email}
                                            onChange={(e) =>
                                                setCustomerDetails({ ...customerDetails, email: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Address"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={customerDetails.address}
                                            onChange={(e) =>
                                                setCustomerDetails({ ...customerDetails, address: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>


                            {/* PRODUCTS SECTION CARD */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 shadow-sm transition-colors duration-300">


                                <h2 className="mb-4 text-green-600 dark:text-green-400">Products</h2>

                                {productRows.map((row, index) => {
                                    const selectedProduct = getProductById(row.product_id);
                                    const hasUOMConversions =
                                        selectedProduct && selectedProduct.uom_conversions.length > 0;

                                    return (
                                        <div
                                            key={index}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-800 transition-colors duration-300"
                                        >
                                            {/* ===========================
                                              FIRST ROW – SELECTION INPUTS
                                            ============================ */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                                                {/* Product Selection */}
                                                <div>
                                                    <label className="block mb-2 font-bold text-gray-900 dark:text-white">
                                                        Select Product (where Qty &gt; 0) <span className="text-red-500">*</span>
                                                    </label>


                                                    <select
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        value={row.product_id || ""}
                                                        onChange={(e) => handleProductChange(index, e.target.value)}
                                                    >
                                                        <option value="">Select a product...</option>

                                                        {products.map((prod) => {
                                                            const label =
                                                                prod.variant_options.length > 0
                                                                    ? `${prod.name} (${prod.variant_options
                                                                        .slice(0, 2)
                                                                        .map((opt) => `${opt.option_name}: ${opt.option_value}`)
                                                                        .join(", ")}${prod.variant_options.length > 2 ? ", ..." : ""
                                                                    })`
                                                                    : prod.name;

                                                            return (
                                                                <option key={prod.product_id} value={prod.product_id}>
                                                                    {label}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>

                                                {/* UOM Selection */}
                                                <div>
                                                    <label className="block mb-2 font-bold text-gray-900 dark:text-white">
                                                        Unit of Measurement
                                                        {selectedProduct && (
                                                            <span className="text-red-900 dark:text-red-400 font-bold text-sm ml-2">
                                                                (Base: {row.base_uom_display})
                                                            </span>
                                                        )}
                                                    </label>

                                                    {selectedProduct ? (
                                                        hasUOMConversions ? (
                                                            <select
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                value={row.selected_uom_id || ""}
                                                                onChange={(e) => handleUOMChange(index, e.target.value)}
                                                            >
                                                                <option value="">Select UOM...</option>

                                                                {selectedProduct.uom_conversions.map((uom) => (
                                                                    <option key={uom.uom_id} value={uom.uom_id}>
                                                                        {`${uom.name} (x${uom.multiplier}) - multiplier`}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <div className="w-full px-4 py-2 border border-red-500 bg-orange-50 dark:bg-red-900 
                                rounded-md text-red-900 dark:text-red-400 font-bold text-sm flex items-center gap-2">
                                                                <Package className="w-4 h-4" />
                                                                No UOM set. Configure in Unit Converter.
                                                            </div>
                                                        )
                                                    ) : (
                                                        <select
                                                            disabled
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-gray-100 dark:bg-gray-800 text-gray-400"
                                                        >
                                                            <option>Select product first</option>
                                                        </select>
                                                    )}
                                                </div>

                                                {/* Quantity per Unit */}
                                                <div>
                                                    <label className="block mb-2 font-bold text-gray-900 dark:text-white">
                                                        Quantity per Unit Of Measure <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="0.01"
                                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
                       rounded-md bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                                        value={row.quantity_per_unit}
                                                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                                                        required
                                                    />
                                                </div>

                                            </div>


                                            {/* ==================================
                                               SECOND SECTION – DISABLED FIELDS
                                              ================================== */}
                                            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 space-y-4">

                                                {/* Batch Info FIRST */}
                                                <div>
                                                    <label className="block mb-2 font-bold text-gray-900 dark:text-white">
                                                        Batch Info(We follow First Expiry First Out,Neary expiry batch is considered) <span className="text-red-500"></span>
                                                    </label>

                                                    {row.product_id ? (
                                                        <div className="space-y-2">

                                                            {/* SHOW CURRENTLY CONSIDERED BATCH */}
                                                            <div className="px-4 py-2 border border-yellow-500 dark:border-yellow-500 
                                                            bg-blue-50 dark:bg-zinc-900 rounded-md 
                                                             text-blue-900 dark:text-blue-200 font-bold">
                                                                {row.batch_id
                                                                    ? `${row.batch_number} (Exp: ${row.expiry_date})`
                                                                    : "No batch available"}
                                                            </div>

                                                            {/* SHOW OTHER BATCHES except considered one */}
                                                            {selectedProduct?.batches
                                                                ?.filter(b => b.batch_id !== row.batch_id)
                                                                .map((batch) => (
                                                                    <div
                                                                        key={batch.batch_id}
                                                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 
                                                                         bg-gray-50 dark:bg-gray-700 rounded-md 
                                                                          text-gray-700 dark:text-gray-300"
                                                                    >
                                                                        {batch.batch_number} (Exp: {batch.expiry_date})
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    ) : (
                                                        <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 
                                                           bg-gray-100 dark:bg-gray-800 rounded-md text-gray-400">
                                                            Select product first
                                                        </div>
                                                    )}
                                                </div>



                                                {/* TWO PER ROW GRID */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                                    {/* Proposed Quantity */}
                                                    <div>
                                                        <label className="block mb-2 font-bold text-green-900 dark:text-green-400">
                                                            Proposed Quantity to Buy
                                                            {selectedProduct && row.selected_uom_id && (
                                                                <span className="text-blue-600 dark:text-blue-400 text-sm ml-2">
                                                                    (in {row.base_uom_display})
                                                                </span>
                                                            )}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900 rounded-md text-blue-700 dark:text-blue-300"
                                                            value={
                                                                row.selected_uom_id
                                                                    ? parseFloat(calculateProposedQuantity(row)).toLocaleString()
                                                                    : "Select UOM first"
                                                            }
                                                            disabled
                                                            readOnly
                                                        />
                                                    </div>

                                                    {/* Unit Selling Price */}
                                                    <div>
                                                        <label className="block mb-2 font-bold text-green-900 dark:text-green-400">
                                                            Unit Selling Price
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white"
                                                            value={parseFloat(row.discounted_price).toLocaleString()}
                                                            disabled
                                                            readOnly
                                                        />
                                                    </div>

                                                    {/* Stock Quantity */}
                                                    <div>
                                                        <label className="block mb-2 font-bold text-green-900 dark:text-green-400">
                                                            Quantity in Stock
                                                            {selectedProduct && (
                                                                <span className="text-stone-700 dark:text-stone-400 font-bold text-sm ml-2">
                                                                    (Base uom: {row.base_uom_display})
                                                                </span>
                                                            )}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white"
                                                            value={row.stock_quantity.toLocaleString()}
                                                            disabled
                                                            readOnly
                                                        />
                                                    </div>

                                                    {/* Subtotal */}
                                                    <div>
                                                        <label className="block mb-2 text-gray-900 dark:text-white">
                                                            Subtotal
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-4 py-2 border border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900 rounded-md text-green-700 dark:text-green-300"
                                                            value={parseFloat(calculateSubtotal(row)).toLocaleString()}
                                                            disabled
                                                            readOnly
                                                        />
                                                    </div>

                                                </div>

                                            </div>

                                            {/* Remove Button */}
                                            <div className="flex justify-end mt-4">
                                                {productRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center gap-2"
                                                        onClick={() => removeProductRow(index)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Remove Product
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add New Product Row */}
                                <div className="text-center mt-4">
                                    <button
                                        type="button"
                                        className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-md hover:bg-gray-900 dark:hover:bg-gray-800 flex items-center gap-2"
                                        onClick={addProductRow}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Product
                                    </button>
                                </div>
                            </div>




                            {/* PAYMENT SECTION CARD */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 shadow-sm transition-colors duration-300">
                                <h2 className="mb-4 text-green-600 dark:text-green-400">Payment Details</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block mb-2 text-gray-900 dark:text-white">
                                            Payment Method <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            required
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="mobile_money">Mobile Money</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-gray-900 dark:text-white">
                                            Payment Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Warning message if products don't have UOM */}
                            {!allProductsHaveUOM() && productRows.some(row => row.product_id !== "") && (
                                <div className="bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6 transition-colors duration-300">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                        <Package className="w-5 h-5" />
                                        <p>
                                            <strong>Cannot submit:</strong> All selected products must have Unit of Measurement conversions configured. Please configure UOM in the Unit Converter or select different products.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* SUBMIT BUTTON */}
                            <div className="text-center mt-6">
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-gradient-to-r from-blue-400 via-green-500 to-blue-600 text-white rounded-md hover:from-blue-500 hover:via-green-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={submitting || !allProductsHaveUOM()}
                                >
                                    {submitting ? "Submitting..." : "Register Sale"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </>


        </>
    );
}

export default RegisterPharmacySales;