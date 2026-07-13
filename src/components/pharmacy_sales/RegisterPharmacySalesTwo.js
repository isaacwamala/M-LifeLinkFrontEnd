import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import AsyncSelect from "react-select/async";
import {
    X,
    Package,
    Search,
    Trash2,
    ShoppingCart,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Wallet,
    RefreshCw,
} from "lucide-react";
import { API_BASE_URL } from "../general/constants";
import { toast, ToastContainer } from "react-toastify";
import { getSelectClassNames } from "../general/searchSelectStyles";

function RegisterPharmacySalesTwo() {
    const token = localStorage.getItem("access_token") || "";

    // ─── state ───────────────────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);

    // Accumulated as products are searched & selected (not pre-loaded)
    const [products, setProducts] = useState([]);

    // Cart rows — starts empty; rows are added when a product is selected
    const [productRows, setProductRows] = useState([]);

    // AsyncSelect controlled value (cleared after each selection)
    const [searchProduct, setSearchProduct] = useState(null);

    // Which rows have their "other batches" panel open: { rowIndex: bool }
    const [expandedBatches, setExpandedBatches] = useState({});

    // Selected registered customer (null = walk-in)
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [customerDetails, setCustomerDetails] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
    });

    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentDate, setPaymentDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    // Amount the customer is paying now (walk-ins are locked to totalAmount)
    const [amountPaid, setAmountPaid] = useState(0);

    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptPdfUrl, setReceiptPdfUrl] = useState(null);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const [receiptCustomerBalance, setReceiptCustomerBalance] = useState(null);

    const searchDebounceRef = useRef(null);
    const customerSearchDebounceRef = useRef(null);

    // ─── helpers ──────────────────────────────────────────────────────────────

    const getProductById = (productId) =>
        products.find((p) => p.product_id === parseInt(productId)) || null;

    // ─── handlers — identical logic to RegisterPharmacySales.js ─────────────

    /**
     * Update a row when its product changes.
     * Called by addProductFromSearch (mirrored) and still available for direct
     * programmatic use (e.g. if a row's product ever needs swapping).
     */
    const handleProductChange = (index, productId) => {
        const prod = products.find((p) => p.product_id === parseInt(productId));
        const updatedRows = [...productRows];
        if (!prod) return;

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

    const handleUOMChange = (index, uomId) => {
        const updatedRows = [...productRows];
        updatedRows[index].selected_uom_id = uomId;
        setProductRows(updatedRows);
    };

    const handleQuantityChange = (index, quantity) => {
        const updatedRows = [...productRows];
        updatedRows[index].quantity_per_unit = quantity;
        setProductRows(updatedRows);
    };

    const removeProductRow = (index) => {
        setProductRows((prev) => prev.filter((_, i) => i !== index));
        // Shift expandedBatches keys after the removed index
        setExpandedBatches((prev) => {
            const next = {};
            Object.entries(prev).forEach(([k, v]) => {
                const ki = parseInt(k);
                if (ki < index) next[ki] = v;
                else if (ki > index) next[ki - 1] = v;
            });
            return next;
        });
    };

    const handleBatchChange = (index, batchId) => {
        const updatedRows = [...productRows];
        const product = getProductById(updatedRows[index].product_id);
        if (!product) return;

        const batch = product.batches.find((b) => b.batch_id === batchId);
        if (!batch) return;

        updatedRows[index].batch_id = batchId;
        updatedRows[index].stock_quantity = batch.quantity_in_base_uom ?? 0;
        updatedRows[index].discounted_price = batch.selling_price ?? 0;
        updatedRows[index].supplier_price = batch.supplier_price ?? 0;

        setProductRows(updatedRows);
    };

    const calculateSubtotal = (row) => {
        const quantity = parseFloat(row.quantity_per_unit) || 0;
        const price = parseFloat(row.discounted_price) || 0;

        // Factor in the UOM multiplier so that e.g. 2 strips × 10 × UGX 300 = 6,000
        // rather than just 2 × 300. When no UOM is selected the multiplier stays 1.
        let multiplier = 1;
        if (row.selected_uom_id && row.uom_conversions) {
            const selectedUOM = row.uom_conversions.find(
                (uom) => uom.uom_id === parseInt(row.selected_uom_id)
            );
            if (selectedUOM) multiplier = selectedUOM.multiplier || 1;
        }

        return (quantity * multiplier * price).toFixed(2);
    };

    const calculateProposedQuantity = (row) => {
        if (!row.product_id || !row.selected_uom_id) return 0;

        const selectedProduct = getProductById(row.product_id);
        if (!selectedProduct) return 0;

        const selectedUOM = selectedProduct.uom_conversions.find(
            (uom) => uom.uom_id === parseInt(row.selected_uom_id)
        );
        if (!selectedUOM) return 0;

        const quantityPerUnit = parseFloat(row.quantity_per_unit) || 0;
        return (quantityPerUnit * selectedUOM.multiplier).toFixed(2);
    };

    const allProductsHaveUOM = () => {
        const selectedRows = productRows.filter((row) => row.product_id !== "");
        if (selectedRows.length === 0) return true;
        return selectedRows.every((row) => {
            const product = getProductById(row.product_id);
            return (
                product &&
                product.uom_conversions &&
                product.uom_conversions.length > 0
            );
        });
    };

    const openReceiptPreview = async (saleId, customerBalance) => {
        setReceiptPdfUrl(null);
        setReceiptCustomerBalance(customerBalance);
        setReceiptLoading(true);
        setShowReceiptModal(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}sales/receipt`,
                { sale_id: saleId },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: "blob",
                }
            );
            const file = new Blob([response.data], { type: "application/pdf" });
            const url = URL.createObjectURL(file);
            setReceiptPdfUrl(url);
        } catch (error) {
            console.error("Error generating receipt:", error);
            toast.error("Failed to generate receipt");
            setShowReceiptModal(false);
        } finally {
            setReceiptLoading(false);
        }
    };

    const closeReceiptModal = () => {
        setShowReceiptModal(false);
        setReceiptLoading(false);
        if (receiptPdfUrl) {
            URL.revokeObjectURL(receiptPdfUrl);
            setReceiptPdfUrl(null);
        }
        setReceiptCustomerBalance(null);
    };

    // ─── customer selector helpers ────────────────────────────────────────────

    const clearCustomer = () => {
        setSelectedCustomer(null);
        // If the cashier had account_deposit selected, fall back to cash
        if (paymentMethod === "account_deposit") {
            setPaymentMethod("cash");
        }
    };

    // Derived option object for the controlled AsyncSelect value
    const selectedCustomerOption = selectedCustomer
        ? {
            value: selectedCustomer.id,
            label: `${selectedCustomer.name} (${selectedCustomer.phone_number})`,
            payload: selectedCustomer,
        }
        : null;

    // ─── derived values ───────────────────────────────────────────────────────

    // All rows have product_id set (added via addProductFromSearch), so
    // activeRows === productRows, but keep the filter for safety
    const activeRows = productRows.filter((r) => r.product_id !== "");

    const totalAmount = activeRows.reduce(
        (sum, row) => sum + parseFloat(calculateSubtotal(row)),
        0
    );

    const balanceRemaining = Math.max(0, totalAmount - parseFloat(amountPaid || 0));

    const depositExceedsBalance =
        paymentMethod === "account_deposit" &&
        parseFloat(amountPaid || 0) > (selectedCustomer?.account_deposit_amount ?? 0);

    // ─── effects — declared after derived values so totalAmount is in scope ───

    // Populate / clear customerDetails whenever the selected customer changes.
    useEffect(() => {
        if (selectedCustomer) {
            setCustomerDetails({
                name: selectedCustomer.name || "",
                phone: selectedCustomer.phone_number || "",
                email: selectedCustomer.email || "",
                address: selectedCustomer.location || "",
            });
        } else {
            setCustomerDetails({ name: "", phone: "", email: "", address: "" });
        }
    }, [selectedCustomer]);

    // Keep amountPaid in sync with totalAmount.
    // Walk-ins are locked to the full total at all times (field is disabled).
    // When a customer is first selected or the cart changes, reset to the full
    // total as the default — the cashier can then edit it down for partial pay.
    useEffect(() => {
        setAmountPaid(totalAmount);
    }, [totalAmount, selectedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── handleSubmit ─────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const transformedProducts = productRows.map((row) => ({
            product_id: parseInt(row.product_id),
            selected_uom_id: parseInt(row.selected_uom_id),
            quantity: parseInt(row.quantity_per_unit),
            quantity_per_unit: parseInt(row.quantity_per_unit),
            discounted_price: parseInt(row.discounted_price),
            batch_id: row.batch_id,
        }));

        const payload = {
            customer_id: selectedCustomer?.id ?? null,
            amount_paid: parseFloat(amountPaid),
            customer_details: customerDetails,
            products: transformedProducts,
            payment_method: paymentMethod,
            payment_date: paymentDate,
        };

        try {
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

            // Reset only after success
            setSelectedCustomer(null);
            setAmountPaid(0);
            setCustomerDetails({ name: "", phone: "", email: "", address: "" });
            setProductRows([]);
            setProducts([]);
            setExpandedBatches({});
            setPaymentMethod("cash");
            setPaymentDate("");

            // Open receipt immediately
            openReceiptPreview(response.data.data.id, response.data.customer_balance);

        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // ─── AsyncSelect: load product options via search endpoint ────────────────

    const loadOptions = (inputValue) =>
        new Promise((resolve) => {
            if (inputValue.length < 2) {
                resolve([]);
                return;
            }
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = setTimeout(async () => {
                try {
                    const response = await axios.get(
                        `${API_BASE_URL}sales/getSellableProductBatchesWithUom`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                Accept: "application/json",
                            },
                            params: { search: inputValue },
                        }
                    );
                    const data = response.data.products || [];

                    // Sort batches FEFO (nearest expiry first) — mirrors useEffect in v1
                    const sorted = data.map((prod) => ({
                        ...prod,
                        batches: (prod.batches || []).sort(
                            (a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)
                        ),
                    }));

                    // Cache full payload in the option so no extra fetch is needed on select
                    const options = sorted.map((prod) => {
                        const variantText = (prod.variant_options || [])
                            .slice(0, 2)
                            .map((v) => `${v.option_name}: ${v.option_value}`)
                            .join(", ");
                        return {
                            value: prod.product_id,
                            label: variantText
                                ? `${prod.name} (${variantText})`
                                : prod.name,
                            payload: prod,
                        };
                    });

                    // Barcode auto-add: only trigger when the typed input is an EXACT match
                    // against a returned product's barcode or internal_barcode — never based
                    // on the shape of the input (single word ≠ barcode; product names are
                    // often single words too, e.g. "Panadol").
                    const trimmedInput = inputValue.trim();
                    const barcodeMatch = options.find((opt) => {
                        const p = opt.payload;
                        return (
                            (p.barcode && p.barcode === trimmedInput) ||
                            (p.internal_barcode && p.internal_barcode === trimmedInput)
                        );
                    });

                    if (barcodeMatch) {
                        addProductFromSearch(barcodeMatch);
                        resolve([]); // close the dropdown, item's already added
                        return;
                    }

                    resolve(options);
                } catch {
                    resolve([]);
                }
            }, 300);
        });

    // ─── AsyncSelect: load customer options ───────────────────────────────────

    const loadCustomerOptions = (inputValue) =>
        new Promise((resolve) => {
            if (inputValue.length < 2) {
                resolve([]);
                return;
            }
            if (customerSearchDebounceRef.current)
                clearTimeout(customerSearchDebounceRef.current);
            customerSearchDebounceRef.current = setTimeout(async () => {
                try {
                    const response = await axios.get(
                        `${API_BASE_URL}customers/getLightWeightCustomers`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                Accept: "application/json",
                            },
                            params: { search: inputValue },
                        }
                    );
                    const data = response.data.customers || [];
                    const options = data.map((customer) => ({
                        value: customer.id,
                        label: `${customer.name} (${customer.phone_number})`,
                        payload: customer,
                    }));
                    resolve(options);
                } catch {
                    resolve([]);
                }
            }, 300);
        });

    // ─── add a row from AsyncSelect selection ────────────────────────────────

    const addProductFromSearch = (option) => {
        if (!option) return;
        const prod = option.payload;

        // Accumulate into products state so getProductById / handleBatchChange work
        setProducts((prev) => {
            if (prev.find((p) => p.product_id === prod.product_id)) return prev;
            return [...prev, prod];
        });

        // Build the new row — same field shape as handleProductChange produces
        const nearestBatch = prod.batches?.[0] || null;
        const newRow = {
            product_id: prod.product_id,
            base_uom_id: prod.base_uom?.uom_id || "",
            base_uom_display: prod.base_uom?.name || "",
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

        setProductRows((prev) => [...prev, newRow]);
        setSearchProduct(null); // clear the search input
    };

    // ─── batch panel toggle ───────────────────────────────────────────────────

    const toggleBatchExpand = (index) =>
        setExpandedBatches((prev) => ({ ...prev, [index]: !prev[index] }));

    // ─── render ───────────────────────────────────────────────────────────────

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-gray-900 dark:to-indigo-950/30 p-4 md:p-6 transition-colors duration-300">
                <ToastContainer />

                <h1 className="text-center mb-5 text-slate-800 dark:text-white text-2xl md:text-3xl font-bold tracking-tight">
                    Pharmacy POS Terminal
                </h1>

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col lg:flex-row gap-5 items-start">

                        {/* ══════════════════════════════════════════
                            LEFT COLUMN — search · customer details
                        ══════════════════════════════════════════ */}
                        <div className="w-full lg:w-[65%] space-y-4">

                            {/* Notice Banner */}
                            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                    Only <strong>outlet stock</strong> is shown here. Batches are
                                    pre-selected by&nbsp;<strong>FEFO</strong> (First Expiry, First
                                    Out) — the nearest-expiry batch is always consumed first.
                                </span>
                            </div>

                            {/* Search Products Card */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm transition-colors duration-300">
                                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">
                                    <Search className="w-5 h-5 text-blue-500" />
                                    Search Products
                                </h2>

                                <AsyncSelect
                                    loadOptions={loadOptions}
                                    value={searchProduct}
                                    onChange={addProductFromSearch}
                                    placeholder="Search by product name or scan barcode..."
                                    noOptionsMessage={({ inputValue }) =>
                                        inputValue.length < 2
                                            ? "Type at least 2 characters to search…"
                                            : "No products found"
                                    }
                                    loadingMessage={() => "Searching…"}
                                    isClearable
                                    unstyled
                                    classNamePrefix="prs"
                                    classNames={{
                                        ...getSelectClassNames(),
                                        control: (state) =>
                                            "!min-h-[56px] !rounded-xl !border-2 !text-base !shadow-none !transition-all " +
                                            (state.isFocused
                                                ? "!border-indigo-500 !ring-4 !ring-indigo-500/15 !bg-white dark:!bg-gray-700"
                                                : "!border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-700"),
                                        placeholder: () =>
                                            "!text-gray-400 dark:!text-gray-500 !text-base",
                                        singleValue: () =>
                                            "!text-gray-900 dark:!text-white !text-base",
                                        input: () =>
                                            "!text-gray-900 dark:!text-white !text-base",
                                        valueContainer: () => "!px-4 !py-2",
                                    }}
                                />
                            </div>

                            {/* Customer Details Card */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm transition-colors duration-300">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                    Customer Details{" "}
                                    <span className="font-normal text-gray-400 dark:text-gray-500">
                                        (Optional)
                                    </span>
                                </h2>

                                {/* Registered customer AsyncSelect + clear button */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1">
                                        <AsyncSelect
                                            loadOptions={loadCustomerOptions}
                                            value={selectedCustomerOption}
                                            onChange={(opt) =>
                                                setSelectedCustomer(opt ? opt.payload : null)
                                            }
                                            placeholder="Search existing customer…"
                                            noOptionsMessage={({ inputValue }) =>
                                                inputValue.length < 2
                                                    ? "Type at least 2 characters to search…"
                                                    : "No customers found"
                                            }
                                            loadingMessage={() => "Searching…"}
                                            unstyled
                                            classNamePrefix="crs"
                                            classNames={{
                                                ...getSelectClassNames(),
                                                control: (state) =>
                                                    "!rounded-lg !border !text-sm !shadow-none !transition-all " +
                                                    (state.isFocused
                                                        ? "!border-indigo-500 !ring-2 !ring-indigo-500/20 !bg-white dark:!bg-gray-700"
                                                        : "!border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-700"),
                                                placeholder: () =>
                                                    "!text-gray-400 dark:!text-gray-500 !text-sm",
                                                singleValue: () =>
                                                    "!text-gray-900 dark:!text-white !text-sm",
                                                input: () =>
                                                    "!text-gray-900 dark:!text-white !text-sm",
                                                valueContainer: () => "!px-3 !py-1.5",
                                            }}
                                        />
                                    </div>
                                    {selectedCustomer && (
                                        <button
                                            type="button"
                                            onClick={clearCustomer}
                                            title="Clear customer"
                                            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Customer balance info panel — only when a customer is selected */}
                                {selectedCustomer && (
                                    <div className="mb-3 flex items-start gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-lg px-3 py-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                                        <Wallet className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <div className="space-y-0.5">
                                            <div>
                                                Deposit balance:{" "}
                                                <span className="font-semibold">
                                                    UGX{" "}
                                                    {(
                                                        selectedCustomer.account_deposit_amount || 0
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                            <div>
                                                Owes pharmacy:{" "}
                                                <span className="font-semibold">
                                                    UGX{" "}
                                                    {(
                                                        selectedCustomer.account_sale_balance || 0
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Detail fields — disabled and pre-filled when a customer is selected */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        { key: "name", placeholder: "Name", type: "text" },
                                        { key: "phone", placeholder: "Phone", type: "text" },
                                        { key: "email", placeholder: "Email", type: "email" },
                                        { key: "address", placeholder: "Address", type: "text" },
                                    ].map(({ key, placeholder, type }) => (
                                        <input
                                            key={key}
                                            type={type}
                                            placeholder={placeholder}
                                            disabled={!!selectedCustomer}
                                            className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors focus:outline-none ${selectedCustomer
                                                ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                }`}
                                            value={customerDetails[key]}
                                            onChange={(e) =>
                                                setCustomerDetails((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.value,
                                                }))
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ══════════════════════════════════════════
                            RIGHT COLUMN — sticky order panel
                        ══════════════════════════════════════════ */}

                        <div className="w-full lg:w-[35%]">
                            <div className="lg:sticky lg:top-6">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md overflow-hidden transition-colors duration-300">

                                    {/* Panel header */}
                                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                        <ShoppingCart className="w-5 h-5 text-blue-500" />
                                        <h2 className="font-bold text-gray-800 dark:text-white text-sm">
                                            Current Order
                                        </h2>
                                    </div>

                                    {/* Items list (scrollable) */}
                                    <div className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
                                        {activeRows.length === 0 ? (
                                            /* Empty state */
                                            <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                                                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                <p className="text-sm">
                                                    No items — search a product to add
                                                </p>
                                            </div>
                                        ) : (
                                            activeRows.map((row, idx) => {
                                                const selectedProduct = getProductById(row.product_id);
                                                const hasUOM =
                                                    selectedProduct &&
                                                    selectedProduct.uom_conversions.length > 0;

                                                const variantText = (row.variant_options || [])
                                                    .slice(0, 2)
                                                    .map((v) => `${v.option_name}: ${v.option_value}`)
                                                    .join(", ");
                                                const productName = variantText
                                                    ? `${selectedProduct?.name || ""} (${variantText})`
                                                    : selectedProduct?.name || `Product #${row.product_id}`;

                                                // Resolve current batch from full product list (stays
                                                // correct after handleBatchChange updates row.batch_id)
                                                const currentBatch = selectedProduct
                                                    ? (selectedProduct.batches || []).find(
                                                        (b) => b.batch_id === row.batch_id
                                                    )
                                                    : null;

                                                const otherBatches = selectedProduct
                                                    ? (selectedProduct.batches || []).filter(
                                                        (b) => b.batch_id !== row.batch_id
                                                    )
                                                    : [];

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-800 transition-colors"
                                                    >
                                                        {/* Row header: name + remove */}
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="text-sm font-medium text-gray-800 dark:text-white leading-tight">
                                                                {productName}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeProductRow(idx)}
                                                                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0 transition-colors"
                                                                title="Remove item"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        {/* FEFO batch badge */}
                                                        {currentBatch ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700/50">
                                                                FEFO&nbsp;·&nbsp;
                                                                {currentBatch.batch_number}&nbsp;·&nbsp;
                                                                Exp:&nbsp;{currentBatch.expiry_date}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                No batch available
                                                            </span>
                                                        )}

                                                        {/* Other batches — collapsed by default */}
                                                        {otherBatches.length > 0 && (
                                                            <div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleBatchExpand(idx)}
                                                                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                                                                >
                                                                    {expandedBatches[idx] ? (
                                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                                    ) : (
                                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                                    )}
                                                                    {expandedBatches[idx]
                                                                        ? "Hide other batches"
                                                                        : `+${otherBatches.length} other batch${otherBatches.length > 1 ? "es" : ""} — click to switch`}
                                                                </button>

                                                                {expandedBatches[idx] && (
                                                                    <div className="mt-2 space-y-1.5">
                                                                        {otherBatches.map((batch) => (
                                                                            <button
                                                                                key={batch.batch_id}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleBatchChange(
                                                                                        idx,
                                                                                        batch.batch_id
                                                                                    )
                                                                                }
                                                                                className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 active:scale-[0.98] transition-all shadow-sm"
                                                                            >
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <span className="font-semibold truncate">
                                                                                        {batch.batch_number}
                                                                                    </span>
                                                                                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 text-[10px]">
                                                                                        Exp: {batch.expiry_date}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="mt-1 text-gray-500 dark:text-gray-400">
                                                                                    Stock:&nbsp;
                                                                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                                                        {(batch.quantity_in_base_uom || 0).toLocaleString()}
                                                                                    </span>
                                                                                    &nbsp;units&nbsp;·&nbsp;
                                                                                    <span className="text-green-600 dark:text-green-400 font-semibold">
                                                                                        UGX {(batch.selling_price || 0).toLocaleString()}
                                                                                    </span>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* UOM select */}
                                                        {hasUOM ? (
                                                            <select
                                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                                value={row.selected_uom_id || ""}
                                                                onChange={(e) =>
                                                                    handleUOMChange(idx, e.target.value)
                                                                }
                                                            >
                                                                <option value="">Select UOM…</option>
                                                                {(selectedProduct?.uom_conversions || []).map(
                                                                    (uom) => (
                                                                        <option
                                                                            key={uom.uom_id}
                                                                            value={uom.uom_id}
                                                                        >
                                                                            {uom.name} (×{uom.multiplier})
                                                                        </option>
                                                                    )
                                                                )}
                                                            </select>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400 text-xs">
                                                                <Package className="w-3 h-3 shrink-0" />
                                                                No UOM configured — set up in Unit
                                                                Converter
                                                            </div>
                                                        )}

                                                        {/* Qty · unit price · subtotal */}
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                                value={row.quantity_per_unit}
                                                                onChange={(e) =>
                                                                    handleQuantityChange(
                                                                        idx,
                                                                        parseInt(e.target.value)
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-gray-500 dark:text-gray-400 shrink-0">
                                                                ×&nbsp;
                                                                {parseFloat(
                                                                    row.discounted_price
                                                                ).toLocaleString()}
                                                            </span>
                                                            <span className="ml-auto font-semibold text-green-700 dark:text-green-400 shrink-0">
                                                                {parseFloat(
                                                                    calculateSubtotal(row)
                                                                ).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Payment · summary · submit */}
                                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-3">

                                        {/* UOM warning */}
                                        {!allProductsHaveUOM() && activeRows.length > 0 && (
                                            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg p-2 text-xs text-red-600 dark:text-red-400">
                                                <Package className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                <span>
                                                    Some products have no UOM configured. Set them
                                                    up in the Unit Converter before charging.
                                                </span>
                                            </div>
                                        )}

                                        {/* Payment Method — pill/segmented buttons */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                                Payment Method{" "}
                                                <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-2 flex-wrap">
                                                {[
                                                    { value: "cash", label: "Cash" },
                                                    { value: "mobile_money", label: "Mobile Money" },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setPaymentMethod(opt.value)}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${paymentMethod === opt.value
                                                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500"
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}

                                                {/* Account Deposit pill — only usable when a customer with a deposit balance is selected */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod("account_deposit")}
                                                    disabled={
                                                        !selectedCustomer ||
                                                        (selectedCustomer?.account_deposit_amount ?? 0) <= 0
                                                    }
                                                    title={
                                                        !selectedCustomer
                                                            ? "Select a customer to use their deposit"
                                                            : (selectedCustomer?.account_deposit_amount ?? 0) <= 0
                                                                ? "Customer has no deposit balance"
                                                                : undefined
                                                    }
                                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${paymentMethod === "account_deposit"
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                                        : !selectedCustomer ||
                                                            (selectedCustomer?.account_deposit_amount ?? 0) <= 0
                                                            ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500"
                                                        }`}
                                                >
                                                    Account Deposit
                                                </button>
                                            </div>
                                        </div>

                                        {/* Amount Paid */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                                Amount Paid{" "}
                                                <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={totalAmount}
                                                step="0.01"
                                                disabled={!selectedCustomer}
                                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors focus:outline-none ${!selectedCustomer
                                                    ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                    : depositExceedsBalance
                                                        ? "border-red-400 dark:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    }`}
                                                value={amountPaid}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value) || 0;
                                                    // Clamp to [0, totalAmount]
                                                    setAmountPaid(
                                                        Math.min(Math.max(0, v), totalAmount)
                                                    );
                                                }}
                                            />

                                            {/* Walk-in lock helper */}
                                            {!selectedCustomer && (
                                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                                    Full payment is required for walk-in customers.
                                                    Select a registered customer to allow partial
                                                    payment.
                                                </p>
                                            )}

                                            {/* Account deposit overage error */}
                                            {depositExceedsBalance && (
                                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                                    Exceeds available deposit balance (UGX{" "}
                                                    {(
                                                        selectedCustomer?.account_deposit_amount ?? 0
                                                    ).toLocaleString()}
                                                    ).
                                                </p>
                                            )}

                                            {/* Live balance remaining — only shown when paying partially */}
                                            {selectedCustomer &&
                                                parseFloat(amountPaid || 0) < totalAmount && (
                                                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                                        Balance remaining: UGX{" "}
                                                        {balanceRemaining.toLocaleString()}
                                                    </p>
                                                )}
                                        </div>

                                        {/* Payment Date */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                                Payment Date{" "}
                                                <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                                value={paymentDate}
                                                onChange={(e) => setPaymentDate(e.target.value)}
                                            />
                                        </div>

                                        {/* Summary line */}
                                        <div className="flex items-center justify-between text-sm pt-1">
                                            <span className="text-gray-500 dark:text-gray-400">
                                                {activeRows.length}&nbsp;item
                                                {activeRows.length !== 1 ? "s" : ""}
                                            </span>
                                            <span className="font-bold text-gray-800 dark:text-white">
                                                Total:&nbsp;UGX&nbsp;
                                                {parseFloat(totalAmount.toFixed(2)).toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Submit — full-width charge button */}
                                        <button
                                            type="submit"
                                            disabled={
                                                submitting ||
                                                !allProductsHaveUOM() ||
                                                activeRows.length === 0 ||
                                                (selectedCustomer === null &&
                                                    parseFloat(amountPaid || 0) < totalAmount) ||
                                                depositExceedsBalance
                                            }
                                            className="w-full py-3 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            {submitting
                                                ? "Processing…"
                                                : `Charge UGX ${parseFloat(
                                                    totalAmount.toFixed(2)
                                                ).toLocaleString()}`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>


            </div>

            {showReceiptModal && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
                    <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Sale Receipt</h3>
                        <button
                            onClick={closeReceiptModal}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg font-bold leading-none"
                        >
                            ✕
                        </button>
                    </div>

                    {receiptCustomerBalance !== null && (
                        <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/50 text-sm text-amber-700 dark:text-amber-300 flex-shrink-0">
                            Outstanding balance across all sales: UGX {Number(receiptCustomerBalance).toLocaleString()}
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {receiptLoading ? (
                            <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                                <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
                                <span className="text-sm">Generating receipt…</span>
                            </div>
                        ) : receiptPdfUrl ? (
                            <iframe src={receiptPdfUrl} title="Sale Receipt" className="w-full h-full border-0" />
                        ) : null}
                    </div>

                    {receiptPdfUrl && !receiptLoading && (
                        <div className="px-5 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <a
                                href={receiptPdfUrl}
                                download="receipt.pdf"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                            >
                                Download Receipt
                            </a>
                        </div>
                    )}
                </div>
            )}

        </>

    );
}

export default RegisterPharmacySalesTwo;
