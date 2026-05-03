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

//Helper to return active branches
export const fetchActiveFacilityBranches = async (token) => {
     if (!token) return [];

    try {
        const res = await fetch(`${API_BASE_URL}config/getBranches`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });

        const data = await res.json(); //  FIX

        return data?.branches || [];

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

 
//Helper to return wards
export const fetchWardsData = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}config/getWards`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );


        return response.data.data || [];

    } catch (error) {
        console.error("Error fetching wards:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};

