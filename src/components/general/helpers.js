import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast } from "react-toastify";

/**
 * Fetch all product categories
 * @param {string} token - User access token
 * @returns {Promise<Array>} - Returns array of categories or empty array
 */


export const fetchDepartments = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}config/getDepartments`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        const departments = response.data.departments || [];

        return departments.map((d) => ({
            id: d.id,
            department_name: d.department_name,
            slug: d.slug,
        }));

    } catch (error) {
        console.error("Error fetching departments:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};