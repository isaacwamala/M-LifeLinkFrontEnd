import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast, ToastContainer } from "react-toastify";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

//Import apis from the helper
import { fetchProductsItems } from "../products/products_helper";
import { fetchUoms } from "../products/products_helper";


export default function UomConversionForProductBaseUnit() {

    const [conversions, setConversions] = useState([]);
    const [products, setProducts] = useState([]);
    const [uoms, setUoms] = useState([]);

    const [searchProduct, setSearchProduct] = useState('');
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("access_token");
    const [searchUnit, setSearchUnit] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);



    // Form state
    const [formData, setFormData] = useState({
        product_name: '',
        unit_of_measure_name: '',
        multiplier: '',
    });

    //Display 15 items per page in atable
    const itemsPerPage = 10;


    // Fetch all Unit of measure conversions for the products base unit
    const fetchConversions = async () => {
        try {
            const res = await axios.get(
                `${API_BASE_URL}items/getUOMConversionsForProductBaseUnit`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            if (res.data.status === "success") {
                const formatted = res.data.data.map((c) => ({

                    id: c.id,                        // record id
                    product_id: c.product.id,
                    product_name: c.product.name,
                    //include the product's basic unit of measure
                    product_base_uom_id: c.product.base_uom_id,

                    uomId: c.uom.id,
                    unit_of_measure_name: c.uom.name,
                    code: c.uom.uom_code,

                    multiplier: c.multiplier,
                }));

                setConversions(formatted);
                console.log('conversions', formatted);
            }
        } catch (error) {
            console.error("Error fetching UOM conversions:", error);
            toast.error("Failed to load UOM conversions");
        } finally {
            setLoading(false);
        }
    };

    // Load products using the helper
    const loadProducts = async () => {
        setLoading(true);
        const data = await fetchProductsItems(token);
        console.log(products)
        setProducts(data);
        setLoading(false);
    };

    //Load uoms using the helper
    const loadUoms = async () => {
        setLoading(true);
        const data = await fetchUoms(token);
        console.log('uoms', data);
        setUoms(data);
        setLoading(false);
    };

    useEffect(() => {
        loadProducts();
        loadUoms();
        fetchConversions();
    }, [token]);



    // Returns the product's base_uom_id(product's base unit of measure)
    //   for the currently editing conversion
    const getBaseUomIdForEditing = () => {
        const conversion = conversions.find(c => c.id === editingId);
        return conversion ? conversion.product_base_uom_id : null;
    };

    // Returns true when current modal edit is for the product's base UOM
    //Ensuring that disable the multiplier and still set it to 1,
    const isEditingBaseUom = () => {
        // editingId might be null for add mode
        if (modalMode !== 'edit' || !editingId) return false;

        const baseUomId = getBaseUomIdForEditing();
        // formData.uom may be string — compare loosely or coerce:
        return baseUomId !== null && Number(formData.uom) === Number(baseUomId);
    };



    // Filter data based on search
    const filteredData = conversions.filter((item) => {
        const matchProduct = item.product_name.toLowerCase().includes(searchProduct.toLowerCase());
        const matchUnit = item.unit_of_measure_name.toLowerCase().includes(searchUnit.toLowerCase());
        return matchProduct && matchUnit;
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    const handleSearchChange = (type, value) => {
        if (type === 'product') {
            setSearchProduct(value);
        } else {
            setSearchUnit(value);
        }
        setCurrentPage(1);
    };

    // Open modal for adding
    const handleAdd = () => {
        setModalMode('add');
        setFormData({ product_name: '', unit_of_measure_name: '', multiplier: '' });
        setIsModalOpen(true);
    };

    // Open modal for editing
    const handleEdit = (item) => {
        setModalMode('edit');

        setEditingId(item.id); //pass the conversionid, for each conversion were updating

        //onlypass uom and multiplier on editing
        setFormData({
            uom: item.uomId,      // pass  the uom id
            multiplier: item.multiplier //pass the multiplier
        });

        setIsModalOpen(true);
    };

    // Delete item
    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            setConversions(conversions.filter((item) => item.id !== id));
        }
    };

    // Create aconversion of aspecific unit of measure considering amultiplier effect in terms 
    //of the product base unit of measure
    const createConversion = async () => {
        setIsSubmitting(true); // start loader
        try {
            const res = await axios.post(
                `${API_BASE_URL}items/setUomConversionForProductBaseUnit`,
                {
                    product_id: formData.product_name, // product select value
                    uom_id: formData.uom,
                    multiplier: formData.multiplier,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            if (res.data.status === "success") {
                toast.success("Conversion added successfully!");
                fetchConversions(); // refresh table
                setIsModalOpen(false);
                setFormData({ product_name: '', uom: '', multiplier: '' }); // reset form
            } else {
                toast.error(res.data.message || "Failed to add conversion");
            }
        } catch (error) {
            toast.error(error.response?.data.message || "Error adding conversion");
            console.error(error);
        } finally {
            setIsSubmitting(false); // stop loader
        }
    };



    // The function to update the conversion
    const updateConversion = async () => {
        setIsSubmitting(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}items/updateUomConverterForProductBaseUnit`,
                {
                    converter_id: editingId,
                    uom_id: formData.uom,
                    multiplier: formData.multiplier
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                }
            );

            if (res.data.status === "success") {
                toast.success("Updated successfully!");

                // refresh table
                fetchConversions();

                setIsModalOpen(false);
            } else {
                toast.error(res.data.message || "Update failed");
            }
        } catch (error) {
            // toast.error("Error updating converter");
            toast.error(error.response?.data.message);
            console.error(error);
        } finally {
            setIsSubmitting(false); // stop loader
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();



        // simple validation
        if (!formData.uom || !formData.multiplier) {
            toast.error("Please fill in all fields");
            return;
        }

        // EDIT MODE → Call update API
        if (modalMode === "edit") {
            updateConversion(); // call update
        } else {
            createConversion(); // call create
        }
    };



    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
                <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
                            Global Product Unit of Measure Converter
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            Manage product unit conversions and multipliers, multiplier effect is expressed in product's base unit of measure 
                        </p>
                    </div>


                    {/* Search and Add Section */}
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 md:p-6 mb-6">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
                            {/* Search Fields */}
                            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
                                {/* Search product */}
                                <div className="flex-1">
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                        Search by Product
                                    </label>
                                    <div className="relative">
                                        <Search className="
                                absolute left-3 top-1/2 transform -translate-y-1/2 
                                text-gray-400 w-5 h-5
                            " />
                                        <input
                                            type="text"
                                            placeholder="Search product..."
                                            value={searchProduct}
                                            onChange={(e) => handleSearchChange('product', e.target.value)}
                                            className="
                                    w-full bg-white dark:bg-gray-700 
                                    text-gray-900 dark:text-white 
                                    pl-10 pr-4 py-2 rounded-lg 
                                    border border-gray-300 dark:border-gray-600 
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 
                                "
                                        />
                                    </div>
                                </div>

                                {/* Search by unit */}
                                <div className="flex-1">
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                        Search by Unit
                                    </label>
                                    <div className="relative">
                                        <Search className="
                                absolute left-3 top-1/2 transform -translate-y-1/2 
                                text-gray-400 w-5 h-5
                            " />
                                        <input
                                            type="text"
                                            placeholder="Search unit..."
                                            value={searchUnit}
                                            onChange={(e) => handleSearchChange('unit', e.target.value)}
                                            className="
                                    w-full bg-white dark:bg-gray-700 
                                    text-gray-900 dark:text-white 
                                    pl-10 pr-4 py-2 rounded-lg 
                                    border border-gray-300 dark:border-gray-600 
                                    focus:outline-none focus:ring-2 focus:ring-blue-500
                                "
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={handleAdd}
                                className="
                       text-white bg-gradient-to-r from-blue-400 via-green-500 to-blue-600
                  hover:bg-gradient-to-br px-6 py-2 rounded-lg 
                        flex items-center gap-2 transition-colors 
                        w-full sm:w-auto justify-center
                    "
                            >
                                <Plus className="w-5 h-5" />
                                Add Converter
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
                        <div className="overflow-x-auto w-full rounded-lg shadow-md">

                            {loading ? (
                                // 🌟 DISPLAY SKELETONS
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="p-5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg"
                                        >
                                            <Skeleton height={20} />
                                            <Skeleton height={20} width="60%" className="mt-2" />
                                            <div className="flex gap-3 mt-4">
                                                <Skeleton height={36} width="48%" />
                                                <Skeleton height={36} width="48%" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            ) : (
                                // DISPLAY TABLE WHEN DATA IS LOADED
                                <table className="min-w-full border-collapse">
                                    <thead className="bg-gray-200 dark:bg-gray-700">
                                        <tr>
                                            <th className="text-left text-gray-700 dark:text-gray-300 px-6 py-4">ID</th>
                                            <th className="text-left text-gray-700 dark:text-gray-300 px-6 py-4">Product Name</th>
                                            <th className="text-left text-gray-700 dark:text-gray-300 px-6 py-4">Unit of Measure</th>
                                            <th className="text-left text-gray-700 dark:text-gray-300 px-6 py-4">Multiplier</th>
                                            <th className="text-left text-gray-700 dark:text-gray-300 px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {currentData.length > 0 ? (
                                            currentData.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <td className="text-gray-700 dark:text-gray-400 px-6 py-4">#{item.id}</td>
                                                    <td className="text-gray-900 dark:text-white px-6 py-4">
                                                        {item.product_name.length > 15
                                                            ? item.product_name.slice(0, 60) + '…'
                                                            : item.product_name
                                                        }
                                                    </td>

                                                    {/* Indicate if mapped unit of measure is the product's base unit of measure */}
                                                    <td className="text-gray-900 dark:text-white px-6 py-4">
                                                        {item.unit_of_measure_name}
                                                        {item.uomId === item.product_base_uom_id && (
                                                            <span className="text-sm text-yellow-500 font-bold ml-1">(Base Unit)</span>
                                                        )}
                                                    </td>

                                                    <td className="text-gray-900 font bold dark:text-white px-6 py-4">{item.multiplier}</td>
                                                    <td className="text-gray-900 dark:text-white px-6 py-4">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="text-white bg-gradient-to-r from-blue-400 via-green-500 to-blue-600 hover:bg-gradient-to-br p-2 rounded-lg text-white"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            {/* <button
                                                                onClick={() => handleDelete(item.id)}
                                                                className="bg-red-600 hover:bg-red-700 p-2 rounded-lg text-white"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button> */}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center text-gray-700 dark:text-gray-400 px-6 py-8">
                                                    No records found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>



                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-gray-800 dark:text-gray-300">
                                    Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of{' '}
                                    {filteredData.length} entries
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="
                                bg-gray-300 hover:bg-gray-400 
                                dark:bg-gray-600 dark:hover:bg-gray-500 
                                disabled:bg-gray-200 disabled:text-gray-500 
                                dark:disabled:bg-gray-800 dark:disabled:text-gray-600 
                                text-gray-900 dark:text-white 
                                px-4 py-2 rounded-lg 
                            "
                                    >
                                        Previous
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`
                                    px-4 py-2 rounded-lg transition-colors 
                                    ${currentPage === page
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-500'
                                                }
                                `}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="
                                bg-gray-300 hover:bg-gray-400 
                                dark:bg-gray-600 dark:hover:bg-gray-500 
                                disabled:bg-gray-200 disabled:text-gray-500 
                                dark:disabled:bg-gray-800 dark:disabled:text-gray-600 
                                text-gray-900 dark:text-white 
                                px-4 py-2 rounded-lg 
                            "
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">

                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-gray-900 dark:text-white">
                                    {modalMode === 'add' ? 'Add UOM Converter' : 'Edit UOM Converter'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Display the product field on only adding the product*/}
                                {modalMode === "add" && (
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                            Product Name
                                        </label>
                                        <select
                                            value={formData.product_name}
                                            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                                        >
                                            <option value="">Select a product</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}


                                {/* UOM */}

                                {/* We ensure that we dont change the set Base unit of measuring this product, so we disbale it  */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                        Unit of Measure
                                    </label>

                                    <select
                                        value={formData.uom}
                                        onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                                        disabled={modalMode === 'edit' && formData.uom == getBaseUomIdForEditing()}
                                    >
                                        <option value="">Select a unit</option>
                                        {uoms.map((unit) => (
                                            <option
                                                key={unit.id}
                                                value={unit.id}
                                            >
                                                {unit.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>



                                {/* Multiplier */}
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                                        Multiplier (Base Unit Conversion)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.multiplier}
                                        onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                                        placeholder="e.g., 1, 12"
                                        step="any"
                                        min="0.000001"
                                        disabled={isEditingBaseUom()}
                                        className="
                                         w-full bg-white dark:bg-gray-700 
                                         text-gray-900 dark:text-white 
                                          px-4 py-2 rounded-lg border 
                                         border-gray-300 dark:border-gray-600
                                          focus:outline-none focus:ring-2 focus:ring-blue-500
                                         "
                                    />
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        Enter the conversion factor relative to the base unit.
                                        {isEditingBaseUom() && (
                                            <span className="ml-2 font-bold text-sm text-red-800 ">
                                                (Base UOM + multiplier locked to 1)-Not changeable
                                            </span>
                                        )}
                                    </p>
                                </div>


                                {/* Footer */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="
                                flex-1 bg-gray-200 dark:bg-gray-700 
                                hover:bg-gray-300 dark:hover:bg-gray-600 
                                text-gray-900 dark:text-white 
                                px-4 py-2 rounded-lg
                            "
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting} // prevent multiple submits
                                        className="
                                         flex-1 text-white bg-gradient-to-r from-blue-400 via-green-500 to-blue-600 hover:bg-gradient-to-br 
                                         text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2
                                           "
                                    >
                                        {isSubmitting && (
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                            </svg>
                                        )}
                                        {modalMode === 'add' ? 'Add' : 'Update'}
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
