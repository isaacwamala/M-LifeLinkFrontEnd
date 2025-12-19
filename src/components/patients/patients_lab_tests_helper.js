import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast } from "react-toastify";

/**
 * Fetch all product categories
 * @param {string} token - User access token
 * @returns {Promise<Array>} - Returns array of categories or empty array
 */


//Function to fetch patient lab test statuses
export const fetchPatientTestStatuses = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}config/getTestStatuses`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        // Fetch test statuses
        const tests = response.data.test_statuses || [];

        return tests.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
        }));

    } catch (error) {
        console.error("Error fetching Patient Test Statuses:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};

//Function to fetch specimen types
export const fetchSpecimenTypes = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}config/getSpecimenTypes`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        // Fetch test statuses
        const specimen_types = response.data.specimen_types  || [];

        return specimen_types.map((s) => ({
            id: s.id,
            specimen_name: s.specimen_name,
            description: s.description,
        }));

    } catch (error) {
        console.error("Error fetching Specimen types:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};

//Function to fetch test types
export const fetchTestTypes = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}config/getTestTypes`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        // Fetch test types
        const test_types = response.data.test_types  || [];

        return test_types.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
        }));

    } catch (error) {
        console.error("Error fetching Test types:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};

//Fetch Lab Instruments
export const fetchLabInstruments = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}config/getInstruments`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        // Fetch lab instruments
        const instruments = response.data.instruments  || [];

        return instruments.map((i) => ({
            id: i.id,
            instrument_name: i.instrument_name,
            description: i.description,
        }));

    } catch (error) {
        console.error("Error fetching Lab instruments:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};

//Fetch Lab sections
export const fetchLabSections = async (token) => {
    if (!token) return [];

    try {
        const response = await axios.get(
            `${API_BASE_URL}config/getLabSections`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        // Fetch lab sections
        const labSections = response.data.labSections  || [];

        return labSections.map((l) => ({
            id: l.id,
            lab_section_name: l.lab_section_name,
            description: l.description,
        }));

    } catch (error) {
        console.error("Error fetching lab sections:", error);

        const backendMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Server error.";

        toast.error(backendMessage);
        return [];
    }
};


