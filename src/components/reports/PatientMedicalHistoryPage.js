// PatientMedicalHistoryPage
// Standalone page at /patient_medical_history (linked from the Reports nav dropdown).
// The user first selects a patient from a searchable dropdown, then the full
// PatientMedicalHistoryReport is rendered inline below.

import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, Search, User, X } from 'lucide-react';
import { fetchBasicPatientsInfoForDropDowns } from '../patients/patients_helper';
import { PatientMedicalHistoryReport } from '../patients/patients_sub_components/PatientMedicalHistoryReport';

export function PatientMedicalHistoryPage() {
    const token = localStorage.getItem('access_token');

    // ── Patient dropdown state ─────────────────────────────────────────────────
    const [patients,         setPatients]         = useState([]);
    const [searchQuery,      setSearchQuery]      = useState('');
    const [dropdownOpen,     setDropdownOpen]     = useState(false);
    const [selectedPatient,  setSelectedPatient]  = useState(null); // { id, name }
    const dropdownRef = useRef(null);

    // Load patient list once on mount
    useEffect(() => {
        fetchBasicPatientsInfoForDropDowns(token).then(setPatients);
    }, [token]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Filtered list ──────────────────────────────────────────────────────────
    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phone_number ?? '').includes(searchQuery)
    );

    const handleSelect = (p) => {
        setSelectedPatient({ id: p.id, name: p.name });
        setSearchQuery('');
        setDropdownOpen(false);
    };

    const handleClear = () => {
        setSelectedPatient(null);
        setSearchQuery('');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

            {/* ── Page header ───────────────────────────────────────────────── */}
            <div className="px-6 py-5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-1">
                    <ClipboardList className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Patient Medical History
                    </h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-10">
                    Select a patient to view their full lifetime medical history, visit breakdowns, and generate a PDF report.
                </p>
            </div>

            <div className="p-6 space-y-6 w-full">

                {/* ── Patient selector card ──────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                        Select Patient
                    </label>

                    {selectedPatient ? (
                        /* ── Selected state ─────────────────────────────────── */
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                                {selectedPatient.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                    {selectedPatient.name}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    ID: {selectedPatient.id}
                                </p>
                            </div>
                            <button
                                onClick={handleClear}
                                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                    text-gray-500 dark:text-gray-400
                                    bg-gray-100 dark:bg-gray-800
                                    hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            >
                                <X className="w-3.5 h-3.5" /> Change patient
                            </button>
                        </div>
                    ) : (
                        /* ── Search dropdown ─────────────────────────────────── */
                        <div className="relative" ref={dropdownRef}>
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
                                bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition">
                                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search by name or phone…"
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setDropdownOpen(true); }}
                                    onFocus={() => setDropdownOpen(true)}
                                    className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400
                                        outline-none min-w-0"
                                />
                            </div>

                            {dropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-30
                                    bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                    rounded-xl shadow-xl overflow-hidden">
                                    {filtered.length === 0 ? (
                                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                                            <User className="w-4 h-4" />
                                            No patients found
                                        </div>
                                    ) : (
                                        <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                                            {filtered.slice(0, 50).map(p => (
                                                <li key={p.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelect(p)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-left
                                                            hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                                                    >
                                                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40
                                                            flex items-center justify-center text-indigo-600 dark:text-indigo-400
                                                            text-xs font-bold flex-shrink-0">
                                                            {p.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                                                {p.name}
                                                            </p>
                                                            {p.phone_number && (
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                    {p.phone_number}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Report area ────────────────────────────────────────────── */}
                {selectedPatient ? (
                    <PatientMedicalHistoryReport
                        patientId={selectedPatient.id}
                        patientName={selectedPatient.name}
                        /* no onClose prop — inline page, no parent modal to close */
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-300 dark:text-gray-700">
                        <ClipboardList className="w-14 h-14 opacity-40" />
                        <p className="text-base font-medium text-gray-400 dark:text-gray-500">
                            Search and select a patient above to load their medical history
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
