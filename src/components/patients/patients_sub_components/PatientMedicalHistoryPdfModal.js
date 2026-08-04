// PatientMedicalHistoryPdfModal
// Fetches the medical history PDF as a blob, displays it in an inline iframe,
// and offers a download button.  URL object is revoked on close/unmount.

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Download, Loader2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../../general/constants';

export function PatientMedicalHistoryPdfModal({ isOpen, onClose, patientId, patientName }) {
    const token   = localStorage.getItem('access_token');
    const blobRef = useRef(null); // keep reference so we can revoke on close

    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);
    const [blobUrl, setBlobUrl] = useState(null);

    // ── Fetch blob whenever the modal opens ───────────────────────────────────
    useEffect(() => {
        if (!isOpen || !patientId) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}reports/patientMedicalHistory/pdf`, {
                    headers:      { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
                    params:       { patient_id: patientId },
                    responseType: 'blob',
                });

                if (cancelled) return;

                const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                blobRef.current = url;
                setBlobUrl(url);
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.message || 'Failed to load PDF.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [isOpen, patientId, token]);

    // ── Revoke blob URL when modal closes or component unmounts ──────────────
    const handleClose = () => {
        if (blobRef.current) {
            URL.revokeObjectURL(blobRef.current);
            blobRef.current = null;
        }
        setBlobUrl(null);
        setError(null);
        onClose();
    };

    // Also revoke on unmount
    useEffect(() => {
        return () => {
            if (blobRef.current) {
                URL.revokeObjectURL(blobRef.current);
                blobRef.current = null;
            }
        };
    }, []);

    if (!isOpen) return null;

    // ── Build a clean filename ─────────────────────────────────────────────────
    const today    = new Date().toISOString().slice(0, 10);
    const safeName = (patientName ?? 'Patient').replace(/\s+/g, '_');
    const fileName = `${today}_${safeName}_Medical_History.pdf`;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                            Medical History PDF — {patientName ?? 'Patient'}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            Showing stats &amp; most recent visit only
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {blobUrl && (
                            <a
                                href={blobUrl}
                                download={fileName}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white
                                    bg-gradient-to-r from-blue-600 to-indigo-600
                                    hover:from-blue-700 hover:to-indigo-700 transition shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" /> Download
                            </a>
                        )}
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                                hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Body ───────────────────────────────────────────────────── */}
                <div className="flex-1 overflow-hidden">
                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p className="text-sm">Generating PDF…</p>
                        </div>
                    )}
                    {error && !loading && (
                        <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                            <AlertTriangle className="w-8 h-8 text-rose-400" />
                            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
                            <button
                                onClick={handleClose}
                                className="mt-1 px-4 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300
                                    bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    )}
                    {blobUrl && !loading && (
                        <iframe
                            src={blobUrl}
                            title="Medical History PDF"
                            className="w-full h-full border-0"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
