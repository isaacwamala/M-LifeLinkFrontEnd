import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Filter, RefreshCw, HandCoins, Package, User, Phone, MapPin, CreditCard, DollarSign, Hash, ChevronRight, ChevronLeft } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchTestTypes } from './patients_lab_tests_helper';
import { fetchSpecimenTypes } from './patients_lab_tests_helper';
import { toast, ToastContainer } from 'react-toastify';

export function PatientLabTestRequests() {
    const [labTests, setLabTests] = useState([]);
    //const [filteredSales, setFilteredSales] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(false);

    //Set assigned specimen type ids
    const [assignedSpecimenTypeIds, setAssignedSpecimenTypeIds] = useState([]);
    const [specimens, setSpecimens] = useState([]);
    const [selectedTestTypeId, setSelectedTestTypeId] = useState(null);

    //States to display accept specimen modal
    const [showSpecimenModal, setShowSpecimenModal] = useState(false);
    //State to handle active test
    const [activeTest, setActiveTest] = useState(null);
    const [selectedSpecimenId, setSelectedSpecimenId] = useState(null);

    //States for the test rejection modal
    // State to display the reject modal
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");



    //Set current page due to paginations from back end
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    //Use local date
    const today = new Date().toLocaleDateString('en-CA');


    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(today);


    useEffect(() => {
        loadAllSpecimenTypes();
    }, []);


    //Endpoint that fetches all specimen types
    //This will help us return all specimens, to be used to filter specimen
    //Belonging to the selected test type by id
    const loadAllSpecimenTypes = async () => {
        setLoading(true);
        const data = await fetchSpecimenTypes(token);
        setSpecimens(data);
        setLoading(false);
    };

    //Now fetch Specimens attached to the selected/considered TestType to start on the test
    // This will help us for the user to confirm the specimen of the test type considered
    //It returns ie Specimen Blood,Urine for test type HIV
    //We shall call this function when user selects Accept specimen button on the test type and pass the test type id
    const fetchSpecimensForTestType = async (tesTypeId) => {
        try {
            setLoading(true);

            //Get assigned specimens for a given test type
            const response = await axios.get(
                `${API_BASE_URL}config/getSpecimensForTestType`,
                {
                    //Pass the test type id,considered to get its specimens
                    params: {
                        test_type_id: tesTypeId
                    },
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            //Get specimens assigned to the test type
            const specimenTypeIds = response.data.test_type.specimens.map(ss => ss.id);
            //Set specimens in state
            setAssignedSpecimenTypeIds(specimenTypeIds);
            console.log('specimenTypeIds', specimenTypeIds)

        } catch (error) {
            console.error('Error fetching specimens for the test type:', error);
            toast.error('error', 'Failed to load specimens for aspecific test type');
        } finally {
            setLoading(false);
        }
    };

    //Fetch Patient Lab tests  from backend
    const fetchPatientLabTestRequests = async (page = 1) => {
        setLoading(true);

        try {
            const response = await axios.get(`${API_BASE_URL}tests/getLabTestRequests`, {
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

            //Get Lab tests
            const data = response.data.tests;

            setLabTests(data.data);
            setTotalPages(data.last_page);
            setCurrentPage(data.current_page);

            console.log("tests:", data);

        } catch (error) {
            console.error("Error fetching Lab tests:", error);
        } finally {
            setLoading(false);
        }
    };

    //Mount the component
    useEffect(() => {
        fetchPatientLabTestRequests(1);
    }, [token, dateFrom, dateTo]);

    const applyDateFilter = () => {
        fetchPatientLabTestRequests(1);
    };

    //Reset filtersto default that is current date
    // and also the single page fetch from back end
    const resetFilters = () => {
        setDateFrom(today);
        setDateTo(today);
        fetchPatientLabTestRequests(1);
    };


    //Determine filtered lab tests based on search term and date range
    //Ensure that if the date filters or searches ,we filter from the full tests list
    //from the back end data
    const filteredLabTests = useMemo(() => {
        const term = searchTerm.toLowerCase();

        return labTests.filter((test) => {
            const matchesSearch =
                !searchTerm.trim() ||
                test.id?.toString().includes(term) ||
                test.patient?.name.toLowerCase().includes(term) ||
                test.visit_details?.visit_number.toLowerCase().includes(term) ||
                test.test_status?.name.toLowerCase().includes(term);

            // DATE FILTER: normalize to local date strings
            const testDate = new Date(test.test_info?.test_date);
            const testDateLocal = testDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

            const matchesDateFrom = !dateFrom || testDateLocal >= dateFrom;
            const matchesDateTo = !dateTo || testDateLocal <= dateTo;

            return matchesSearch && matchesDateFrom && matchesDateTo;
        });
    }, [labTests, searchTerm, dateFrom, dateTo]);


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


    // 1.Function to collect sample for a given test by id
    const handleCollectSample = async (testId) => {
        if (!testId) return;
        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/collectTestSpecimen`,
                {
                    // Pass the actual test request ID, not the test type ID
                    test_id: testId
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            toast.success(response.data.message);
            fetchPatientLabTestRequests(currentPage);

        } catch (error) {
            console.error("Error collecting sample:", error);
            toast.error(error.response?.data?.message || "Failed to collect sample");
        } finally {
            setLoading(false);
        }
    };

    //2.Function to accept specimen
    const handleAcceptSpecimen = async () => {
        if (!activeTest || !selectedSpecimenId) return;

        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/acceptCollectedSpecimen`,
                {
                    //Pass the the id of the test type selected and then the specimen type id
                    test_id: activeTest.id,
                    specimen_type_id: selectedSpecimenId,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            //toast.success('Specimen accepted successfully');
            toast.success(response.data.message);
            setShowSpecimenModal(false);
            fetchPatientLabTestRequests(currentPage);

        } catch (error) {
            console.error(error);
            toast.error(error.response.data?.message);
        } finally {
            setLoading(false);
        }
    };

    //3.Function To Start The Test
    const handleTestStartOrAnalysis = async (testId) => {
        if (!testId) return;
        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/startLaboratoryTest`,
                {
                    // Pass the actual test request ID,
                    test_id: testId
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            toast.success(response.data.message);
            fetchPatientLabTestRequests(currentPage);

        } catch (error) {
            console.error("Error starting test:", error);
            toast.error(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    //Function to reject the Test
    const handleRejectTest = async () => {
        if (!activeTest) {
            toast.error("No test selected");
            return;
        }

        if (!rejectionReason || !rejectionReason.trim()) {
            toast.error("Rejection reason is required");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/rejectLaboratoryTest`,
                {
                    test_id: activeTest.id,
                    test_rejection_reason: rejectionReason
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            toast.success(response.data.message);
            setShowRejectModal(false);
            setRejectionReason("");
            fetchPatientLabTestRequests(currentPage);

        } catch (error) {
            console.error("Error rejecting test:", error);
            toast.error(error.response?.data?.message || "Failed to reject test");
        } finally {
            setLoading(false);
        }
    };




    return (
        <>
            <ToastContainer />
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-5">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">

                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center gap-3">
                            <HandCoins className="w-8 h-8 text-blue-600" />
                            <h1 className="text-black-900 font-bold dark:text-white text-2xl md:text-[30px]">
                                Patient Laboratory Test Requests
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
                            Lab tests displayed are those made today. Adjust the filters above to Laboratory tests made other periods.
                        </p>
                    </div>
                </div>
                {/* Header Row */}



                {/* Filters Section */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search test status, visit number, patient neme...."
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

                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <table className="w-full text-sm">
                        {/* HEADER */}
                        <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                {[
                                    "Test ID",
                                    "Patient",
                                    "Patient No",
                                    "Visit No",
                                    "Visit Date",
                                    "Test",
                                    "Specimen",
                                    "Barcode",
                                    "Status",
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
                                [...Array(6)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={9} className="px-6 py-4">
                                            <Skeleton height={24} />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLabTests.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        No lab test requests found
                                    </td>
                                </tr>
                            ) : (
                                filteredLabTests.map((test) => (
                                    <React.Fragment key={test.id}>
                                        {/* MAIN ROW */}
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                                                #LT-{test.id}
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {test.patient?.name}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                {test.patient?.patient_number}
                                            </td>

                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                {test.visit_details?.visit_number}
                                            </td>

                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                {test.visit_details?.visit_date}
                                            </td>

                                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                                                {test.test_info?.test_type}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="inline-flex px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                                    {test.specimen?.type}

                                                </span>
                                            </td>

                                            <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                {test.specimen?.specimen_barcode}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full
                                    bg-yellow-100 text-yellow-800
                                    dark:bg-yellow-900 dark:text-yellow-300">
                                                    {test.test_status?.name}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => toggleRow(test.id)}
                                                    className="inline-flex items-center  justify-center w-8 h-8 rounded-full
                                               hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
                                                >
                                                    {expandedRows.has(test.id) ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* EXPANDED ROW */}
                                        {expandedRows.has(test.id) && (
                                            <tr>
                                                <td colSpan={10} className="bg-gray-50 dark:bg-gray-800 px-6 py-6">
                                                    {/* ACTIONS SECTION */}
                                                    <div className="mb-6">
                                                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                            Laboratory Actions for this Test
                                                        </h4>

                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">

                                                            {/* Function to collect specimen/sample while calling the function 
                                                            WE ensure we pass the id of this test, its only we need */}
                                                            <button
                                                                onClick={() => handleCollectSample(test.id)}
                                                                className="px-3 py-2 text-xs font-bold rounded-lg
                                                                bg-blue-100 text-blue-700
                                                                dark:bg-blue-900/30 dark:text-blue-300
                                                                hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                                                            >
                                                                Collect Sample
                                                            </button>



                                                            {/* Accept Specimen Button,when clicked it triggers the modal */}
                                                            <button
                                                                onClick={() => {
                                                                    setActiveTest(test);


                                                                    setSelectedSpecimenId(null);
                                                                    // Pass the id of this test type and pass it to the function that returns specimens for the test type
                                                                    // its necessary when accepting sample/specimen for the test
                                                                    fetchSpecimensForTestType(test.test_info.id);
                                                                    setShowSpecimenModal(true);
                                                                }}
                                                                className="px-3 py-2 text-xs font-bold rounded-lg
                                                                bg-indigo-100 text-indigo-700
                                                                 dark:bg-indigo-900/30 dark:text-indigo-300
                                                                 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition"
                                                            >
                                                                Accept Specimen
                                                            </button>


                                                            {/* Button to reject the test, we ensure we save the test in state, 
                                                              and we shall pass the id of the test in handleRejectTest function,
                                                             together with the rejection reason */}
                                                            <button
                                                                onClick={() => {
                                                                    setActiveTest(test); // save the current test in state
                                                                    setRejectionReason(""); // reset any previous reason
                                                                    setShowRejectModal(true); // open modal
                                                                }}
                                                                className="px-3 py-2 text-xs font-bold rounded-lg
                                                                bg-red-100 text-red-700
                                                                dark:bg-red-900/30 dark:text-red-300
                                                                hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                                                            >
                                                                Reject Test
                                                            </button>



                                                            {/* Handle the start of the test, by passing the id of this test to the function
                                                            that handles the start of the test */}
                                                            <button
                                                                onClick={() => handleTestStartOrAnalysis(test.id)}
                                                                className="px-3 py-2 text-xs font-bold rounded-lg
                                                               bg-yellow-100 text-yellow-800
                                                               dark:bg-yellow-900/30 dark:text-yellow-300
                                                               hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
                                                            >
                                                                Start / Analyze
                                                            </button>

                                                            <button className="px-3 py-2 text-xs font-bold rounded-lg
                                                              bg-purple-100 text-purple-700
                                                              dark:bg-purple-900/30 dark:text-purple-300
                                                              hover:bg-purple-200 dark:hover:bg-purple-900/50 transition">
                                                                Enter Results
                                                            </button>

                                                            <button className="px-3 py-2 text-xs font-bold rounded-lg
                                                              bg-teal-100 text-teal-700
                                                              dark:bg-teal-900/30 dark:text-teal-300
                                                              hover:bg-teal-200 dark:hover:bg-teal-900/50 transition">
                                                                Verify Results
                                                            </button>

                                                            <button className="px-3 py-2 text-xs font-bold rounded-lg
                                                               bg-green-100 text-green-700
                                                               dark:bg-green-900/30 dark:text-green-300
                                                                hover:bg-green-200 dark:hover:bg-green-900/50 transition">
                                                                Approve Results
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* CARDS GRID */}
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                            General Test Request Details
                                                        </h4>

                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">



                                                            {/* PATIENT CARD */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                    Patient Details
                                                                </h4>

                                                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                                                    <p><span className="font-medium">Email:</span> {test.patient?.email || "N/A"}</p>
                                                                    <p><span className="font-medium">Address:</span> {test.patient?.address || "N/A"}</p>
                                                                    <p><span className="font-medium">Phone number:</span> {test.patient?.phone_number || "N/A"}</p>
                                                                    <p>
                                                                        <span className="font-medium">Insurance:</span>{" "}
                                                                        {test.patient?.insurance_provider || "N/A"}
                                                                    </p>
                                                                    <p>
                                                                        <span className="font-medium">Insurance No.:</span>{" "}
                                                                        {test.patient?.insurance_number || "N/A"}
                                                                    </p>
                                                                </div>


                                                            </div>



                                                            {/* TEST CARD */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                    Test Information
                                                                </h4>

                                                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                                                    <p><span className="font-medium">Purpose:</span> {test.test_info?.test_purpose}</p>
                                                                    <p><span className="font-medium">Method:</span> {test.test_info?.method_used || "N/A"}</p>
                                                                    <p>
                                                                        <span className="font-medium">Test Date:</span>{" "}
                                                                        {formatDate(test.test_info?.test_date)}
                                                                    </p>
                                                                </div>
                                                            </div>


                                                            {/* SECIMEN AND AUDIT */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                    Specimen & Audit
                                                                </h4>

                                                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                                                    <p>
                                                                        <span className="font-medium">Specimen Accepted:</span>{" "}
                                                                        {test.specimen?.specimen_acceptance}
                                                                    </p>
                                                                    <p><span className="font-medium">Requested By:</span> {test.audit?.requested_by}</p>
                                                                    <p><span className="font-medium">Created By:</span> {test.audit?.created_by}</p>
                                                                </div>
                                                            </div>

                                                            {/* Visit Details */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                    Visit Details Information
                                                                </h4>

                                                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                                                    <p><span className="font-medium">Visit Type:</span> {test.visit_details?.visit_type}</p>
                                                                    <p><span className="font-bold">Visit Date:</span> {test.visit_details?.visit_date}</p>
                                                                    <p><span className="font-bold">Visit Created By:</span> {test.visit_details?.created_by}</p>

                                                                </div>
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
                        Showing {filteredLabTests.length} of {totalPages} results
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchPatientLabTestRequests(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => fetchPatientLabTestRequests(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ACCEPT SPECCIMEN MODAL */}
            {/* This modal will be triggered when the user selects Accept specimen and it maps all specimen(s)
            For the considered test by id */}
            {showSpecimenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl shadow-lg p-6">

                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                Accept Specimen To use on this test
                            </h3>
                            <button
                                onClick={() => setShowSpecimenModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        {/* BODY */}
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {assignedSpecimenTypeIds.length === 0 ? (
                                <p className="text-xs text-gray-500">
                                    No specimens mapped to this test type.
                                </p>
                            ) : (
                                // Then map all specimens belonging to the selected test type,
                                //These specimen id's are set in state, when we pass the test type id on 
                                //clicking the accept specimen button
                                specimens
                                    .filter(s => assignedSpecimenTypeIds.includes(s.id))
                                    .map(specimen => (
                                        <label
                                            key={specimen.id}
                                            className="flex items-center gap-3 p-2 rounded-lg
                                            hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                name="specimen"
                                                value={specimen.id}
                                                checked={selectedSpecimenId === specimen.id}
                                                onChange={() => setSelectedSpecimenId(specimen.id)}
                                                className="text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {specimen.specimen_name}
                                            </span>
                                        </label>
                                    ))
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowSpecimenModal(false)}
                                className="px-4 py-2 text-xs font-bold rounded-lg
            bg-gray-100 text-gray-700
            dark:bg-gray-800 dark:text-gray-300"
                            >
                                Cancel
                            </button>

                            {/* call the function that accepts the specimen */}
                            <button
                                disabled={!selectedSpecimenId}
                                onClick={handleAcceptSpecimen}
                                className="px-4 py-2 text-xs font-bold rounded-lg
                        bg-indigo-600 text-white
                        hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Confirm Acceptance
                            </button>
                        </div>

                    </div>
                </div>
            )}


            {/* TEST REJECTION MODAL */}
            {/* Here we submit the rejection of the test while passing the test rejection reason */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl shadow-lg p-6">

                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                Reject Test
                            </h3>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="space-y-3">
                            <label className="text-sm text-gray-700 dark:text-gray-300">
                                Rejection Reason
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-red-500 transition"
                                    placeholder="Enter reason for rejecting this test..."
                                />
                            </label>
                        </div>

                        {/* Footer */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-xs font-bold rounded-lg
                        bg-gray-100 text-gray-700
                        dark:bg-gray-800 dark:text-gray-300"
                            >
                                Cancel
                            </button>

                            <button
                                disabled={!rejectionReason.trim()}
                                onClick={handleRejectTest}
                                className="px-4 py-2 text-xs font-bold rounded-lg
                        bg-red-600 text-white
                        hover:bg-red-700 disabled:opacity-50"
                            >
                                Submit Rejection
                            </button>
                        </div>

                    </div>
                </div>
            )}


        </>
    );
}
