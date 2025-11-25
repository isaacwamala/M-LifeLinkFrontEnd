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


