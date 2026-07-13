// products_helper.js
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast } from "react-toastify";

/**
 * Fetch all product categories
 * @param {string} token - User access token
 * @returns {Promise<Array>} - Returns array of categories or empty array
 */
export const fetchProductCategories = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(`${API_BASE_URL}config/getCategories`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        const { success, message, categories } = response.data;
        // If backend said success
        if (success) {
            //if (message) toast.success(message);

            return categories || [];
        }
        // If backend said fail
        else {
            toast.info(message || "No categories found.");
            return [];
        }

    } catch (error) {
        console.error("Error fetching categories:", error);

        // Safely extract server error message
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching categories.";

        toast.error(backendMessage);
        return [];
    }
};

// Export product variants
export const fetchProductVariants = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(`${API_BASE_URL}items/getProductVariants`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        const { status, message, variants } = response.data;
        // If backend said success
        if (status === 'success') {
            //if (message) toast.success(message);

            return variants || [];
        }
        // If backend said fail
        else {
            toast.info(message || "No Variants found.");
            return [];
        }

    } catch (error) {
        console.error("Error fetching product variants:", error);

        // Safely extract server error message
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching categories.";

        toast.error(backendMessage);
        return [];
    }

}

//export unit of measure
export const fetchUoms = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(`${API_BASE_URL}config/getUnitOfMeasure`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });

        const { success, message, uoms } = response.data;

        // If backend said success
        if (success) {
            //if (message) toast.success(message);

            return uoms.map((u) => ({
                id: u.id,
                name: u.name,
                uom_code: u.uom_code,
            }));
        }
        // If backend said fail
        else {
            toast.info(message || "No Unit of Measures found.");
            return [];
        }

    } catch (error) {
        console.error("Error fetching UOM:", error);

        // safely extract backend error message
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching Unit of Measures.";

        toast.error(backendMessage);
        return [];
    }
};


//Export product items / medical supplies
export const fetchProductsItems = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(`${API_BASE_URL}items/getProductItems`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });

        const { status, message, products } = response.data;

        // If backend said success
        if (status === "success") {
            //if (message) toast.success(message);

            console.log("Products:", products);

            return products || [];
        }

        // If backend said fail
        toast.info(message || "No products found.");
        return [];

    } catch (error) {
        console.error("Error fetching products:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching products.";

        toast.error(backendMessage);
        return [];
    }
};


// Fetch active variant option names with their active values (for product form dropdowns)
export const fetchActiveVariantOptionNames = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(`${API_BASE_URL}config/getActiveVariantOptionNames`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        const { success, message, data } = response.data;
        if (success) {
            return data || [];
        }
        toast.info(message || "No variant option names found.");
        return [];
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching variant option names.";
        toast.error(backendMessage);
        return [];
    }
};

// Lightweight, unpaginated product list for "pick a product" dropdowns.
// Returns a flat array of products (id, name, sku, barcode, variant_options,
// smallest_base_uom_id, uom) — never a paginator object.
export const fetchProductsItemsLightweight = async (token) => {
    if (!token) return [];
    try {
        const response = await axios.get(`${API_BASE_URL}config/getAllProductsLightweight`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const { status, products } = response.data;
        return status === "success" && Array.isArray(products) ? products : [];
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching products.";
        toast.error(backendMessage);
        return [];
    }
};

// Async-search helper for react-select/async dropdowns.
// Queries the server-side search endpoint on every keystroke; the frontend
// debounces calls before invoking this function. Returns an array of
// react-select option objects { value, label, raw } ready for AsyncSelect.
// Keep fetchProductsItemsLightweight below as-is for any caller still relying
// on "load a default list with no search" behaviour — this is additive.
export const fetchProductsForAsyncSelect = async (token, searchTerm = '') => {
    if (!token) return [];
    try {
        const params = {};
        if (searchTerm) params.search = searchTerm;
        const response = await axios.get(`${API_BASE_URL}config/getAllProductsLightweight`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            params,
        });
        const { status, products } = response.data;
        if (status !== "success" || !Array.isArray(products)) return [];

        return products.map((p) => {
            const variantOptions = normalizeVariantOptions(p.variant_options);
            const variantText = variantOptions.map(v => `${v.option_value}`).join(" / ");
            return {
                value: p.id.toString(),
                label: variantText ? `${p.name} – ${variantText}` : p.name,
                raw: p,
            };
        });
    } catch (error) {
        const backendMessage =
            error.response?.data?.message || error.response?.data?.error ||
            "Server error while searching products.";
        toast.error(backendMessage);
        return [];
    }
};

// Async-search helper for dropdowns that need product + batch data.
// Queries getProductsWithTheirBatches (server-side search, limit 30).
// Returns react-select option objects { value, label, raw } where raw is the
// full product object including its `batch` array.
export const fetchProductsWithBatchesForAsyncSelect = async (token, searchTerm = '') => {
    if (!token) return [];
    try {
        const params = {};
        if (searchTerm) params.search = searchTerm;
        const response = await axios.get(`${API_BASE_URL}items/getProductsWithTheirBatches`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            params,
        });
        const { status, products } = response.data;
        if (status !== "success" || !Array.isArray(products)) return [];

        return products.map((p) => {
            const variantOptions = normalizeVariantOptions(p.variant_options);
            const variantText = variantOptions.map(v => `${v.option_value}`).join(" / ");
            return {
                value: p.id.toString(),
                label: variantText ? `${p.name} – ${variantText}` : p.name,
                raw: p,
            };
        });
    } catch (error) {
        const backendMessage =
            error.response?.data?.message || error.response?.data?.error ||
            "Server error while searching products.";
        toast.error(backendMessage);
        return [];
    }
};

// Returns the best displayable batch number for a given batch object.
// Prefers batch_number when it is a non-empty, non-whitespace string;
// falls back to internal_batch_number otherwise.
// Use this everywhere a batch label is rendered — never for form submission values.
export const getBatchDisplayNumber = (batch) => {
    if (!batch) return '';
    const hasRealBatchNumber =
        typeof batch.batch_number === 'string' && batch.batch_number.trim() !== '';
    return hasRealBatchNumber ? batch.batch_number : (batch.internal_batch_number ?? '');
};

// Normalise the variant_options JSON column, which can come back as a
// PHP-object-shaped JSON ({"0":{...},"2":{...}}) instead of a clean array
// when a product row was saved before variant_options re-indexing was fixed.
export const normalizeVariantOptions = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
};

// Paginated product listing with optional search and date filters.
// Returns the full paginator object: { data, current_page, last_page, total, ... }
export const fetchProductsItemsPaginated = async (token, { page = 1, search = '', dateFrom = '', dateTo = '' } = {}) => {
    if (!token) return null;

    try {
        const params = { page };
        if (search) params.search = search;
        if (dateFrom) params.from_date = dateFrom;
        if (dateTo) params.to_date = dateTo;

        const response = await axios.get(`${API_BASE_URL}items/getProductItems`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            params,
        });
        const { status, message, products } = response.data;
        if (status === "success") {
            return products; // full paginator object: { data, current_page, last_page, total, ... }
        }
        toast.info(message || "No products found.");
        return null;
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching products.";
        toast.error(backendMessage);
        return null;
    }
};

// Fetch ALL variant option names + ALL their values (for admin management screen)
export const fetchAllVariantOptionNamesForAdmin = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(`${API_BASE_URL}config/getAllVariantOptionNamesForAdmin`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        const { success, message, data } = response.data;
        if (success) {
            return data || [];
        }
        toast.info(message || "No variant option names found.");
        return [];
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching variant option names.";
        toast.error(backendMessage);
        return [];
    }
};

export const createVariantOptionName = async (token, name) => {
    if (!token) return null;
    try {
        const response = await axios.post(
            `${API_BASE_URL}config/storeVariantOptionName`,
            { name },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to create variant option name.";
        toast.error(backendMessage);
        return null;
    }
};

export const updateVariantOptionName = async (token, id, payload) => {
    if (!token) return null;
    try {
        const response = await axios.post(
            `${API_BASE_URL}config/updateVariantOptionName`,
            { id, ...payload },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to update variant option name.";
        toast.error(backendMessage);
        return null;
    }
};

export const deleteVariantOptionName = async (token, id) => {
    if (!token) return null;
    try {
        const response = await axios.delete(`${API_BASE_URL}config/deleteVariantOptionName/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        return response.data;
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to delete variant option name.";
        toast.error(backendMessage);
        return null;
    }
};

export const createVariantOptionValue = async (token, variantOptionId, value) => {
    if (!token) return null;
    try {
        const response = await axios.post(
            `${API_BASE_URL}config/storeVariantOptionValue`,
            { variant_option_id: variantOptionId, value },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to create variant option value.";
        toast.error(backendMessage);
        return null;
    }
};

export const updateVariantOptionValue = async (token, id, payload) => {
    if (!token) return null;
    try {
        const response = await axios.post(
            `${API_BASE_URL}config/updateVariantOptionValue`,
            { id, ...payload },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to update variant option value.";
        toast.error(backendMessage);
        return null;
    }
};

export const deleteVariantOptionValue = async (token, id) => {
    if (!token) return null;
    try {
        const response = await axios.delete(`${API_BASE_URL}config/deleteVariantOptionValue/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        return response.data;
    } catch (error) {
        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to delete variant option value.";
        toast.error(backendMessage);
        return null;
    }
};

///fetch Suppliers
export const fetchSuppliers = async (token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}config/getSuppliers`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        const { success, message, suppliers } = response.data;
        if (success) {
            //  toast.success("Suppliers loaded successfully"); // Optional
            return suppliers.map(s => ({
                id: s.id,
                name: s.name,
                contact_person: s.contact_person,
                contact: s.contact,
                email: s.email || "N/A",
                location: s.location || "N/A",
                balance: parseFloat(s.supplier_balance) || 0,
                status: s.status,
            }));
        }
        // If backend said fail
        else {
            toast.info(message || "No Unit of Measures found.");
            return [];
        }

    } catch (error) {
        console.error("Error fetching suppliers:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error while fetching suppliers.";

        toast.error(backendMessage);
        return [];
    }
};


