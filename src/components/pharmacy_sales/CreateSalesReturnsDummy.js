import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, Loader2, AlertCircle, CheckCircle } from 'lucide-react';



export default function App() {
  const [sales, setSales] = useState([]);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnPayStatus, setReturnPayStatus] = useState('pending');

  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const token = localStorage.getItem("access_token");

  // Fetch lightweight sales on mount
  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoadingSales(true);
    setError(null);

    try {
      const response = await axios.get(
        'http://127.0.0.1:8000/api/sales/getLightweightSalesForReturn',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      setSales(response.data.sales || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch sales');
    } finally {
      setLoadingSales(false);
    }
  };

  // Fetch sale details when a sale is selected
  const handleSaleSelect = async (saleId) => {
    setSelectedSaleId(saleId);
    setDropdownOpen(false);
    setLoadingDetails(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/sales/getSaleByIDForSalesReturnCreation',
        { onsite_sale_id: saleId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const details = response.data.sale;
      setSaleDetails(details);

      // Initialize return items from sale products
      const items = details.products.map(product => ({
        ...product,
        return_quantity: 0,
        brief_return_reason: '',
      }));

      setReturnItems(items);
      setReturnReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch sale details');
      setSaleDetails(null);
      setReturnItems([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleQuantityChange = (index, value) => {
    const numValue = parseInt(value) || 0;
    const maxQuantity = returnItems[index].quantity;

    const updatedItems = [...returnItems];
    updatedItems[index].return_quantity = Math.min(
      Math.max(0, numValue),
      maxQuantity
    );

    setReturnItems(updatedItems);
  };

  const handleBriefReasonChange = (index, value) => {
    const updatedItems = [...returnItems];
    updatedItems[index].brief_return_reason = value;
    setReturnItems(updatedItems);
  };

  const calculateItemSubtotal = (item) => {
    return item.return_quantity * item.productUnitPrice;
  };

  const calculateTotalAmount = () => {
    return returnItems.reduce(
      (total, item) => total + calculateItemSubtotal(item),
      0
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSaleId) {
      setError('Please select a sale');
      return;
    }

    if (!returnReason.trim()) {
      setError('Please enter a return reason');
      return;
    }

    const itemsToReturn = returnItems.filter(
      item => item.return_quantity > 0
    );

    if (itemsToReturn.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    const missingReasons = itemsToReturn.filter(
      item => !item.brief_return_reason.trim()
    );

    if (missingReasons.length > 0) {
      setError('Please provide a brief return reason for all returned items');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        sale_id: selectedSaleId,
        return_reason: returnReason,
        return_pay_status: returnPayStatus,
        return_items: itemsToReturn.map(item => ({
          product_id: item.product_id,
          quantity: item.return_quantity,
          brief_return_reason: item.brief_return_reason,
          productUnitPrice: item.productUnitPrice,
          uom_name_to_return: item.selected_uom_name,
          return_uom_multiplier: item.selected_uom_multiplier,
          variant_options: item.variant_options,
        })),
      };

      await axios.post(
        'http://127.0.0.1:8000/api/sales/registerOnsiteSalesReturn',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      setSuccess('Sales return created successfully!');

      // Reset
      setSelectedSaleId(null);
      setSaleDetails(null);
      setReturnItems([]);
      setReturnReason('');
      setReturnPayStatus('pending');

      fetchSales();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create sales return');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSale = sales.find(s => s.id === selectedSaleId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl text-gray-900 mb-6">Create Sales Return</h1>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Sale Selection Dropdown */}
          <div className="mb-6">
            <label className="block text-sm text-gray-700 mb-2">
              Select Sale to Return
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={loadingSales}
                className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-gray-900">
                  {loadingSales ? (
                    'Loading sales...'
                  ) : selectedSale ? (
                    `${selectedSale.sales_unique_number || `Sale #${selectedSale.id}`} - ${selectedSale.customer_name || 'Walk-in Customer'} - ${selectedSale.total_sale_amount.toLocaleString()}`
                  ) : (
                    'Select a sale...'
                  )}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && !loadingSales && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
                  {sales.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">No sales available for return</div>
                  ) : (
                    sales.map(sale => (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => handleSaleSelect(sale.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-gray-900">
                              {sale.sale_unique_number || `Sale #${sale.id}`}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {sale.customer_name || 'Walk-in Customer'} • {sale.sale_outlet_name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {sale.payment_date} • Registered by {sale.registered_by}
                            </div>
                          </div>
                          <div className="text-gray-900">
                            {sale.total_sale_amount.toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loadingDetails && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading sale details...</span>
            </div>
          )}

          {/* Sale Details Form */}
          {saleDetails && !loadingDetails && (
            <form onSubmit={handleSubmit}>
              {/* Sale Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h2 className="text-lg text-gray-900 mb-3">Sale Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Sale Number</div>
                    <div className="text-gray-900">{saleDetails.sales_unique_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Customer</div>
                    <div className="text-gray-900">{saleDetails.customer_details.name || 'Walk-in Customer'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Original Total</div>
                    <div className="text-gray-900">{saleDetails.total_amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Payment Status</div>
                    <div className="text-gray-900 capitalize">{saleDetails.payment_status}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Payment Method</div>
                    <div className="text-gray-900 capitalize">{saleDetails.payment_method}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Payment Date</div>
                    <div className="text-gray-900">{saleDetails.payment_date}</div>
                  </div>
                </div>
              </div>

              {/* Return Reason */}
              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">
                  Main Return Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Enter the main reason for returning this sale..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
                  required
                />
              </div>

              {/* Return Payment Status */}
              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">
                  Return Payment Status <span className="text-red-600">*</span>
                </label>

                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="return_pay_status"
                      value="pending"
                      checked={returnPayStatus === 'pending'}
                      onChange={(e) => setReturnPayStatus(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-900">Pending</span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="return_pay_status"
                      value="refunded"
                      checked={returnPayStatus === 'refunded'}
                      onChange={(e) => setReturnPayStatus(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-900">Refunded</span>
                  </label>
                </div>
              </div>


              {/* Items Table */}
              <div className="mb-6">
                <h2 className="text-lg text-gray-900 mb-4">Return Items</h2>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm text-gray-700">Product</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-700">Barcode</th>
                        <th className="px-4 py-3 text-right text-sm text-gray-700">Unit Price</th>
                        <th className="px-4 py-3 text-right text-sm text-gray-700">Original Qty</th>
                        <th className="px-4 py-3 text-right text-sm text-gray-700">Return Qty</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-700">UOM</th>
                        <th className="px-4 py-3 text-left text-sm text-gray-700">Brief Return Reason</th>
                        <th className="px-4 py-3 text-right text-sm text-gray-700">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {returnItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{item.barcode}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{item.productUnitPrice.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={item.return_quantity}
                              onChange={(e) => handleQuantityChange(index, e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-600">{item.selected_uom_name}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.brief_return_reason}
                              onChange={(e) => handleBriefReasonChange(index, e.target.value)}
                              placeholder={item.return_quantity > 0 ? "Required..." : "N/A"}
                              disabled={item.return_quantity === 0}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {calculateItemSubtotal(item).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-end mb-6">
                <div className="w-full md:w-1/3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Items to Return:</span>
                    <span className="text-gray-900">
                      {returnItems.filter(item => item.return_quantity > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Total Quantity:</span>
                    <span className="text-gray-900">
                      {returnItems.reduce((sum, item) => sum + item.return_quantity, 0)}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 my-3"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg text-gray-900">Total Return Amount:</span>
                    <span className="text-xl text-gray-900">
                      {calculateTotalAmount().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSaleId(null);
                    setSaleDetails(null);
                    setReturnItems([]);
                    setReturnReason('');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"

                  disabled={submitting || calculateTotalAmount() === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed      flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {submitting ? 'Creating Return...' : 'Create Sales Return'}
                </button>
              </div>
            </form>
          )}

          {/* Empty state */}
          {!saleDetails && !loadingDetails && !error && (
            <div className="text-center py-12 text-gray-500">
              Select a sale from the dropdown above to create a return
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
