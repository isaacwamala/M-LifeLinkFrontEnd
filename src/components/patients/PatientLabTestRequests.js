import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Search, Calendar, Trash2, Filter, RefreshCw, HandCoins, Package, User, Phone, MapPin, CreditCard, DollarSign, Hash, ChevronRight, ChevronLeft, ChartBarStackedIcon, Clock, FlaskConical, ClipboardList, Fingerprint, Building2, Barcode } from 'lucide-react';
import { API_BASE_URL } from '../general/constants';
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import dayjs from 'dayjs';
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

    //State for the verify results confirmation modal
    //We store the test to verify in state so the confirm button knows which test to act on
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [testToVerify, setTestToVerify] = useState(null);

    //States for Enter Results Modal
    const [showEnterResultsModal, setShowEnterResultsModal] = useState(false);
    const [resultValues, setResultValues] = useState({});
    const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
    const [excludedParameterIds, setExcludedParameterIds] = useState(new Set());

    //States for PDF Preview Modal (shared by both request form and result form)
    const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
    const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);


    //Set current page due to paginations from back end
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    //Use local date
    const today = new Date().toLocaleDateString('en-CA');

    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(today);

    // State for active tab
    const [activeTab, setActiveTab] = useState(4); // Default to PENDING
    const [totalConfiguredParameters, setTotalConfiguredParameters] = useState(0);


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

    //Load Lab instruments
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

    //Helper to get the right patient's reference range, based on his/her gender and age of the patient and the reference ranges defined for the test parameter in the back end
    //This ensures that we get the right reference range for the patient's age and gender 
    // on the result parameters set in the back end for the test type parameter and the patient's demographics
    const getMatchingReferenceRange = (param, patient) => {
        if (!param.reference_ranges || param.reference_ranges.length === 0) {
            return null;
        }

        //ensure that u return null if patient's DOB is null
        if (!patient || !patient.dob) return null;

        //Calculate actual age by subtracting the current date from the patient's date of birth
        //Using day js
        const patientAge = dayjs().diff(dayjs(patient.dob), 'year');
        //console.log('DOB:', patient.dob);
        //console.log('Computed Age:', patientAge);
        //console.log('All Ranges:', param.reference_ranges);

        //Also look for the patient's gender
        const patientGender = patient?.gender?.toLowerCase();
        //console.log('gender', patientGender);

        return param.reference_ranges.find(range => {
            const genderMatch =
                range.gender === 'both' ||
                range.gender?.toLowerCase() === patientGender;

            const ageMatch =
                (!range.age_min || patientAge >= range.age_min) &&
                (!range.age_max || patientAge <= range.age_max);

            return genderMatch && ageMatch;
        }) || null;
    };

    // NOTE: `patient` is now passed in explicitly rather than read from the
    // `activeTest` state variable. Previously this read `activeTest?.patient`,
    // but setActiveTest() doesn't apply synchronously — this function was
    // invoked in the same tick as setActiveTest(test), so it was always closing
    // over the PREVIOUS activeTest (usually null after closeEnterResultsModal
    // resets it). That silently made getMatchingReferenceRange() return null
    // for every numeric parameter regardless of how correct the reference
    // ranges actually were, producing the "no parameters match" message.
    const fetchParameters = async (testTypeId, patient) => {
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

            /**
             * Build the list of parameters to show in the Enter Results modal.
             *
             * - NUMERIC parameters need a reference range matched to the patient's
             *   age/gender before we can display normal_min/max, si_unit, and
             *   auto-interpretation (Low/Normal/High). If no matching range exists
             *   for this patient's demographics, we exclude the parameter and ask
             *   the user to configure a range that covers the patient (existing behavior).
             *
             * - TEXT / QUALITATIVE / SEMI_QUANTITATIVE parameters (e.g. HIV → Positive/Negative)
             *   are never given reference ranges at configuration time, so there is
             *   nothing to match against the patient. Previously these were run through
             *   getMatchingReferenceRange() too, which always returned null and silently
             *   dropped them from the modal — this is the bug. We now skip range-matching
             *   for non-numeric result types and keep them as-is so a plain text input
             *   renders for them.
             */
            const parsedData = testTypeParameters
                .map(param => {
                    // Non-numeric: no reference range needed, keep parameter as-is
                    if (param.result_type !== 'numeric') {
                        return {
                            ...param,
                            normal_min: null,
                            normal_max: null,
                            reference_range: null,
                        };
                    }

                    // Numeric: find the reference range matching this patient's age/gender
                    const matchedRange = getMatchingReferenceRange(param, patient);

                    // ❗ If no matching range → exclude parameter
                    // where the patient gender and age dont fall in the ranges set age range or gender
                    //for the parameter,this means the user has to set the range on the result parameter which satsifies
                    //patient gender and age
                    if (!matchedRange) return null;

                    return {
                        ...param,
                        normal_min: matchedRange.normal_min
                            ? parseFloat(matchedRange.normal_min)
                            : null,
                        normal_max: matchedRange.normal_max
                            ? parseFloat(matchedRange.normal_max)
                            : null,
                        reference_range: matchedRange.reference_range,
                        flag_low_label: matchedRange.flag_low_label || 'Low',
                        flag_normal_label: matchedRange.flag_normal_label || 'Normal',
                        flag_high_label: matchedRange.flag_high_label || 'High',
                    };
                })
                .filter(Boolean); // removes nulls (numeric params with no matching range)

            //Set these parameters which reflect in state
            setParameters(parsedData);
            //to check if there is any parameter before filter above occurs, for 
            //user responses,whether configurations are missing
            //this checks whether, the test type has no test parameters at all
            //to prevent confusion if they have been filtered out due to patient's age and gender
            setTotalConfiguredParameters(testTypeParameters.length);

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

    // Summary counts across the full fetched dataset (not filtered by tab/search)
    const insights = useMemo(() => {
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        return {
            total: labTests.length,
            // status ids 2 = SPECIMEN_COLLECTED, 3 = SPECIMEN_ACCEPTED
            awaitingSpecimen: labTests.filter(t => t.test_status.id === 2 || t.test_status.id === 3).length,
            // status id 5 = STARTED
            inProgress: labTests.filter(t => t.test_status.id === 5).length,
            // status ids 6 = COMPLETED, 7 = VERIFIED
            awaitingSignoff: labTests.filter(t => t.test_status.id === 6 || t.test_status.id === 7).length,
            // status id 8 = APPROVED
            approved: labTests.filter(t => t.test_status.id === 8).length,
            // PENDING (4) and created more than 2 hours ago
            overdue: labTests.filter(t =>
                t.test_status.id === 4 &&
                t.test_info?.test_date &&
                (Date.now() - new Date(t.test_info.test_date).getTime()) > TWO_HOURS_MS
            ).length,
        };
    }, [labTests]);


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

    // Opens the confirm-verify modal for a given test instead of verifying immediately
    const handleVerifyResultsClick = (test) => {
        setTestToVerify(test);
        setShowVerifyModal(true);
    };

    // Closes the confirm-verify modal without acting
    const closeVerifyModal = () => {
        setShowVerifyModal(false);
        setTestToVerify(null);
    };

    // Runs when the user confirms inside the modal
    const confirmVerifyResults = async () => {
        if (!testToVerify) return;
        await handleVerifyLabTestResults(testToVerify.id);
        closeVerifyModal();
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

    // Handler for Enter Results button click.
    // Fetches parameters and opens the modal directly (instead of relying on a
    // useEffect keyed off `activeTest`). The old effect-based approach failed to
    // reopen the modal when the same test was clicked twice in a row, because
    // setActiveTest(test) with the same object reference doesn't trigger a
    // dependency change, so the effect never re-ran.
    const handleEnterResultsClick = async (test) => {
        setActiveTest(test);
        setExcludedParameterIds(new Set());
        setResultValues({});
        setSelectedInstrumentId(null);
        setParameters([]); // clear stale params from any previously viewed test
        setShowEnterResultsModal(true); // open immediately so the skeleton shows while fetching
        // Pass test.patient directly rather than relying on the activeTest state
        // variable, since setActiveTest() above hasn't applied yet at this point.
        await fetchParameters(test.test_info.id, test.patient);
    };

    // Central close/reset for the Enter Results modal. Clearing activeTest here
    // (not just hiding the modal) is what guarantees the next click on the same
    // test is treated as a fresh open.
    const closeEnterResultsModal = () => {
        setShowEnterResultsModal(false);
        setActiveTest(null);
        setParameters([]);
        setResultValues({});
        setExcludedParameterIds(new Set());
        setSelectedInstrumentId(null);
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

    // Function to determine interpretation  of the result whether low,high or normal
    //  based on the result value entered and the reference range for the patient for that parameter
    const getInterpretation = (value, param) => {
        if (!value || param.result_type !== 'numeric') return '';

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';

        if (param.normal_min !== null && param.normal_max !== null) {
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
            closeEnterResultsModal();
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

    // Tab configuration — fully-static class strings so Tailwind JIT never purges them
    const TABS = [
        {
            id: TEST_STATUS.PENDING,
            label: 'Pending Tests',
            activeClass: 'bg-yellow-500 text-white shadow-md',
            badgeActiveClass: 'bg-yellow-300 text-yellow-900',
            badgeInactiveClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        },
        {
            id: TEST_STATUS.SPECIMEN_COLLECTED,
            label: 'Specimen Collected',
            activeClass: 'bg-blue-600 text-white shadow-md',
            badgeActiveClass: 'bg-blue-300 text-blue-900',
            badgeInactiveClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        },
        {
            id: TEST_STATUS.SPECIMEN_ACCEPTED,
            label: 'Specimen Accepted',
            activeClass: 'bg-indigo-600 text-white shadow-md',
            badgeActiveClass: 'bg-indigo-300 text-indigo-900',
            badgeInactiveClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        },
        {
            id: TEST_STATUS.STARTED,
            label: 'Started',
            activeClass: 'bg-orange-500 text-white shadow-md',
            badgeActiveClass: 'bg-orange-300 text-orange-900',
            badgeInactiveClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        },
        {
            id: TEST_STATUS.COMPLETED,
            label: 'Completed',
            activeClass: 'bg-purple-600 text-white shadow-md',
            badgeActiveClass: 'bg-purple-300 text-purple-900',
            badgeInactiveClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        },
        {
            id: TEST_STATUS.VERIFIED,
            label: 'Verified',
            activeClass: 'bg-teal-600 text-white shadow-md',
            badgeActiveClass: 'bg-teal-300 text-teal-900',
            badgeInactiveClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
        },
        {
            id: TEST_STATUS.APPROVED,
            label: 'Approved',
            activeClass: 'bg-green-600 text-white shadow-md',
            badgeActiveClass: 'bg-green-300 text-green-900',
            badgeInactiveClass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        },
        {
            id: TEST_STATUS.REJECTED,
            label: 'Rejected',
            activeClass: 'bg-red-600 text-white shadow-md',
            badgeActiveClass: 'bg-red-300 text-red-900',
            badgeInactiveClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        },
    ];

    // Get count of tests for each status
    const getStatusCount = (statusId) => {
        return labTests.filter(test => test.test_status.id === statusId).length;
    };

    // Resolve the correct badge color for a status by reusing the TABS config,
    // instead of a hardcoded color. Falls back to a neutral gray if a status
    // id somehow isn't in TABS.
    const getStatusBadgeClasses = (statusId) => {
        const tab = TABS.find(t => t.id === statusId);
        return tab ? tab.badgeInactiveClass : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
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

    //Handle thefunction to download test result form
    //tests/generatePatientTestResultForm
    const handleDownloadOfTestResultForm = (visitId) => {
        openPdfPreview('tests/generatePatientTestResultForm', visitId, 'Test Result Form');
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


                {/* Insights Bar — numbers enlarged and given a colored accent bar
                so counts are readable at a glance instead of blending into the card */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        {/* Total — neutral */}
                        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400 dark:bg-gray-500" />
                            <p className="text-4xl font-extrabold leading-none text-gray-900 dark:text-white">{insights.total}</p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">Total Tests</p>
                        </div>
                        {/* Awaiting Specimen — indigo */}
                        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-lg border border-indigo-200 dark:border-indigo-700 p-4 text-center">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                            <p className="text-4xl font-extrabold leading-none text-indigo-600 dark:text-indigo-400">{insights.awaitingSpecimen}</p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">Awaiting Specimen</p>
                        </div>
                        {/* In Progress — orange */}
                        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-lg border border-orange-200 dark:border-orange-700 p-4 text-center">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
                            <p className="text-4xl font-extrabold leading-none text-orange-500 dark:text-orange-400">{insights.inProgress}</p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">In Progress</p>
                        </div>
                        {/* Awaiting Sign-off — purple */}
                        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-700 p-4 text-center">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                            <p className="text-4xl font-extrabold leading-none text-purple-600 dark:text-purple-400">{insights.awaitingSignoff}</p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">Awaiting Sign-off</p>
                        </div>
                        {/* Approved — green */}
                        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-700 p-4 text-center">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
                            <p className="text-4xl font-extrabold leading-none text-green-600 dark:text-green-400">{insights.approved}</p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">Approved</p>
                        </div>
                        {/* Overdue — red, stands out when count > 0 */}
                        <div className={`relative overflow-hidden bg-white dark:bg-gray-900 rounded-lg border p-4 text-center ${insights.overdue > 0
                            ? 'border-red-400 dark:border-red-500 ring-2 ring-red-400 dark:ring-red-500'
                            : 'border-gray-200 dark:border-gray-700'
                            }`}>
                            <div className={`absolute top-0 left-0 right-0 h-1 ${insights.overdue > 0 ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <p className={`text-4xl font-extrabold leading-none ${insights.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                {insights.overdue}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-2">Overdue (&gt;2h Pending)</p>
                        </div>
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

                {/* Tabs Section — sticky so it stays visible while the table scrolls */}
                <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="px-6 overflow-x-auto">
                        <div className="flex gap-2 min-w-max py-3">
                            {TABS.map((tab) => {
                                const count = getStatusCount(tab.id);
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${isActive
                                            ? tab.activeClass
                                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        <span>{tab.label}</span>
                                        {/* Count badge enlarged (was text-xs/min-w-[1.25rem]) so counts
                                        are legible without squinting, especially double-digit values */}
                                        <span className={`inline-flex items-center justify-center min-w-[1.75rem] h-6 px-2 rounded-full text-sm font-bold ${isActive ? tab.badgeActiveClass : tab.badgeInactiveClass
                                            }`}>
                                            {count}
                                        </span>
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
                                filteredLabTests.map((test) => {
                                    // Small helpers scoped to this row — keeps the JSX below readable
                                    const patientInitial = (test.patient?.name || '?').charAt(0).toUpperCase();
                                    const isExpanded = expandedRows.has(test.id);

                                    return (
                                        <React.Fragment key={test.id}>
                                            {/* MAIN ROW — entire row is clickable to expand/collapse */}
                                            <tr
                                                className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer ${isExpanded ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                                                onClick={() => toggleRow(test.id)}
                                            >
                                                <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                                    #LT-{test.id}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs font-bold flex-shrink-0">
                                                            {patientInitial}
                                                        </div>
                                                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
                                                            {test.patient?.name}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                    {test.patient?.patient_number}
                                                </td>

                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                    {test.visit_details?.visit_number}
                                                </td>

                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {test.visit_details?.visit_date}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <FlaskConical className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                                        <span className="font-semibold text-gray-800 dark:text-gray-100">
                                                            {test.test_info?.test_type}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className="inline-flex px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                                        {test.specimen?.type}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    {/* Status color now matches the tab config exactly (was previously
                                                hardcoded to yellow regardless of actual status) */}
                                                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(test.test_status?.id)}`}>
                                                        {test.test_status?.name}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleRow(test.id); }}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full
                                               hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* EXPANDED ROW */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={10} className="p-0 bg-gray-50 dark:bg-gray-800/60 border-b-2 border-blue-100 dark:border-blue-900/40">

                                                        {/* Colored top accent, echoes the pattern used elsewhere in the app */}
                                                        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                                                        <div className="p-6">

                                                            {/* ══ ACTIONS PANEL ══ */}
                                                            <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center gap-2">
                                                                    <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                                                        Laboratory Actions
                                                                    </span>
                                                                </div>

                                                                <div className="p-4 flex flex-wrap gap-2">

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

                                                                    {/* ACCEPT SPECIMEN — if sample Collected */}
                                                                    {test.test_status.id === TEST_STATUS.SPECIMEN_COLLECTED && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveTest(test);
                                                                                setSelectedSpecimenId(null);
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

                                                                    {/* REJECT TEST — If Test is Pending, Started, Completed */}
                                                                    {[TEST_STATUS.PENDING, TEST_STATUS.STARTED, TEST_STATUS.COMPLETED].includes(test.test_status.id) && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveTest(test);
                                                                                setRejectionReason("");
                                                                                setShowRejectModal(true);
                                                                            }}
                                                                            className="px-3 py-2 text-xs font-bold rounded-lg
                                                                    bg-red-100 text-red-700
                                                                    dark:bg-red-900/30 dark:text-red-300
                                                                    hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                                                                        >
                                                                            Reject Test
                                                                        </button>
                                                                    )}

                                                                    {/* START TEST — If specimen Accepted */}
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

                                                                    {/* ADD / UPDATE RESULTS — If Test Is Started OR Completed */}
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

                                                                    {/* VERIFY RESULTS — IF Test Completed */}
                                                                    {test.test_status.id === TEST_STATUS.COMPLETED && (
                                                                        <button
                                                                            onClick={() => handleVerifyResultsClick(test)}
                                                                            className="px-3 py-2 text-xs font-bold rounded-lg
                                                                  bg-teal-100 text-teal-700
                                                                  dark:bg-teal-900/30 dark:text-teal-300
                                                                  hover:bg-teal-200 dark:hover:bg-teal-900/50 transition"
                                                                        >
                                                                            Verify Results
                                                                        </button>
                                                                    )}

                                                                    {/* APPROVE RESULTS — If Test Verified */}
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

                                                                    {/* Divider between action buttons and document buttons */}
                                                                    <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

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

                                                                    {/* Test Result Form — only if the test is Approved */}
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

                                                            {/* ══ DETAILS CARDS GRID ══ */}
                                                            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                                                                Patient Visit &amp; Test Request Details
                                                            </h4>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">

                                                                {/* ── PATIENT CARD ── */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center gap-2">
                                                                        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Patient</span>
                                                                    </div>
                                                                    <div className="p-3 space-y-2">
                                                                        {[
                                                                            { label: 'Date of Birth', value: test.patient?.dob },
                                                                            { label: 'Age', value: test.patient?.dob ? `${dayjs().diff(dayjs(test.patient.dob), "year")} yrs` : null },
                                                                            { label: 'Gender', value: test.patient?.gender },
                                                                            { label: 'Address', value: test.patient?.address },
                                                                            { label: 'Phone', value: test.patient?.phone_number },
                                                                            { label: 'Insurance No.', value: test.patient?.insurance_number },
                                                                            { label: 'Insurance Provider', value: test.patient?.insurance_provider },
                                                                        ].map(({ label, value }) => (
                                                                            <div key={label} className="flex items-start justify-between gap-2">
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                                                                                <span className={`text-xs font-medium text-right capitalize truncate max-w-[55%] ${value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                                                                                    {value ?? '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* ── VISIT CARD ── */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                                                                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Visit</span>
                                                                    </div>
                                                                    <div className="p-3 space-y-2">
                                                                        {[
                                                                            { label: 'Visit Type', value: test.visit_details?.visit_type },
                                                                            { label: 'Visit Date', value: test.visit_details?.visit_date },
                                                                            { label: 'Created By', value: test.visit_details?.created_by },
                                                                        ].map(({ label, value }) => (
                                                                            <div key={label} className="flex items-start justify-between gap-2">
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                                                                                <span className={`text-xs font-medium text-right capitalize truncate max-w-[55%] ${value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                                                                                    {value ?? '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* ── SPECIMEN & AUDIT CARD ── */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
                                                                        <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                                                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Specimen &amp; Audit</span>
                                                                    </div>
                                                                    <div className="p-3 space-y-2">
                                                                        {[
                                                                            { label: 'Accepted?', value: test.specimen?.specimen_acceptance },
                                                                            { label: 'Collected By', value: test.specimen?.specimen_collected_by },
                                                                            { label: 'Collected At', value: test.specimen?.specimen_collected_at },
                                                                            { label: 'Accepted By', value: test.specimen?.specimen_accepted_by },
                                                                            { label: 'Barcode', value: test.specimen?.specimen_barcode, mono: true },
                                                                        ].map(({ label, value, mono }) => (
                                                                            <div key={label} className="flex items-start justify-between gap-2">
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                                                                                <span className={`text-xs font-medium text-right truncate max-w-[55%] ${mono ? 'font-mono' : 'capitalize'} ${value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                                                                                    {value ?? '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* ── TEST INFORMATION CARD ── */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800 flex items-center gap-2">
                                                                        <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Test Information</span>
                                                                    </div>
                                                                    <div className="p-3 space-y-2">
                                                                        {[
                                                                            { label: 'Test Type', value: test.test_info?.test_type },
                                                                            { label: 'Purpose', value: test.test_info?.test_purpose },
                                                                            { label: 'Method', value: test.test_info?.method_used },
                                                                            { label: 'Test Date', value: test.test_info?.test_date ? formatDate(test.test_info.test_date) : null },
                                                                            { label: 'Rejection Reason', value: test.test_info?.test_rejection_reason },
                                                                        ].map(({ label, value }) => (
                                                                            <div key={label} className="flex items-start justify-between gap-2">
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                                                                                <span className={`text-xs font-medium text-right capitalize truncate max-w-[55%] ${value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                                                                                    {value ?? '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* ── ACCOUNTABILITY CARD ── */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800 flex items-center gap-2">
                                                                        <Fingerprint className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                                                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">Accountability</span>
                                                                    </div>
                                                                    <div className="p-3 space-y-2">
                                                                        {[
                                                                            { label: 'Created By', value: test.audit?.created_by },
                                                                            { label: 'Tested By', value: test.audit?.tested_by },
                                                                            { label: 'Verified By', value: test.audit?.verified_by },
                                                                            { label: 'Approved By', value: test.audit?.approved_by },
                                                                            { label: 'Rejected By', value: test.audit?.rejected_by },
                                                                        ].map(({ label, value }) => (
                                                                            <div key={label} className="flex items-start justify-between gap-2">
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                                                                                <span className={`text-xs font-medium text-right capitalize truncate max-w-[55%] ${value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                                                                                    {value ?? '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* ── TIMESTAMPS CARD ── */}
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-center gap-2">
                                                                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Timeline</span>
                                                                    </div>
                                                                    <div className="p-3 space-y-2">
                                                                        {[
                                                                            { label: 'Created', value: test.timestamps?.created },
                                                                            { label: 'Started', value: test.timestamps?.started },
                                                                            { label: 'Completed', value: test.timestamps?.completed },
                                                                            { label: 'Verified', value: test.timestamps?.verified },
                                                                            { label: 'Approved', value: test.timestamps?.approved },
                                                                            { label: 'Rejected', value: test.timestamps?.rejected },
                                                                        ].map(({ label, value }) => (
                                                                            <div key={label} className="flex items-start justify-between gap-2">
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
                                                                                <span className={`text-xs font-medium text-right truncate max-w-[55%] ${value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                                                                                    {value ?? '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                            </div>

                                                            {/* ══ RESULTS SECTION ══ */}
                                                            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                                                <Barcode className="w-3.5 h-3.5" />
                                                                Results For This Test
                                                            </h4>

                                                            {test.test_results && test.test_results.length > 0 ? (
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                    {test.test_results.map((result) => {
                                                                        const parameter = result.snapshot?.parameter_used;
                                                                        const isNumeric = parameter?.result_type === "numeric";

                                                                        // Left-border accent color communicates interpretation at a glance
                                                                        const interpretationAccent =
                                                                            result.interpretation === "High"
                                                                                ? "border-l-red-500"
                                                                                : result.interpretation === "Low"
                                                                                    ? "border-l-yellow-500"
                                                                                    : "border-l-emerald-500";

                                                                        return (
                                                                            <div
                                                                                key={result.id}
                                                                                className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${interpretationAccent} p-4`}
                                                                            >
                                                                                {/* HEADER */}
                                                                                <div className="flex items-start justify-between mb-3">
                                                                                    <div>
                                                                                        <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                                            {parameter?.name || "Unknown Parameter"}
                                                                                        </h5>
                                                                                        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                                                                                            {parameter?.result_type || "N/A"} result
                                                                                        </p>
                                                                                    </div>
                                                                                    <span
                                                                                        className={`text-xs font-bold px-2 py-1 rounded-full ${result.interpretation === "High"
                                                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                                                            : result.interpretation === "Low"
                                                                                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                                                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                                                            }`}
                                                                                    >
                                                                                        {result.interpretation || "—"}
                                                                                    </span>
                                                                                </div>

                                                                                {/* RESULT VALUE */}
                                                                                <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-3">
                                                                                    {result.result_value}
                                                                                    {isNumeric && parameter?.si_unit && (
                                                                                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500 ml-1.5">
                                                                                            {parameter.si_unit}
                                                                                        </span>
                                                                                    )}
                                                                                </p>

                                                                                {/* NUMERIC DETAILS */}
                                                                                {isNumeric ? (
                                                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                                                                                        <p><span className="font-medium text-gray-600 dark:text-gray-300">Reference:</span> {parameter?.reference_range || 'N/A'}</p>
                                                                                        <p><span className="font-medium text-gray-600 dark:text-gray-300">Range:</span> {parameter?.normal_min}–{parameter?.normal_max}</p>
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                                                                                        No reference range — qualitative result
                                                                                    </p>
                                                                                )}

                                                                                {/* AUDIT */}
                                                                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                                                                    <p><span className="font-medium">Instrument:</span> {result.test_instrument?.test_instrument_name || "N/A"}</p>
                                                                                    <p><span className="font-medium">Entered:</span> {result.test_result_entered_by?.name || "N/A"} {result.time_entered && `· ${result.time_entered}`}</p>
                                                                                    <p><span className="font-medium">Verified:</span> {result.test_result_verified_by?.name || "Not verified yet"} {result.time_verified && `· ${result.time_verified}`}</p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-8 text-center">
                                                                    <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                                                                        No test results recorded for this test yet.
                                                                    </p>
                                                                </div>
                                                            )}

                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
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


            {/* VERIFY RESULTS CONFIRMATION MODAL */}
            {/* Asks the user to confirm before verifying a test's results — verification
            hands the test off to the approval stage, so we don't want a stray click to
            trigger it without a deliberate confirm step. */}
            {showVerifyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl shadow-lg p-6">

                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                Verify Test Results
                            </h3>
                            <button
                                onClick={closeVerifyModal}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                            <p>
                                Are you sure you want to verify the results for{" "}
                                <span className="font-bold">
                                    #LT-{testToVerify?.id} — {testToVerify?.test_info?.test_type}
                                </span>
                                {testToVerify?.patient?.name && (
                                    <> for patient <span className="font-bold">{testToVerify.patient.name}</span></>
                                )}?
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Once verified, this test moves to the approval stage.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={closeVerifyModal}
                                className="px-4 py-2 text-xs font-bold rounded-lg
                        bg-gray-100 text-gray-700
                        dark:bg-gray-800 dark:text-gray-300"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={confirmVerifyResults}
                                disabled={loading}
                                className="px-4 py-2 text-xs font-bold rounded-lg
                        bg-teal-600 text-white
                        hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Verifying..." : "Confirm Verification"}
                            </button>
                        </div>

                    </div>
                </div>
            )}


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
                                        Test: {activeTest.test_info?.test_type} | Patient: {activeTest.patient?.name} | Age: {activeTest.patient ? dayjs().diff(dayjs(activeTest.patient.dob), 'year') : 'N/A'} | {activeTest.patient?.gender}
                                    </p>
                                )}
                            </div>


                            <button
                                onClick={closeEnterResultsModal}
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
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <RefreshCw className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Loading test parameters...
                                    </p>
                                </div>
                            ) : parameters.length === 0 ? (
                                <p className="text-red-50">
                                    {totalConfiguredParameters === 0
                                        ? "No parameters configured for this test type."
                                        : "No parameters match this patient’s age and gender. Please configure reference ranges for this test type to fit the patient’s demographics."}
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
                                onClick={closeEnterResultsModal}
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
                                Submit Test Results
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF PREVIEW MODAL */}
            {/* Shared by both "View Test Request Form" and "View Test Result Form" buttons */}
            {showPdfPreviewModal && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-5 py-3
                        bg-white dark:bg-gray-900
                        border-b border-gray-200 dark:border-gray-700
                        flex-shrink-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {pdfPreviewTitle}
                        </h3>
                        <button
                            onClick={closePdfPreviewModal}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                                text-lg font-bold leading-none"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Modal Body */}
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
