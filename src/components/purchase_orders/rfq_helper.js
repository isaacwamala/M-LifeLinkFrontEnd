// rfq_helper.js
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import { toast } from "react-toastify";

/**
 * Fetch paginated RFQs with optional date-range filter.
 *
 * NOTE — supplier_id is sent as a query param but the current getRFQ controller
 * method does NOT filter by it server-side (it only accepts from/to).
 * The frontend falls back to client-side filtering of the returned page.
 * To enable true server-side supplier filtering, add one line to getRFQ:
 *   ->when($request->supplier_id, fn($q,$id) => $q->where('supplier_id',$id))
 */
export const fetchRfqs = async (token, { page = 1, fromDate = "", toDate = "", supplierId = "" } = {}) => {
    if (!token) return null;
    try {
        const params = { page };
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;
        // supplierId is included for forward-compatibility; not yet consumed by the backend
        if (supplierId) params.supplier_id = supplierId;

        const response = await axios.get(`${API_BASE_URL}rfqs`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            params,
        });
        if (response.data.success) {
            return response.data; // { success, date_range, data: paginator }
        }
        toast.info(response.data.message || "No RFQs found.");
        return null;
    } catch (error) {
        const msg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to fetch RFQs.";
        toast.error(msg);
        return null;
    }
};

export const createRfq = async (token, payload) => {
    if (!token) return null;
    try {
        const response = await axios.post(`${API_BASE_URL}rfqs/create`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });
        return response.data;
    } catch (error) {
        const msg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to create RFQ.";
        toast.error(msg);
        return null;
    }
};

export const updateRfq = async (token, payload) => {
    if (!token) return null;
    try {
        const response = await axios.post(`${API_BASE_URL}rfqs/update`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });
        return response.data;
    } catch (error) {
        const msg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to update RFQ.";
        toast.error(msg);
        return null;
    }
};

export const deleteRfq = async (token, id) => {
    if (!token) return null;
    try {
        const response = await axios.post(
            `${API_BASE_URL}rfqs/delete`,
            { id },
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
        const msg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to delete RFQ.";
        toast.error(msg);
        return null;
    }
};

/**
 * Fetch a single RFQ's PDF as a Blob for preview-then-download.
 * Returns a Blob on success, null on failure.
 */
export const fetchRfqPdfBlob = async (token, id) => {
    if (!token) return null;
    try {
        const response = await axios.post(
            `${API_BASE_URL}rfqs/generate-pdf`,
            { id },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/pdf",
                },
                responseType: "blob",
            }
        );
        return response.data; // Blob
    } catch (error) {
        let msg = "Failed to generate RFQ PDF.";
        try {
            // blob error responses need text() decoding
            const text = await error.response?.data?.text?.();
            if (text) msg = JSON.parse(text)?.message ?? msg;
        } catch {}
        toast.error(msg);
        return null;
    }
};
