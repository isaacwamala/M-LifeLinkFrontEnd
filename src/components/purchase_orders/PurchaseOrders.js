import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Search, Calendar, X, Edit, Plus, Trash2, AlertCircle, Pencil,ChevronLeft, ShoppingCart, ChevronRight } from 'lucide-react';
import { fetchProductsItems } from '../products/products_helper';
import { fetchUoms } from '../products/products_helper';
import { fetchSuppliers } from '../products/products_helper';
import { toast, ToastContainer } from 'react-toastify';
import Skeleton, { SkeletonTheme } from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { useNavigate } from 'react-router-dom';


export default function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('access_token');
  const [modalMessage, setModalMessage] = useState({ product: '', uom: '' });
  const [conversions, setConversions] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUpdateReceivingStatusModalOpen, setIsUpdateReceivingStatusModalOpen] = useState(false);
  const [editReceivingStatusFormData, setEditReceivingStatusFormData] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orders, setPurchaseOrders] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);

  //New state that pbserves aproduct  missing aconversion set
  const [conversionMissing, setConversionMissing] = useState(false);
  const navigate = useNavigate();

  const now = new Date(); // initialize now first

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]; // YYYY-MM-DD

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];


  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(endOfMonth);


  //Fetch all purchase orders for the current year , current month
  const fetchAllPurchaseOrders = async (page = 1) => {
    try {
      const response = await axios.get(`${API_BASE_URL}purchase/getAllPurchaseOrders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        params: {
          from_date: dateFrom,
          to_date: dateTo,
          page: page
        }
      });

      toast.success(response.data.message);
      setPurchaseOrders(response.data.orders.data);
      setTotalPages(response.data.orders.last_page);
      setCurrentPage(response.data.orders.current_page);

      console.log("purchaseOrders:", response.data.orders);

    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  //Fetch products base uom and their conversions
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
    setUoms(data);
  };
  //fetch suppliers
  const loadSuppliers = async () => {
    const data = await fetchSuppliers(token);
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

  useEffect(() => {
    fetchAllPurchaseOrders(1);
  }, [dateFrom, dateTo, token]);

  // Handle resetting to default
  const handleResetFilters = () => {
    setDateFrom(startOfMonth);
    setDateTo(endOfMonth);
    fetchAllPurchaseOrders(1);
  };


  //filter orders by supplier name, batch number, status
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDateFrom = !dateFrom || new Date(order.order_date) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(order.order_date) <= new Date(dateTo);

      return matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [orders, searchTerm, dateFrom, dateTo]);


  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  // Function to handle the opening of the modal with prefilled data
  const handleUpdateOrder = (order) => {
    setSelectedOrder(order);
    setEditFormData({
      purchase_order_id: order.id,
      supplier_id: order.supplier_id,
      status: order.status,
      order_date: order.order_date,
      items: order.items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        unit_of_measure: item.unit_of_measure,
        quantity_of_uom_entered: parseFloat(item.quantity_of_uom_entered),
        unit_price: parseFloat(item.unit_price)
      }))
    });
    setIsUpdateModalOpen(true);
  };

  //Handle the update of the receiving status of the order
  const handleUpdateOrderReceivingStatus = (order) => {
    setSelectedOrder(order);
    setEditReceivingStatusFormData({
      purchase_order_id: order.id,
      receiving_status: order.receiving_status
    });
    setIsUpdateReceivingStatusModalOpen(true);
  };



  const handleAddItem = () => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      items: [
        ...editFormData.items,
        {
          product_id: products[0].id,
          unit_of_measure: products[0].id,
          quantity_of_uom_entered: 1,
          unit_price: 0
        }
      ]
    });
  };

  const handleRemoveItem = (index) => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      items: editFormData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    if (!editFormData) return;
    const newItems = [...editFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditFormData({ ...editFormData, items: newItems });
  };


  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800 font-bold';
      case 'approved':
        return 'bg-green-100 text-green-800 font-bold';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800 font-bold';
      case 'rejected':
        return 'bg-red-100 text-red-800 font-bold';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  //Check if conversion exists for the selected product and entered unit of measure
  useEffect(() => {
    if (!editFormData?.items) return;

    const missing = editFormData.items.some(item => {
      if (!item.product_id || !item.unit_of_measure) return false;

      const product = conversions.find(
        p => p.id.toString() === item.product_id.toString()
      );

      if (!product) return true;

      const hasConversion = product.uom_conversions.some(
        u => u.uom_id.toString() === item.unit_of_measure.toString()
      );

      return !hasConversion;
    });

    setConversionMissing(missing);
  }, [editFormData?.items, conversions]);


  //Handle the product and unit of measure selected change
  //To rule out if it really has aconversion or not
  const handleProductOrUOMChange = (index, field, value) => {
    const updatedItems = [...editFormData.items];
    updatedItems[index][field] = value;

    setEditFormData({
      ...editFormData,
      items: updatedItems
    });

    const { product_id, unit_of_measure } = updatedItems[index];
    if (!product_id || !unit_of_measure) return;

    const product = conversions.find(
      p => p.id.toString() === product_id.toString()
    );

    if (!product) return;

    const hasConversion = product.uom_conversions.some(
      u => u.uom_id.toString() === unit_of_measure.toString()
    );

    if (!hasConversion) {
      const p = products.find(pr => pr.id === product_id);
      const u = uoms.find(um => um.id === unit_of_measure);

      setModalMessage({
        product: p?.name || "",
        uom: u?.name || ""
      });

      setShowModal(true);
      setConversionMissing(true);
    } else {
      setConversionMissing(false);
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


  // Update the Purchase Order 
  const handleSubmitUpdate = async () => {
    if (conversionMissing) {
      toast.error("Conversion missing — cannot update order.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        purchase_order_id: editFormData.purchase_order_id,
        supplier_id: editFormData.supplier_id,
        status: editFormData.status,
        order_date: editFormData.order_date,
        items: editFormData.items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          unit_of_measure: item.unit_of_measure,
          quantity_of_uom_entered: item.quantity_of_uom_entered,
          unit_price: item.unit_price
        }))
      };

      console.log("Submitting payload:", payload);

      const response = await axios.post(
        `${API_BASE_URL}purchase/updatePurchaseOrder`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          maxBodyLength: Infinity
        }
      );

      toast.success(response.data.message);
      setIsUpdateModalOpen(false);

      fetchAllPurchaseOrders(); // refresh list

    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.response?.data.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  //Update receiving status
  const handleUpdateOrderReceiveStatus = async () => {
    setIsSubmitting(true);

    try {
      const payload = {
        purchase_order_id: Number(editReceivingStatusFormData.purchase_order_id),
        receiving_status: editReceivingStatusFormData.receiving_status,
      };

      console.log("Submitting payload:", payload);

      const response = await axios.post(
        `${API_BASE_URL}purchase/updateOrderReceivingStatus`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          maxBodyLength: Infinity,
        }
      );

      toast.success(response.data.message);

      setIsUpdateReceivingStatusModalOpen(false); // FIXED

      fetchAllPurchaseOrders(1);

    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.response?.data.message);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 text-gray-900 dark:text-white">

        {/* Other jsx to be put here */}
        <div className="w-full">
          <div className="flex flex-col gap-1 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <h1 className="text-black-900 font-bold dark:text-white text-[30px]">Purchase Orders</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 ml-11">
              Showing purchase orders for the current month ({new Date(startOfMonth).toLocaleDateString()} – {new Date(endOfMonth).toLocaleDateString()}) of this year. Adjust the filters to see other periods.
            </p>
          </div>


          {/* Filters Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by order number/supplier name or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 
                     bg-white dark:bg-gray-900 
                     text-gray-900 dark:text-white 
                     rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date From */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 
                     bg-white dark:bg-gray-900 
                     text-gray-900 dark:text-white 
                     rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 
                     bg-white dark:bg-gray-900 
                     text-gray-900 dark:text-white 
                     rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="relative">

                <button
                  onClick={handleResetFilters}
                  className="flex w-full sm:w-auto justify-center items-center gap-2 px-5 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-400 transition-colors font-medium shadow-md"
                >
                  Reset
                </button>
              </div>


            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-red-700 font-bold dark:text-red-700">Order Number</th>
                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Supplier</th>
                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Order Date</th>
                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Order Total</th>
                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Created by</th>
                    <th className="px-6 py-3 text-left text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">

                  {/* Show skeletons while loading */}
                  {loading && (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
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
                  )}

                  {/* Show real data when loaded */}
                  {!loading && filteredOrders.length > 0 && filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-red-700 font-bold dark:text-white">{order.order_number}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{order.supplier?.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {parseFloat(order.order_total_amount).toFixed(2)}/=
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${getStatusColor(order.status)}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{order.created_by?.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleUpdateOrder(order)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 rounded-lg"
                          >
                            <Edit className="w-5 h-5" />
                          </button>

                          {/* Handle updating the receive status */}
                          <button
                            onClick={() => handleUpdateOrderReceivingStatus(order)}
                            className="p-2 text-yellow-600 dark:text-yellow-400 font-bold hover:bg-yellow-50 dark:hover:bg-yellow-900/40 rounded-lg"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Show "No records" message */}
                  {!loading && filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-gray-600 dark:text-gray-300">
                        No records found
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>
            </div>

            {/* Pagination */}
            {/* Pagination */}
            <div className="flex justify-center mt-6 items-center gap-4">
              <button
                disabled={currentPage === 1}
                onClick={() => fetchAllPurchaseOrders(currentPage - 1)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft />
              </button>

              <span className="text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => fetchAllPurchaseOrders(currentPage + 1)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight />
              </button>
            </div>

          </div>
        </div>
    

        {/* View Modal */}
        {isViewModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">

              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-normal">Order:</span>
                  {selectedOrder.order_number}
                </h2>

                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              <div className="p-6 space-y-8">

                {/* GENERAL INFORMATION */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    General Information
                  </h3>

                  <div className="grid grid-cols-2 gap-6 text-sm">

                    {/* REUSABLE ITEM */}
                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Order Number</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {selectedOrder.order_number}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Status</p>

                      {/* Status Pill */}
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${selectedOrder.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                            : selectedOrder.status === "approved"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              : selectedOrder.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                      >
                        {selectedOrder.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Supplier</p>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedOrder.supplier.name}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Order Date</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {new Date(selectedOrder.order_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Total Amount</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        UGX {parseFloat(selectedOrder.order_total_amount).toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Created By</p>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedOrder.created_by.name}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Approved By</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {selectedOrder.approved_by?.name || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Created At</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Receiving Status */}
                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Receiving Status</p>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${selectedOrder.receiving_status === "fully_received_order"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : selectedOrder.receiving_status === "partial_received_order"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                      >
                        {selectedOrder.receiving_status || "Not Received"}
                      </span>
                    </div>

                    {/* Payment Indicator */}
                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Any payments to Supplier?</p>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${selectedOrder.is_order_paid_on === 1
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          }`}
                      >
                        {selectedOrder.is_order_paid_on === 1 ? "Paid" : "Not yet"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-500 dark:text-gray-400">Supplier Order Payment Status</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {selectedOrder.supplier_order_payment_status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ORDER ITEMS */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Items</h3>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                    <table className="min-w-[700px] w-full">
                      <thead className="bg-gray-100 dark:bg-gray-700/60">
                        <tr>
                          <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 text-sm">Product</th>
                          <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 text-sm">UOM</th>
                          <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 text-sm">Qty/UOM</th>
                          <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 text-sm">Unit Price</th>
                          <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 text-sm">Subtotal</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{item.product.name}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.uom.name}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                              {parseFloat(item.quantity_of_uom_entered).toFixed(3)}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                              {parseFloat(item.unit_price).toFixed(2)}/=
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-semibold">
                              {parseFloat(item.order_item_sub_total).toFixed(2)}/=
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
        )}


        {/* Update Major Order Modal */}
        {isUpdateModalOpen && selectedOrder && editFormData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Update Order - {selectedOrder.order_number}
                </h2>

                <button
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
              </div>

              <div className="p-6">

                {/* Order Details */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Supplier</label>
                    <select
                      value={editFormData.supplier_id}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, supplier_id: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Order Date</label>
                    <input
                      type="date"
                      value={editFormData.order_date}
                      onChange={(e) => setEditFormData({ ...editFormData, order_date: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>


                {/* Status Checkboxes */}
                <div className="mb-6">
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Order Status</label>

                  {/* Display currently selected status */}
                  <div className="mb-2 text-gray-900 dark:text-white font-semibold">
                    {editFormData.status
                      ? ({
                        open: "Open",
                        approved: "Approved",
                        rejected: "Rejected",
                        cancelled: "Cancelled",
                        partial: "Partially received",
                      }[editFormData.status])
                      : "Select Status"}
                  </div>

                  {/* Radio buttons for changing status */}
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: "Open", value: "open" },
                      { label: "Approve", value: "approved" },
                      { label: "Reject", value: "rejected" },
                      { label: "Cancel", value: "cancelled" },
                      { label: "Partially received", value: "partial" },
                    ].map((statusOption) => (
                      <label key={statusOption.value} className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="order_status"
                          value={statusOption.value}
                          checked={editFormData.status === statusOption.value}
                          onChange={() => setEditFormData({ ...editFormData, status: statusOption.value })}
                          className="form-radio h-5 w-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{statusOption.label}</span>
                      </label>
                    ))}
                  </div>
                </div>



                {/* Items Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900 dark:text-white">Order Items</h3>
                    <button
                      onClick={handleAddItem}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editFormData.items.map((item, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        {/* Show conversion information if available, for the selected product item's unit of measure */}
                        {renderUnitConversion(item)}


                        <div className="grid grid-cols-5 gap-4">
                          {/* Product */}
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 mb-2">Product</label>
                            <select
                              value={item.product_id}
                              onChange={(e) =>
                                handleProductOrUOMChange(index, "product_id", parseInt(e.target.value))
                              }

                              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
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
                            <label className="block text-gray-700 dark:text-gray-300 mb-2">UOM</label>
                            <select
                              value={item.unit_of_measure}
                              onChange={(e) =>
                                handleProductOrUOMChange(index, "unit_of_measure", parseInt(e.target.value))
                              }

                              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {uoms.map((uom) => (
                                <option key={uom.id} value={uom.id}>
                                  {uom.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 mb-2">Quantity</label>
                            <input
                              type="number"
                              value={item.quantity_of_uom_entered}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "quantity_of_uom_entered",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="0"
                              step="0.001"
                            />
                          </div>

                          {/* Unit Price */}
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 mb-2">Unit Price</label>
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleItemChange(index, "unit_price", parseFloat(e.target.value))
                              }
                              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="0"
                              step="0.01"
                            />
                          </div>

                          {/* Remove Button */}
                          <div className="flex items-end">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="w-full px-4 py-2 text-red-600 border border-red-300 dark:border-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitUpdate}
                    disabled={conversionMissing || isSubmitting}
                    className={`px-6 py-2 rounded-lg text-white flex items-center justify-center gap-2
                ${conversionMissing || isSubmitting
                        ? "bg-blue-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                      }`}
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Update Order"
                    )}
                  </button>

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
          </div>

        )}


        {/* Update receiving status of the order */}
        {isUpdateReceivingStatusModalOpen && selectedOrder && editReceivingStatusFormData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Update Receiving Status - {selectedOrder.order_number}
                </h2>

                <button
                  onClick={() => setIsUpdateReceivingStatusModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
              </div>

              <div className="p-6">

                {/* Display current receiving status */}
                <div className="mb-6">
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">
                    Current Receiving Status
                  </label>

                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {{
                      partial_received_order: "Partially Received Order",
                      fully_received_order: "Fully Received Order",
                    }[editReceivingStatusFormData.receiving_status] || "Not Selected"}
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    {/* Partial */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editReceivingStatusFormData.receiving_status === "partial_received_order"}
                        onChange={() =>
                          setEditReceivingStatusFormData({
                            ...editReceivingStatusFormData,
                            receiving_status:
                              editReceivingStatusFormData.receiving_status === "partial_received_order"
                                ? ""
                                : "partial_received_order",
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Partially Receive Order</span>
                    </label>

                    {/* Full */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editReceivingStatusFormData.receiving_status === "fully_received_order"}
                        onChange={() =>
                          setEditReceivingStatusFormData({
                            ...editReceivingStatusFormData,
                            receiving_status:
                              editReceivingStatusFormData.receiving_status === "fully_received_order"
                                ? ""
                                : "fully_received_order",
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Fully Receive Order</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setIsUpdateReceivingStatusModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleUpdateOrderReceiveStatus}
                    disabled={isSubmitting}
                    className={`px-6 py-2 rounded-lg text-white flex items-center justify-center gap-2
              ${isSubmitting ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
            `}
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Update Order"
                    )}
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
