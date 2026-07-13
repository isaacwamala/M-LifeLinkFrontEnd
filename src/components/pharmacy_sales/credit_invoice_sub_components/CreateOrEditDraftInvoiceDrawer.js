import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import { X, Plus, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';
import { getSelectClassNames } from '../../general/searchSelectStyles';
import { toast } from 'react-toastify';

const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};

const fmt = (v) => `UGX ${Number(v || 0).toLocaleString()}`;



export function CreateOrEditDraftInvoiceDrawer({ isOpen, onClose, invoice, token, onSuccess }) {
    const isEditing = Boolean(invoice);

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [lineItems, setLineItems] = useState([]);
    const [searchProduct, setSearchProduct] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const productDebounceRef = useRef(null);
    const customerDebounceRef = useRef(null);

    // ── Pre-populate when editing ──────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && isEditing && invoice) {
            setSelectedCustomer(invoice.customer
                ? { value: invoice.customer.id, label: `${invoice.customer.name} (${invoice.customer.phone_number || ''})`, payload: invoice.customer }
                : null
            );
            setDueDate(invoice.due_date ? invoice.due_date.split('T')[0] : '');
            setNotes(invoice.notes || '');

            // Prefill immediately with the single known UOM so qty/price show right away.
            const baseLines = (invoice.products || []).map(line => ({
                product_id: line.product_id,
                name: line.name,
                uom_conversions: [{
                    uom_id: line.selected_uom_id,
                    uom_name: line.selected_uom_name,
                    multiplier: line.selected_uom_multiplier || 1,
                }],
                selected_uom_id: String(line.selected_uom_id),
                quantity: String(line.quantity_of_uom_selected),
                unit_price: String(line.unit_price),
            }));
            setLineItems(baseLines);

            // Backfill the full uom_conversions list per product using the existing
            // search endpoint (no backend change needed) — search by product name.
            (async () => {
                try {
                    const results = await Promise.all(
                        (invoice.products || []).map(line =>
                            axios.get(`${API_BASE_URL}sales/getSellableProductBatchesWithUom`, {
                                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                                params: { search: line.name },
                            })
                                .then(res => (res.data.products || []).find(p => p.product_id === line.product_id) || null)
                                .catch(() => null)
                        )
                    );
                    setLineItems(prev => prev.map((item, i) => {
                        const prod = results[i];
                        if (!prod?.uom_conversions?.length) return item;
                        return {
                            ...item,
                            uom_conversions: prod.uom_conversions.map(u => ({
                                uom_id: u.uom_id,
                                uom_name: u.name,
                                multiplier: u.multiplier,
                            })),
                        };
                    }));
                } catch {
                    // keep single-option fallback if this fails
                }
            })();
        } else if (isOpen && !isEditing) {
            setSelectedCustomer(null);
            setDueDate('');
            setNotes('');
            setLineItems([]);
        }
        setSearchProduct(null);
    }, [isOpen, invoice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Credit-enabled check ───────────────────────────────────────────────────
    const creditDisabled = selectedCustomer && selectedCustomer.payload?.credit_enabled === false;

    // ── UOM multiplier lookup ──────────────────────────────────────────────────
    //get multiplier from the selected uom when item is selected
    const getMultiplier = (item) => {
        const uom = (item.uom_conversions || []).find(u => String(u.uom_id) === String(item.selected_uom_id));
        return uom?.multiplier ?? 1;
    };

    // ── Running total ──────────────────────────────────────────────────────────
    const total = lineItems.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const multiplier = getMultiplier(item);
        return sum + qty * multiplier * price;
    }, 0);

    // ── Product AsyncSelect ────────────────────────────────────────────────────
    const loadProductOptions = (inputValue) =>
        new Promise((resolve) => {
            if (inputValue.length < 2) { resolve([]); return; }
            if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
            productDebounceRef.current = setTimeout(async () => {
                try {
                    const res = await axios.get(`${API_BASE_URL}sales/getSellableProductBatchesWithUom`, {
                        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                        params: { search: inputValue },
                    });
                    const data = (res.data.products || []).map(prod => ({
                        ...prod,
                        batches: (prod.batches || []).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)),
                    }));
                    resolve(data.map(prod => {
                        const variantText = (prod.variant_options || []).slice(0, 2).map(v => `${v.option_name}: ${v.option_value}`).join(', ');
                        return {
                            value: prod.product_id,
                            label: variantText ? `${prod.name} (${variantText})` : prod.name,
                            payload: prod,
                        };
                    }));
                } catch { resolve([]); }
            }, 300);
        });

    const addProduct = (opt) => {
        if (!opt) return;
        const prod = opt.payload;
        const nearestBatch = prod.batches?.[0] || null;
        const uomConversions = (prod.uom_conversions || []).map(u => ({
            uom_id: u.uom_id,
            uom_name: u.name,
            multiplier: u.multiplier,
        }));
        const baseUom = uomConversions.find(u => u.multiplier === 1) || uomConversions[0];

        setLineItems(prev => [...prev, {
            product_id: prod.product_id,
            name: opt.label,
            uom_conversions: uomConversions,
            selected_uom_id: baseUom ? String(baseUom.uom_id) : '',
            quantity: '1',
            unit_price: String(nearestBatch?.selling_price ?? ''), // always base-unit price
        }]);
        setSearchProduct(null);
    };

    const updateLine = (index, field, value) => {
        setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const updateLineUom = (index, uomId) => {
        setLineItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const uom = (item.uom_conversions || []).find(u => String(u.uom_id) === String(uomId));
            const multiplier = uom?.multiplier ?? 1;
            return {
                ...item,
                selected_uom_id: uomId,
                unit_price: String((item.base_unit_price || 0) * multiplier),
            };
        }));
    };

    const removeLine = (index) => {
        setLineItems(prev => prev.filter((_, i) => i !== index));
    };

    // ── Customer AsyncSelect ───────────────────────────────────────────────────
    const loadCustomerOptions = (inputValue) =>
        new Promise((resolve) => {
            if (inputValue.length < 2) { resolve([]); return; }
            if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
            customerDebounceRef.current = setTimeout(async () => {
                try {
                    const res = await axios.get(`${API_BASE_URL}customers/getLightWeightCustomers`, {
                        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                        params: { search: inputValue },
                    });
                    const data = res.data.customers || [];
                    resolve(data.map(c => ({
                        value: c.id,
                        label: `${c.name} (${c.phone_number})`,
                        payload: c,
                    })));
                } catch { resolve([]); }
            }, 300);
        });

    // ── Validation ─────────────────────────────────────────────────────────────
    const minDate = tomorrow();
    const allLinesValid = lineItems.length > 0 && lineItems.every(item =>
        item.product_id && item.selected_uom_id && parseFloat(item.quantity) >= 1 && parseFloat(item.unit_price) >= 0
    );
    const canSubmit = selectedCustomer && !creditDisabled && dueDate >= minDate && allLinesValid && !submitting;

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const payload = {
                customer_id: selectedCustomer.value,
                due_date: dueDate,
                notes: notes || null,
                products: lineItems.map(item => ({
                    product_id: item.product_id,
                    discounted_price: parseFloat(item.unit_price),
                    quantity: parseInt(item.quantity, 10),  //sending in quantity of selected uom
                    selected_uom_id: parseInt(item.selected_uom_id, 10),
                })),
            };
            if (isEditing) payload.invoice_id = invoice.id;

            const url = isEditing ? `${API_BASE_URL}credit-invoices/updateDraft` : `${API_BASE_URL}credit-invoices/createDraft`;
            const res = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            toast.success(res.data.message || (isEditing ? 'Draft updated' : 'Invoice draft created'));
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const selectClassNames = {
        ...getSelectClassNames(),
        control: (state) =>
            '!rounded-lg !border !text-sm !shadow-none !transition-all ' +
            (state.isFocused
                ? '!border-indigo-500 !ring-2 !ring-indigo-500/20 !bg-white dark:!bg-gray-800'
                : '!border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-800'),
        placeholder: () => '!text-gray-400 dark:!text-gray-500 !text-sm',
        singleValue: () => '!text-gray-900 dark:!text-white !text-sm',
        input: () => '!text-gray-900 dark:!text-white !text-sm',
        valueContainer: () => '!px-3 !py-1.5',
    };



    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative ml-auto h-full w-full max-w-4xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-right">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h2 className="font-bold text-gray-900 dark:text-white text-base">
                            {isEditing ? 'Edit Draft Invoice' : 'Create Draft Invoice'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* ── Customer ── */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Customer <span className="text-red-500">*</span>
                        </label>
                        <AsyncSelect
                            loadOptions={loadCustomerOptions}
                            value={selectedCustomer}
                            onChange={(opt) => setSelectedCustomer(opt)}
                            placeholder="Search customer by name or phone…"
                            noOptionsMessage={({ inputValue }) => inputValue.length < 2 ? 'Type at least 2 characters…' : 'No customers found'}
                            loadingMessage={() => 'Searching…'}
                            unstyled
                            classNamePrefix="cis"
                            classNames={selectClassNames}
                        />
                        {creditDisabled && (
                            <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    This customer does not have credit enabled — enable credit for them first.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Due Date + Notes ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                Due Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                min={minDate}
                                onChange={e => setDueDate(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                            />
                            {dueDate && dueDate < minDate && (
                                <p className="mt-1 text-xs text-red-500">Due date must be after today</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                Notes <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition resize-none"
                            />
                        </div>
                    </div>

                    {/* ── Product search ── */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Add Product
                        </label>
                        <AsyncSelect
                            loadOptions={loadProductOptions}
                            value={searchProduct}
                            onChange={addProduct}
                            placeholder="Search by product name…"
                            noOptionsMessage={({ inputValue }) => inputValue.length < 2 ? 'Type at least 2 characters…' : 'No products found'}
                            loadingMessage={() => 'Searching…'}
                            isClearable
                            unstyled
                            classNamePrefix="pis"
                            classNames={selectClassNames}
                        />
                    </div>

                    {/* ── Line items table ── */}
                    {lineItems.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Line Items</p>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            {['Product', 'UOM', 'Qty', 'Unit Price', 'Subtotal', ''].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                        {lineItems.map((item, i) => {
                                            const multiplier = getMultiplier(item);
                                            const subtotal = (parseFloat(item.quantity) || 0) * multiplier * (parseFloat(item.unit_price) || 0);
                                            return (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap max-w-[200px] truncate" title={item.name}>
                                                        {item.name}
                                                    </td>
                                                    <td className="px-3 py-2 min-w-[130px]">
                                                        <select
                                                            value={item.selected_uom_id}
                                                            onChange={e => updateLine(i, 'selected_uom_id', e.target.value)}
                                                            required
                                                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                                                        >
                                                            <option value="">Select UOM</option>
                                                            {(item.uom_conversions || []).map(uom => (
                                                                <option key={uom.uom_id} value={uom.uom_id}>
                                                                    {uom.uom_name}{uom.multiplier >= 1 ? ` (x${uom.multiplier})` : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2 w-20">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            value={item.quantity}
                                                            onChange={e => updateLine(i, 'quantity', e.target.value)}
                                                            required
                                                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 w-32">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_price}
                                                            onChange={e => updateLine(i, 'unit_price', e.target.value)}
                                                            required
                                                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                                        {fmt(subtotal)}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLine(i)}
                                                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                                                            title="Remove line"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Running total */}
                            <div className="flex items-center justify-end mt-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-4">Total</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(total)}</span>
                            </div>
                        </div>
                    )}

                    {lineItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-600">
                            <Plus className="w-8 h-8 mb-2" />
                            <p className="text-sm">Search for a product above to add it to this invoice</p>
                        </div>
                    )}
                </form>

                {/* ── Footer ── */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="noop"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-200 dark:shadow-blue-900/40"
                    >
                        {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Draft'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
            `}</style>
        </div>
    );
}
