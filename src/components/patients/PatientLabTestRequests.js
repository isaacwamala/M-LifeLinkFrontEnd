import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Trash2, Filter, RefreshCw, HandCoins, Package, User, Phone, MapPin, CreditCard, DollarSign, Hash, ChevronRight, ChevronLeft, ChartBarStackedIcon } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchTestTypes } from './patients_lab_tests_helper';
import { fetchSpecimenTypes } from './patients_lab_tests_helper';
import { toast, ToastContainer } from 'react-toastify';
import { fetchLabInstruments } from './patients_lab_tests_helper';

export function PatientLabTestRequests() {
    const [labTests, setLabTests] = useState([]);
    const [instruments, setInstruments] = useState([]);
    //const [filteredSales, setFilteredSales] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const token = localStorage.getItem('access_token');
    const [loading, setLoading] = useState(false);

    //state for test type parameters
    const [parameters, setParameters] = useState([]);

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

    //States for Enter Results Modal
    const [showEnterResultsModal, setShowEnterResultsModal] = useState(false);
    const [resultValues, setResultValues] = useState({});
    const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
    const [excludedParameterIds, setExcludedParameterIds] = useState(new Set());


    //Set current page due to paginations from back end
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    //Use local date
    const today = new Date().toLocaleDateString('en-CA');

    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(today);

    // State for active tab
    const [activeTab, setActiveTab] = useState(4); // Default to PENDING


    useEffect(() => {
        loadAllSpecimenTypes();
        loadInstruments();
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

    //Load instruments
    const loadInstruments = async () => {
        setLoading(true);
        const data = await fetchLabInstruments(token);
        setInstruments(data);
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

    //Fetch All set /configured test type result parameters,
    //These parameters will be loaded when user clicks enterresults on the modal
    const fetchParameters = async (testTypeId) => {
        setLoading(true);
        try {

            //End point to return test parameters for the selected test type
            //This ensures we can add, remove or update atest result parameter for the test type
            const response = await axios.get(
                `${API_BASE_URL}test_results/getTestTypeResultWithItsParameters`,
                {
                    //Pass the test type id for the selected test type, to get its paramters if they are there
                    params: {
                        test_type_id: testTypeId
                    },
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            //Return test type parameters for the test type selected
            const testTypeParameters = response.data.test_type_parameters;


            const parsedData = testTypeParameters.map(param => ({
                ...param,
                normal_min: param.normal_min ? parseFloat(param.normal_min) : null,
                normal_max: param.normal_max ? parseFloat(param.normal_max) : null
            }));

            //Set these parameters in state
            setParameters(parsedData);

        } catch (error) {
            console.error('Error fetching parameters:', error);
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

            // FILTER BY ACTIVE TAB - only show tests matching the active tab's status
            const matchesTab = test.test_status.id === activeTab;

            return matchesSearch && matchesDateFrom && matchesDateTo && matchesTab;
        });
    }, [labTests, searchTerm, dateFrom, dateTo, activeTab]);


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

    //Function to verify Lab test results
    //We ensure that we pass the id of the test , passed on verify results button click
    //calling this very function
    const handleVerifyLabTestResults = async (testId) => {
        if (!testId) return;
        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/verifyLabTestResults`,
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
            console.error("Error verifying results:", error);
            toast.error(error.response?.data?.message || "Failed to verify results");
        } finally {
            setLoading(false);
        }
    };

    //Function to approve lab test results
    const handleApproveTestResults = async (testId) => {
        if (!testId) return;
        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/approveLaboratoryTest`,
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
            console.error("Error marking results as approved:", error);
            toast.error(error.response?.data?.message || "Failed to mark results as approved");
        } finally {
            setLoading(false);
        }
    };

    // Handler for Enter Results button click
    //We also fetch the parameters for the test type, 
    const handleEnterResultsClick = async (test) => {
        setActiveTest(test);
        setExcludedParameterIds(new Set());
        setResultValues({});
        setSelectedInstrumentId(null);

        // Fetch parameters for this test type
        //Pas the id of the tes type ie HIV,CBC and then display modal with the parameters
        //returned by the function(fetchParameters)
        await fetchParameters(test.test_info.id);
        setShowEnterResultsModal(true);
    };

    // Handler for result value changes
    const handleResultValueChange = (parameterId, field, value) => {
        setResultValues(prev => ({
            ...prev,
            [parameterId]: {
                ...prev[parameterId],
                [field]: value
            }
        }));
    };

    // Handler to exclude/remove a parameter
    const handleRemoveParameter = (parameterId) => {
        setExcludedParameterIds(prev => {
            const newSet = new Set(prev);
            newSet.add(parameterId);
            return newSet;
        });

        // Also remove from result values
        setResultValues(prev => {
            const updated = { ...prev };
            delete updated[parameterId];
            return updated;
        });
    };

    // Function to determine interpretation based on value and normal range
    const getInterpretation = (value, param) => {
        if (!value || param.result_type !== 'numeric') return '';

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';

        if (param.normal_min && param.normal_max) {
            if (numValue < param.normal_min) return param.flag_low_label || 'Low';
            if (numValue > param.normal_max) return param.flag_high_label || 'High';
            return param.flag_normal_label || 'Normal';
        }

        return '';
    };

    // Handler to submit test results
    const handleSubmitResults = async () => {
        if (!activeTest) {
            toast.error("No test selected");
            return;
        }

        if (!selectedInstrumentId) {
            toast.error("Please select an instrument");
            return;
        }

        // Get visible parameters (not excluded)
        const visibleParameters = parameters.filter(p => !excludedParameterIds.has(p.id));

        // Check if all visible parameters have values
        const missingValues = visibleParameters.filter(p => !resultValues[p.id]?.result_value);
        if (missingValues.length > 0) {
            toast.error("Please enter values for all parameters or remove them");
            return;
        }

        // Build the lab_test_results array
        const lab_test_results = visibleParameters.map(param => {
            const value = resultValues[param.id]?.result_value || '';
            return {
                lab_test_parameter_id: param.id,
                result_value: value,
                interpretation: param.result_type === 'numeric'
                    ? getInterpretation(value, param)
                    : ''
            };
        });

        try {
            setLoading(true);

            const response = await axios.post(
                `${API_BASE_URL}tests/enterLaboratoryTestResults`,
                {
                    patient_lab_test_id: activeTest.id,
                    test_instrument_id: selectedInstrumentId,
                    lab_test_results: lab_test_results
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            toast.success(response.data.message || "Results submitted successfully");
            setShowEnterResultsModal(false);
            setResultValues({});
            setExcludedParameterIds(new Set());
            fetchPatientLabTestRequests(currentPage);

        } catch (error) {
            console.error("Error submitting results:", error);
            toast.error(error.response?.data?.message || "Failed to submit results");
        } finally {
            setLoading(false);
        }
    };

    //Define statuses for Laboratory Actions as defined from 
    //Back end to logically allow do actions based on Current test status
    const TEST_STATUS = {
        SPECIMEN_COLLECTED: 2,   //status for specimen collected
        SPECIMEN_ACCEPTED: 3,    //status for specimen accepted
        PENDING: 4,             //status for pending test or created test
        STARTED: 5,             //status for Started test
        COMPLETED: 6,           //Status for completed test
        VERIFIED: 7,           //Status for verified test
        APPROVED: 8,           //status for Approved test
        REJECTED: 9,           //Status for Rejected Test
    };

    // Tab configuration
    const TABS = [
        { id: TEST_STATUS.PENDING, label: 'Pending Tests', color: 'yellow' },
        { id: TEST_STATUS.SPECIMEN_COLLECTED, label: 'Specimen Collected', color: 'blue' },
        { id: TEST_STATUS.SPECIMEN_ACCEPTED, label: 'Specimen Accepted', color: 'indigo' },
        { id: TEST_STATUS.STARTED, label: 'Started', color: 'orange' },
        { id: TEST_STATUS.COMPLETED, label: 'Completed', color: 'purple' },
        { id: TEST_STATUS.VERIFIED, label: 'Verified', color: 'teal' },
        { id: TEST_STATUS.APPROVED, label: 'Approved', color: 'green' },
        { id: TEST_STATUS.REJECTED, label: 'Rejected', color: 'red' },
    ];

    // Get count of tests for each status
    const getStatusCount = (statusId) => {
        return labTests.filter(test => test.test_status.id === statusId).length;
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

                {/* Tabs Section */}
                <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="px-6 overflow-x-auto">
                        <div className="flex gap-2 min-w-max py-3">
                            {TABS.map((tab) => {
                                const count = getStatusCount(tab.id);
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            px-4 py-2 rounded-lg transition-all duration-200
                                            ${isActive
                                                ? `bg-${tab.color}-600 text-white shadow-md`
                                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                                            }
                                        `}
                                        style={isActive ? {
                                            backgroundColor: tab.color === 'blue' ? '#2563eb' :
                                                tab.color === 'indigo' ? '#4f46e5' :
                                                    tab.color === 'yellow' ? '#eab308' :
                                                        tab.color === 'orange' ? '#f97316' :
                                                            tab.color === 'purple' ? '#9333ea' :
                                                                tab.color === 'teal' ? '#14b8a6' :
                                                                    tab.color === 'green' ? '#16a34a' :
                                                                        tab.color === 'red' ? '#dc2626' : '#6b7280'
                                        } : {}}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{tab.label}</span>
                                            <span className={`
                                                px-2 py-0.5 rounded-full text-xs
                                                ${isActive
                                                    ? 'bg-white/20 text-white'
                                                    : `bg-${tab.color}-100 text-${tab.color}-700 dark:bg-${tab.color}-900/30 dark:text-${tab.color}-300`
                                                }
                                            `}>
                                                {count}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
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
                                    "Sample Used",
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
                                        <td colSpan={10} className="px-6 py-4">
                                            <Skeleton height={24} />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLabTests.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        No lab test requests found for this status
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
                                                        <h4 className="text-2xl text-center font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                            Laboratory Actions for this Test
                                                        </h4>

                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">

                                                            {/* Function to collect specimen/sample while calling the function 
                                                            WE ensure we pass the id of this test, its only we need */}
                                                            {/* COLLECT SAMPLE — If Pending */}
                                                            {test.test_status.id === TEST_STATUS.PENDING && (
                                                                <button
                                                                    onClick={() => handleCollectSample(test.id)}
                                                                    className="px-3 py-2 text-xs font-bold rounded-lg
                                                                bg-blue-100 text-blue-700
                                                                dark:bg-blue-900/30 dark:text-blue-300
                                                                hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                                                                >
                                                                    Collect Sample
                                                                </button>
                                                            )}


                                                            {/* Accept Specimen Button,when clicked it triggers the modal */}
                                                            {/* ACCEPT SPECIMEN — if sample Collected */}
                                                            {test.test_status.id === TEST_STATUS.SPECIMEN_COLLECTED && (
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
                                                            )}

                                                            {/* Button to reject the test, we ensure we save the test in state, 
                                                              and we shall pass the id of the test in handleRejectTest function,
                                                             together with the rejection reason */}

                                                            {/* Show REJECT TEST — If Test is Pending,  Started, Completed  */}
                                                            {[TEST_STATUS.PENDING, TEST_STATUS.STARTED, TEST_STATUS.COMPLETED].includes(test.test_status.id) && (
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
                                                            )}


                                                            {/* Handle the start of the test, by passing the id of this test to the function
                                                            that handles the start of the test */}
                                                            {/* Show START TEST — If specimen Accepted */}
                                                            {test.test_status.id === TEST_STATUS.SPECIMEN_ACCEPTED && (
                                                                <button
                                                                    onClick={() => handleTestStartOrAnalysis(test.id)}
                                                                    className="px-3 py-2 text-xs font-bold rounded-lg
                                                               bg-yellow-100 text-yellow-800
                                                               dark:bg-yellow-900/30 dark:text-yellow-300
                                                               hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
                                                                >
                                                                    Start / Analyze
                                                                </button>
                                                            )}

                                                            {/* Handle the enter results button, which triggers the function that opens amodal */}

                                                            {/* Show ADD / UPDATE RESULTS — If Test Is Started OR Completed */}
                                                            {[TEST_STATUS.STARTED, TEST_STATUS.COMPLETED].includes(test.test_status.id) && (
                                                                <button
                                                                    onClick={() => handleEnterResultsClick(test)}
                                                                    className="px-3 py-2 text-xs font-bold rounded-lg
                                                              bg-purple-100 text-purple-700
                                                              dark:bg-purple-900/30 dark:text-purple-300
                                                              hover:bg-purple-200 dark:hover:bg-purple-900/50 transition">
                                                                    Add/Update Results
                                                                </button>
                                                            )}

                                                            {/* Verify test results button, we ensure that we pass the id of this test were on */}
                                                            {/* Show VERIFY RESULTS — IF Test Completed */}
                                                            {test.test_status.id === TEST_STATUS.COMPLETED && (
                                                                <button
                                                                    onClick={() => handleVerifyLabTestResults(test.id)}
                                                                    className="px-3 py-2 text-xs font-bold rounded-lg
                                                              bg-teal-100 text-teal-700
                                                              dark:bg-teal-900/30 dark:text-teal-300
                                                              hover:bg-teal-200 dark:hover:bg-teal-900/50 transition"
                                                                >
                                                                    Verify Results
                                                                </button>
                                                            )}

                                                            {/* Function to approve test results, we pass the id of the test */}
                                                            {/* Show APPROVE RESULTS — If Test Verified */}
                                                            {test.test_status.id === TEST_STATUS.VERIFIED && (
                                                                <button
                                                                    onClick={() => handleApproveTestResults(test.id)}
                                                                    className="px-3 py-2 text-xs font-bold rounded-lg
                                                               bg-green-100 text-green-700
                                                               dark:bg-green-900/30 dark:text-green-300
                                                                hover:bg-green-200 dark:hover:bg-green-900/50 transition">
                                                                    Approve Results
                                                                </button>
                                                            )}

                                                            {/* Handle the button that downloads the Lab test request form */}
                                                            <button
                                                                onClick={() =>
                                                                    handlePreviewLabTestRequestPdf(test.visit_details?.id)
                                                                }
                                                                className="px-3 py-2 text-xs font-bold rounded-lg
                                                                bg-sky-100 text-sky-700
                                                                dark:bg-sky-900/30 dark:text-sky-300
                                                                hover:bg-sky-200 dark:hover:bg-sky-900/50 transition"
                                                            >
                                                                View Test Request Form
                                                            </button>



                                                            {/* Show Test Result Form If the Test is Approved */}
                                                            {test.test_status.id === TEST_STATUS.APPROVED && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleDownloadOfTestResultForm(test.visit_details?.id)
                                                                    }
                                                                    className="px-3 py-2 text-xs font-bold rounded-lg
                                                                bg-sky-100 text-sky-700
                                                                dark:bg-sky-900/30 dark:text-sky-300
                                                                hover:bg-sky-200 dark:hover:bg-sky-900/50 transition"
                                                                >
                                                                    View Test Result Form
                                                                </button>
                                                            )}

                                                        </div>
                                                    </div>

                                                    {/* CARDS GRID */}
                                                    <div className="">
                                                        <h4 className="text-2xl text-center font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                            Patient Visit and Test Request Details
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

                                                                    <p><span className="font-medium">Specimen collected By:</span> {test.specimen?.specimen_collected_by}</p>

                                                                    <p><span className="font-medium">Specimen collected at:</span> {test.specimen?.specimen_collected_at}</p>
                                                                    <p><span className="font-medium">Specimen Accepted By:</span> {test.specimen?.specimen_accepted_by}</p>
                                                                    <p><span className="font-medium">Specimen Barcode:</span> {test.specimen?.specimen_barcode}</p>

                                                                </div>
                                                            </div>



                                                            {/* TEST CARD */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                    Test Information
                                                                </h4>

                                                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                                                    <p><span className="font-medium">Test Type:</span> {test.test_info?.test_type}</p>
                                                                    <p><span className="font-medium">Test Created By:</span> {test.audit?.created_by || 'N/A'}</p>
                                                                    <p><span className="font-medium">Who proven this test to be started:</span> {test.audit?.tested_by || 'N/A'}</p>
                                                                    <p><span className="font-medium">Test rejected by:</span> {test.audit?.rejected_by || 'N/A'}</p>
                                                                    <p><span className="font-medium">Test verified by:</span> {test.audit?.verified_by || 'N/A'}</p>
                                                                    <p><span className="font-medium">Test Approved by:</span> {test.audit?.approved_by || 'N/A'}</p>

                                                                    <p><span className="font-medium">Purpose:</span> {test.test_info?.test_purpose}</p>

                                                                    <p><span className="font-medium">Method:</span> {test.test_info?.method_used || "N/A"}</p>
                                                                    <p>
                                                                        <span className="font-medium">Test Date:</span>{" "}
                                                                        {formatDate(test.test_info?.test_date)}
                                                                    </p>
                                                                    <p><span className="font-medium">Test Rejection reason:</span> {test.test_info?.test_rejection_reason || 'N/A'}</p>


                                                                </div>
                                                            </div>

                                                            {/* TEST TIMING */}
                                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                                    This Test Time stamps
                                                                </h4>

                                                                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                                                    <p><span className="font-medium">Test created at:</span> {test.timestamps?.created || 'N/A'}</p>
                                                                    <p><span className="font-medium">Test started at:</span> {test.timestamps?.started || 'N/A'}</p>
                                                                    <p><span className="font-medium">Test Completed at:</span> {test.timestamps?.completed || 'N/A'}</p>
                                                                    <p><span className="font-medium">Test Verified at:</span> {test.timestamps?.verified || 'N/A'}</p>

                                                                    <p><span className="font-medium">Test rejected at:</span> {test.timestamps?.rejected || 'N/A'}</p>
                                                                    <p><span className="font-medium">Test Approved at:</span> {test.timestamps?.approved || 'N/A'}</p>


                                                                </div>
                                                            </div>






                                                        </div>

                                                    </div>

                                                    {/* MAP  TEST RESULTS FOR THIS TEST */}
                                                    <div className="mt-8">
                                                        <h1 className=" text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
                                                            Results For This Test
                                                        </h1>

                                                        {/* Map from test results from api */}
                                                        {test.test_results && test.test_results.length > 0 ? (
                                                            <div className="space-y-4">
                                                                {test.test_results.map((result) => {
                                                                    const parameter = result.snapshot?.parameter_used;
                                                                    // Check if the result type for this test is numeric, 
                                                                    // These tests use specific info which may not apply to tests which are text based
                                                                    const isNumeric = parameter?.result_type === "numeric";

                                                                    return (
                                                                        <div
                                                                            key={result.id}
                                                                            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
                                                                        >
                                                                            {/* HEADER */}
                                                                            <div className="mb-3">
                                                                                <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                                    {parameter?.name || "Unknown Parameter"}
                                                                                </h5>
                                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                    Result Type: {parameter?.result_type || "N/A"}
                                                                                </p>
                                                                            </div>

                                                                            {/* RESULT VALUE */}
                                                                            <div className="mb-4">
                                                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                                    Result Value
                                                                                </p>
                                                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                                                    {result.result_value}
                                                                                </p>

                                                                                <p
                                                                                    className={`mt-1 text-xs font-medium ${result.interpretation === "High"
                                                                                        ? "text-red-600 dark:text-red-400"
                                                                                        : result.interpretation === "Low"
                                                                                            ? "text-yellow-600 dark:text-yellow-400"
                                                                                            : "text-green-600 dark:text-green-400"
                                                                                        }`}
                                                                                >
                                                                                    Interpretation: {result.interpretation || "—"}
                                                                                </p>
                                                                            </div>

                                                                            {/* NUMERIC DETAILS */}
                                                                            <div className="mb-4">
                                                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
                                                                                    Measurement Details used for this Parameter
                                                                                </p>
                                                                                {/* If the test is not applicable for numeric results like reference ranges etc  */}
                                                                                {isNumeric ? (
                                                                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                                                                        <p>
                                                                                            <span className="font-medium">SI Unit:</span>{" "}
                                                                                            {parameter?.si_unit}
                                                                                        </p>
                                                                                        <p>
                                                                                            <span className="font-medium">Reference Range:</span>{" "}
                                                                                            {parameter?.reference_range}
                                                                                        </p>
                                                                                        <p>
                                                                                            <span className="font-medium">Normal Min:</span>{" "}
                                                                                            {parameter?.normal_min}
                                                                                        </p>
                                                                                        <p>
                                                                                            <span className="font-medium">Normal Max:</span>{" "}
                                                                                            {parameter?.normal_max}
                                                                                        </p>
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                                                        Not applicable for non-numeric results
                                                                                    </p>
                                                                                )}
                                                                            </div>

                                                                            {/* INSTRUMENT */}
                                                                            <div className="mb-4 text-xs text-gray-600 dark:text-gray-400">
                                                                                <span className="font-bold">Instrument Used:</span>{" "}
                                                                                {result.test_instrument?.test_instrument_name || "N/A"}
                                                                            </div>

                                                                            {/* AUDIT */}
                                                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
                                                                                    Test Results Auditing
                                                                                </p>
                                                                                <p>
                                                                                    <span className="font-medium">Results Entered By:</span>{" "}
                                                                                    {result.test_result_entered_by?.name || "N/A"}
                                                                                </p>
                                                                                <p>
                                                                                    <span className="font-medium">Results Verified By:</span>{" "}
                                                                                    {result.test_result_verified_by?.name || "Not Verified"}
                                                                                </p>
                                                                                <p>
                                                                                    <span className="font-medium">Time Entered:</span>{" "}
                                                                                    {result.time_entered}
                                                                                </p>

                                                                                <p>
                                                                                    <span className="font-medium">Time Verified:</span>{" "}
                                                                                    {result.time_verified}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="text-1xl text-center font-bold text-red-500 dark:text-red-400">
                                                                No test results recorded for this test.
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


            {/* ENTER RESULTS MODAL */}
            {/* ENTER RESULTS MODAL */}
            {showEnterResultsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-xl shadow-lg max-h-[90vh] flex flex-col">

                        {/* HEADER */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    Enter New Results or Update Existing Results
                                </h3>

                                <div className="mt-1">
                                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                        Please note that what you submit is exactly what will be saved
                                    </span>
                                </div>

                                {activeTest && (
                                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                                        Test: {activeTest.test_info?.test_type} | Patient: {activeTest.patient?.name}
                                    </p>
                                )}
                            </div>


                            <button
                                onClick={() => setShowEnterResultsModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Instrument Selection */}
                        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Select Instrument *
                            </label>
                            <select
                                value={selectedInstrumentId || ''}
                                onChange={(e) => setSelectedInstrumentId(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 transition"
                            >
                                <option value="">-- Select Instrument --</option>
                                {instruments.map(instrument => (
                                    <option key={instrument.id} value={instrument.id}>
                                        {instrument.instrument_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* BODY - Scrollable Parameters */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} height={80} />
                                    ))}
                                </div>
                            ) : parameters.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">
                                    No parameters configured for this test type.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {parameters
                                        .filter(param => !excludedParameterIds.has(param.id))
                                        .map(param => (
                                            <div
                                                key={param.id}
                                                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                            >
                                                {/* Parameter Header with Delete */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                                            {param.parameter_name}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Code: {param.parameter_code}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveParameter(param.id)}
                                                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                                                        title="Remove this parameter"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Result Input */}
                                                <div className="mb-3">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Result Value *
                                                    </label>
                                                    <input
                                                        type={param.result_type === 'numeric' ? 'number' : 'text'}
                                                        step={param.result_type === 'numeric' ? 'any' : undefined}
                                                        value={resultValues[param.id]?.result_value || ''}
                                                        onChange={(e) => handleResultValueChange(param.id, 'result_value', e.target.value)}
                                                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 transition"
                                                        placeholder={`Enter ${param.result_type} value`}
                                                    />
                                                </div>

                                                {/* For Numeric Type: Show Reference Range and SI Unit */}
                                                {param.result_type === 'numeric' && (
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                Reference Range:
                                                            </span>
                                                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                                                                {param.reference_range || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                SI Unit:
                                                            </span>
                                                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                                                                {param.si_unit || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Show auto-interpretation for numeric */}
                                                {param.result_type === 'numeric' && resultValues[param.id]?.result_value && (
                                                    <div className="mt-2 text-sm">
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                                            Interpretation:
                                                        </span>
                                                        <span className={`ml-2 font-semibold ${getInterpretation(resultValues[param.id]?.result_value, param) === (param.flag_normal_label || 'Normal')
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-orange-600 dark:text-orange-400'
                                                            }`}>
                                                            {getInterpretation(resultValues[param.id]?.result_value, param)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowEnterResultsModal(false)}
                                className="px-4 py-2 text-xs font-bold rounded-lg
                                bg-gray-100 text-gray-700
                                dark:bg-gray-800 dark:text-gray-300
                                hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSubmitResults}
                                disabled={loading || !selectedInstrumentId}
                                className="px-4 py-2 text-xs font-bold rounded-lg
                                bg-purple-600 text-white
                                hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Submit Results
                            </button>
                        </div>
                    </div>
                </div>
            )}



        </>
    );
}
