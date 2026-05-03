import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast } from "react-toastify";

/**
 * Fetch all product categories
 * @param {string} token - User access token
 * @returns {Promise<Array>} - Returns array of categories or empty array
 */


export const fetchPatientCategories = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}patient/returnPatientCategories`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        const categories = response.data.data || [];

        return categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
        }));

    } catch (error) {
        console.error("Error fetching Patient category:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};


// Fetch docctors
export const fetchDoctors = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}set/getDoctors`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        const doctors = response.data.doctors || [];

        return doctors.map((d) => ({
            id: d.id,
            name: d.name,
          
        }));

    } catch (error) {
        console.error("Error fetching doctors:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};

//Fetch basic patients  info to be used in drpdowns
export const fetchBasicPatientsInfoForDropDowns = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}patient/getPatientsForDropdown`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        const patients = response.data.patients || [];

        return patients.map((p) => ({
            id: p.id,
            name: p.name,
            phone_number: p.phone_number,
            address: p.address,
            email: p.email,
          
        }));

    } catch (error) {
        console.error("Error fetching patients:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};

// Fetch medical rooms 
export const fetchMedicalRooms = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}set/getMedicalRooms`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        const rooms = response.data.rooms || [];

        return rooms.map((d) => ({
            id: d.id,
            room_name: d.room_name,
            room_number: d.room_number,
            status: d.status,
            branch_name: d.branch?.branch_name,
          
        }));

    } catch (error) {
        console.error("Error fetching rooms:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};


//Fetch rooms with assigned doctors
export const fetchRoomsWithAssignedDoctors = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}set/getRoomsWithAssignedDoctors`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        return response.data.data || [];

    } catch (error) {
        console.error("Error fetching rooms:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};