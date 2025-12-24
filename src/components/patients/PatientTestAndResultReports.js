import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, HandCoins, ChevronRight, ChevronLeft, X } from 'lucide-react';
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

    //Handle the download of test request form
    const handlePreviewLabTestRequestPdf = async (visitId) => {
        if (!visitId) {
            toast.error("Visit ID not found");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/generatePatientLabTestRequestForm`,
                { visit_id: visitId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    responseType: "blob",
                }
            );

            // Create blob
            const file = new Blob([response.data], { type: "application/pdf" });

            // Create blob URL
            const fileURL = URL.createObjectURL(file);

            // Preview PDF in new tab
            window.open(fileURL, "_blank");

            // Cleanup after some time
            setTimeout(() => URL.revokeObjectURL(fileURL), 60000); // 1 minute

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate test request form");
        } finally {
            setLoading(false);
        }
    };

    //Handle thefunction to download test result form
    //tests/generatePatientTestResultForm
    const handleDownloadOfTestResultForm = async (visitId) => {
        if (!visitId) {
            toast.error("Visit ID not found");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/generatePatientTestResultForm`,
                { visit_id: visitId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    responseType: "blob",
                }
            );

            // Create blob
            const file = new Blob([response.data], { type: "application/pdf" });

            // Create blob URL
            const fileURL = URL.createObjectURL(file);

            // Preview PDF in new tab
            window.open(fileURL, "_blank");

            // Cleanup after some time
            setTimeout(() => URL.revokeObjectURL(fileURL), 60000); // 1 minute

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate test result form");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ToastContainer />
            <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-5 dark:bg-gradient-to-br dark:from-purple-900 dark:via-blue-900 dark:to-black">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                                Patient Lab Tests and Lab Results Reporting
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
                                        {/* MAIN ROW - ONE PER VISIT */}
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {visit.patient?.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {visit.patient?.patient_number}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                {formatDate(visit.visit_details?.visit_date)}
                                            </td>

                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                {visit.visit_details?.visit_number}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 text-xs rounded-md ${visit.visit_details?.visit_type === 'InPatient'
                                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                                    }`}>
                                                    {visit.visit_details?.visit_type}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                {visit.lab_tests && visit.lab_tests.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-w-md">
                                                        {visit.lab_tests.map((test) => (
                                                            <span
                                                                key={test.test_id}
                                                                className="inline-flex px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                                                            >
                                                                {test.test_info?.test_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">No tests</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3">
                                                {visit.lab_tests && visit.lab_tests.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-w-md">
                                                        {visit.lab_tests.map((test) => (
                                                            <span
                                                                key={test.test_id}
                                                                className={`inline-flex px-2 py-1 text-xs text-gray-700 dark:text-gray-300  rounded-md ${getStatusColor(test.test_status?.id)}`}
                                                            >
                                                                {test.test_status?.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">No tests</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 font-semibold">
                                                    {visit.lab_tests?.length || 0}
                                                </span>
                                            </td>



                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => toggleRow(visit.visit_details?.id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
                                                >
                                                    {expandedRows.has(visit.visit_details?.id) ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* EXPANDED ROW */}
                                        {expandedRows.has(visit.visit_details?.id) && (
                                            <tr>
                                                <td colSpan={8} className="bg-gray-50 dark:bg-gray-800 px-6 py-6">
                                                     {/* ACTIONS SECTION */}
                                                    <div className="mb-6">
                                                        <h4 className="text-2xl text-center font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                           Actions
                                                        </h4>

                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">

                                                            {/* Handle the button that downloads the Lab test request form */}
                                                            <button
                                                                onClick={() =>
                                                                    handlePreviewLabTestRequestPdf(visit.visit_details?.id)
                                                                }
                                                                className="px-3 py-2 text-xs font-bold rounded-lg
                                                                bg-sky-100 text-sky-700
                                                                dark:bg-sky-900/30 dark:text-sky-300
                                                                hover:bg-sky-200 dark:hover:bg-sky-900/50 transition"
                                                            >
                                                                View Test Request Form
                                                            </button>



                                                            {/* Button download Test Result Form */}
                    
                                                                <button
                                                                    onClick={() =>
                                                                        handleDownloadOfTestResultForm(visit.visit_details?.id)
                                                                    }
                                                                    className="px-3 py-2 text-xs font-bold rounded-lg
                                                                bg-sky-100 text-sky-700
                                                                dark:bg-sky-900/30 dark:text-sky-300
                                                                hover:bg-sky-200 dark:hover:bg-sky-900/50 transition"
                                                                >
                                                                    View Test Result Form
                                                                </button>
                                                           

                                                        </div>
                                                    </div>

                                                    {/* PATIENT & VISIT DETAILS */}
                                                    <div className="mb-6">
                                                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                                                            Patient & Visit Information
                                                        </h4>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* PATIENT CARD */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                                <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                    Patient Details
                                                                </h5>

                                                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                                                    <p><span className="font-medium">Name:</span> {visit.patient?.name || "N/A"}</p>
                                                                    <p><span className="font-medium">Patient No:</span> {visit.patient?.patient_number || "N/A"}</p>
                                                                    <p><span className="font-medium">Email:</span> {visit.patient?.email || "N/A"}</p>
                                                                    <p><span className="font-medium">Phone:</span> {visit.patient?.phone_number || "N/A"}</p>
                                                                    <p><span className="font-medium">Address:</span> {visit.patient?.address || "N/A"}</p>
                                                                    <p><span className="font-medium">District:</span> {visit.patient?.district || "N/A"}</p>
                                                                    <p><span className="font-medium">Insurance:</span> {visit.patient?.insurance?.provider || "N/A"}</p>
                                                                    <p><span className="font-medium">Insurance No:</span> {visit.patient?.insurance?.number || "N/A"}</p>
                                                                </div>
                                                            </div>

                                                            {/* Visit Details */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                                <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                    Visit Details
                                                                </h5>

                                                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                                                    <p><span className="font-medium">Visit Number:</span> {visit.visit_details?.visit_number || "N/A"}</p>
                                                                    <p><span className="font-medium">Visit Type:</span> {visit.visit_details?.visit_type || "N/A"}</p>
                                                                    <p><span className="font-medium">Visit Date:</span> {visit.visit_details?.visit_date || "N/A"}</p>
                                                                    <p><span className="font-medium">Created By:</span> {visit.visit_details?.created_by || "N/A"}</p>
                                                                    <p><span className="font-medium">Doctor:</span> {visit.visit_details?.doctor || "N/A"}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ALL TESTS FOR THIS VISIT */}
                                                    <div className="mt-6">
                                                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                                                            Lab Tests ({visit.lab_tests?.length || 0})
                                                        </h4>

                                                        {visit.lab_tests && visit.lab_tests.length > 0 ? (
                                                            <div className="space-y-6">
                                                                {visit.lab_tests.map((labTest) => (
                                                                    <div
                                                                        key={labTest.test_id}
                                                                        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
                                                                    >
                                                                        {/* TEST HEADER */}
                                                                        <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                                                            <div>
                                                                                <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                                                    {labTest.test_info?.test_name}
                                                                                </h5>
                                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                                    Test ID: {labTest.test_id}
                                                                                </p>
                                                                            </div>
                                                                            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                                                                {labTest.test_status?.name || "N/A"}
                                                                            </span>
                                                                        </div>

                                                                        {/* TEST & SPECIMEN INFO GRID */}
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                                            {/* TEST INFO */}
                                                                            <div>
                                                                                <h6 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                                                                                    Test Information
                                                                                </h6>
                                                                                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                                                    <p><span className="font-medium">Purpose:</span> {labTest.test_info?.purpose || "N/A"}</p>
                                                                                    <p><span className="font-medium">Description:</span> {labTest.test_info?.description || "N/A"}</p>
                                                                                    <p><span className="font-medium">Method Used:</span> {labTest.test_info?.method_used || "N/A"}</p>
                                                                                    <p><span className="font-medium">Accepted By:</span> {labTest.test_info?.accepted_by || "N/A"}</p>
                                                                                    <p><span className="font-medium">Time Accepted:</span> {labTest.test_info?.time_accepted || "N/A"}</p>
                                                                                </div>
                                                                            </div>

                                                                            {/* SPECIMEN INFO */}
                                                                            <div>
                                                                                <h6 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                                                                                    Specimen Information
                                                                                </h6>
                                                                                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                                                    <p><span className="font-medium">Type:</span> {labTest.specimen?.type || "N/A"}</p>
                                                                                    <p><span className="font-medium">Barcode:</span> {labTest.specimen?.barcode || "N/A"}</p>
                                                                                    <p><span className="font-medium">Collected By:</span> {labTest.specimen?.collected_by || "N/A"}</p>
                                                                                    <p><span className="font-medium">Collected At:</span> {labTest.specimen?.collected_at || "N/A"}</p>
                                                                                    <p><span className="font-medium">Acceptance:</span> {labTest.specimen?.sample_acceptance || "N/A"}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* TEST RESULTS */}
                                                                        <div className="mt-4">
                                                                            <h6 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                                Test Results ({labTest.results?.length || 0})
                                                                            </h6>

                                                                            {labTest.results && labTest.results.length > 0 ? (
                                                                                <div className="space-y-3">
                                                                                    {labTest.results.map((result, idx) => {
                                                                                        const parameter = result.snapshot?.parameter_used;
                                                                                        const testResult = result.snapshot?.test_result;
                                                                                        const isNumeric = parameter?.result_type === "numeric";

                                                                                        return (
                                                                                            <div
                                                                                                key={`${labTest.test_id}-${result.parameter_id}-${idx}`}
                                                                                                className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                                                                                            >
                                                                                                {/* PARAMETER HEADER */}
                                                                                                <div className="flex items-start justify-between mb-3">
                                                                                                    <div>
                                                                                                        <h6 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                                                            {parameter?.name || "Unknown Parameter"}
                                                                                                        </h6>
                                                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                                            Type: {parameter?.result_type || "N/A"}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* RESULT VALUE */}
                                                                                                <div className="mb-3">
                                                                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                                                                        Result Value
                                                                                                    </p>
                                                                                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                                                                        {result.value || testResult?.result_value} {parameter?.si_unit || ''}
                                                                                                    </p>

                                                                                                    <p
                                                                                                        className={`mt-1 text-xs font-medium ${(result.interpretation || testResult?.interpretation) === "High"
                                                                                                            ? "text-red-600 dark:text-red-400"
                                                                                                            : (result.interpretation || testResult?.interpretation) === "Low"
                                                                                                                ? "text-yellow-600 dark:text-yellow-400"
                                                                                                                : "text-green-600 dark:text-green-400"
                                                                                                            }`}
                                                                                                    >
                                                                                                        Interpretation: {result.interpretation || testResult?.interpretation || "—"}
                                                                                                    </p>
                                                                                                </div>

                                                                                                {/* NUMERIC DETAILS */}
                                                                                                {isNumeric && (
                                                                                                    <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                                                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                                                                            Reference Range
                                                                                                        </p>
                                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                                                            {parameter?.reference_range || `${parameter?.normal_min} - ${parameter?.normal_max}`} {parameter?.si_unit || ''}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* AUDIT TRAIL */}
                                                                                                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                                                                                    <p><span className="font-medium">Instrument:</span> {result.instrument || "N/A"}</p>
                                                                                                    <p><span className="font-medium">Entered By:</span> {result.result_entered_by || "N/A"}</p>
                                                                                                    <p><span className="font-medium">Verified By:</span> {result.result_verified_by || "Not Verified"}</p>
                                                                                                    <p><span className="font-medium">Time Entered:</span> {result.time_entered || "N/A"}</p>
                                                                                                    <p><span className="font-medium">Time Verified:</span> {result.time_verified || "N/A"}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                                                    No results recorded for this test
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                No lab tests recorded for this visit
                                                            </div>
                                                        )}
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
        </>
    );
}