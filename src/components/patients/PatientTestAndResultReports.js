import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, HandCoins, ChevronRight, ChevronLeft, X, Download, FileText, User, Stethoscope, FlaskConical, TestTube2 } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast, ToastContainer } from 'react-toastify';


//This function returns Tests and Their Results but at patient visit level
//This means that We return All patient lab tests each with its own test results if any
//But Only visits which actually have tests will be returned here
export function PatientTestAndResultReports() {
    const [labReports, setLabReports] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(false);

    //States for PDF Preview Modal (shared by both request form and result form)
    const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
    const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);

    //Set current page due to paginations from back end
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Test status constants
    const TEST_STATUS = {
        PENDING: 4,             //status for pending test or created test
        STARTED: 5,             //status for Started test
        COMPLETED: 6,           //Status for completed test
        VERIFIED: 7,            //Status for verified test
        APPROVED: 8,            //status for Approved test
        REJECTED: 9,            //Status for Rejected Test
    };

    // Function to get status color based on test_status.id
    //This will display statuses as badge on top to tell the user what they Mean
    const getStatusColor = (statusId) => {
        switch (statusId) {
            case TEST_STATUS.PENDING:
                return 'text-pink-900 font-bold dark:text-pink-900'; // Pink
            case TEST_STATUS.STARTED:
                return 'text-yellow-500 font-bold dark:text-yellow-500'; // Yellow
            case TEST_STATUS.COMPLETED:
                return 'text-blue-600  font-bold dark:text-blue-600'; // Blue
            case TEST_STATUS.VERIFIED:
                return 'text-violet-900  font-bold dark:text-violet-900'; // VIOLET
            case TEST_STATUS.APPROVED:
                return 'text-green-600 font-bold dark:text-green-600'; // Green
            case TEST_STATUS.REJECTED:
                return 'text-red-600 font-bold dark:text-red-600'; // Red
            default:
                return 'text-gray-400 font-bold dark:text-gray-400'; // Default gray
        }
    };

    // Ensure we show data for this month of the current year, as back end returns them by default
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]; // YYYY-MM-DD
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    const [dateFrom, setDateFrom] = useState(startOfMonth);
    const [dateTo, setDateTo] = useState(endOfMonth);


    //Fetch reports from back end
    const fetchPatientLabTestAndResultReport = async (page = 1) => {
        setLoading(true);

        try {
            const response = await axios.get(`${API_BASE_URL}tests/getPatientLabTestsAndResultsReport`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                params: {
                    from_date: dateFrom,
                    to_date: dateTo,
                    page: page,
                },
            });

            //Get Lab reports
            const data = response.data.report;
            //Set Lab reports in state
            setLabReports(data.data);

            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);

            console.log("report:", data);

        } catch (error) {
            console.error("Error fetching Lab test and Result Reports:", error);
            toast.error("Failed to fetch reports");
        } finally {
            setLoading(false);
        }
    };


    //Mount the component
    useEffect(() => {
        fetchPatientLabTestAndResultReport(1);
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => {
        fetchPatientLabTestAndResultReport(1);
    };

    //Reset filters to default that is current date
    // and also the single page fetch from back end
    const resetFilters = () => {
        setDateFrom(startOfMonth);
        setDateTo(endOfMonth);
        setSearchTerm('');
        fetchPatientLabTestAndResultReport(1);
    };


    //Determine filtered lab tests based on search term and date range
    const filteredLabTestReports = useMemo(() => {
        const term = searchTerm.toLowerCase();

        return labReports.filter((report) => {
            const matchesSearch =
                !searchTerm.trim() ||
                report.patient?.name.toLowerCase().includes(term) ||
                report.patient?.patient_number.toLowerCase().includes(term) ||
                report.visit_details?.visit_number.toLowerCase().includes(term) ||
                report.visit_details?.visit_type.toLowerCase().includes(term) ||
                report.lab_tests?.some(test => test.test_info?.test_name.toLowerCase().includes(term));

            // DATE FILTER: normalize to local date strings
            const visitDate = new Date(report.visit_details?.visit_date);
            const visitDateLocal = visitDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

            const matchesDateFrom = !dateFrom || visitDateLocal >= dateFrom;
            const matchesDateTo = !dateTo || visitDateLocal <= dateTo;

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [labReports, searchTerm, dateFrom, dateTo]);


    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    //Close PDF preview modal and revoke blob URL to avoid memory leaks
    const closePdfPreviewModal = () => {
        setShowPdfPreviewModal(false);
        setPdfPreviewLoading(false);
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
        setPdfPreviewTitle('');
    };

    //Shared helper: fetch a PDF blob from an endpoint and open in the preview modal
    const openPdfPreview = async (endpoint, visitId, title) => {
        if (!visitId) {
            toast.error("Visit ID not found");
            return;
        }

        // Open the modal immediately with a loading spinner
        setPdfPreviewUrl(null);
        setPdfPreviewTitle(title);
        setPdfPreviewLoading(true);
        setShowPdfPreviewModal(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}${endpoint}`,
                { visit_id: visitId },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: "blob",
                }
            );

            const file = new Blob([response.data], { type: "application/pdf" });
            const url = URL.createObjectURL(file);
            setPdfPreviewUrl(url);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate PDF");
            closePdfPreviewModal();
        } finally {
            setPdfPreviewLoading(false);
        }
    };

    //Handle the download of test request form
    const handlePreviewLabTestRequestPdf = (visitId) => {
        openPdfPreview('tests/generatePatientLabTestRequestForm', visitId, 'Test Request Form');
    };

    //Handle the function to download test result form
    const handleDownloadOfTestResultForm = (visitId) => {
        openPdfPreview('tests/generatePatientTestResultForm', visitId, 'Test Result Form');
    };

    return (
        <>
            <ToastContainer />
            <div className="rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900 mt-5 bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-100 dark:bg-gradient-to-br dark:from-violet-950 dark:via-indigo-900 dark:to-teal-950">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                                Patient Lab Tests and Results Reporting
                            </h1>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Reports displayed by default are for the current month. Adjust the filter to view reports for other periods based on visit date.
                        </p>
                    </div>

                    {/* 🔔 Informational Alert */}
                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                        <p className="text-1xl font-bold leading-relaxed">
                            <strong>Note:</strong> This report generates lab tests and results based on a specific patient visit.
                            Only patient visits that have laboratory tests performed on them are included.
                            You may adjust the date filters to view reports for other periods.
                        </p>
                    </div>
                </div>


                {/* Filters Section */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by patient name, visit number, test name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Date Filters */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>

                            <button
                                onClick={applyDateFilter}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 justify-center"
                            >
                                <Filter className="w-4 h-4" />
                                Apply
                            </button>

                            <button
                                onClick={resetFilters}
                                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2 justify-center"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Status Legend */}
                    <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                            Test Status Legend
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                            <div className="flex items-center gap-2">
                                <X className="w-4 h-4 font-bold text-pink-900 dark:text-pink-900" strokeWidth={3} />
                                <span className="text-gray-700 dark:text-gray-300">Pending</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <X className="w-4 h-4 font-bold text-yellow-500" strokeWidth={3} />
                                <span className="text-gray-700 dark:text-gray-300">Started</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <X className="w-4 h-4 font-bold text-blue-600" strokeWidth={3} />
                                <span className="text-gray-700 dark:text-gray-300">Completed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <X className="w-4 h-4 font-bold text-violet-900" strokeWidth={3} />
                                <span className="text-gray-700 dark:text-gray-300">Verified</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <X className="w-4 h-4 font-bold text-green-600" strokeWidth={3} />
                                <span className="text-gray-700 dark:text-gray-300">Approved</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <X className="w-4 h-4 font-bold text-red-600" strokeWidth={3} />
                                <span className="text-gray-700 dark:text-gray-300">Rejected</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <table className="w-full text-sm">
                        {/* HEADER */}
                        <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {[
                                    "Patient",
                                    "Visit Date",
                                    "Visit No",
                                    "Visit Type",
                                    "Tests",
                                    "Test Status(Respectively)",
                                    "Test Count",

                                    "",
                                ].map((head) => (
                                    <th
                                        key={head}
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide"
                                    >
                                        {head}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {/* BODY */}
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={8} className="px-6 py-4">
                                            <Skeleton height={24} />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLabTestReports.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No lab reports found. Adjust the filter
                                    </td>
                                </tr>
                            ) : (
                                filteredLabTestReports.map((visit) => (
                                    <React.Fragment key={visit.visit_details?.id}>
                                        {/* MAIN ROW — click anywhere to expand/collapse */}
                                        <tr
                                            className="hover:bg-blue-50/40 dark:hover:bg-gray-800 transition cursor-pointer select-none"
                                            onClick={() => toggleRow(visit.visit_details?.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {visit.patient?.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {visit.patient?.patient_number}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-sm">
                                                {formatDate(visit.visit_details?.visit_date)}
                                            </td>

                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-sm font-mono">
                                                {visit.visit_details?.visit_number}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${visit.visit_details?.visit_type === 'InPatient'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                    }`}>
                                                    {visit.visit_details?.visit_type}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                {visit.lab_tests && visit.lab_tests.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {visit.lab_tests.map((test) => (
                                                            <span
                                                                key={test.test_id}
                                                                className="inline-flex px-2 py-0.5 text-xs rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                                                            >
                                                                {test.test_info?.test_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">No tests</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3">
                                                {visit.lab_tests && visit.lab_tests.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {visit.lab_tests.map((test) => (
                                                            <span
                                                                key={test.test_id}
                                                                className={`inline-flex px-2 py-0.5 text-xs rounded-md ${getStatusColor(test.test_status?.id)}`}
                                                            >
                                                                {test.test_status?.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">No tests</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold">
                                                    {visit.lab_tests?.length || 0}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                                    {expandedRows.has(visit.visit_details?.id) ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* EXPANDED ROW */}
                                        {expandedRows.has(visit.visit_details?.id) && (
                                            <tr>
                                                <td colSpan={8} className="p-0 bg-slate-50 dark:bg-gray-800/50">
                                                    <div className="border-t-2 border-blue-400 dark:border-blue-600">

                                                        {/* ── ACTIONS BAR ── */}
                                                        <div className="px-6 py-3 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 border-b border-slate-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
                                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
                                                                Documents
                                                            </span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handlePreviewLabTestRequestPdf(visit.visit_details?.id); }}
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600 transition shadow-sm"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                                View Test Request Form
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDownloadOfTestResultForm(visit.visit_details?.id); }}
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition shadow-sm"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                                View Test Result Form
                                                            </button>
                                                        </div>

                                                        <div className="px-6 py-5 space-y-6">

                                                            {/* ── PATIENT & VISIT CARDS ── */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* PATIENT CARD */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                                                    <div className="px-4 py-2.5 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                                                        <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                                                        <h5 className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Patient Details</h5>
                                                                    </div>
                                                                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                                                                        {[
                                                                            ['Name', visit.patient?.name],
                                                                            ['Patient No', visit.patient?.patient_number],
                                                                            ['Email', visit.patient?.email],
                                                                            ['Phone', visit.patient?.phone_number],
                                                                            ['Address', visit.patient?.address],
                                                                            ['District', visit.patient?.district],
                                                                            ['Insurance', visit.patient?.insurance?.provider],
                                                                            ['Insurance No', visit.patient?.insurance?.number],
                                                                        ].map(([label, value]) => (
                                                                            <div key={label}>
                                                                                <dt className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wide">{label}</dt>
                                                                                <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate">{value || 'N/A'}</dd>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* VISIT CARD */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                                                    <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                                                        <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                        <h5 className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Visit Details</h5>
                                                                    </div>
                                                                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                                                                        {[
                                                                            ['Visit Number', visit.visit_details?.visit_number],
                                                                            ['Visit Type', visit.visit_details?.visit_type],
                                                                            ['Visit Date', visit.visit_details?.visit_date],
                                                                            ['Created By', visit.visit_details?.created_by],
                                                                            ['Doctor', visit.visit_details?.doctor],
                                                                        ].map(([label, value]) => (
                                                                            <div key={label}>
                                                                                <dt className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wide">{label}</dt>
                                                                                <dd className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{value || 'N/A'}</dd>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* ── LAB TESTS ── */}
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <FlaskConical className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                                                                        Lab Tests
                                                                    </h4>
                                                                    <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                                        {visit.lab_tests?.length || 0}
                                                                    </span>
                                                                </div>

                                                                {visit.lab_tests && visit.lab_tests.length > 0 ? (
                                                                    <div className="space-y-4">
                                                                        {visit.lab_tests.map((labTest, labIdx) => (
                                                                            <div
                                                                                key={labTest.test_id}
                                                                                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
                                                                            >
                                                                                {/* TEST HEADER */}
                                                                                <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-700 text-white text-xs font-bold flex-shrink-0">
                                                                                            {labIdx + 1}
                                                                                        </span>
                                                                                        <div>
                                                                                            <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                                                {labTest.test_info?.test_name}
                                                                                            </h5>
                                                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">ID: {labTest.test_id}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusColor(labTest.test_status?.id)} border-current/20`}>
                                                                                        {labTest.test_status?.name || 'N/A'}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="p-5 space-y-4">
                                                                                    {/* TEST & SPECIMEN INFO */}
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                                                                            <h6 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Test Information</h6>
                                                                                            <dl className="space-y-1.5 text-xs">
                                                                                                {[
                                                                                                    ['Purpose', labTest.test_info?.purpose],
                                                                                                    ['Description', labTest.test_info?.description],
                                                                                                    ['Method Used', labTest.test_info?.method_used],
                                                                                                    ['Accepted By', labTest.test_info?.accepted_by],
                                                                                                    ['Time Accepted', labTest.test_info?.time_accepted],
                                                                                                ].map(([label, val]) => (
                                                                                                    <div key={label} className="flex gap-2">
                                                                                                        <dt className="text-gray-400 dark:text-gray-500 shrink-0 w-24">{label}:</dt>
                                                                                                        <dd className="font-medium text-gray-700 dark:text-gray-300">{val || 'N/A'}</dd>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </dl>
                                                                                        </div>
                                                                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                                                                            <h6 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Specimen Information</h6>
                                                                                            <dl className="space-y-1.5 text-xs">
                                                                                                {[
                                                                                                    ['Type', labTest.specimen?.type],
                                                                                                    ['Barcode', labTest.specimen?.barcode],
                                                                                                    ['Collected By', labTest.specimen?.collected_by],
                                                                                                    ['Collected At', labTest.specimen?.collected_at],
                                                                                                    ['Acceptance', labTest.specimen?.sample_acceptance],
                                                                                                ].map(([label, val]) => (
                                                                                                    <div key={label} className="flex gap-2">
                                                                                                        <dt className="text-gray-400 dark:text-gray-500 shrink-0 w-24">{label}:</dt>
                                                                                                        <dd className="font-medium text-gray-700 dark:text-gray-300">{val || 'N/A'}</dd>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </dl>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* RESULTS TABLE */}
                                                                                    <div>
                                                                                        <div className="flex items-center gap-2 mb-2">
                                                                                            <TestTube2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                                                                            <h6 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                                                Results ({labTest.results?.length || 0})
                                                                                            </h6>
                                                                                        </div>

                                                                                        {labTest.results && labTest.results.length > 0 ? (
                                                                                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                                                                                <table className="w-full text-xs">
                                                                                                    <thead className="bg-gray-100 dark:bg-gray-700/60">
                                                                                                        <tr>
                                                                                                            {['Parameter', 'Type', 'Result', 'Unit', 'Ref. Range', 'Interpretation', 'Instrument', 'Entered By', 'Verified By', 'Time Entered', 'Time Verified'].map(h => (
                                                                                                                <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                                                                                                    {h}
                                                                                                                </th>
                                                                                                            ))}
                                                                                                        </tr>
                                                                                                    </thead>
                                                                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                                                                                        {labTest.results.map((result, idx) => {
                                                                                                            const parameter = result.snapshot?.parameter_used;
                                                                                                            const testResult = result.snapshot?.test_result;
                                                                                                            const isNumeric = parameter?.result_type === "numeric";
                                                                                                            const interp = result.interpretation || testResult?.interpretation;
                                                                                                            return (
                                                                                                                <tr
                                                                                                                    key={`${labTest.test_id}-${result.parameter_id}-${idx}`}
                                                                                                                    className="bg-white dark:bg-gray-900 even:bg-gray-50/60 even:dark:bg-gray-800/30"
                                                                                                                >
                                                                                                                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                                                                                        {parameter?.name || '—'}
                                                                                                                    </td>
                                                                                                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                                                                                                        {parameter?.result_type || '—'}
                                                                                                                    </td>
                                                                                                                    <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">
                                                                                                                        {result.value || testResult?.result_value || '—'}
                                                                                                                    </td>
                                                                                                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                                                                                                        {parameter?.si_unit || '—'}
                                                                                                                    </td>
                                                                                                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                                                                                        {isNumeric ? (parameter?.reference_range || `${parameter?.normal_min} – ${parameter?.normal_max}`) : '—'}
                                                                                                                    </td>
                                                                                                                    <td className={`px-3 py-2 font-bold whitespace-nowrap ${interp === 'High' ? 'text-red-600 dark:text-red-400' : interp === 'Low' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                                                                                                                        {interp || '—'}
                                                                                                                    </td>
                                                                                                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{result.instrument || '—'}</td>
                                                                                                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{result.result_entered_by || '—'}</td>
                                                                                                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{result.result_verified_by || 'Not Verified'}</td>
                                                                                                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{result.time_entered || '—'}</td>
                                                                                                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{result.time_verified || '—'}</td>
                                                                                                                </tr>
                                                                                                            );
                                                                                                        })}
                                                                                                    </tbody>
                                                                                                </table>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="text-center py-4 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                                                                                No results recorded for this test
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                                                        No lab tests recorded for this visit
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>


                {/* Pagination */}
                <div className="px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                    {/* Showing info */}
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                        Showing {filteredLabTestReports.length} visits (Page {currentPage} of {totalPages})
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchPatientLabTestAndResultReport(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => fetchPatientLabTestAndResultReport(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── PDF PREVIEW MODAL ── */}
            {/* Shared by both "View Test Request Form" and "View Test Result Form" buttons */}
            {showPdfPreviewModal && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3
                        bg-white dark:bg-gray-900
                        border-b border-gray-200 dark:border-gray-700
                        flex-shrink-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {pdfPreviewTitle}
                        </h3>
                        <div className="flex items-center gap-3">
                            {pdfPreviewUrl && (
                                <a
                                    href={pdfPreviewUrl}
                                    download={`${pdfPreviewTitle}.pdf`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                </a>
                            )}
                            <button
                                onClick={closePdfPreviewModal}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg font-bold leading-none"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {pdfPreviewLoading ? (
                            <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                                <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
                                <span className="text-sm">Generating PDF&hellip;</span>
                            </div>
                        ) : pdfPreviewUrl ? (
                            <iframe
                                src={pdfPreviewUrl}
                                title={pdfPreviewTitle}
                                className="w-full h-full border-0"
                                style={{ minHeight: 0 }}
                            />
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
}